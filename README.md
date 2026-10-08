# Frankxyh 的博客

个人技术博客：**https://yoruniubi.github.io/**

用 Nuxt 4 + Nuxt Content 写内容，Tailwind CSS v4 管样式，构建时 `nuxt generate` 出纯静态
文件丢到 GitHub Pages —— 没有服务器、没有数据库、没有后台，文章就是仓库里的 Markdown。

设计上只追求一件事：**写文章的时候只写正文**。标题、摘要、日期、网址全部自动得出，
迁移老文章不用改格式。

## 技术栈

| 用途 | 用的什么 |
| --- | --- |
| 框架 | Nuxt 4 |
| 内容 | Nuxt Content v3（Markdown 存在 git 里） |
| 样式 | Tailwind CSS v4，颜色走 CSS 变量 |
| 图标 | Lucide |
| 字体 | Fraunces / Newsreader / IBM Plex Mono / Noto Serif SC |
| 部署 | GitHub Pages + GitHub Actions（静态生成） |

## 目录结构

```
app/
  pages/index.vue        首页：座右铭 + 「现在」 + 文章卡片列表
  pages/[...slug].vue    文章页 / 关于页
  composables/           主题切换（亮/暗）
  components/            页头、页脚、卡片、阅读进度条
  theme.ts               全部颜色（浅色 + 深色两套，语义化命名）
  assets/css/main.css    字号表 + 所有自定义样式
content/
  blogs/                 文章，可以再分子文件夹
  about.md               关于页
auto-frontmatter.ts      自动补 frontmatter、降级正文标题、缩短网址、图片相对地址改绝对
scripts/sync-images.mjs  把 content/ 里跟文章放在一起的图片同步进静态产物（generate 后自动跑）
design.md                界面设计说明（为什么长这样、颜色和字号的清单）
```

## 本地运行

```bash
npm install        # 装依赖
npm run dev        # 本地开发，http://localhost:3000
npm run generate   # 生成纯静态站点到 .output/public（部署用）
npm run build      # 构建成需要 Node 运行的服务端产物（本地预览用）
npm run typecheck  # 类型检查
```

本地预览静态产物：

```bash
npm run generate
npx serve .output/public
```

## 写一篇文章：只写正文

在 `content/blogs/` 下新建一个 `.md` 文件，**正文怎么写就怎么写**，frontmatter 会自动补：

```md
# 读研心得

关于读研的一些感想。

## 第一节

正文从这里开始。
```

上面这个文件**一行 frontmatter 都不用写**，会这样被理解：

| 字段 | 从哪来 |
| --- | --- |
| `title` | 正文第一个 `# 标题` → 「读研心得」 |
| `description` | `# 标题` 后面的第一段 → 「关于读研的一些感想。」；标题后面如果没有段落（比如直接跟了个 `## 小节`），就用正文里出现的第一段 |
| `date` | 这个文件在 git 里最后一次被改动的日期 |
| 网址 | 文件名：`content/blogs/读研心得.md` → `/blogs/读研心得` |

几条规则：

- **正文第一个 `#` 会被当成文章标题**，渲染在页面顶部，不会再在正文里重复出现。所以不要在正文里再抄一遍标题。
- **紧跟标题的那一段会被当成摘要**，显示在首页卡片上（最多两行）和文章标题下面，也不会再在正文里重复出现。
- **上面这两样只有在「确实被用掉了」的时候才会从正文里删掉。** 标题比对得上才删标题那一行，段落内容跟摘要一模一样才删那一段。如果写了 frontmatter `title:` 盖掉它，正文里那一行 `#` 就不算标题了，会当普通小节留着（自动降成二级标题）。
- **日期来自 git 提交记录**，不是文件里写的。

  为什么不用文件的「修改时间」：CI 检出代码时，所有文件的修改时间都会变成检出那一刻，
  全站日期会一起变成今天。所以线上以「最后一次提交」为准；只在 git 里根本查不到这个文件（刚写好还没提交）时，才用文件保存时间兜底。

  这意味着：改了一篇老文章但还没 push 时，本地预览看到的是上次提交的日期，push 完就更新了。

想单独控制某一项，就在文件开头写 frontmatter，**写了就以写的为准**：

frontmatter就是形如下面这种格式👇
```md
---
title: 读研心得                    # 覆盖正文里的 # 标题
date: 2026-09-30                   # 覆盖 git 日期
description: 关于读研的一些感想     # 覆盖自动摘要
---

## 从这里开始写正文
```

### 标题取错了、或者想给文章改名

老文章常常第一行就是 `# 前言` 这种小节名，文章本身叫别的名字，结果标题就显示成「前言」。
这种情况在文件开头写一行 `title:` 盖掉就行，**正文一个字都不用改**：

```md
---
title: 关于自建new-api
---
# 前言          ← 这一行现在是小节了，会降成二级标题留在正文里

在L站逛多了之后发现……
```

注意这个开关是双向的：

- **没写 `title:`** → 正文第一个 `#` 就是标题，会被从正文里删掉，只在页面顶部显示一次。
- **写了 `title:`** → 正文里那个 `#` 不算标题了，作为普通小节保留在正文里（降成二级标题）。

所以「一句话写进 frontmatter」和「一行 `#` 出现在正文里」只能二选一。

这套自动补全的逻辑在 `auto-frontmatter.ts`，想改规则（比如换一种日期来源）改那个文件就行。

### 正文标题会自动降一级

**正文里的标题会整体降一级**：`#`→`##`、`##`→`###`、`###`→`####`。

因为文章大标题已经占了 `h1`。很多老博文是拿 `#` 一节一节写下来的，不降的话正文里会冒出一堆
跟大标题一样大的标题，层级也跟大标题平级。

为什么是「整体」降一级，而不是只把 `#` 改成 `##`：老文里 `#` 是节、`##` 是子节，只降 h1
的话节和子节会挤在同一级，层级关系就丢了；整体降完还是「节 > 子节」。

所以**迁移老文章时 `#` 照着原样写就行**，不用手动改成 `##`。`content/about.md` 不在这条规则里。

### 用文件夹归档

`content/blogs/` 下面可以随便建文件夹，会递归读取；网址会尽量短：

| 文件 | 生成的网址 |
| --- | --- |
| `content/blogs/读研心得.md` | `/blogs/读研心得` |
| `content/blogs/服务器/自建 new-api.md` | `/blogs/服务器/自建 new-api` |
| `content/blogs/服务器/服务器.md` | `/blogs/服务器`（文件夹名和文件名一样，自动去重） |
| `content/blogs/服务器/index.md` | `/blogs/服务器`（`index` 不会出现在网址里） |

最后两种写法效果一样，因为配图都在同一个文件夹里、用哪个名字都能用。

> 不要在同一个文件夹里同时放 `服务器.md` 和 `index.md` —— 会算出同一个网址，
> 一篇会把另一篇盖掉。

中文文件名会原样出现在网址里，不用管什么 slug。

### 图片：什么都不用做

图片直接放在文章旁边就行，跟 `.md` 同一个文件夹：

```
content/blogs/某篇/某篇.md
content/blogs/某篇/image-8.png
```

正文里写相对地址：

```md
![](image-8.png)
```

构建时有两步会自动处理，你不需要记任何命令：

1. `auto-frontmatter.ts` 在解析正文时把相对地址改写成绝对地址：
   `![](image-8.png)` → `![](/images/blogs/某篇/image-8.png)`
2. `scripts/sync-images.mjs` 把 `content/` 里的图片同构复制到产物里
   （`npm run generate` 的 `postgenerate` 会自动跑；dev 下由 `nuxt.config.ts` 的
   `nitro.publicAssets` 直接提供）

两类图片地址因此完全一致，都是 `/images/blogs/某篇/image-8.png`：

- 跟在文章旁边的（自动同步）
- 早就放在 `public/images/` 里的（Vite 拷 `public/`，一直都能用）

想看看会同步哪些、不动文件：

```bash
npm run sync-images -- --dry
```

> 也完全可以继续手动把图放 `public/images/`、正文里写 `/images/xxx.png` 绝对路径。
> 两种写法共存，不会打架。

> 顺带一提：网址是 `/blogs/服务器/自建 new-api` 时，相对路径的 `image-8.png` 会解析成
> `/blogs/服务器/image-8.png`；但如果用了 `index.md`（网址是 `/blogs/服务器`，没有结尾斜杠），
> 同一个相对路径会解析成 `/blogs/image-8.png`，更糟。构建时会把相对地址统一改成 `/images/...`，
> 所以这个坑不会真的碰到，但自己在别处（比如代码块里）写链接时还是用绝对路径。

### 在手机上临时写点什么

本站**没有任何在线编辑器，也没有登录**——写东西只有一条路：把文件提交进仓库。
个人博客不值得为了这个背上一套账号体系和 token。

不需要装任何东西：手机浏览器打开

```
https://github.com/yoruniubi/yoruniubi.github.io/new/main/content/blogs/
```

就是 GitHub 的「新建文件」页面，文件名写 `随手记.md`，正文照上面的规则写，Commit 完等
一两分钟 Actions 跑完就上线了。把这个地址「添加到主屏幕」，以后点一下就能写。

电脑上想写得更舒服一点：在仓库页面按一下 `.`（句点）会打开网页版 VS Code，能边写边预览；
本地改就照「本地运行」那节 `npm run dev`，写完 push。

写完直接 push，GitHub Actions 会自动重新构建并发布。

> **新增文章后必须重新构建。** GitHub Pages 是纯静态托管，内容查询全部发生在构建时，
> 不是「传个 md 上去就生效」。

## 想改点什么

| 想改什么 | 改哪 |
| --- | --- |
| 站名、首页那句 motto、「现在」这一栏、GitHub 链接 | `app/app.config.ts` |
| 颜色（浅色 / 深色两套） | `app/theme.ts` |
| 为什么长这样（设计说明、令牌清单、签名元素） | `design.md` |
| 字号、行高、间距、所有自定义样式 | `app/assets/css/main.css` |
| frontmatter 自动补全、图片相对地址改写 | `auto-frontmatter.ts` |
| 图片同步脚本（generate 后自动跑） | `scripts/sync-images.mjs` |
| 图标 | 替换 `public/icon.ico`，然后 `cp public/icon.ico public/favicon.ico` |
| 顶部导航 | `app/components/AppHeader.vue` |
| 关于页 | `content/about.md` |

字号那张表在 `main.css` 的 `@theme static` 里，全站文字都从那里取值：

```css
--text-label: 0.875rem;   /* 14px  日期、眉标、栏目名 */
--text-eyebrow: 1.125rem; /* 18px  眉标 +「现在」 */
--text-body: 1.0625rem;   /* 17px  正文 */
--text-title: 1.375rem;   /* 22px  卡片标题 */
--text-heading: 1.875rem; /* 30px  区块标题 */
```

## 部署到 GitHub Pages

已经配好了，推上去就行：

```bash
git add -A
git commit -m "更新"
git push
```

去仓库的 **Settings → Pages**，把 **Source** 改成 **GitHub Actions**（只需要设置一次）。

workflow 在 `.github/workflows/deploy.yml`，push 到 `main` 或 `master` 都会触发。

这个仓库叫 `yoruniubi.github.io`，属于**用户站**，地址就是：

```
https://yoruniubi.github.io/
```

> 换成别的仓库名（比如 `my-blog`）也不改任何配置 —— workflow 会把子路径传给
> `NUXT_APP_BASE_URL`，`nuxt.config.ts` 读它来决定资源路径。

### 为什么必须是 `generate` 而不是 `build`

GitHub Pages 只能放静态文件，没有 Node 进程。`nuxt build` 产出的是需要跑 Node 的服务端产物；
`nuxt generate` 会在构建阶段把每个页面都渲染成 HTML。

## 许可

Apache License 2.0，见 [LICENSE](LICENSE)。
