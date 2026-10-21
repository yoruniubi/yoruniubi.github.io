<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'

const props = defineProps<{
  post: {
    path: string
    title?: string
    date?: string
    description?: string
  }
}>()

const date = computed(() => props.post.date?.replaceAll('-', '.') ?? '')
</script>

<template>
  <NuxtLink :to="post.path" class="post-card glass group p-5">
    <div class="flex items-start justify-between gap-5">
      <h3
        class="mark-hover font-display text-title font-semibold tracking-[-0.01em]"
      >
        {{ post.title }}
      </h3>
      <!-- 悬停时箭头不再变香槟金：香槟金只出现在「语义位置」（高亮、搜索命中、
           阅读进度、caret），不用于纯装饰。箭头改为与标题同色。 -->
      <ArrowUpRight
        class="mt-1 shrink-0 text-erased transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
        :size="18"
        :stroke-width="1.75"
      />
    </div>

    <p
      v-if="post.description"
      class="mt-3 line-clamp-2 text-body"
    >
      {{ post.description }}
    </p>

    <div v-if="date" class="mt-5 label label-wide">
      {{ date }}
    </div>
  </NuxtLink>
</template>
