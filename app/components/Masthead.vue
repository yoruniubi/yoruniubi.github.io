<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

const { site } = useAppConfig()
</script>

<template>
  <!-- 眉标 / 那句签名 / 座右铭。原来是 mt-10 + sm:pt-28（桌面端离页头 152px），太空了 -->
  <section class="mt-10 sm:mt-16">
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

  <!-- 现在在做什么。原来 mt-20 + pt-6 / sm:mt-24（桌面端 96+24px），收到 56+20px -->
  <section class="mt-12 border-t border-rule pt-5 sm:mt-14">
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
