<script setup lang="ts">

const { data: posts } = await useAsyncData('posts', () =>
  queryCollection('blogs').order('date', 'DESC').all(),
)

const count = computed(() => posts.value?.length ?? 0)

const LIVE2D_SRC =
  'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.1/dist/autoload.js'

let injected = false
let onHomePage = false
let observer: MutationObserver | null = null

/** 小人只出现在首页，其他页面把它两个根节点藏起来 */
function applyVisibility() {
  for (const id of ['waifu', 'waifu-toggle']) {
    const el = document.getElementById(id)
    if (el) el.style.display = onHomePage ? '' : 'none'
  }
}

onMounted(() => {
  onHomePage = true

  if (injected) {
    // 这次会话已经加载过，只要重新显示出来
    applyVisibility()
    return
  }
  injected = true

  const script = document.createElement('script')
  script.src = LIVE2D_SRC
  script.async = true
  document.head.appendChild(script)

  // 小人是脚本加载完成后才异步插进 <body> 的（要先下完样式和模型列表），
  // 所以等它出现的那一刻再决定显示还是隐藏 —— 万一人还没出来就跳到文章页了。
  observer = new MutationObserver(() => {
    applyVisibility()
    if (onHomePage && document.getElementById('waifu')) {
      observer?.disconnect()
      observer = null
    }
  })
  observer.observe(document.body, { childList: true })
})

onBeforeUnmount(() => {
  onHomePage = false
  applyVisibility()
})
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
