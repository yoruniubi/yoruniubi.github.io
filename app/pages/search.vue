<script setup lang="ts">
import { Search as SearchIcon, X as XIcon } from 'lucide-vue-next'

useSeoMeta({
  title: '搜索',
  description: '在这个博客的正文里搜一个词，看它出现在哪几篇的哪一节。',
  // 搜索结果页会出现 ?q=xxx 的无数种组合，别让搜索引擎收录
  robots: 'noindex, follow',
})

type IndexPost = {
  path: string
  title?: string
  description?: string
  date?: string
  category?: string
}

type IndexSection = {
  id: string
  title: string
  titles: string[]
  level: number
  content: string
}

type SearchIndex = { posts: IndexPost[], sections: IndexSection[] }

/* ── 索引 ──────────────────────────────────────── */

/**
 * 索引是构建时生成的一个静态文件（server/api/search.json.get.ts）。
 *
 * `server: false`：页面本身是预渲染的，索引只在浏览器里按需下载 ——
 * 不进这个页面就永远不会下载它。
 * baseURL 要带上：部署成项目站时（/my-blog/）地址前面会多一层。
 */
const base = String(useRuntimeConfig().app.baseURL)
const { data: index, status } = useAsyncData<SearchIndex>(
  'search-index',
  () => $fetch<SearchIndex>(`${base.endsWith('/') ? base : `${base}/`}api/search.json`),
  { server: false, default: () => ({ posts: [], sections: [] }) },
)

/* ── 输入框和网址上的 ?q= ───────────────────────────
 * 写进网址是为了刷新、分享链接、浏览器后退都能复原。
 */

const route = useRoute()
const router = useRouter()
const query = ref(String(route.query.q ?? ''))

watch(query, (value) => {
  router.replace({ query: value.trim() ? { q: value } : {} })
})
watch(() => route.query.q, (value) => {
  const next = String(value ?? '')
  if (next !== query.value) query.value = next
})

/** 空格分开的多个词：要全部命中才算（"docker 端口" 找同时出现这两个词的段落） */
const terms = computed(() =>
  query.value.toLowerCase().split(/\s+/).map(term => term.trim()).filter(Boolean),
)

/* ── 匹配（没有依赖库，就是找子串）────────────────────
 * 中文没有词边界，所以「子串命中」反而比英文那套分词更准：
 * 搜「注册表」能搜到「注册表编辑器」。代价是没有模糊匹配（拼错就搜不到）。
 */

/** text 里所有命中词的区间，重叠的合并掉 */
function hitRanges(text: string, terms: string[]): Array<[number, number]> {
  const haystack = text.toLowerCase()
  const ranges: Array<[number, number]> = []

  for (const term of terms) {
    let from = 0
    while (from <= haystack.length - term.length) {
      const at = haystack.indexOf(term, from)
      if (at === -1) break
      ranges.push([at, at + term.length])
      from = at + term.length
    }
  }

  ranges.sort((a, b) => a[0] - b[0])

  const merged: Array<[number, number]> = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([...range] as [number, number])
  }
  return merged
}

/**
 * 把文字切成 [普通 | 命中] 的小段，模板里 v-for 出来。
 * 不用 v-html —— 正文里的尖括号不该有机会变成标签。
 */
function toParts(text: string, terms: string[]): Array<{ text: string, hit: boolean }> {
  const parts: Array<{ text: string, hit: boolean }> = []
  let cursor = 0

  for (const [start, end] of hitRanges(text, terms)) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), hit: false })
    parts.push({ text: text.slice(start, end), hit: true })
    cursor = end
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false })

  return parts
}

/** 截命中词附近的一段当预览（两端加省略号） */
function toSnippet(text: string, terms: string[], around = 30): string {
  const [first] = hitRanges(text, terms)
  if (!first) return text.slice(0, around * 2)

  const from = Math.max(0, first[0] - around)
  const to = Math.min(text.length, first[1] + around)

  return [
    from > 0 ? '…' : '',
    text.slice(from, to).trim(),
    to < text.length ? '…' : '',
  ].join('')
}

/* ── 结果 ────────────────────────────────────────
 * 按文章归并：一篇文里命中好几节也只出现一次，列出命中最多的前几节。
 */

type Hit = {
  id: string
  /** 命中所在的小节名（文章标题那一节为空，不然会跟标题重复） */
  heading: string
  parts: Array<{ text: string, hit: boolean }>
}

// 每篇最多列几处命中（其余的归到「还有 N 处」）。2 处就够看出“这篇为什么命中”了，
// 列多了卡片会长得没边。
const HITS_PER_POST = 2

const results = computed(() => {
  const list = terms.value
  if (!list.length) return []

  const posts = new Map(index.value.posts.map(post => [post.path, post]))
  const grouped = new Map<string, {
    path: string
    title: string
    category?: string
    date?: string
    hits: Hit[]
    titleHit: boolean
  }>()

  for (const section of index.value.sections) {
    const heading = section.title
    const trail = `${heading} ${section.titles.join(' ')}`.toLowerCase()
    const haystack = `${trail} ${section.content}`.toLowerCase()
    if (!list.every(term => haystack.includes(term))) continue

    // id 形如 /blogs/某篇#某节，取 # 前面那截就是文章地址
    const path = section.id.split('#')[0] ?? ''
    const post = posts.get(path)

    let entry = grouped.get(path)
    if (!entry) {
      entry = {
        path,
        title: post?.title || heading || path,
        category: post?.category,
        date: typeof post?.date === 'string' ? post.date.replaceAll('-', '.') : undefined,
        hits: [],
        titleHit: false,
      }
      grouped.set(path, entry)
    }

    // 命中的是这一节的名字 / 祖先标题，而不是正文
    if (list.every(term => trail.includes(term))) entry.titleHit = true

    const text = section.content.trim() || heading
    entry.hits.push({
      id: section.id,
      heading: section.level > 1 ? heading : '',
      parts: toParts(toSnippet(text, list), list),
    })
  }

  return [...grouped.values()]
    .map(entry => ({
      ...entry,
      total: entry.hits.length,
      rest: Math.max(0, entry.hits.length - HITS_PER_POST),
      hits: entry.hits.slice(0, HITS_PER_POST),
    }))
    // 标题命中的排前面，其余按日期（新的在前）
    .sort((a, b) =>
      Number(b.titleHit) - Number(a.titleHit)
      || String(b.date ?? '').localeCompare(String(a.date ?? '')),
    )
})

const totalHits = computed(() => results.value.reduce((sum, item) => sum + item.total, 0))
</script>

<template>
  <!--
    居中列，宽度跟文章页同一把尺子：`max-w-measure`（= `--container-measure`，
    现在 48rem，见 main.css —— 改那一个数字，两处一起变）。
    结果卡片是「标题 + 几行预览」，撑满 1032px 就变成一行超长文本、卡片也长得没边。
  -->
  <div class="mx-auto w-full max-w-measure">
    <section class="mt-14 sm:mt-16">

      <!-- 一条线，而不是一个圆角输入框：跟稿纸的规矩一致。
           聚焦时：线被荧光笔从左往右划过去（只动 transform，不挤动任何东西），
           放大镜同时从 erased 亮到 marker；光标和选中文字也都是荧光笔色。 -->
      <div
        class="group relative mt-8 flex items-center gap-3 border-b border-rule pb-1 transition-colors duration-300 hover:border-foreground/25"
      >
        <SearchIcon
          :size="16"
          :stroke-width="1.75"
          class="shrink-0 text-erased transition-colors duration-300 group-focus-within:text-marker"
          aria-hidden="true"
        />
        <input
          v-model="query"
          type="text"
          class="w-full min-w-0 bg-transparent py-2 text-body text-foreground caret-marker outline-none selection:bg-marker/30 placeholder:text-erased"
          placeholder="搜正文里的任何一个词，多个词用空格分开"
          aria-label="搜索正文"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          enterkeyhint="search"
          @keydown.esc="query = ''"
        >
        <button
          v-if="query"
          type="button"
          class="icon-btn shrink-0"
          aria-label="清空"
          @click="query = ''"
        >
          <XIcon :size="16" :stroke-width="1.75" />
        </button>

        <!-- 荧光笔： 1px，从左边划到满宽，盖在那条 rule 上 -->
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-marker transition-transform duration-300 ease-out group-focus-within:scale-x-100"
        />
      </div>

      <!-- 输入框下面这行小字：左边是「现在按什么在搜」，右边是键盘提示。
           多词时把词一个个列出来，顺手把 AND 这个规则写明白（不用猜）。 -->
      <div class="mt-3 flex items-baseline justify-between gap-4 label label-wide">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <template v-if="terms.length">
            <span
              v-for="term in terms"
              :key="term"
              class="border border-rule px-1.5 text-foreground"
            >{{ term }}</span>
            <span>{{ terms.length > 1 ? '都要出现' : '子串匹配' }}</span>
          </template>
          <span v-else-if="status === 'success'">索引 {{ index.posts.length }} 篇正文</span>
        </div>

        <p class="hidden shrink-0 items-center gap-1.5 sm:flex">
          <kbd class="border border-rule px-1.5 text-foreground">Esc</kbd>
          <span>清空</span>
        </p>
      </div>

      <p v-if="!terms.length" class="mt-8 text-body text-muted">
        输入一个词，正文里出现过它的地方都会列出来。
      </p>

      <p
        v-else-if="status === 'pending' || status === 'idle'"
        class="mt-8 text-body text-muted"
      >
        正在载入索引…
      </p>

      <p v-else-if="status === 'error'" class="mt-8 text-body text-muted">
        索引没下载下来，刷新一下再试。
      </p>

      <template v-else>
        <p v-if="results.length" class="mt-8 label label-wide">
          找到 {{ results.length }} 篇 · {{ totalHits }} 处
        </p>

        <ol v-if="results.length" class="mt-6 space-y-3">
          <li v-for="item in results" :key="item.path">
            <NuxtLink :to="item.path" class="post-card group block p-5">
              <div class="flex items-baseline justify-between gap-4">
                <h2 class="mark-hover font-display text-title font-semibold tracking-[-0.01em]">
                  {{ item.title }}
                </h2>
                <span class="label label-wide shrink-0">
                  {{ item.total }} 处
                </span>
              </div>

              <div
                v-if="item.category || item.date"
                class="mt-3 flex flex-wrap gap-x-4 label label-wide"
              >
                <span v-if="item.category">{{ item.category }}</span>
                <span v-if="item.date">{{ item.date }}</span>
              </div>

              <ul class="mt-4 space-y-3">
                <li v-for="hit in item.hits" :key="hit.id">
                  <p v-if="hit.heading" class="label label-wide">
                    # {{ hit.heading }}
                  </p>
                  <p class="text-body text-muted" :class="hit.heading && 'mt-1'">
                    <template v-for="(part, i) in hit.parts" :key="i">
                      <mark
                        v-if="part.hit"
                        class="bg-marker/30 text-foreground"
                      >{{ part.text }}</mark>
                      <template v-else>{{ part.text }}</template>
                    </template>
                  </p>
                </li>
                <li v-if="item.rest" class="label label-wide">
                  还有 {{ item.rest }} 处
                </li>
              </ul>
            </NuxtLink>
          </li>
        </ol>

        <p v-else class="mt-8 text-body text-muted">
          没找到「{{ query.trim() }}」。换个词、或者少写几个词试试。
        </p>
      </template>
    </section>
  </div>
</template>
