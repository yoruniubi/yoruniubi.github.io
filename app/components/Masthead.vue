<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

const { site } = useAppConfig()
</script>

<template>
  <section class="mt-10 sm:pt-28">
    <p class="label label-caps">
      个人博客 · 一份还在改的稿子
    </p>

    <!-- 签名元素：被划掉的旧目标，和留下来的那一个 -->
    <p class="revise-line mt-9">
      <span>想成为</span>
      <span class="strike">天才</span>
      <ArrowRight class="revise-arrow" aria-hidden="true" />
      <span class="mark">全能的人</span>
    </p>

    <h1 class="motto mt-5">{{ site.motto }}</h1>
  </section>

  <!-- 现在在做什么 -->
  <section class="mt-20 border-t border-rule pt-6 sm:mt-24">
    <dl class="grid gap-x-8 gap-y-2 sm:grid-cols-[5rem_1fr]">
      <dt class="label label-caps">
        现在
      </dt>
      <dd class="text-body text-foreground">
        {{ site.now }}
        <span v-if="site.nowUpdated" class="ml-2 label">
          {{ site.nowUpdated }}
        </span>
      </dd>
    </dl>
  </section>
</template>
