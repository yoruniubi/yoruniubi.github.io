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
 */
const pagePath = decodeURI(route.path)

const { data: doc } = await useAsyncData(pagePath, async () => {
  const found =
    (await queryCollection('pages').path(pagePath).first()) ??
    (await queryCollection('blogs').path(pagePath).first())

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

/** 同一条时间轴上前一篇 / 后一篇（只对文章生效） */
const { data: timeline } = await useAsyncData(`timeline:${pagePath}`, async () => {
  if (!pagePath.startsWith('/blogs/')) return { older: null, newer: null }

  const all = await queryCollection('blogs')
    .order('date', 'ASC')
    .select('path', 'title', 'date')
    .all()

  const i = all.findIndex((p) => p.path === pagePath)
  if (i === -1) return { older: null, newer: null }

  return {
    older: i > 0 ? all[i - 1] : null,
    newer: i < all.length - 1 ? all[i + 1] : null,
  }
})

const date = computed(() => {
  const d = doc.value
  // pages 集合的 schema 里没有 date，用 in 把联合类型收窄到 blogs
  if (!d || !('date' in d)) return ''
  return typeof d.date === 'string' ? d.date.replaceAll('-', '.') : ''
})

const fmt = (d?: string) => (typeof d === 'string' ? d.replaceAll('-', '.') : '')
</script>

<template>
  <article v-if="doc" class="pb-28 pt-14">
    <ReadingProgress />

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
        v-if="date"
        class="mt-7 flex items-center gap-2 label label-wide"
      >
        <Calendar :size="13" :stroke-width="1.75" />
        <span>{{ date }}</span>
      </div>
    </header>

    <div class="prose mt-14">
      <ContentRenderer :value="doc" />
    </div>

    <!-- 时间轴：左=较早，右=较新 -->
    <nav
      v-if="timeline?.older || timeline?.newer"
      class="mt-24 grid gap-8 border-t border-rule pt-7 sm:grid-cols-2"
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
</template>
