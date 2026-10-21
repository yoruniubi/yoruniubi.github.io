<template>
  <!-- 场景层：光源 + 颗粒。fixed 铺满视口，玻璃靠它们才有东西可折射。 -->
  <div class="scene-light" aria-hidden="true" />
  <div class="grain" aria-hidden="true" />

  <!-- 内容层：z-10 抬到颗粒之上（颗粒是 z-1，光斑是 z-0） -->
  <div class="relative z-10 flex min-h-dvh flex-col">
    <AppHeader />
    <main class="mx-auto w-full max-w-270 flex-1 px-6">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>