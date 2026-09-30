<script setup lang="ts">
import { themeCss } from '~/theme'

useTheme()

useHead({
  style: [{ innerHTML: themeCss }],
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
  </NuxtLayout>
</template>
