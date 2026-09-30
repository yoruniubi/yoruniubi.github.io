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
  <NuxtLink :to="post.path" class="post-card group p-6">
    <div class="flex items-start justify-between gap-5">
      <h3
        class="mark-hover font-display text-title font-semibold tracking-[-0.01em]"
      >
        {{ post.title }}
      </h3>
      <ArrowUpRight
        class="mt-1 shrink-0 text-erased transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
        :size="18"
        :stroke-width="1.75"
      />
    </div>

    <p
      v-if="post.description"
      class="mt-4 line-clamp-2 text-body text-muted"
    >
      {{ post.description }}
    </p>

    <div v-if="date" class="mt-8 label label-wide">
      {{ date }}
    </div>
  </NuxtLink>
</template>
