<script setup lang="ts">
import { Github, Moon, Sun } from 'lucide-vue-next'

const { isDark, toggle } = useThemeState()
const { site } = useAppConfig()
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-rule bg-background/85 backdrop-blur-md"
  >
    <div
      class="mx-auto flex h-16 max-w-270 items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6"
    >
      <NuxtLink to="/" class="flex min-w-0 items-baseline gap-2">
        <span
          class="truncate font-display text-body font-semibold tracking-[-0.02em] sm:text-title"
        >
          {{ site.name }}
        </span>
      </NuxtLink>

      <nav class="flex shrink-0 items-center gap-1">
        <NuxtLink to="/" class="nav-link">目录</NuxtLink>
        <NuxtLink to="/about" class="nav-link">关于</NuxtLink>
        <a
          v-if="site.github"
          :href="site.github"
          target="_blank"
          rel="noopener noreferrer"
          class="icon-btn ml-1 sm:ml-2"
          aria-label="GitHub"
        >
          <Github :size="16" :stroke-width="1.75" />
        </a>

        <button
          type="button"
          class="icon-btn ml-1 sm:ml-2"
          :aria-label="isDark ? '切换到浅色' : '切换到深色'"
          @click="toggle"
        >
          <Sun v-if="isDark" :size="16" :stroke-width="1.75" />
          <Moon v-else :size="16" :stroke-width="1.75" />
        </button>
      </nav>
    </div>
  </header>
</template>
