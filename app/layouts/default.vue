<template>
  <div class="flex min-h-dvh flex-col">
    <AppHeader />
    <main class="mx-auto w-full max-w-270 flex-1 px-6">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
