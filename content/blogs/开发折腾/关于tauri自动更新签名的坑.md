# 排查记录：Tauri 自动更新签名报 "Wrong password for that key"，而私钥根本没密码

> 环境：Windows 11 / Node 24 / npm / GitHub Actions（windows-latest）
> 涉及版本：`@tauri-apps/cli` **2.11.0** 与 **2.12.4**（两者都复现）｜`minisign` 0.7.3 / 0.9.x
> 一句话结论：**Tauri 的 updater 签名私钥如果是「空密码」的，在 CI 里永远签不过**——因为 `tauri build` 只能通过环境变量传密码，而空密码经环境变量传入后会被 minisign 判成错误密码。解决办法：给私钥设一个非空密码。

---

## 1. 背景

[Symbix](https://github.com/yoruniubi/Symbix) 是一个「桌面宠物形态的 AI Agent」。在 v0.1.6 这一版，我们第一次接入**应用内自动更新**：

- 前端：`@tauri-apps/plugin-updater`
- 后端：`tauri-plugin-updater`（Rust）
- 签名：Tauri 内置的 **minisign** 签名，`createUpdaterArtifacts` + `plugins.updater.pubkey`

签名链路一共三个环节：

1. `tauri signer generate` 生成一对 key（私钥 `.key` + 公钥 `.key.pub`），公钥写进 `tauri.conf.json`
2. CI 构建时用私钥对更新包（`.nsis.zip` / `.app.tar.gz`）签名，生成 `.sig`
3. 客户端用内置公钥校验更新包签名，通过才安装

CI 第一次跑，前面全部绿，最后在签名环节挂掉：

```
incorrect updater private key password: Wrong password for that key
```

而这个 key 生成时**根本没设密码**（`tauri signer generate` 直接回车）。

---

## 2. 第一反应：secret 复制错了（结果全被排除）

`Wrong password` 这个措辞极具误导性——它其实是 minisign 用来表示**「解密后校验和不匹配」**的通用报错，密钥被截断、贴错、密码不对，全都报这一句。

于是先做事实取证，而不是猜：

| 取证动作 | 结果 |
| --- | --- |
| 本地 `.key` 文件字节数 / sha256 | 348 字节；sha256 与 CI 里 secret 的 sha256 **完全一致** |
| secret 是不是被截断 | 第一次贴的是 243 字节的坏副本（报 `Invalid padding`，与 CI 的报错**不同**）→ 重新整份复制后 sha256 对上了 |
| 是不是贴成了公钥 | secret 解码后首行为 `untrusted comment: rsign encrypted secret key`，是私钥 ✅ |
| 是不是密码 secret 里存了脏值 | GitHub 里**根本没有** `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 这个 secret |
| 本地能不能签 | `npx tauri signer sign -f symbix.key -p ""` **成功**，且签名 keyid 与配置的 pubkey 匹配 |

到这一步，key 内容、密码值、公钥配对都可以排除了。**剩下的可疑点只有一个：密码是怎么传进 CLI 的。**

这一步的方法论值得记下来：**在 CI 里加一段预检，把「长度 / sha256 / 密码 secret 状态 / 解码头部 / 实签结果」全部打进日志**。比在本地反复猜快得多——Tauri CLI 没有 `signer verify` 子命令，唯一可靠的验证方式就是**真签一次**。

---

## 3. 控制变量：把「密码来源」拆开测

关键突破来自一张 2×2 矩阵。key 固定用同一个文件（`-f`），只改密码的传递方式：

| 密码来源 | 结果 |
| --- | --- |
| `-p ""`（命令行显式给空串） | ✅ 签名成功 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=`（环境变量存在且为空） | ❌ `Wrong password for that key` |
| 完全不给密码 | ❌ 打印 `Signing without password.` 后**卡住不动** |
| 环境变量给**非空**正确密码 | ✅ 签名成功 |

再补三条交叉验证：

1. **`-p ""` 确实表示「密码 = 空串」**：用一把密码为 `test123` 的 key 测试，`-p ""` 会正确失败，`-p test123` 成功。
2. **不是 npm 的问题**：直接 `node node_modules/@tauri-apps/cli/tauri.js`、`npx tauri`、`npm run tauri --` 三层调用结果完全一致。
3. **变量确实传进去了**：同一个 spawn 链路里用 `cmd /c set` 和 node 探针确认，子进程看到的变量是「存在且为 0 字节」。

于是根因收口为：**只有「命令行显式 `-p ""`」这条路径能解开无密码的私钥；任何通过环境变量传入空密码的形式都会失败。**

---

## 4. 为什么这条差异在 CI 里是致命的

翻 `tauri-cli` 源码（`crates/tauri-cli/src`）可以看到两条签名路径：

**① `tauri signer sign`（手动签名）** —— 支持 `-p` 标志，所以命令行能用：

```rust
#[clap(short, long, env = "TAURI_SIGNING_PRIVATE_KEY_PASSWORD")]
password: Option<String>,
```

**② `tauri build`（构建时自动给更新包签名）** —— 没有 `-p` 可用，只能读环境变量，CI 环境下还会兜底成空串：

```rust
// crates/tauri-cli/src/bundle.rs
let password = std::env::var("TAURI_SIGNING_PRIVATE_KEY_PASSWORD")
    .ok()
    .or_else(|| if ci { Some("".into()) } else { None });
```

两条路径最终都进 minisign 的 `SecretKeyBox::into_secret_key(password)`：

```rust
// minisign/src/secret_key.rs
let interactive = password.is_none();
let password = match password {
    Some(password) => password,          // 直接拿来当密码
    None => get_password("Password: ")?, // 交互式提示（CI 里会卡死）
};
let sk = sk.encrypt(password)?;          // 用密码派生 scrypt keystream 做 XOR
if chk != sk.keynum_sk.chk {
    Err(PError::new(ErrorKind::Verify, "Wrong password for that key"))
}
```

也就是说：

- **`tauri build` 在 CI 里必然传一个 `Some("")`** → 空密码签不过 → 无密码私钥在 CI 中完全不可用
- **不给密码** → 走交互式提示读**控制台**（不是 stdin），CI 里直接挂住；实测 `</dev/null` 也救不了，日志上只会看到 `Signing without password.` 然后超时

顺带记录一个还没钉死的细节：从源码看，`clap` 从环境变量拿到的同样应该是 `Some("")`，与 `-p ""` 应该完全等价，但实测行为不同。所以这大概率是 CLI/clap/minisign 之间某个**传参层面的缺陷**——这也是我们暂时不去提 PR、而是先提 issue 的原因：机制没定位到，补丁就不可信。

**上游是否已修？没有。** 我拉了最新的稳定版 `tauri-cli 2.12.4`（minisign 升到了 0.9），`bundle.rs` 里这三行**一字未改**，同一个用例照样失败。

---

## 5. 什么情况下会遇到（触发条件）

只要同时满足下面任意一条，就会踩到：

1. **用 `tauri signer generate` 生成 key 时直接回车**（空密码），然后让 CI 签名自动更新产物 ← 最常见的坑
2. key 有密码，但 GitHub 里**忘了建** `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 这个 secret（workflow 里 `${{ secrets.XXX }}` 引用一个不存在的 secret 会得到**空字符串**，不是报错）
3. 在非交互环境（CI / 定时任务）里跑 `tauri signer sign` 且完全不给密码 → 卡在控制台读密码

反过来，**非空密码 + 环境变量**这条路是完好的——所以最稳的姿势就是「私钥必须带密码」。

---

## 6. 解决方案

### 方案 A（推荐）：换一把带非空密码的 key

对还没发过「带 updater 的版本」的项目，轮换成本几乎为零（老版本的安装包里没有 updater，也就没有 pubkey 兼容问题）。

```powershell
# 1) 备份旧 key（万一要回滚）
Copy-Item "$env:USERPROFILE\.tauri\symbix.key" "$env:USERPROFILE\.tauri\symbix.key.old"

# 2) 生成新 key（密码只用 ASCII 字母数字 + - _ .，避免各种转义问题）
npx tauri signer generate -w "$env:USERPROFILE\.tauri\symbix.key" -p '你的密码' -f

# 3) 把私钥整份复制进剪贴板，粘到 GitHub secret TAURI_SIGNING_PRIVATE_KEY
Get-Content -Raw "$env:USERPROFILE\.tauri\symbix.key" | Set-Clipboard
```

然后：

- GitHub → Settings → Secrets and variables → Actions
  - 更新 `TAURI_SIGNING_PRIVATE_KEY`（私钥全文，348 字节那种单行）
  - **新建** `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- 把 `~/.tauri/symbix.key.pub` 的内容（**单行 base64，152 字符**）原样替换 `tauri.conf.json` 里的 `plugins.updater.pubkey`

⚠️ **密码务必存进密码管理器**：密码丢了就再也签不出更新包，只能换 key——而换 key 之后，已经安装过旧版本的客户端将永远收不到自动更新。

### 方案 B：绕开 bundler 签名

如果不想动 key，也可以让 `tauri build` 不签名，构建完自己签：

```bash
# -p "" 这条命令行路径是能工作的
npx tauri signer sign -p "" path/to/bundle.nsis.zip
# 再把各平台 .sig 合并成 latest.json 上传 Release
```

缺点是要自己维护一段签名 + 清单生成逻辑，等上游修好后还得改回来。适合「今晚必须发版」的场景。

---

## 7. 顺手加的两道 CI 防护

被这个 bug 折腾之后，我们在 `release.yml` 里把「密钥预检」做扎实了（放在编译**之前**，2 分钟内失败，不浪费整轮构建）：

1. **必填校验**：私钥非空、base64 合法、解码头部必须是 `secret key`（防贴成公钥）、**密码 secret 必须非空**
2. **可观测**：日志里打印私钥长度与 **sha256 指纹**（绝不回显私钥本体，只打指纹就够了）
3. **实签探针**：直接签一个临时文件，失败时保留 minisign 原始报错，并给出 3 条排查方向
4. **keyid 配对校验**：确认「私钥」和「配置里的 pubkey」真的是一对

第 4 条的实现原理值得记一下，minisign 的数据结构很干净：

- **签名** 的二进制格式是 `2 字节算法 + 8 字节 keyid + 64 字节签名`，共 **74 字节**
- **公钥** 文件的注释行里直接写着 16 位十六进制 keyid：`untrusted comment: minisign public key: 6105796BD3FB796C`

```js
// 从 tauri.conf.json 的 pubkey 里解出 keyid
const confText = Buffer.from(conf.pubkey, 'base64').toString('utf8');
const confHex = confText.match(/minisign public key: ([0-9A-F]{16})/i)[1];

// 从实签产生的 .sig 里解出 keyid（keynum 是小端序）
const sigText = Buffer.from(fs.readFileSync('.sig', 'utf8').trim(), 'base64').toString('utf8');
const raw = Buffer.from(sigText.split(/\r?\n/)[1], 'base64');
const sigHex = Buffer.from(raw.subarray(2, 10)).reverse().toString('hex').toUpperCase();

if (confHex !== sigHex) throw new Error('私钥与 pubkey 不配对，客户端会拒绝所有更新包');
```

这正好覆盖了当初最耗时的那一类问题：**key 贴错 / pubkey 忘了改**。CI 里 Tauri 自己只会打一句 `log::warn!` 就继续跑完，结果发出去的更新包客户端全拒——现在提前 30 分钟就报错。

---

## 8. 经验教训

1. **「Wrong password」不一定是密码错。** 加密库把「密钥截断 / 贴错 / 密码不对」全都归成同一句话。看到这种密文类报错，第一件事是**取证**（长度、sha256、解码头部），第二件事是**控制变量**，而不是继续改密码。
2. **同一个参数，走命令行和走环境变量可能是两条完全不同的路径。** 我们这次就是卡在 `-p ""` 与 `XXX=` 的差异上。测试时要**两条路都测**，只测一条就会得出错误结论。
3. **CI 自诊断优于本地猜。** 与其在本地模拟，不如把长度、指纹、密码状态、实签结果直接打进日志——`Re-run failed jobs` 一次比本地折腾一小时有效。
4. **优先用「能跑通的最小验证」代替格式假设。** `tauri signer` 没有 `verify` 子命令，那就直接签一个字节长度的文件看结果，别去推断格式。
5. **别在聊天里贴私钥。** 排查过程中私钥曾出现在对话里，最后正好借这次轮换一起作废掉了——密钥一旦外泄过一次，就该当它已经泄露。
6. **无密码的签名 key 是「本地舒服、CI 致命」的陷阱。** 既然 CI 只能走环境变量，就干脆统一用带密码的 key。

---

## 附 A：最小复现（可直接贴 issue）

```bash
# 1) 生成一把无密码的 updater key（直接回车）
npx tauri signer generate -w ~/.tauri/repro.key

# 2) 命令行显式给空密码 → 成功
npx tauri signer sign -f ~/.tauri/repro.key -p "" probe.txt

# 3) 同一个 key，空密码走环境变量 → 失败
TAURI_SIGNING_PRIVATE_KEY_PASSWORD= npm run --silent tauri -- signer sign -f ~/.tauri/repro.key probe.txt
#   => incorrect updater private key password: Wrong password for that key

# 4) 完全不给密码 → 打印 "Signing without password." 后卡在控制台读密码
npm run --silent tauri -- signer sign -f ~/.tauri/repro.key probe.txt
```

**预期**：2、3 行为一致（都成功）。**实际**：只有 2 成功。

影响面：任何使用无密码 updater 私钥的项目，都无法在 CI 中为更新包签名（`tauri build` 只能通过 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 传密码）。

---

