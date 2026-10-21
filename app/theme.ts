/**
 * 全站设计令牌 —— 想改颜色只改这个文件
 *
 * 方向「夜航玻璃」：深墨夜景 · 单向光源 · 玻璃只借光、不带色。
 * 玻璃拟态的本质是光学，不是配色 —— 真实的玻璃没有颜色，
 * 它只是借用、弯曲、柔化背后的光。所以：
 *   · 面板用白色低透明度（5%~12%），颜色全部来自背景的光斑
 *   · 全站只有一个强调色（marker，香槟金），只出现在动作和高亮文字
 *   · 「划掉 = 过去」「高亮 = 留下来的」——这套语汇就是设计本身
 */

export interface ThemeTokens {
  /** 画布底 */
  background: string
  /** 正文墨色 */
  foreground: string
  /** 次要文字 */
  muted: string
  /** 被划掉的、过去的、更弱的文字 */
  erased: string
  /** 卡片 / 内嵌块 */
  paper: string
  /** 稿纸线：所有 1px 分隔线 */
  rule: string
  /** 唯一强调色（香槟金）：动作与高亮文字 */
  marker: string
  /** 落在荧光笔上的字色 */
  'on-marker': string

  /* ── 玻璃（无色，只借光）────────────────────────── */
  /** 玻璃面板填充：只用白色低透明度，绝不带色 */
  glass: string
  /** 玻璃边框 */
  'glass-border': string
  /** 玻璃顶边受光 / 底边背光 —— 这是真玻璃与「半透明色块」的分界线 */
  'glass-light': string
  'glass-shade': string
  /** 玻璃上的文字：比 foreground 亮一档，补偿模糊带来的灰度 */
  'on-glass': string
  'on-glass-muted': string

  /* ── 光源（light wells）──────────────────────────── */
  /** 场景里 2~3 个大半径柔和光源。玻璃靠它们才有东西可折射 */
  'glow-1': string
  'glow-2': string
  'glow-3': string
}

export const theme: { light: ThemeTokens; dark: ThemeTokens } = {
  light: {
    background: '#eef0f5',
    foreground: '#0B1322',
    muted: '#4f5a70',
    erased: '#98a1b3',
    paper: '#ffffff',
    rule: '#dce0e9',
    marker: '#b8862f',
    'on-marker': '#ffffff',

    glass: 'rgb(255 255 255 / 0.58)',
    'glass-border': 'rgb(255 255 255 / 0.85)',
    'glass-light': 'rgb(255 255 255 / 0.95)',
    'glass-shade': 'rgb(22 28 44 / 0.06)',
    'on-glass': '#161c2c',
    'on-glass-muted': '#4f5a70',

    'glow-1': 'rgb(255 255 255 / 0.9)',
    'glow-2': 'rgb(210 224 255 / 0.55)',
    'glow-3': 'rgb(255 245 225 / 0.5)',
  },
  dark: {
    /**
     * 近黑的深墨蓝场景 —— 玻璃拟态必须这么深。
     * 原来是 #1b2236，但它 L=16% / S=33%：太亮、蓝味太稀。
     * 白色玻璃一叠上去，亮度涨到 22%、饱和度掉到 23% —— 就又亮又灰。
     * 这个底色 L=9% / S=51%，白玻璃叠完仍保持冷调，玻璃才有东西可折射。
     */
    background: '#0B1322',
    foreground: '#e9ecf4',
    muted: '#8e9ab8',
    erased: '#5f6b88',
    paper: '#141d31',
    rule: '#22304d',
    /** 香槟金 —— 唯一强调色，只出现在主要动作和高亮文字，绝不大面积铺色 */
    marker: '#E4B863',
    'on-marker': '#241c07',

    glass: 'rgb(255 255 255 / 0.09)',
    'glass-border': 'rgb(255 255 255 / 0.11)',
    'glass-light': 'rgb(255 255 255 / 0.16)',
    'glass-shade': 'rgb(0 0 0 / 0.24)',
    'on-glass': '#f2f5fc',
    'on-glass-muted': '#a9b6d4',

    /**
     * 光源：蓝 · 青 · 紫 —— 三色各占一团。
     * 冷色相相邻，不是「紫粉 AI 渐变」（那是 indigo→purple→pink，含粉）。
     * 没粉、没红，三个都在蓝紫区间，所以叠起来仍然是「夜景」而不是「渐变壁纸」。
     *
     * 透明度调得很克制：早先 0.30/0.20/0.24 太亮，大面积铺开就是一团白雾（显脏），
     * 现在这个量只当「氛围」，光斑本身几乎看不出形状，但玻璃能借到光。
     */
    'glow-1': 'rgb(120 160 255 / 0.13)',
    'glow-2': 'rgb(90 220 215 / 0.08)',
    'glow-3': 'rgb(150 130 255 / 0.10)',
  },
}

const toVars = (o: ThemeTokens) =>
  (Object.keys(o) as (keyof ThemeTokens)[])
    .map((k) => `--${k}:${o[k]};`)
    .join('')

/** 注入 <head>：:root 浅色，.dark 覆盖 */
export const themeCss = `:root{${toVars(theme.light)}}.dark{${toVars(theme.dark)}}`