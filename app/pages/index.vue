<script setup lang="ts">
const appConfig = useAppConfig()

const { data: posts } = await useAsyncData('posts', () =>
  queryCollection('blogs').order('date', 'DESC').all(),
)

const count = computed(() => posts.value?.length ?? 0)
const uncategorized = computed(() => appConfig.uncategorized || '未分类')

/**
 * 按分类分组。
 *
 * 分类是在构建时由 auto-frontmatter.ts 从文件夹名推出来的，前端只负责摆位置。
 * 顺序：app.config.ts 里 categories 列过的按列表顺序 → 其余按名字 → 未分类永远最后。
 */
const groups = computed(() => {
  const buckets = new Map<string, NonNullable<typeof posts.value>>()

  for (const post of posts.value ?? []) {
    const key = post.category?.trim() || uncategorized.value
    const bucket = buckets.get(key)
    if (bucket) bucket.push(post)
    else buckets.set(key, [post])
  }

  const order = appConfig.categories ?? []

  return [...buckets.keys()]
    .sort((a, b) => {
      if (a === uncategorized.value) return 1
      if (b === uncategorized.value) return -1
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b, 'zh')
    })
    .map(key => ({ key, posts: buckets.get(key) ?? [] }))
})
</script>

<template>
  <div>
    <Masthead />

    <!-- 「现在」到「文章」之间。原来是 mt-24/sm:mt-28（桌面端 112px） -->
    <section class="mt-14 sm:mt-16">
      <div v-if="posts?.length" class="mt-12 space-y-16">
        <section
          v-for="group in groups"
          :id="group.key"
          :key="group.key"
          class="scroll-mt-20"
        >
          <div class="flex items-baseline justify-between">
            <h2 class="font-display text-title font-semibold tracking-[-0.01em]">
              {{ group.key }}
            </h2>
            <span class="label label-wide">
              {{ group.posts.length }} 篇
            </span>
          </div>

          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <PostCard v-for="post in group.posts" :key="post.path" :post="post" />
          </div>
        </section>
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
