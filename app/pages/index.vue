<script setup lang="ts">

const { data: posts } = await useAsyncData('posts', () =>
  queryCollection('blogs').order('date', 'DESC').all(),
)

const count = computed(() => posts.value?.length ?? 0)

</script>

<template>
  <div>
    <Masthead />

    <!-- 「现在」到「文章」之间。原来是 mt-24/sm:mt-28（桌面端 112px） -->
    <section class="mt-14 sm:mt-16">
      <!-- 这一页的 h1 是上面 Masthead 里那句 motto，这里只能是小标题 -->
      <div class="flex items-baseline justify-between border-b border-rule pb-3">
        <h2 class="font-display text-heading font-semibold tracking-[-0.01em]">
          文章
        </h2>
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
