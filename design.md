# 博客界面设计规范（design.md）

个人技术博客的 UI 设计说明，风格为 **粗线条 + 硬阴影 + 平涂色块**（neo-brutalism）。
适用技术栈：Nuxt 4 + Nuxt Content + Tailwind CSS v4。

> 配色暂为占位方案，后续会调整。所有颜色都通过语义化变量引用，改色只需要改 `app/theme.ts`，组件代码不用动。

---

## 1. 设计理念

- **活泼，有个性**：不做成"通用模板"的克制风格，用形状和排版制造性格，而不是靠渐变或装饰。
- **像贴纸和卡牌**：元素带黑色粗边框和不带模糊的硬阴影，标签和小块内容可以略微倾斜。
- **颜色是点缀，结构是主角**：黑（或浅）边框负责结构，彩色只出现在色块里，且色块上的文字固定用黑色。
- **内容优先**：装饰只用在首页和列表，文章正文区域保持安静、行宽窄、行高大。
- **只保留一处常驻动效**：其余动效都是对用户操作的反馈（悬停、按下）。

---

## 2. 设计令牌（Design Tokens）

### 2.1 颜色

语义令牌固定，色值可替换。

| 令牌 | 用途 | 浅色（占位） | 深色（占位） |
|---|---|---|---|
| `background` | 页面背景 | `#fffdf7` | `#1b2236` |
| `foreground` | 文字、边框、硬阴影 | `#000000` | `#f6f1e6` |
| `muted-foreground` | 次要文字 | `#575757` | `#aab3c8` |
| `paper` | 卡片底色 | `#ffffff` | `#263049` |
| `subtle` | 代码块等浅底 | `#f3efe4` | `#2b3654` |
| `c1` | 色块 1（黄） | `#ffd23f` | 同左 |
| `c2` | 色块 2（粉） | `#ff7eb6` | 同左 |
| `c3` | 色块 3（蓝） | `#5cb8ff` | 同左 |
| `c4` | 色块 4（绿） | `#7be495` | 同左 |
| `on` | 色块上的文字 | `#000000` | `#000000` |

规则：

- 彩色 `c1`～`c4` 在深浅模式下**保持相同**，色块上的文字一律用 `on`（黑色）。
- 避免使用纯黑 `#000` 作为深色模式的页面背景，饱和的色块在纯黑上会显得刺眼。
- 一个视图里同时出现的彩色不超过 4 种；觉得吵就减少到 2～3 种。

### 2.2 字体

| 角色 | 字体栈 | 说明 |
|---|---|---|
| 正文、标题 | `Inter`, `Noto Sans SC`, `PingFang SC`, `Microsoft YaHei`, system-ui | 标题用 800～900 字重 |
| 等宽 | `Fira Code`, ui-monospace, Consolas | 日期、标签、行内代码、代码块 |

- 国内网络下不要依赖 Google Fonts，使用 `@fontsource/inter`、`@fontsource/fira-code` 本地打包。
- 大标题使用负字距（约 `-0.04em` ～ `-0.06em`）。

字号层级：

| 元素 | 大小 |
|---|---|
| 首页大标题 | `clamp(60px, 17vw, 148px)`，字重 900，行高 0.98 |
| 文章页标题 | `clamp(28px, 6vw, 42px)`，字重 900 |
| 区块标题 | 32px，字重 900 |
| 卡片标题 | 20px，字重 800 |
| 正文 | 17px，行高 1.9～1.95 |
| 次要文字 | 15px |
| 标签、日期 | 12～13px，等宽 |

### 2.3 边框、阴影、圆角

| 令牌 | 值 |
|---|---|
| `--bw`（边框粗细） | `2.5px` |
| `--shadow-hard` | `5px 5px 0 var(--foreground)` |
| `--shadow-hard-sm` | `3px 3px 0 var(--foreground)` |
| 大卡片圆角 | `12px` |
| 代码块圆角 | `10px` |
| 小标签、按钮 | `999px`（全圆角） |
| 技术栈小牌 | `8px` |

想让页面整体更安静：把 `--bw` 降到 `1.5px`，阴影偏移降到 `3px`。

### 2.4 布局

- 内容最大宽度 `820px`，左右内边距 `22px`，水平居中。
- 文章正文最大宽度约 `38em`（约 35 个汉字一行）。
- 区块之间留白：首页 hero 上下 `56px`，区块间 `64px` 以上。
- 全部左对齐，不使用居中排版（除按钮内文字）。

### 2.5 背景

页面背景带极淡的点阵：

```css
background-image: radial-gradient(
  color-mix(in srgb, var(--foreground) 16%, transparent) 1px,
  transparent 1.2px
);
background-size: 22px 22px;
```

---

## 3. 组件规范

### 3.1 顶部导航

- 左：Logo，黄色底、黑边框、硬阴影，旋转 `-2deg`。
- 右：导航项（首页 / 文章 / 关于）+ 主题切换按钮。
- 导航项默认无边框，悬停出现边框；**当前页**为粉色实心胶囊 + 黑边框。
- 主题切换：圆形按钮，绿色底，按下时向右下位移并去掉阴影。
- 移动端允许换行，不做汉堡菜单（导航项只有三个）。

### 3.2 首页 Hero

自上而下：

1. 超大标题："想变得**全能**。" 其中"全能"用粉色填充 + 黑色描边 + 硬文字阴影。
2. 贴纸：黄色底 + 黑边框 + 硬阴影，内容为 motto，旋转 `-3deg`。
3. 一句话自我介绍，18px，最大宽度 30em。
4. 技术栈小牌：一排彩色小块，各带不同的小角度旋转（-4° ～ 4°），像一把手牌。

### 3.3 文章卡片（列表项）

- 结构：左侧**日期块**（固定 96px 宽）+ 右侧内容。
- 日期块：彩色底，内容为大号"日"和小号"年.月"，等宽字体。
- 四张卡片的日期块依次使用 c1～c4 循环。
- 右侧：标题（20px / 800）、摘要（次要色）、标签。
- 卡片本身：`paper` 底色、粗边框、硬阴影。
- **悬停**：卡片向右下移动 `5px`，阴影消失，模拟被按下。
- 移动端：日期块改为卡片顶部的一条横向色带。

### 3.4 标签（Tag）

- 等宽字体 12px，全圆角，`2px` 黑边框，彩色底，黑色文字。
- 同一篇文章中的标签依次使用 c4、c3、c2。

### 3.5 便签（"正在做"区块）

- 蓝色底 + 粗边框 + 硬阴影，整体旋转 `-0.6deg`。
- 用于首页底部的简短状态说明，不超过两行。

### 3.6 文章页

- **标题块**：粉色底 + 粗边框 + 硬阴影，内含标题和元信息（日期、标签）。
- 顶部有"← 返回"按钮：黄色底、全圆角、硬阴影。
- **正文**（`prose`）：

| 元素 | 样式 |
|---|---|
| `h2` | 绿色底 + 黑边框 + 硬阴影，旋转 `-1deg`，`inline-block` |
| 行内 `code` | 黄色底 + 2px 黑边框 + 小圆角，等宽 |
| 代码块 `pre` | `subtle` 底 + 粗边框 + 硬阴影，横向可滚动 |
| 引用 `blockquote` | 粗边框，左侧 14px 粉色粗边，20px / 800 |
| 链接 | 下划线 + 悬停变色（使用 c3 或 foreground） |

正文区域保持克制：一屏内不要出现超过两个装饰性色块。

### 3.7 按钮

- 主要按钮：彩色底 + 粗边框 + `--shadow-hard-sm`，全圆角。
- **按下（`:active`）**：位移 `3px 3px` 并移除阴影。

### 3.8 页脚

- 顶部一条粗横线，左侧版权，右侧一句 motto。

---

## 4. 交互与动效

| 场景 | 行为 |
|---|---|
| 卡片悬停 | `transform: translate(5px, 5px)` + 阴影去除，`120ms` |
| 按钮按下 | 同上，位移 `3px` |
| 页面常驻动效 | 无（或仅保留一个，如标题末尾的闪烁光标） |
| `prefers-reduced-motion` | 关闭所有过渡和动画 |

不做：滚动渐入、每个卡片的弹跳入场、视差、渐变流动。

---

## 5. 响应式

- 断点主要用 `520px`：小于该宽度时，文章卡片改为上下结构，日期块变成顶部色带。
- 大标题用 `clamp()` 自适应，不写固定断点。
- 代码块、表格横向滚动，页面本身不出现横向滚动条。
- 移动端注意安全区：使用 `env(safe-area-inset-*)`。

---

## 6. 无障碍

- 键盘焦点必须可见：`outline: 3px solid`（用 c3 或 foreground），偏移 `3px`。
- 色块上的文字必须是黑色，确保对比度。
- 主题切换按钮加 `aria-label`。
- 装饰性元素（如闪烁光标）加 `aria-hidden="true"`。
- 文章卡片使用真正的 `<a>` / `<NuxtLink>`，不要只给 `div` 绑定点击。

---

## 7. 在 Nuxt + Tailwind v4 中的落地

### 7.1 文件结构

```
app/
├─ theme.ts                 # 颜色令牌（唯一需要改色的地方）
├─ app.vue                  # 注入主题 CSS 变量
├─ assets/css/main.css      # Tailwind 配置与自定义工具类
├─ layouts/default.vue      # 顶部导航 + 页脚
├─ components/
│  ├─ AppHeader.vue
│  ├─ PostCard.vue
│  ├─ TagChip.vue
│  └─ StackChip.vue
└─ pages/
   ├─ index.vue             # Hero + 最近文章 + 便签
   └─ posts/
      ├─ index.vue          # 文章列表
      └─ [...slug].vue      # 文章详情
content/posts/*.md
content.config.ts
```

### 7.2 `theme.ts`（结构示意）

```ts
export const theme = {
  light: {
    background: '#fffdf7', foreground: '#000000', 'muted-foreground': '#575757',
    paper: '#ffffff', subtle: '#f3efe4',
  },
  dark: {
    background: '#1b2236', foreground: '#f6f1e6', 'muted-foreground': '#aab3c8',
    paper: '#263049', subtle: '#2b3654',
  },
  // 彩色在两种模式下相同
  shared: { c1: '#ffd23f', c2: '#ff7eb6', c3: '#5cb8ff', c4: '#7be495', on: '#000000' },
} as const

const toVars = (o: Record<string, string>) =>
  Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('')

export const themeCss =
  `:root{${toVars(theme.light)}${toVars(theme.shared)}}` +
  `.dark{${toVars(theme.dark)}}`
```

### 7.3 `main.css`（关键部分）

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted-foreground: var(--muted-foreground);
  --color-paper: var(--paper);
  --color-subtle: var(--subtle);
  --color-c1: var(--c1);
  --color-c2: var(--c2);
  --color-c3: var(--c3);
  --color-c4: var(--c4);
  --color-on: var(--on);
  --shadow-hard: 5px 5px 0 var(--foreground);
  --shadow-hard-sm: 3px 3px 0 var(--foreground);
}

@theme {
  --font-sans: "Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  --font-mono: "Fira Code", ui-monospace, Consolas, monospace;
}

@utility border-bold {
  border: 2.5px solid var(--foreground);
}

@layer base {
  body {
    @apply bg-background text-foreground font-sans antialiased;
    background-image: radial-gradient(
      color-mix(in srgb, var(--foreground) 16%, transparent) 1px, transparent 1.2px);
    background-size: 22px 22px;
  }
  ::selection { background: var(--c1); color: #000; }
}
```

### 7.4 组件写法示例

文章卡片：

```vue
<NuxtLink
  :to="post.path"
  class="border-bold grid grid-cols-[96px_1fr] overflow-hidden rounded-xl bg-paper shadow-hard
         transition hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none
         max-[520px]:grid-cols-1"
>
  <div class="flex flex-col items-center justify-center border-r-[2.5px] border-foreground py-3
              font-mono text-on" :class="dateBg">
    <b class="text-3xl">{{ day }}</b>
    <span class="text-xs">{{ yearMonth }}</span>
  </div>
  <div class="px-5 py-4">
    <h3 class="text-xl font-extrabold">{{ post.title }}</h3>
    <p class="text-[15px] text-muted-foreground">{{ post.description }}</p>
  </div>
</NuxtLink>
```

`dateBg` 由列表页的下标决定：`['bg-c1', 'bg-c2', 'bg-c3', 'bg-c4'][i % 4]`。

按钮：

```vue
<button class="border-bold rounded-full bg-c1 px-4 py-0.5 font-bold text-on shadow-hard-sm
               active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
```

### 7.5 深浅色

```ts
// nuxt.config.ts
modules: ['@nuxt/content', '@nuxtjs/color-mode'],
colorMode: { classSuffix: '', preference: 'light', fallback: 'light' },
```

默认浅色，用户手动切换后才进入深色。

---

## 8. 该做与不该做

**该做**

- 所有颜色通过语义类名（`bg-c1`、`text-muted-foreground`）使用。
- 边框、阴影用统一的令牌，保持一致。
- 彩色块上的文字用黑色。
- 首页可以张扬，文章页要安静。

**不该做**

- 在组件里直接写十六进制色值。
- 同时使用软阴影（模糊阴影）和硬阴影。
- 在正文里堆叠多个旋转、彩色的装饰元素。
- 使用渐变、发光、毛玻璃等与整体风格冲突的效果。
- 用 `div` + `click` 代替链接。

---

## 9. 后续可调整的部分

- **配色**：修改 `theme.ts` 中的 `shared` 和深浅色两组值。
- **强度**：调整 `--bw`、阴影偏移、旋转角度，控制页面的"吵闹"程度。
- **字体**：替换 `--font-sans` / `--font-mono`。
- **彩色数量**：减少到 2～3 种时，把其余卡片日期块和标签改用 `foreground` 或 `paper`。