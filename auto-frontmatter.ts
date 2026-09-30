/**
 * 自动补全 frontmatter —— 写文章时只写正文就行。
 *
 *   title        不写 → 用正文里第一个 `# 标题`
 *   description  不写 → 用 `# 标题` 后面的第一段
 *   date         不写 → 用 git 里这个文件最后一次被改动的日期
 *
 * title / description 其实不用我们管：Nuxt Content 自己会从正文里抽
 * （@nuxtjs/mdc 的 contentHeading）。这个文件补的是它不管的两件事：
 *   1. date
 *   2. 把已经被抽成 title / description 的那两段从正文里删掉，
 *      否则标题和第一段会在页面上出现两遍
 */
import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'

const CONTENT_DIR = 'content'

/**
 * 哪些集合要自动填 date。
 * `pages` 集合（about.md 这种）的表里根本没有 date 列，硬塞会报错。
 * 以后加了新的文章集合，把名字往这里加一个就行。
 */
const DATED_COLLECTIONS = ['blogs']

/**
 * minimark 的节点长这样：`['h2', { id: '小节' }, '小节', ['strong', {}, '粗体']]`
 * 第 0 位是标签名，第 1 位是属性，后面全是子节点。
 */
function nodeText(node: unknown): string {
  if (!Array.isArray(node)) return typeof node === 'string' ? node : ''
  return node
    .slice(2)
    .map((child) =>
      Array.isArray(child) ? nodeText(child) : typeof child === 'string' ? child : '',
    )
    .join('')
}

/** 统一成 content/ 后面的相对路径，这样 git 的输出和文件绝对路径能对上 */
function toContentKey(p: string): string {
  const s = String(p).replace(/\\/g, '/')
  if (s.startsWith(`${CONTENT_DIR}/`)) return s.slice(CONTENT_DIR.length + 1)
  const i = s.lastIndexOf(`/${CONTENT_DIR}/`)
  return i === -1 ? s : s.slice(i + CONTENT_DIR.length + 2)
}

/**
 * 一次性把所有文章的 git 日期读出来：
 * key = content/ 后面的相对路径，value = YYYY-MM-DD。
 *
 * `git log` 是从新到旧的，所以同一个文件第一次遇到的那条就是最新日期。
 */
function readGitDates(): Map<string, string> {
  const dates = new Map<string, string>()
  try {
    const out = execFileSync(
      'git',
      [
        '-c', 'core.quotepath=false', // 中文文件名不要转义成 \345\205\263
        'log',
        '--pretty=format:%cI',
        '--name-only',
        '--diff-filter=AM', // 只看新增和修改
        '--',
        `${CONTENT_DIR}/`,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )

    let current = ''
    for (const line of out.split('\n')) {
      const t = line.trim()
      if (!t) continue
      if (/^\d{4}-\d{2}-\d{2}T/.test(t)) current = t.slice(0, 10)
      else if (!dates.has(t)) dates.set(toContentKey(t), current)
    }
  } catch {
    // 没有 git、浅克隆、或者还没提交过任何东西：
    // 不报错，下面用文件修改时间兜底
  }
  return dates
}

const gitDates = readGitDates()

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

/** 由 nuxt.config.ts 的 `content:file:afterParse` 钩子调用 */
export function applyAutoFrontmatter(
  filePath: string,
  collectionName: string,
  content: Record<string, any>,
): void {
  // ① date
  if (DATED_COLLECTIONS.includes(collectionName) && !content.date) {
    content.date = gitDates.get(toContentKey(filePath)) ?? dateFromMtime(filePath)
  }

  // ② 标题兜底：frontmatter 没写、正文也没有 `# 标题`，就用文件名当标题
  if (!content.title) {
    content.title = String(content.stem ?? '').split('/').pop() || '无标题'
    if (content.seo && !content.seo.title) content.seo.title = content.title
  }

  // ③ 把已经变成 title / description 的那两段从正文里删掉
  const body = content.body as { type?: string, value?: unknown[] } | undefined
  if (!body || body.type !== 'minimark' || !Array.isArray(body.value)) return

  const nodes = body.value
  let eaten = 0

  // 正文开头的 h1 已经被当成标题了
  if (Array.isArray(nodes[0]) && nodes[0][0] === 'h1') eaten = 1

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

  if (eaten > 0) body.value = nodes.slice(eaten)
}
