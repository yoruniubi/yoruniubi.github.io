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
 *   4. 图片的相对地址改成绝对地址：`![](image-8.png)` → `![](/images/blogs/某篇/image-8.png)`
 *      这样图片跟 `.md` 放在一起就能用，不必再手动搬图片
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
  return node
    .slice(2)
    .map((child) =>
      Array.isArray(child) ? nodeText(child) : typeof child === 'string' ? child : '',
    )
    .join('')
}

/** 标题降一级的对照表 */
const HEADING_SHIFT: Record<string, string> = {
  h1: 'h2', h2: 'h3', h3: 'h4', h4: 'h5', h5: 'h6', h6: 'h6',
}

/**
 * 把一棵 minimark 节点树里的标题整体降一级（h1→h2、h2→h3……）。
 *
 * 为什么要降：文章的大标题已经由 title 渲染成 h1 了。
 * 很多老博文是拿 `#` 一节一节写下来的，不降的话正文里会冒出一堆 h1，
 * 字号跟文章大标题一样大、层级也跟大标题平级。
 *
 * 为什么是「整体」降一级而不是只把 h1 改成 h2：
 * 老文里 `#` 是节、`##` 是子节，只降 h1 的话节和子节会挤在同一级、
 * 层级关系就丢了。整体降完还是「节 > 子节」。
 */
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

/**
 * 正文里的相对图片地址 → `/images/<content 下的相对路径>`。
 *
 * 返回 undefined 表示「不用管」：外链、`/images/...` 这种已经是绝对路径的、
 * 锚点，以及算出跑到 `content/` 外面的地址。
 *
 * 为什么不用先检查文件存不存在：`/images/blogs/dir/x.png` 这个网址，
 * `public/images/blogs/dir/x.png` 和 `content/blogs/dir/x.png` 两边都能指到，
 * 老图（已经搬到 public 的）和新图（就放在文章旁边）统一用这一个写法。
 */
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

/** minimark 里的图片是 `['img', { src, alt }]`；顺手管一下原始 HTML 的 <img src="x.png"> */
const HTML_SRC = /\b(src|href)\s*=\s*(["'])([^"']+)\2/gi

/** 把整棵树里所有图片的相对地址换成绝对地址（就地改） */
function rewriteImageSources(nodes: unknown[], mdDir: string): void {
  for (const node of nodes) {
    if (!Array.isArray(node)) continue

    const props = node[1]
    if (node[0] === 'img' && props && typeof props === 'object') {
      const src = (props as Record<string, unknown>).src
      if (typeof src === 'string') {
        const next = toImagesUrl(src, mdDir)
        if (next) (props as Record<string, unknown>).src = next
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

/**
 * 一篇文章的「内容日期」。
 *
 * 为什么一个文件跑一次 `git log --follow`，而不是一次读完所有文件：
 * 把文章归到分类文件夹里（`blogs/某篇.md` → `blogs/开发折腾/某篇.md`）
 * 在 git 眼里是一次纯改名，状态是 R100。而日期应该是内容最后一次改动的时间，
 * 不是搬家的时间。所以这里从新到旧扫，跳过 R100，第一条真正的改动（A/M）就是答案。
 * 批量 `git log` 做不到这件事 —— 它没办法把改名前后连起来。
 */
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

/**
 * 网址去重。
 *
 * `content/blogs/某篇/某篇.md` 生成的路径本来是 `/blogs/某篇/某篇`，名字白白重复一遍。
 * 文件夹名和文件名一模一样时，把最后一段去掉：
 *   content/blogs/关于自建new-api/关于自建new-api.md  →  /blogs/关于自建new-api
 *
 * 用 `index.md` 命名得到的是同一个网址（Nuxt Content 自带的约定），
 * 两种写法都行，不用刻意改。
 *
 * 注意：如果同一个文件夹里同时有 `某篇.md` 和 `index.md`，两个会算出同一个网址，
 * 那样一篇会盖掉另一篇，只留一个。
 */
function shortenPath(path: string): string {
  const parts = path.split('/')
  const last = parts[parts.length - 1]
  if (last && last === parts[parts.length - 2]) return parts.slice(0, -1).join('/') || '/'
  return path
}

/**
 * 分类 = `content/blogs/` 下面的第一层文件夹名。
 *
 *   content/blogs/开发折腾/某篇.md         → 开发折腾
 *   content/blogs/开发折腾/某篇/某篇.md    → 开发折腾（文章自己带图时也占一层）
 *   content/blogs/某篇.md                  → undefined（直接放在 blogs 下，算未分类）
 *
 * 所以「归类」就是「把文件放进对应文件夹」，不用写任何 frontmatter，
 * 也不会因为打错一个字就掉进未分类。
 * 分组的显示顺序在 app/app.config.ts 的 categories 里配。
 */
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

  // ③ 把已经变成 title / description 的那两段从正文里删掉
  const body = content.body as { type?: string, value?: unknown[] } | undefined
  if (!body || body.type !== 'minimark' || !Array.isArray(body.value)) return

  const nodes = body.value

  // ④ 图片：相对地址 → /images/... （所有集合都适用，about.md 里放图也一样）
  //    mdDir = 这个 md 在 content/ 下的目录（例如 blogs/开发折腾/关于Win11系统更改用户名）
  rewriteImageSources(nodes, toContentKey(filePath).split('/').slice(0, -1).join('/'))

  let eaten = 0

  // 正文开头的 h1 **就是**被当成文章标题的那一行时，从正文里删掉 ——
  // 它已经在页面上以文章大标题的形式出现了，留着会显示两遍。
  //
  // 为什么要比对文字、而不是看到 h1 就删：
  // 老文章常常第一行是 `# 前言` 这种小节名，文章本身叫别的名字。
  // 这种情况你得在 frontmatter 里写 `title: 真正的标题` 盖掉它，
  // 盖掉之后这个 h1 就不是标题了，是正文里的小节，得留着
  // （下面第 ⑦ 步会把它降成二级标题）。
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

  if (eaten > 0) body.value = nodes.slice(eaten)

  // ⑤ 分类：从文件夹推出来，并把分类段从网址里拿掉
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

  // ⑥ 摘要兜底：`# 标题` 后面没有段落时，用正文里出现的第一段当摘要。
  //    例如标题后面直接跟 `## 一、xxx`，contentHeading 就什么都抽不到，
  //    卡片上和 <meta name="description"> 里会是空的。
  if (POST_COLLECTIONS.includes(collectionName) && !content.description) {
    const firstP = (body.value as unknown[]).find(
      (n): n is unknown[] => Array.isArray(n) && n[0] === 'p',
    )
    const text = firstP ? nodeText(firstP).trim() : ''
    if (text) content.description = text
  }

  // ⑦ 正文标题整体降一级（大标题已经占了 h1）
  if (POST_COLLECTIONS.includes(collectionName)) {
    shiftHeadings((body.value ?? nodes) as unknown[])

    // ⑧ 网址去重：`某篇/某篇.md` → `/blogs/某篇`
    if (typeof content.path === 'string') content.path = shortenPath(content.path)
  }
}
