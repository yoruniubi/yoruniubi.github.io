# 界面设计说明（design.md）

这套界面**已经实现**，这文档是解释，不是待办清单 —— 想看现在的样子，直接跑 `npm run dev`。

方向叫「**修订稿**」：深蓝稿纸 · 墨白衬线 · 一支荧光笔。
全站只有一个暖色，其余是纸、墨、和被划掉的灰。

> **真源不在这个文件里。**
> 颜色 → `app/theme.ts`；字号 → `app/assets/css/main.css` 的 `@theme static`；
> 间距和组件样式 → 同上以及各个 `.vue`。
> 文档跟代码对不上时，**以代码为准**，并顺手把这里改对。

---

## 1. 为什么是现在这套

早先做过一版：极光背景、粒子、自定义光标、跑马灯、装饰性编号。那版被判定为
「AI 生成感的默认长相」——看起来热闹，但没有一处是**这篇博客自己**的东西，于是全删了。

现在的语汇只有两条，都是从「生活曲折」这件事里长出来的：

- **划掉 = 过去**（`.strike`）
- **荧光笔 = 留下来的**（`.mark` / `.mark-hover`）

全站唯一一处把这套语汇讲出来的地方是首页刊头：

```
想成为  ~~天才~~  →  [全能的人]
```

纪律（比风格更重要）：

- **只有一个强调色**（`marker`）。想突出什么，就用它；除此之外不许有第二个彩色。
- 装饰必须有理由。没有理由的渐变、发光、毛玻璃、编号、动效，一律不加。
- 首页可以张扬（大字号 + 划掉 + 荧光笔），**文章页必须安静**（一屏内不要出现第二个色块）。

---

## 2. 颜色：8 个令牌，其中 7 个是无彩色

| 令牌 | 用途 | 浅色 | 深色（默认） |
| --- | --- | --- | --- |
| `background` | 画布底 | `#f5f6f9` | **`#1b2236`** |
| `foreground` | 正文墨色 | `#161c2c` | `#e9ecf4` |
| `muted` | 次要文字（摘要、说明） | `#4f5a70` | `#949fb9` |
| `erased` | 被划掉的、更弱的（日期、图标、标签） | `#98a1b3` | `#6a7691` |
| `paper` | 卡片 / 内嵌块 / 代码底 | `#ffffff` | `#212a42` |
| `rule` | 稿纸线：所有 1px 分隔线、边框 | `#dce0e9` | `#2c3956` |
| `marker` | **荧光笔（全站唯一的暖色）** | `#ffe066` | `#f2cb5b` |
| `on-marker` | 落在荧光笔上的字色 | `#231d06` | `#231d06` |

规则：

- 深色模式的底色 `#1b2236` 是**钉死的**，不要换成纯黑 —— 荧光笔在纯黑上会刺眼。
- 组件里**不许写十六进制色值**，一律用语义类名：`bg-background` `text-muted`
  `border-rule` `bg-marker` `text-on-marker`。
- `marker` 只出现在四处：座右铭的荧光笔、`::selection`、卡片悬停的标题、`:focus-visible` 描边。
  （外加正文引用块左侧那 2px 竖线。）**不要**把它用到行内代码上 —— 那会让全篇到处都是重点，
  等于没有重点。行内代码用 `paper` 底 + `rule` 描边，跟代码块同一套语汇。

---

## 3. 字

| 角色 | 字体 | 用在哪 |
| --- | --- | --- |
| 标题（`font-display`） | Fraunces + Noto Serif SC Variable + 宋体兜底 | 站名、文章标题、座右铭、刊头 |
| 正文（`font-body`） | Newsreader + 苹方/微软雅黑 | 正文、摘要、导航、页脚 |
| 数据（`font-mono`） | IBM Plex Mono + 中文兜底 | 日期、栏目名、行内代码、代码块 |

中文衬线（Noto Serif SC Variable）约 600KB，仍然保留：它是这套「稿纸 + 衬线」观感的一半，
`font-display: swap` 兜住了首屏。国内不要依赖 Google Fonts，全部本地打包。

### 字号刻度（`main.css` 的 `@theme static`）

全站每一个字多大，都由这张表决定。**要整体调大调小，只改这张表**，
不要回到 `text-[11px]` 那种逐处写死的写法。

| 类 | 值 | 用在哪 |
| --- | --- | --- |
| `text-label` | 14px | 日期、计数、小标签（配 `.label`） |
| `text-body` | 17px | 正文、摘要、导航、页脚（也是 `body` 的默认字号） |
| `text-title` | 22px | 卡片标题、桌面端站名 |
| `text-heading` | 30px | 区块标题（首页「文章」） |
| `text-eyebrow` | 18px | 眉标、「现在」这种栏目名（配 `.label-caps`） |
| `text-revise` | `clamp(1.5rem, 3.6vw, 2.5rem)` | 刊头那句（24 → 40px） |
| `text-display` | `clamp(2.25rem, 5.2vw, 3.25rem)` | 文章大标题（36 → 52px） |
| `text-motto` | `clamp(2.25rem, 7.4vw, 4.7rem)` | 首页座右铭（36 → 75px） |

后三个用 `clamp()` 自己跟着屏宽缩放，**不再写 `sm:` 断点**。用法跟 Tailwind 自带的一样，
也支持响应式前缀（`text-body sm:text-title`）。

---

## 4. 签名元素

### 4.1 划掉 —— `.strike`

`::after` 画一条 `0.055em` 高的横线，从左侧 `scaleX(0)` 拉到 1，延迟 0.45s。
字色降到 `erased`，并强制 `white-space: nowrap`（被划掉的词不能被拆行）。

### 4.2 荧光笔 —— `.mark` / `.mark-hover`

**用 `text-decoration: underline` 实现，不是背景色块。** 这一点是踩坑踩出来的：

- 背景色块想「只盖住下半部分」，得靠 `linear-gradient` 的 em 偏移去猜；
  中文字体的 ascent 高达 1.16em，`1em` 那个想当然的偏移在中文上必然失准、压住字形。
- 下划线的位置由**字体自己的度量**决定，永远不可能压到字形。

仍然要注意中文的 overshoot：汉字底部会探到基线下方约 `0.07em`，所以

```css
text-underline-offset: 0.11em;   /* 必须 > 0.07em，留 0.04em 的缝 */
text-decoration-skip-ink: none;  /* 不然「人」「大」这类字会把笔道断开 */
```

太贴就加大（0.14em），看着像边框就减小（0.09em）。

两个用法：

| 类 | 行为 |
| --- | --- |
| `.mark` | 首次进入就落下（`text-decoration-thickness: 0.2em`，延迟 0.95s） |
| `.mark-hover` | 平时透明（0.08em），**父元素 `.group:hover`** 时才落下来（0.18em） |

### 4.3 稿纸线 —— `rule`

所有分隔线、卡片边框、代码块边框、引用块、图片边框都是 `1px solid var(--rule)`，
不要用 `foreground` 去画框（会变成 neo-brutalism 的粗黑边，跟这套观感冲突）。

---

## 5. 版面

| 项 | 值 |
| --- | --- |
| 页面最大宽度 | `max-w-270` = 1080px（页头、页脚、`main` 三处对齐） |
| 左右内边距 | 桌面 `px-6`，页头在窄屏收到 `px-3` |
| 正文列宽 | **`max-w-measure` = `--container-measure`（现在 `48rem` = 768px），`mx-auto` 居中**（文章页 / 关于页 / 搜索页共用） |
| 文章标题行宽 | `max-w-[22ch]`（`ch` 跟自己的字号走，所以 52px 的标题自然换算成更长的行） |
| 文章摘要 / 引言 | `max-w-[46ch]` |
| 正文行高 | `1.9`（`.prose`），宽度交给外层那一列（`max-width: none` 盖掉 typography 插件的 `65ch`） |
| 卡片网格 | `grid gap-4 sm:grid-cols-2`（一屏两列，不用侧边栏） |
| 页头高度 | `h-16`（+1px 下边框） |

**没有左侧栏，没有侧边导航。** 页面结构就是：页头 → 内容 → 页脚。

### 留白刻度（都是实测过的值，别随手动）

| 位置 | 现在 | 之前（太松，已收） |
| --- | --- | --- |
| 页头 → 眉标 | 64px | 152px |
| 座右铭 → 「现在」 | 56 + 20px | 96 + 24px |
| 「现在」 → 「文章」 | 64px | 112px |
| 卡片 → 页脚 | 64px | 112px |
| 正文底 → 页脚 | 141px | 245px |
| 正文 → 时间轴 | 64px | 96px |

教训：`mt-24`（96px）这种大跳跃在一个竖向滚动的长页面里会连成一片真空。
相邻区块 56～64px 就够，靠 `border-t border-rule` 去分区，而不是靠空白。

---

## 6. 组件

### 6.1 页头 `AppHeader.vue`

`sticky top-0 z-30` + `bg-background/85` + `backdrop-blur-md` + 1px 下边框。

- 左：站名（`font-display`）。**移动端 17px、桌面端 22px** —— 手机上 22px 会把导航挤变形。
- 右：`目录` / `搜索` / `关于`（`.nav-link`）+ GitHub 图标按钮 + 主题切换按钮（`.icon-btn`）。
- 两个防御性写法，别删：
  - `.nav-link { white-space: nowrap }` —— 中文可以逐字断行，「目录」会被拆成两个竖着的字，
    看起来像导航变成了竖列。这不是 flex 的问题，是换行规则的问题。
  - 站名容器 `min-w-0` + 站名 `truncate` —— 屏幕真窄时宁可站名走省略号，也不要挤掉导航。

### 6.2 首页刊头 `Masthead.vue`

自上而下：眉标 `.label-caps`（`个人博客 · 一份还在改的稿子`）→ 刊头 `.revise-line`
（划掉「天才」→ 荧光笔「全能的人」）→ 座右铭 `<h1 class="motto">` → 一条 `rule` 横线 →
「现在」在做什么（`<dl>`，左栏 `.label-caps` 固定 5rem，右栏正文）。

motto 和 now 都来自 `app/app.config.ts`，改文案不用碰组件。

### 6.3 文章卡片 `PostCard.vue`

整个卡片就是一个 `<NuxtLink>`（真链接，不是 `div` + click）。

- 结构：标题 + 右上角外链箭头 → 摘要（`line-clamp-2`）→ 日期（`.label`）。
- 密度：`p-5` 内边距（原来是 `p-6`，一屏两列时块头显得太大）、摘要 `mt-3`、日期 `mt-5`。
  跟搜索页的结果卡片同一密度 —— 两张卡本来就是同一种观感。
- 悬停（`.post-card:hover` + `.group:hover`）：标题落荧光笔（`.mark-hover`）、
  边框提亮到 `color-mix(foreground 26%)`、整体上浮 3px、出现一层很软的阴影。
  四种反馈**同时**发生，这就是「这个卡片可点」的全部信号 —— 不需要再加别的东西。

### 6.4 阅读进度 `ReadingProgress.client.vue`

`fixed inset-x-0 top-0 z-40 h-0.5`，内部 `bg-marker`，宽度 = 滚动百分比（0.15s 过渡）。
只在文章页出现。它是全站唯一的常驻动效，也是 `marker` 的合法用法之一。

### 6.5 文章页 `pages/[...slug].vue`（关于页走同一套）

返回目录（`.back-link`）→ `<h1 class="text-display">` → 摘要 → 日期（带日历图标）→
`.prose` 正文 → 时间轴（左「较早 · 日期」，右「较新 · 日期」，两边都写明确日期，
不只写「上一篇 / 下一篇」）。

**外面套一层居中的正文列**（`mx-auto w-full max-w-measure`，直接写在 `<article>` 上；
`measure` 这个工具类由 main.css 里的 `--container-measure` 生成，现在 `48rem` = 768px）。
原先它左对齐贴在 1080px 容器左边，右边空出一大块；而左下角正好是 Live2D 小人，
两头抢位置。居中之后 48rem 的两侧各留 ~130px，宽屏上小人整个落在左侧空白里
（窗口 ≳ 1310px 就完全不重叠；列越宽这个阈值越大）。
- 一开始给的是 `40rem`（640px），看着偏窄 —— 用户反馈“文本宽度不够”后提到 48rem。
  这也是把宽度收到**一个具名令牌**里的原因：想再宽/再窄只改 `--container-measure` 一个数字，
  文章页和搜索页一起变。
- 正文实际宽度由这层 `max-w` 定：`.prose` 里写了一句 `max-width: none`，
  盖掉 typography 插件自带的 `65ch`（约 552px）—— 不然正文比列窄一截、
  又在列里左对齐，右边那块空白就原封不动地回来了。
- `ReadingProgress` 拿到了 `<article>` 外面：它是 `fixed` 的、只读 `documentElement`，
  跟位置无关；这样里层就不用多包一层 div，也不用把整段模板重新缩进。
- **为什么我们的 `.prose` 盖得住插件**（这里踩过一次坑）：插件那条 `.prose` 落在
  `@layer utilities` 里，而 main.css 里的 `.prose`（第 304 行起）在**没有 `@layer` 的顶层** ——
  没进层的规则比任何层都高。所以 `max-width: none`、`font-size: var(--text-body)`（17px）、
  `line-height: 1.9`、以及那组 `--tw-prose-*` 颜色变量，全部是我们的在生效；
  插件只提供了被盖掉的默认值（`65ch` / `1rem` / `1.75` / 一套灰）。
  推论：**别把 `.prose` 整段挪进 `@layer`** —— 挪进去就只剩插件那套默认值了
  （连正文颜色都会变成插件的灰）。注意 `@layer components` 在 main.css 第 144 行就闭合了，
  `.post-card`、`.prose` 都在它后面，都是顶层的。
- 核实办法（不用起 dev、不用构建）：拿 `@tailwindcss/node` 的 `compile()` 把 main.css
  编译一遍，看每条 `.prose` 规则落在哪一层 —— 两条 `.prose`，一条在 `utilities`（插件的）、
  一条无层（我们的），就是对的。

### 6.6 页脚 `AppFooter.vue`

一条 `rule` 横线；左侧 motto（`font-display`），右侧年份 · 站名 + 回到顶部按钮。

### 6.7 Live2D 小人（全站）

`plugins/live2d.client.ts`，一个纯客户端插件。它在水合结束之后（`onNuxtReady`）
往 `<head>` 插一个 `<script>`，拉 `live2d-widgets@1.0.1` 的 `autoload.js`
（就是 stevenjoezhang/live2d-widget 那个独立项目）。脚本自己会再取
`waifu.css` / `waifu-tips.js` / `waifu-tips.json` / `live2d.min.js` 和模型。
显隐只看屏幕宽不宽（`roomForWidget()`）：`window.innerWidth` 和 `screen.width` 都得 ≥ 768。
**早先它只在首页出现、靠 `watch(route.path)` 收起**，后来改成每页都有 —— 那套路由逻辑就删了，
少两个活动部件。手机上 250px 宽的小人会把正文盖住，而且手机上一行 JS 都不下载，省 0.85MB。
原版 `autoload.js` 里本来就有 `screen.width >= 768` 那道判断（我们的动态加载版本一开始把它丢了），
补回来顺手还有两个好处：手机 250px 宽的小人会把正文盖住；手机上一行 JS 都不下载，省 0.85MB。
两个条件都看是因为它们各管一种情况 —— 手机横屏时 `innerWidth` 会变宽，但那还是块小屏幕；
桌面端把窗口拖成窄条时 `screen.width` 很大，但小人同样会盖住正文。
窗口拖窄即时藏、再拉宽自己会回来（监听 `resize`，口径跟第 5 条一致：只藏不删）。

**尺寸缩到 90%**（`main.css` 末尾那条 `#waifu { zoom: .9 }`）。它自带的 `waifu.css`
把 300×300 的身子钉在左下角，窗口窄一点就压到正文。用 `zoom` 而不是 `transform` —— 
它自己的 `transform: translateY(25px)` 是出场动画，覆盖掉动画就没了；`zoom` 只改尺寸。
缩的是 `#waifu` 根节点，提示气泡 / 工具图标 / canvas 都是它的子节点，整块一起缩、比例不乱。
（它自带的 `autoload.js` 里那句 `// if (screen.width < 768) return;` 是被官方**注释掉**的，
注释里写着“如果担心手机上显示效果不佳可以启用”—— 所以我们插件里那道判断其实是把它接回来。）

为什么是插件、不是组件 —— 三条路都走过：

1. **它不渲染任何节点**（脚本自己会把 `#waifu` 插到 `<body>` 上）。做成组件的话模板里只剩一句注释，
   而 Vue 生产构建默认不带注释（`comments: false`）：服务端什么都没渲染、客户端却多渲染一个空片段，
   水合后 DOM 里多出一个 `<!--]-->`，控制台报「Hydration completed but contains mismatches」。
   dev 环境注释是保留的，所以开发时完全看不出来。
2. **更不能用 `.client.vue` 后缀** —— 那会被 Nuxt 包一层 `createClientOnly`，而那一层会手动调 setup、
   再拿渲染结果当 vnode 读 `.children`；渲染结果是 `null` 时当场抛
   「Cannot read properties of null (reading 'children')」，整页变 500。
3. **放进页面组件会丢钩子** —— 原先这段代码在 `pages/index.vue`，结果「切到别的页面再切回来，
   小人就没了」：页面 setup 里有 `await useAsyncData`，而**在 `await` 之后注册的
   `onMounted` / `onBeforeUnmount` 在客户端换页时会被 Vue 静默丢弃**（首屏是水合，所以完全
   看不出来），那次切回来时 setup 跑了、`onMounted` 没跑，于是没人再调用 `applyVisibility()`。
   同一条坑适用于「`await` 之后注册任何生命周期钩子」。插件只在浏览器里跑一次、
   没有卸载再挂载这回事，天然绕开。

它自己还有两条脾气：

4. **只能注入一次** —— 它的 `initWidget` 没有 `destroy()`，注入两次就是两个小人。
   用模块级变量 `injected` 挡（客户端热更新会让插件重跑一遍）。
5. **只藏、不删** —— 它往 `window` 上挂了一堆 `mousemove` / `click` / `copy`
   监听且没有解绑接口，把 `#waifu-tips` 删掉之后每次鼠标划过都会抛
   “Cannot set properties of null”。藏起来则一切照常（`.waifu-active` 状态还在，
   即时恢复、不会重播出场动画）。拖窄窗口时也是藏，不是删。（原先离开首页靠这一条收起，
   现在每页都显示，这条只剩拖窄窗口那一种用途。）

首次加载约 0.85MB（`live2d.min.js` 129KB、默认模型 Pio 的贴图 603KB、其余脚本约 74KB），
因为挂在水合之后，这 0.85MB 不跟首屏抢带宽，之后走浏览器缓存。它也是**全站唯一一个在运行时
加载第三方资源**的地方（字体和图标都是本地打包的），访客的 IP 会经过 jsDelivr。

### 6.8 目录页的分类分组（`pages/index.vue`）

首页按分类分段，一段就是一组卡片。

- **分类从哪来**：`content/blogs/` 下面的第一层文件夹名，构建时由 `auto-frontmatter.ts` 写进
  `category`（`content.config.ts` 里必须声明这个字段，zod 会把没声明的键丢掉）。
  用文件夹而不是 frontmatter，是因为它**不可能拼错、不用记**，文件树上一眼能看到结构。
- **分类段不进网址**：`/blogs/开发折腾/某篇` → `/blogs/某篇`。所以改分类名、给文章换分类，
  已经发出去的链接都不会失效。
- **顺序**：`app/app.config.ts` 的 `categories` 决定谁在前；没列过的按名字排在后面；
  没归类的（直接放在 `blogs/` 下）进 `uncategorized`，**永远最后** —— 文件夹名建错时它掉到最底下
  会被看见，而不是静默消失。
- **层级**：这一页的 `h1` 是刊头那句 motto，「文章」降级成 `.label-caps` 小字（它只是这一栏的名字，
  不是章节），**分类才是 `h2`**，卡片标题是 `h3`。一页仍然只有一个 `h1`，分组加多少层都不变。
- 分组段带 `:id="分类名"`，文章页标题下那颗分类标签就是链到 `/#分类名`；`scroll-mt-20`
  是为了锚点跳过去时标题不要贴在最上沿。

### 6.9 搜索页（`pages/search.vue`）

搜索页要看起来很轻，它只是“找东西”这件事的一个入口。

- **输入框是一条线，不是一个圆角框**：跟稿纸的规矩一致（全站没有一个输入框形状的东西）。
  聚焦时**荧光笔从左往右划过去**（一个 `h-px` 的 `bg-marker` 绝对定位横条，
  `scale-x-0 → group-focus-within:scale-x-100`，盖在那条 `rule` 上）——
  只动 `scale`，不会挤动任何东西；`transition-transform` 在 v4 里本身就包含 `scale`。
  选中文字也用 30% 荧光笔（`selection:bg-marker/30`），光标是 `caret-marker`。
  那条线本身悬停时亮到 `foreground/25`（跟卡片、链接同一套反馈）。
- **输入框下面那行小字**（`.label`，14px mono）：
  左边是「现在按什么在搜」—— 多词时把词一个一个列出来（`border border-rule` 的小方块），
  后面跟一句「都要出现」（多个词时）或「子串匹配」（单同）；没输入词时显示「索引 N 篇正文」；
  右边是 `<kbd>Esc</kbd> 清空`（窄屏隐藏，手机上本来就有键盘上的 X）。
  目的不是装饰：搜索的规则（子串 + AND）写在界面上，就不用让人猜，也不用写在一段帮助文字里。
- **命中用 30% 的荧光笔块**（`<mark class="bg-marker/30 text-foreground">`）：这是荧光笔的第三个
  用法 —— 划掉是过去，落下是现在（座右铭、悬停），划出命中段是“你要找的那几个字”。
  仍只有一个强调色，没引入第二种颜色。
- **结果直接用 `.post-card`**：搜索结果是文章的入口，不是一种新组件；悬停、上浮、标题落下
  荧光笔的行为跟首页卡片完全一致。但**密度比首页卡片紧**：外层列是 `max-w-measure`（跟文章页同一把尺子）、
  卡片 `p-5`、每篇只列 `HITS_PER_POST = 2` 处命中、预览窗口 `around = 30` 字。
  一开始卡片没有宽度限制、直接撑满 1032px，"标题 + 几行预览" 就被拉成一行超长文本了。
- **层级**：`h1` 是「搜索」，每篇结果的标题是 `h2`，命中所在的小节名用 `.label` 的 `# 小节`，
  不占标题层级。
- **索引按需下载**：`server/api/search.json.get.ts` 在构建时导出，页面用 `server: false`
  的 `useAsyncData` 只在浏览器里取。预渲染的 HTML 里没有索引，也没白白让每个访客都下载它。
- **`?q=` 写进网址**：刷新、分享、后退都能复原；因此这个页面带 `robots: noindex`，
  不然搜索引擎会把无穷多个 `?q=` 当独立页面收。
- **不用 `v-html` 做高亮**：把文字切成 `[普通 | 命中]` 小段后用 `v-for` 渲染，
  正文里的尖括号就没有机会变成标签。

---

## 7. 动效

| 场景 | 行为 | 时长 |
| --- | --- | --- |
| 划掉 | `scaleX` 0 → 1，延迟 0.45s | 0.5s |
| 荧光笔落下 | `text-decoration-thickness` 0 → 0.2em + 颜色渐入，延迟 0.95s | 0.5s |
| 卡片悬停 | 上浮 3px、边框提亮、荧光笔落下 | 0.3s |
| 页面切换 | 淡入淡出 + 上下 8px 位移（`out-in`） | 0.26s |
| 阅读进度条 | 宽度跟随滚动 | 0.15s |

`prefers-reduced-motion: reduce` 下全部关闭（划掉直接显示、荧光笔直接落下、卡片不再位移、
页面切换不再过渡）。

**不做**：滚动渐入、视差、跑马灯、渐变流动、装饰性编号（`01 / 02 / 03`）、
每个元素各自的弹跳入场。

---

## 8. 深浅色

- **默认深色**（`#1b2236`），模式存 cookie（`theme`），不是 `@nuxtjs/color-mode`。
- `app/composables/useTheme.ts` 提供 `useThemeState()`（读写 + 切换）和
  `useTheme()`（在 `app.vue` 调一次，把 `.dark` 挂到 `<html>` 上）。
- 模式存 cookie 而不是 localStorage，是为了 **SSR 直出的 HTML 上就带着正确的 class**，
  首屏不会先亮再暗地闪一下。
- 令牌注入在 `app/app.vue`：`useHead({ style: [{ innerHTML: themeCss }] })`，
  输出 `:root{…浅色…}.dark{…深色…}`；`main.css` 用 `@theme inline` 把它们映射成
  Tailwind 的颜色工具类（`bg-background` 等）。

---

## 9. 无障碍

- 键盘焦点必须可见：`:focus-visible { outline: 2px solid var(--marker); outline-offset: 3px }`。
- 只有图标的按钮一律带 `aria-label`（GitHub、主题切换、回到顶部）；纯装饰元素带 `aria-hidden`。
- 荧光笔上的字固定用 `on-marker`（近黑），别用 `foreground`（深浅模式下会变成浅色，看不清）。
- 卡片、导航、时间轴都用真的 `<NuxtLink>` / `<a>`，不要给 `div` 绑 `click`。
- 一页只有一个 `<h1>`；正文里的小节标题由 `auto-frontmatter.ts` 在构建时整体降一级。

---

## 10. 想改点什么，去哪改

| 想改什么 | 改哪 |
| --- | --- |
| 颜色（两套） | `app/theme.ts` |
| 字号刻度 | `app/assets/css/main.css` 的 `@theme static` |
| 划掉 / 荧光笔 / 卡片 / 导航 / 正文排版 | 同上（`.strike` `.mark` `.post-card` `.nav-link` `.prose`） |
| 留白（`mt-*`、`pb-*`） | 各个 `.vue` 里，注释写了「原来是 xxx」的那些 |
| 站名、motto、「现在」、GitHub 链接 | `app/app.config.ts` |
| 分类的顺序、未分类叫什么 | `app/app.config.ts`（分类本身 = 文件夹名） |
| 搜索的输入框、结果、高亮 | `app/pages/search.vue` |
| 页头结构 | `app/components/AppHeader.vue` |
| 卡片长什么样 | `app/components/PostCard.vue` |

新增样式时：能写成工具类的就写工具类；成套的、要复用 3 次以上的写成
`@layer components` 里的类（`.label` `.label-wide` `.label-caps` `.icon-btn`）。
放在 components 层是有意的 —— 这一层比工具类低，所以 `class="label text-foreground"`
里 `text-foreground` 能盖住它。
