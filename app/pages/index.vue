<script setup lang="ts">
const { data: posts } = await useAsyncData('posts', () =>
  queryCollection('blogs').order('date', 'DESC').all(),
)

const count = computed(() => posts.value?.length ?? 0)

import type { Widget } from 'l2d-widget'

let widget: Widget | null = null

onMounted(async () => {
  const { createWidget } = await import('l2d-widget')
  widget = createWidget({
    model: [
      { path: 'https://model.hacxy.cn/wanko/model.json' },
      { path: 'https://model.hacxy.cn/shizuku/model.json' },
    ],
  })
})

onBeforeUnmount(() => {
  widget?.destroy()
  widget = null
})
</script>

<template>
  <div>
    <Masthead />

    <section class="mt-24 sm:mt-28">
      <div class="flex items-baseline justify-between border-b border-rule pb-3">
        <h1 class="font-display text-heading font-semibold tracking-[-0.01em]">
          文章
        </h1>
        <span class="label label-wide">
          {{ count }} 篇
        </span>
      </div>

      <div v-if="posts?.length" class="mt-6 grid gap-4 sm:grid-cols-2">
        <PostCard v-for="post in posts" :key="post.path" :post="post" />
      </div>

      <p
        v-else
        class="mt-6 rounded-md border border-dashed border-rule px-6 py-16 text-center text-body text-muted"
      >
        还没有文章。写下第一篇，它就会出现在这里。
      </p>
    </section>
  </div>
</template>
