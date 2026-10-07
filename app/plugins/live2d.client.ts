/**
 * 首页左下角那个小人（Live2D）。
 *
 * 为什么是一个插件，而不是组件：
 *
 * 1. 它不需要渲染任何节点 —— 脚本自己会把 #waifu 插到 <body> 上。
 *    做成组件的话，模板里只能放一句注释；而 Vue 生产构建默认不带注释
 *    （comments:false），服务端渲染出来的东西和客户端对不上：水合后
 *    DOM 里会多一个片段结束注释（`<!--]-->`），控制台报
 *    「Hydration completed but contains mismatches」。dev 里注释是保留的，
 *    所以这个问题只在构建产物里出现。
 * 2. 写成 `.client.vue` 组件更不行：Nuxt 会给它包一层 createClientOnly，
 *    那一层会手动调用组件的 setup、再拿渲染结果当 vnode 读 `.children`。
 *    渲染结果是 null 时当场抛「Cannot read properties of null (reading 'children')」，
 *    整页变 500。
 * 3. 插件只在浏览器里跑一次，不存在「组件被卸载又挂载」的问题，
 *    也就没有下面第 4 条那个坑。
 *
 * 还有两条是这个第三方脚本自己的脾气：
 *
 * 4. 显隐必须靠路由，不能靠页面组件的生命周期。
 *    原先这段代码放在 pages/index.vue 里，结果是「切到别的页面再切回来，小人就没了」：
 *    页面组件的 setup 里有 `await useAsyncData`，而**在 await 之后注册的
 *    onMounted / onBeforeUnmount 在客户端换页时会被 Vue 静默丢弃**（首屏是水合，
 *    所以完全看不出来）。那次切回来时 setup 跑了、onMounted 没跑，
 *    于是没人再调用 applyVisibility() 把它重新显示出来。
 *    同一条坑适用于「await 之后注册任何生命周期钩子」。
 * 5. 离开首页只藏、不删。
 *    live2d-widgets 没有 destroy()，还往 window 上挂了一堆当场解绑不了的
 *    mousemove / click 监听；把 #waifu-tips 删掉会让之后每次鼠标划过都抛
 *    「Cannot set properties of null」。display:none 不影响它的内部状态，
 *    回到首页即时恢复、也不会重播出场动画。
 */

const LIVE2D_SRC =
  'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.1/dist/autoload.js'

// 脚本会把 #waifu 插到 <body> 上，注入两次页面上就有两个小人。
// 模块级变量挡的是客户端热更新那种「插件重跑一遍」的情况。
let injected = false

export default defineNuxtPlugin(() => {
  const route = useRoute()

  const isHome = () => route.path === '/'

  /** 小人只出现在首页，其他页面把它的两个根节点藏起来 */
  function applyVisibility() {
    const show = isHome()
    for (const id of ['waifu', 'waifu-toggle']) {
      const el = document.getElementById(id)
      if (el) el.style.display = show ? '' : 'none'
    }
  }

  // 等水合彻底结束再动手：这脚本是纯装饰，没必要跟首屏抢带宽，
  // 更要紧的是别在初始化 / Suspense 推进的过程中往 <head> 里插东西。
  onNuxtReady(() => {
    if (injected) return
    injected = true

    const script = document.createElement('script')
    script.src = LIVE2D_SRC
    script.async = true
    document.head.appendChild(script)

    // 小人是脚本加载完之后才异步插进 <body> 的（要先下完样式和模型列表），
    // 所以等它出现的那一刻再决定显示还是隐藏 —— 万一人还没出来用户就跳走了。
    const observer = new MutationObserver(() => {
      applyVisibility()
      if (isHome() && document.getElementById('waifu')) observer.disconnect()
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
  })

  // 路由一换就跟上；immediate 负责首次进入时的状态
  watch(() => route.path, applyVisibility, { immediate: true })
})
