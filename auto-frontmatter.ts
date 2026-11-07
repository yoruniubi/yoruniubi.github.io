/**
 * 自动补全 frontmatter —— 写文章时只写正文就行。
 *
 *   title        不写 → 用正文里第一个 `# 标题`
 *   description  不写 → 用 `# 标题` 后面的第一段
 *   date         不写 → 用 git 里这个文件内容最后一次被改动的日期
 *   category     不用写 → 用文件所在的文件夹名（见下面第 5 条）
 *
 * title / description 其实不用我们管：Nuxt Content 自己会从正文里抽
 * （@nuxtjs/mdc 的 contentHeading）。这个文件补的是它不管的七件事：
 *   1. date
 *   2. description 兜底：`# 标题` 后面没有段落时（比如直接跟了个 `## 小节`），
 *      用正文里出现的第一段当摘要
 *   3. 把已经变成 title / description 的那两段从正文里删掉，
 *      否则标题和第一段会在页面上出现两遍
 *   4. 媒体资源的相对地址改成绝对地址：`![](image-8.png)` → `![](/images/blogs/某篇/image-8.png)`，
 *      `<video src="x.mp4">` 同理。图片、视频跟 `.md` 放在一起就能用，不必手动搬
 *      （另一半：dev 下由 nuxt.config.ts 的 nitro.publicAssets 供图，
 *       静态产物由 scripts/sync-images.mjs 在 generate 后自动同步）
 *   5. 分类：从文件夹名推出来（`blogs/开发折腾/某篇.md` → `开发折腾`），
 *      并把分类段从网址里拿掉，网址保持 /blogs/某篇 不变
 *   6. 把正文里的标题整体降一级，
 *      否则老文章里用 `#` 分的节会变成跟文章大标题一样的 h1
 *   7. 网址去重：`某篇/某篇.md` → `/blogs/某篇`
 */
import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'

const CONTENT_DIR = 'content'

/**
 * 哪些集合算「文章」，要自动填 date、要降级正文标题。
 * `pages` 集合（about.md 这种）的表里根本没有 date 列，硬塞会报错；
 * 它的正文层级也是手写的，不要去动。
 * 以后加了新的文章集合，把名字往这里加一个就行。
 */
const POST_COLLECTIONS = ['blogs']

/**
 * minimark 的节点长这样：`['h2', { id: '小节' }, '小节', ['strong', {}, '粗体']]`
 * 第 0 位是标签名，第 1 位是属性，后面全是子节点。
 */
function nodeText(node: unknown): string {
  if (!Array.isArray(node)) return typeof node === 'string' ? node : ''
  // <annotation> 是 MathML 里存 LaTeX 源码的地方，屏幕上不显示。
  // 抽摘要时必须跳过，否则 `$\rightarrow$` 会变成“→\rightarrow”。
  if (node[0] === 'annotation') return ''
  return node
    .slice(2)
    .map((child) =>
      Array.isArray(child) ? nodeText(child) : typeof child === 'string' ? child : '',
    )
    .join('')
}

/**
 * 判断 description 是不是 mdc 自动从「第一段」抽出来的，而不是你在 frontmatter 里手写的。
 *
 * 为什么要判：mdc 的 contentHeading 抽摘要用的是它自己的 nodeTextContent，
 * 而那个函数会把 MathML 里存 LaTeX 源码的 <annotation> 当正文算进去 ——
 * `$\rightarrow$` 于是被抽成 "→\rightarrow"，直接写进了 content.description。
 * 我们的 nodeText 会跳过 annotation，所以用干净的那份替掉它；
 * 但前提是它确实是自动抽的 —— 你手写的摘要一个字都不能动。
 *
 * 怎么判：把现有内容里的 `\命令` 抹掉、空白抹掉，跟干净版逐字比对，
 * 相等就说明两者本来是同一段话，只是多了 LaTeX 源码。
 */
function isAutoDescription(description: unknown, clean: string): boolean {
  if (typeof description !== 'string' || !description) return false
  const normalize = (s: string) => s.replace(/\\[a-zA-Z]+/g, '').replace(/\s+/g, '')
  return normalize(description) === normalize(clean)
}

/** 标题降一级的对照表 */
const HEADING_SHIFT: Record<string, string> = {
  h1: 'h2', h2: 'h3', h3: 'h4', h4: 'h5', h5: 'h6', h6: 'h6',
}

function shiftHeadings(nodes: unknown[]): void {
  for (const node of nodes) {
    if (!Array.isArray(node)) continue
    const tag = node[0]
    if (typeof tag === 'string' && HEADING_SHIFT[tag]) node[0] = HEADING_SHIFT[tag]
    shiftHeadings(node.slice(2)) // 子节点也走一遍（标题里可能套着 strong 之类）
  }
}

/** 统一成 content/ 后面的相对路径，这样 git 的输出和文件绝对路径能对上 */
function toContentKey(p: string): string {
  const s = String(p).replace(/\\/g, '/')
  if (s.startsWith(`${CONTENT_DIR}/`)) return s.slice(CONTENT_DIR.length + 1)
  const i = s.lastIndexOf(`/${CONTENT_DIR}/`)
  return i === -1 ? s : s.slice(i + CONTENT_DIR.length + 2)
}

function toImagesUrl(src: string, mdDir: string): string | undefined {
  // http:// https:// data: # /xxx //cdn...
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(src)) return undefined

  const stack: string[] = []
  for (const part of `${mdDir}/${src.split(/[?#]/)[0]}`.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (stack.length === 0) return undefined // 指到 content/ 外面去了
      stack.pop()
      continue
    }
    stack.push(part)
  }
  if (stack.length === 0) return undefined

  // 空格会让 markdown 断掉，转义一下；中文保持原样更好读
  return `/images/${stack.map((p) => p.replace(/ /g, '%20')).join('/')}`
}

/** 原始 HTML 文本节点（整段没被解析的 HTML 字符串）里的引用也改掉。
 *  注意得原地改 node[i]，slice 出来的是新数组，改了不生效。 */
const HTML_SRC = /\b(src|href)\s*=\s*(["'])([^"']+)\2/gi

/** minimark 里媒体标签会被解析成真正的元素节点（props 是对象）：
 *  ["img", {src}]、["video", {src, poster}]、["source", {src}]…
 *  这些节点的相对地址也要改写。跟下面 'html' 分支的原始文本是两回事。 */
const MEDIA_TAGS = new Set(['img', 'video', 'audio', 'source', 'embed', 'track'])
const MEDIA_ATTRS = ['src', 'poster'] as const

/** 把整棵树里所有媒体资源的相对地址换成绝对地址（就地改） */
function rewriteImageSources(nodes: unknown[], mdDir: string): void {
  for (const node of nodes) {
    if (!Array.isArray(node)) continue

    const props = node[1]
    if (typeof node[0] === 'string' && MEDIA_TAGS.has(node[0]) && props && typeof props === 'object') {
      for (const attr of MEDIA_ATTRS) {
        const val = (props as Record<string, unknown>)[attr]
        if (typeof val === 'string') {
          const next = toImagesUrl(val, mdDir)
          if (next) (props as Record<string, unknown>)[attr] = next
        }
      }
    }

    // 原始 HTML 节点（有人习惯直接写 `<img src="x.png">`）里的引用也改掉。
    // 注意得原地改 node[i]，slice 出来的是新数组，改了不生效。
    if (node[0] === 'html') {
      for (let i = 2; i < node.length; i++) {
        const child = node[i]
        if (typeof child !== 'string') continue
        node[i] = child.replace(HTML_SRC, (whole, attr: string, quote: string, url: string) => {
          const next = toImagesUrl(url, mdDir)
          return next ? `${attr}=${quote}${next}${quote}` : whole
        })
      }
    }

    rewriteImageSources(node.slice(2), mdDir)
  }
}

function readGitDate(key: string): string | undefined {
  try {
    const out = execFileSync(
      'git',
      [
        '-c', 'core.quotepath=false', // 中文文件名不要转义成 \345\205\263
        'log',
        '--follow', // 顺着改名往前找历史
        '-M', // 开启改名检测，否则看不到 R100
        '--name-status',
        '--format=@%cI', // 提交行以 @ 开头，跟下面的状态行区分开
        '--',
        `${CONTENT_DIR}/${key}`,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )

    let current = ''
    for (const raw of out.split('\n')) {
      const line = raw.trim()
      if (!line) continue

      if (line.startsWith('@')) {
        current = line.slice(1).trim().slice(0, 10) // YYYY-MM-DD
        continue
      }
      if (!current) continue

      // 状态行，形如 A\t路径 / M\t路径 / R100\t旧路径\t新路径
      // 只是搬了位置（R100）不算内容改动，继续往前找
      if (line.split('\t')[0] === 'R100') continue
      return current
    }
  } catch {
    // 没装 git、不是 git 仓库、或者这个文件还没提交过：交给下面的 mtime 兜底
  }
  return undefined
}

/** 同一个文件只问 git 一次 */
const gitDateCache = new Map<string, string | undefined>()
function gitDate(key: string): string | undefined {
  if (!gitDateCache.has(key)) gitDateCache.set(key, readGitDate(key))
  return gitDateCache.get(key)
}

const formatDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 兜底日期：文件最后一次保存的时间（本地新写的、还没提交的文章用得上） */
function dateFromMtime(filePath: string): string | undefined {
  try {
    return formatDate(statSync(filePath).mtime)
  } catch {
    return undefined
  }
}

function shortenPath(path: string): string {
  const parts = path.split('/')
  const last = parts[parts.length - 1]
  if (last && last === parts[parts.length - 2]) return parts.slice(0, -1).join('/') || '/'
  return path
}

function deriveCategory(key: string): string | undefined {
  const parts = key.split('/') // ['blogs', '开发折腾', '某篇.md']
  return parts.length >= 3 ? parts[1] : undefined
}

/** 由 nuxt.config.ts 的 `content:file:afterParse` 钩子调用 */
export function applyAutoFrontmatter(
  filePath: string,
  collectionName: string,
  content: Record<string, any>,
): void {
  // ① date
  if (POST_COLLECTIONS.includes(collectionName) && !content.date) {
    const key = toContentKey(filePath)
    content.date = gitDate(key) ?? dateFromMtime(filePath)
  }

  // ② 标题兜底：frontmatter 没写、正文也没有 `# 标题`，就用文件名当标题
  if (!content.title) {
    content.title = String(content.stem ?? '').split('/').pop() || '无标题'
    if (content.seo && !content.seo.title) content.seo.title = content.title
  }

  // ③ 取正文树
  const rawBody = content.body as any
  const nodes: unknown[] | undefined = Array.isArray(rawBody)
    ? rawBody
    : Array.isArray(rawBody?.value)
      ? rawBody.value
      : undefined
  if (!nodes) return

  // ④ 图片：相对地址 → /images/... （所有集合都适用，about.md 里放图也一样）
  //    mdDir = 这个 md 在 content/ 下的目录（例如 blogs/开发折腾/关于Win11系统更改用户名）
  rewriteImageSources(nodes, toContentKey(filePath).split('/').slice(0, -1).join('/'))

  // ⑤ 摘要：`# 标题` 后面那段就是摘要。
  //
  //    mdc 的 contentHeading 已经自动抽过一次了，但它用的 nodeTextContent 会把
  //    MathML 里存 LaTeX 源码的 <annotation> 当正文 —— `$\rightarrow$` 于是被抽成
  //    "→\rightarrow"，meta description 和首页卡片上就会漏出 LaTeX 源码。
  //    所以用自己的 nodeText 重抽一遍；只在「原本没摘要」或「原本那份就是自动抽的」
  //    时候动手，你写在 frontmatter 里的摘要一个字不动。
  //    顺带兑上了「标题后面直接跟 `## 小节`」时摘要为空的情况。
  if (POST_COLLECTIONS.includes(collectionName)) {
    const firstP = nodes.find(
      (n): n is unknown[] => Array.isArray(n) && n[0] === 'p',
    )
    const firstPText = firstP ? nodeText(firstP).trim() : ''
    if (
      firstPText
      && (!content.description || isAutoDescription(content.description, firstPText))
    ) {
      content.description = firstPText
    }
  }

  // ⑥ 把已经变成 title / description 的那两段从正文里删掉
  let eaten = 0

  if (
    Array.isArray(nodes[0])
    && nodes[0][0] === 'h1'
    && nodeText(nodes[0]).trim() === String(content.title ?? '').trim()
  ) {
    eaten = 1
  }

  // 紧跟着的那一段，如果就是 description，也已经被当成摘要了
  const next = nodes[eaten]
  if (
    content.description
    && Array.isArray(next)
    && next[0] === 'p'
    && nodeText(next).trim() === String(content.description).trim()
  ) {
    eaten += 1
  }

  if (eaten > 0) nodes.splice(0, eaten)

  // ⑦ 分类：从文件夹推出来，并把分类段从网址里拿掉
  //    网址保持 /blogs/某篇（不带分类），分类只体现在首页的分组上
  if (POST_COLLECTIONS.includes(collectionName)) {
    const category = deriveCategory(toContentKey(filePath))
    if (category) {
      content.category = category
      const parts = String(content.path ?? '').split('/') // ['', 'blogs', '开发折腾', '某篇']
      if (parts[2] === category) {
        content.path = [...parts.slice(0, 2), ...parts.slice(3)].join('/')
      }
    }
  }

  // ⑧ 正文标题整体降一级（大标题已经占了 h1）
  if (POST_COLLECTIONS.includes(collectionName)) {
    shiftHeadings(nodes)

    // ⑨ 网址去重：`某篇/某篇.md` → `/blogs/某篇`
    if (typeof content.path === 'string') content.path = shortenPath(content.path)
  }
}
