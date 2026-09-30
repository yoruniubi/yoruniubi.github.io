<script setup lang="ts">
import { ArrowUp } from 'lucide-vue-next'

const { site } = useAppConfig()
const year = new Date().getFullYear()

function toTop() {
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <footer class="mt-28 border-t border-rule">
    <div
      class="mx-auto flex max-w-270 flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="font-display text-body text-muted">{{ site.motto }}</p>

      <div class="flex items-center gap-3">
        <span class="label">
          {{ year }} · {{ site.name }}
        </span>
        <button
          type="button"
          class="icon-btn"
          aria-label="回到顶部"
          @click="toTop"
        >
          <ArrowUp :size="16" :stroke-width="1.75" />
        </button>
      </div>
    </div>
  </footer>
</template>
