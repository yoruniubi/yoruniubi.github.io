/**
 * 深浅色：默认深色画布（#1b2236）。模式存 cookie，SSR 直出正确的 <html class>。
 */
export function useThemeState() {
  const mode = useCookie<'light' | 'dark'>('theme', {
    default: () => 'dark',
    path: '/',
    sameSite: 'lax',
  })

  const isDark = computed(() => mode.value !== 'light')
  const toggle = () => {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  return { mode, isDark, toggle }
}

/** 在 app.vue 调用一次，负责给 <html> 挂上 / 摘掉 .dark */
export function useTheme() {
  const state = useThemeState()
  useHead(() => ({
    htmlAttrs: { class: state.isDark.value ? 'dark' : '' },
  }))
  return state
}
