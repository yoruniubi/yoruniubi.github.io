#!/usr/bin/env node
/**
 * 把文章旁边的图片搬进 public/，并把链接改成绝对路径。
 *
 * 为什么需要这一步
 * ────────────────
 * `content/` 是给 Nuxt **解析内容**的目录，里面的图片不会被打包到网站里。
 * 静态资源必须放在 `public/` 下，线上才访问得到。
 * 所以如果你在 `content/blogs/某篇/` 里放图、正文写 `![](image-8.png)`，
 * 本地预览可能正常，上线后一定是破图。
 *
 * 这个脚本做的事
 * ──────────────
 *   1. 扫 `content/` 下所有 `.md`
 *   2. 找出里面指向「同目录下真实文件」的相对链接（`![](image-8.png)` 这种）
 *   3. 把文件搬到 `public/images/<它在 content 下的相对路径>`
 *   4. 把链接改写成 `/images/<同样的相对路径>`
 *
 * 即：`public/images/` 里的目录结构跟 `content/` 一一对应，
 * 搬完之后 content 目录里就只剩 `.md` 了。
 *
 * 可以反复运行：已经搬过的、链接已经写成 `/images/...` 的，都会自动跳过。
 * 你之后继续迁移老文章，每搬完一批跑一次就行。
 *
 *   npm run fix-assets             真的搬
 *   npm run fix-assets -- --dry    只列出会改什么，不动任何文件
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'

const ROOT = process.cwd()
const CONTENT_DIR = join(ROOT, 'content')
const PUBLIC_DIR = join(ROOT, 'public')
const IMAGES_DIR = join(PUBLIC_DIR, 'images')
const DRY = process.argv.includes('--dry')

/** 这些是「内容文件」不是「资源文件」，别搬走 */
const CONTENT_EXT = new Set(['.md', '.markdown', '.yml', '.yaml', '.json', '.csv'])

/** markdown 的 `](url)` 和 html 的 `src="url"` / `href="url"` */
const MD_REF = /\]\(\s*([^()\s]+)(?:\s+["'][^"']*["'])?\s*\)/g
const HTML_REF = /\b(?:src|href)\s*=\s*(["'])([^"']+)\1/gi

// ─────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────

/** 递归找出所有以 ext 结尾的文件 */
function walk(dir, ext) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, ext))
    else if (entry.isFile() && ext.includes(extname(entry.name).toLowerCase())) out.push(full)
  }
  return out
}

/** 路径统一成 `/` 分隔，打印和写进 md 都用这个 */
const slash = (p) => p.split(sep).join('/')

/**
 * 判断一个链接要不要处理。返回 null 表示「不用管」。
 *
 * 不处理的情况：外链、绝对路径、锚点、`content/` 外面的文件、内容文件本身。
 */
function plan(url, mdFile) {
  // http:// https:// data: # /xxx //cdn...
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(url)) return null

  const noQuery = url.split(/[?#]/)[0]
  let decoded = noQuery
  try {
    decoded = decodeURIComponent(noQuery)
  } catch {
    // 链接里有裸的 % 号，解码会炸，那就按原样找
  }

  const abs = resolve(dirname(mdFile), decoded)
  if (!abs.startsWith(CONTENT_DIR + sep)) return null // 指到 content 外面去了
  if (!existsSync(abs) || !statSync(abs).isFile()) return null
  if (CONTENT_EXT.has(extname(abs).toLowerCase())) return null // 是 md/yaml，不是资源

  const rel = slash(relative(CONTENT_DIR, abs)) // blogs/某篇/image-8.png
  return { url, abs, rel, dest: join(IMAGES_DIR, ...rel.split('/')), newUrl: `/images/${rel}` }
}

/** 网址里会让 markdown 断掉的字符（空格、括号）转义一下，中文保持原样更好读 */
const escapeUrl = (u) => u.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29')

/**
 * 逐行扫一遍正文，把相对引用换成绝对路径。
 * 会跳过 ``` 代码块里的内容，免得把示例代码也改了。
 */
function rewriteMarkdown(text, mdFile, moves) {
  let inFence = false

  const handle = (url) => {
    const p = plan(url, mdFile)
    if (!p) return null
    moves.push(p)
    return escapeUrl(p.newUrl)
  }

  const lines = text.split('\n').map((line) => {
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence
      return line
    }
    if (inFence) return line

    return line
      .replace(MD_REF, (whole, url) => {
        const next = handle(url)
        return next ? whole.replace(url, next) : whole
      })
      .replace(HTML_REF, (whole, quote, url) => {
        const next = handle(url)
        return next ? whole.replace(url, next) : whole
      })
  })

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────────────────────
if (!existsSync(CONTENT_DIR)) {
  console.error(`  找不到 ${CONTENT_DIR}`)
  process.exit(1)
}

const mdFiles = walk(CONTENT_DIR, ['.md', '.markdown'])
console.log(`\n  ════ 扫描 content/ 下 ${mdFiles.length} 个 markdown 文件`)
if (DRY) console.log('  ════ 这是预览模式（--dry），不会动任何文件')

const allMoves = []
let changedFiles = 0

for (const md of mdFiles) {
  const before = readFileSync(md, 'utf8')
  const moves = []
  const after = rewriteMarkdown(before, md, moves)

  if (moves.length === 0) continue

  const rel = slash(relative(ROOT, md))
  console.log(`\n    ── ${rel}`)
  for (const m of moves) {
    console.log(`       ${slash(relative(ROOT, m.abs))}`)
    console.log(`         → ${slash(relative(ROOT, m.dest))}`)
    console.log(`         ${m.url}  →  ${m.newUrl}`)
  }

  if (DRY) {
    allMoves.push(...moves)
    continue
  }

  // 先复制再删，复制失败的话原文件还在
  for (const m of moves) {
    mkdirSync(dirname(m.dest), { recursive: true })
    copyFileSync(m.abs, m.dest)
    unlinkSync(m.abs)
  }

  if (after !== before) {
    writeFileSync(md, after)
    changedFiles += 1
  }
  allMoves.push(...moves)
}

// 顺便看看有没有「没被任何文章引用」的漏网之鱼
const movedAbs = new Set(allMoves.map((m) => m.abs))
const leftovers = walk(CONTENT_DIR, ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'])
  .filter((f) => !movedAbs.has(f))
  .map((f) => slash(relative(ROOT, f)))

console.log('\n  ════ 汇总')
if (allMoves.length === 0) {
  console.log('      没有需要搬的图片（要么已经搬过了，要么本来就用的是 /images/... 绝对路径）')
} else {
  console.log(`      处理了 ${allMoves.length} 个引用，改写了 ${changedFiles} 个 md 文件`)
  console.log(`      图片现在在: public/images/<跟 content 里一样的目录结构>/`)
}
if (leftovers.length > 0) {
  console.log(`\n      注意：content/ 里还有 ${leftovers.length} 个图片没被任何文章引用，没有搬：`)
  for (const f of leftovers) console.log(`        ${f}`)
  console.log('      如果它们没用了可以直接删；有用的话请手动搬到 public/images/ 并在正文里引用')
}
console.log()
