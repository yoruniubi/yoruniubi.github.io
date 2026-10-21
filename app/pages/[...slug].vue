<script setup lang="ts">
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-vue-next'

const route = useRoute()

/**
 * Vue Router 的 route.path 是百分号编码过的：
 *   /blogs/%E5%85%B3%E4%BA%8E%E8%AF%BB%E7%A0%94%E7%94%9F%E6%B4%BB
 * 而数据库里存的是原样路径：
 *   /blogs/关于读研生活
 * 中文网址必须解码后再查，否则永远查不到，页面直接 404。
 * 用 decodeURI 而不是 decodeURIComponent：前者不会把 %2F 变成路径分隔符。
 *
 * 传 computed 而不是裸字符串：裸字符串只在 setup 那一瞬读一次，组件复用时
 * 拿到的还是旧 path（编译产物里会被固化成常量 key）。computed 会被 Nuxt watch，
 * path 一变就重新取数。
 */
const pagePath = computed(() => decodeURI(route.path))

const { data: doc } = await useAsyncData(pagePath, async () => {
  const found =
    (await queryCollection('pages').path(pagePath.value).first()) ??
    (await queryCollection('blogs').path(pagePath.value).first())

  // 404 必须在 handler 里抛，不能写完 useAsyncData 就在外面同步检查 doc.value：
  // 客户端 hydration 那一刻数据还没到（静态站要从 _payload.json 取），
  // 在外面检查会把本来正常的页面全部误判成 404。
  if (!found) {
    throw createError({ statusCode: 404, statusMessage: '页面不存在', fatal: true })
  }
  return found
})

// 每篇文章有自己的标签页标题和搜索摘要
useSeoMeta({
  title: () => doc.value?.title ?? undefined,
  description: () => doc.value?.description ?? undefined,
})

/**
 * 同一条时间轴上前一篇 / 后一篇（只对文章生效）。
 *
 * 这里同样踩过 key 的坑：模板字面量里的 pagePath 只是个普通字符串 ——
 * 就算 pagePath 本身是 computed，`timeline:${pagePath.value}` 也在 setup
 * 那一瞬被求值成了常量。所以要把整件事包成 getter，让 Nuxt 能 watch 到。
 */
const { data: timeline } = await useAsyncData(
  () => `timeline:${pagePath.value}`,
  async () => {
    const p = pagePath.value
    if (!p.startsWith('/blogs/')) return { older: null, newer: null }

    const all = await queryCollection('blogs')
      .order('date', 'ASC')
      .select('path', 'title', 'date')
      .all()

    const i = all.findIndex((x) => x.path === p)
    if (i === -1) return { older: null, newer: null }

    return {
      older: i > 0 ? all[i - 1] : null,
      newer: i < all.length - 1 ? all[i + 1] : null,
    }
  },
)

const date = computed(() => {
  const d = doc.value
  // pages 集合的 schema 里没有 date，用 in 把联合类型收窄到 blogs
  if (!d || !('date' in d)) return ''
  return typeof d.date === 'string' ? d.date.replaceAll('-', '.') : ''
})

/** 分类（只有文章有；点它会跳回首页对应的那一组） */
const category = computed(() => {
  const d = doc.value
  if (!d || !('category' in d)) return ''
  return typeof d.category === 'string' ? d.category : ''
})

const fmt = (d?: string) => (typeof d === 'string' ? d.replaceAll('-', '.') : '')
</script>

<template>
  <!--
    ⚠️ 空白 bug 的真正元凶在 app.vue（`:transition` 的 `mode: 'out-in'`），
    这里保持**单一根节点**只是顺手加固 —— Vue 的 <Transition> 本来也要求单根。
    完整机制见 app.vue 里的注释。
  -->
  <div>
    <ReadingProgress />

    <!--
      正文列：居中 + 固定行宽。宽度 = `max-w-measure`，
      也就是 main.css 里的 `--container-measure`（现在 48rem = 768px，
      17px 字号下约一行 45 个汉字）—— 想宽一点只改那一个数字。

      以前正文是左对齐贴在 1080px 容器左边，右边空一大块；而左下角正好是
      Live2D 小人，两者抢位置。居中之后，宽屏上小人落在左侧空白里
      （窗口 ≳ 1310px 就完全不重叠；改宽列宽这个阈值会跟着变大）。

      正文实际宽度由这一列的 max-w 决定 —— typography 插件自带的
      `max-width: 65ch` 已经在 .prose 里被去掉，见 main.css。

      pb-28 会跟页脚的 mt 叠成 245px 的空白（pb-28 + footer mt-28 + 段落下边距），收到 pb-16。
    -->
    <article v-if="doc" class="mx-auto w-full max-w-measure pb-16 pt-14">
    <NuxtLink to="/" class="back-link">
      <ArrowLeft :size="14" :stroke-width="1.75" />
      <span>返回目录</span>
    </NuxtLink>

    <header class="mt-12">
      <h1
        class="max-w-[22ch] font-display text-display font-semibold tracking-tight"
      >
        {{ doc.title }}
      </h1>

      <p
        v-if="doc.description"
        class="mt-6 max-w-[46ch] text-body text-muted"
      >
        {{ doc.description }}
      </p>

      <div
        v-if="category || date"
        class="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 label label-wide"
      >
        <NuxtLink
          v-if="category"
          :to="`/#${category}`"
          class="mark-hover text-muted transition-colors duration-300 hover:text-foreground"
        >
          {{ category }}
        </NuxtLink>

        <span v-if="date" class="flex items-center gap-2">
          <Calendar :size="13" :stroke-width="1.75" />
          <span>{{ date }}</span>
        </span>
      </div>
    </header>

    <div class="prose mt-14">
      <ContentRenderer :value="doc" />
    </div>

    <!-- 时间轴：左=较早，右=较新 -->
    <nav
      v-if="timeline?.older || timeline?.newer"
      class="mt-16 grid gap-8 border-t border-rule pt-6 sm:grid-cols-2"
    >
      <NuxtLink
        v-if="timeline?.older"
        :to="timeline.older.path"
        class="group block"
      >
        <span class="flex items-center gap-1.5 label label-wide">
          <ArrowLeft
            class="transition-transform duration-300 group-hover:-translate-x-0.5"
            :size="12"
            :stroke-width="1.75"
          />
          <span>较早 · {{ fmt(timeline.older.date) }}</span>
        </span>
        <span
          class="mt-2 block font-display text-title font-medium text-muted transition-colors duration-300 group-hover:text-foreground"
        >
          {{ timeline.older.title }}
        </span>
      </NuxtLink>
      <div v-else />

      <NuxtLink
        v-if="timeline?.newer"
        :to="timeline.newer.path"
        class="group block sm:text-right"
      >
        <span class="flex items-center gap-1.5 label label-wide sm:justify-end">
          <span>较新 · {{ fmt(timeline.newer.date) }}</span>
          <ArrowRight
            class="transition-transform duration-300 group-hover:translate-x-0.5"
            :size="12"
            :stroke-width="1.75"
          />
        </span>
        <span
          class="mt-2 block font-display text-title font-medium text-muted transition-colors duration-300 group-hover:text-foreground"
        >
          {{ timeline.newer.title }}
        </span>
      </NuxtLink>
      <div v-else />
    </nav>
    </article>
  </div>
</template>
