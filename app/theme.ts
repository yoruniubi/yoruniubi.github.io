/**
 * 全站设计令牌 —— 想改颜色只改这个文件
 *
 * 方向「修订稿」：深蓝稿纸 · 墨白衬线 · 一支荧光笔。
 * 全站只有一个暖色（marker），其余是纸、墨、和被划掉的灰。
 * 「划掉 = 过去」「荧光笔 = 留下来的」——这套语汇就是设计本身。
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
  /** 荧光笔（全站唯一的暖色） */
  marker: string
  /** 落在荧光笔上的字色 */
  'on-marker': string
}

export const theme: { light: ThemeTokens; dark: ThemeTokens } = {
  light: {
    background: '#f5f6f9',
    foreground: '#161c2c',
    muted: '#4f5a70',
    erased: '#98a1b3',
    paper: '#ffffff',
    rule: '#dce0e9',
    marker: '#ffe066',
    'on-marker': '#231d06',
  },
  dark: {
    /** 你钉死的画布底色 */
    background: '#1b2236',
    foreground: '#e9ecf4',
    muted: '#949fb9',
    erased: '#6a7691',
    paper: '#212a42',
    rule: '#2c3956',
    marker: '#f2cb5b',
    'on-marker': '#231d06',
  },
}

const toVars = (o: ThemeTokens) =>
  (Object.keys(o) as (keyof ThemeTokens)[])
    .map((k) => `--${k}:${o[k]};`)
    .join('')

/** 注入 <head>：:root 浅色，.dark 覆盖 */
export const themeCss = `:root{${toVars(theme.light)}}.dark{${toVars(theme.dark)}}`
