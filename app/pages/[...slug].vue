<script setup lang="ts">
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-vue-next'

const route = useRoute()

const { data: doc } = await useAsyncData(route.path, async () => {
  return (
    (await queryCollection('pages').path(route.path).first()) ??
    (await queryCollection('blogs').path(route.path).first())
  )
})

if (!doc.value) {
  throw createError({ statusCode: 404, statusMessage: '页面不存在', fatal: true })
}

/** 同一条时间轴上前一篇 / 后一篇（只对文章生效） */
const { data: timeline } = await useAsyncData(`timeline:${route.path}`, async () => {
  if (!route.path.startsWith('/blogs/')) return { older: null, newer: null }

  const all = await queryCollection('blogs')
    .order('date', 'ASC')
    .select('path', 'title', 'date')
    .all()

  const i = all.findIndex((p) => p.path === route.path)
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
