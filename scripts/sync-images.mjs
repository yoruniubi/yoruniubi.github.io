#!/usr/bin/env node
/**
 * 把 content/ 里的图片（复制）同步进静态产物。
 *
 * 为什么还需要这一步
 * ──────────────────
 * `nuxt generate` 只会把 `public/` 拷进 `.output/public/`（那是 Vite 的 publicDir），
 * `content/` 里的图片不会自己进去。而 `nitro.publicAssets` 那套只在 dev 生效 ——
 * Nuxt 的构建路径压根不调 Nitro 的 `copyPublicAssets`（实测：声明式和钩子都试过，
 * 产物里始终只有 public/ 的那几张）。所以静态产物得自己补一刀。
 *
 * 它跟另一半是配套的
 * ──────────────────
 *   正文里写 `![](image-8.png)`（相对地址）
 *     → auto-frontmatter.ts 在解析时改写成 `/images/blogs/某篇/image-8.png`
 *     → 本脚本把 `content/blogs/某篇/image-8.png` 复制到
 *       `.output/public/images/blogs/某篇/image-8.png`
 *
 * 复制而不是搬走：图片留在文章旁边，`content/` 和 `public/` 两边的老图也照旧能用。
 * 跟已经搬进 `public/images/` 的老图不冲突 —— 两边目录结构一样，只是来源不同。
 *
 *   npm run sync-images            复制进 .output/public
 *   npm run sync-images -- --dry   只列出会复制什么，不动任何文件
 *   npm run sync-images -- --into public    换个目标目录（一般不用）
 *
 * 复制完还会自检一遍：产物里每个页面引用的 `/images/...` 是不是都存在。
 * 缺了就让进程退出码非 0（`npm run generate` 跟着失败），
 * 免得复制这一环没发生、线上默默变一堆破图。
 *
 * `npm run generate` 会自动跑它（见 package.json 的 postgenerate），
 * GitHub Actions 里跑的也是 `npm run generate`，所以线上同样自动生效。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const CONTENT_DIR = join(ROOT, 'content')

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const intoIndex = args.indexOf('--into')
const TARGET = intoIndex === -1 ? join(ROOT, '.output', 'public') : join(ROOT, args[intoIndex + 1] || '')

/** 这些是「内容文件」不是「资源文件」，不要复制 */
const CONTENT_EXT = new Set(['.md', '.markdown', '.yml', '.yaml', '.json', '.csv'])
/** 编辑器、系统留下的垃圾 */
const JUNK = new Set(['.DS_Store', 'Thumbs.db'])

/** 路径统一成 `/` 分隔，打印用 */
const slash = (p) => p.split(sep).join('/')

/** 递归列出 content/ 下所有「资源文件」 */
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (!entry.isFile()) continue
    else if (JUNK.has(entry.name) || CONTENT_EXT.has(extname(entry.name).toLowerCase())) continue
    else out.push(full)
  }
  return out
}

/** 递归找出所有 .html（产物里的页面） */
function walkHtml(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkHtml(full))
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.html') out.push(full)
  }
  return out
}

if (!existsSync(CONTENT_DIR)) {
  console.error(`  找不到 ${CONTENT_DIR}`)
  process.exit(1)
}

const files = walk(CONTENT_DIR).filter((f) => statSync(f).isFile())

// 目标目录不存在就别往下走了（一般是还没 generate，或者 --into 写错了）。
// 不能 rename 成新建：那会凭空造出一个空目录，让人以为成功了。
if (!DRY && !existsSync(TARGET)) {
  console.error(`\n  目标目录不存在：${slash(relative(ROOT, TARGET)) || TARGET}`)
  console.error('  先跑 `npm run generate`（它会自动调用本脚本），或者用 --into 指定别的目录。\n')
  process.exit(1)
}

if (files.length === 0) {
  console.log('\n  ════ content/ 里没有图片需要同步（正文都用的 /images/... 绝对路径？）')
  console.log('       直接进自检')
} else {
  console.log(`\n  ════ 把 content/ 里的 ${files.length} 个资源同步到 ${slash(relative(ROOT, TARGET)) || TARGET}/images/`)
  if (DRY) console.log('  ════ 这是预览模式（--dry），不会动任何文件')

  let bytes = 0
  for (const file of files) {
    const rel = slash(relative(CONTENT_DIR, file)) // blogs/某篇/image-8.png
    const dest = join(TARGET, 'images', ...rel.split('/'))
    const size = statSync(file).size
    bytes += size
    console.log(`       ${rel}  (${(size / 1024).toFixed(0)} KB)`)
    if (DRY) continue
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(file, dest)
  }

  console.log(`\n  ════ ${DRY ? '会同步' : '已同步'} ${files.length} 个文件，共 ${(bytes / 1024 / 1024).toFixed(1)} MB`)
  console.log('       线上地址: /images/<上面的相对路径>')
}

// ─────────────────────────────────────────────────────────────
// 自检：产物里每个页面引用的 /images/... 是不是真的存在
//
// 为什么要这一步：复制这环一旦没发生（比如有人绕过 npm、直接跑 nuxt generate），
// 线上就是一堆破图，而且没人看得出。所以与其默默发个坏站，不如让构建直接失败。
// ─────────────────────────────────────────────────────────────
if (DRY) process.exit(0)

const pages = walkHtml(TARGET)
const missing = new Map() // 缺的地址 → 第一个引用它的页面
let checked = 0

for (const page of pages) {
  const html = readFileSync(page, 'utf8')
  for (const m of html.matchAll(/<img[^>]*\ssrc="(\/images\/[^"]+)"/g)) {
    const url = m[1].split(/[?#]/)[0]
    checked += 1
    // 地址里可能是 %20（空格），磁盘上的文件名是原样空格
    let rel = url.replace(/^\/images\//, '')
    try {
      rel = decodeURIComponent(rel)
    } catch {
      // 地址里有裸的 % 号，按原样找
    }
    if (!existsSync(join(TARGET, 'images', ...rel.split('/'))) && !missing.has(url)) {
      missing.set(url, slash(relative(TARGET, page)))
    }
  }
}

console.log(`\n  ════ 自检：产物里 ${pages.length} 个页面共引用 ${checked} 张 /images/…`)

if (missing.size === 0) {
  console.log('       全部存在 ✓\n')
  process.exit(0)
}

console.error(`       有 ${missing.size} 张找不到：`)
for (const [url, page] of missing) console.error(`         ${url}\n           被 ${page} 引用`)
console.error('\n       检查：图片是不是忘了跟文章一起提交？还是地址写错了？\n')
process.exit(1)
