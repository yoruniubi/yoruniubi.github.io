/**
 * 左下角那个小人（Live2D），每一页都有。
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
 * 3. 客户端换页会把它卸载再挂载，而 live2d-widgets 没有 destroy() ——
 *    重建就是第二个小人，外加一堆解绑不掉的 window 监听。
 *    插件只在浏览器里跑一次，没有这回事。
 *
 * 另外两条是这个第三方脚本自己的脾气：
 *
 * 4. 任何时候都不要把 #waifu-tips 删掉 —— 它往 window 上挂了一堆解绑不了的
 *    mousemove / click 监听，节点没了之后每次鼠标划过都会抛
 *    「Cannot set properties of null」。要藏就用 display:none：
 *    内部状态不受影响，恢复时也不会重播出场动画。窄屏就是这么处理的。
 * 5. 窄屏（手机 / 拖窄的窗口）不放它 —— 见下面的 roomForWidget()。
 *
 * 历史备注：这段代码原先在 pages/index.vue 里、靠路由决定显示，结果
 * 「切到别的页面再切回来，小人就没了」：页面 setup 里有 `await useAsyncData`，而
 * **在 await 之后注册的 onMounted / onBeforeUnmount 在客户端换页时会被 Vue 静默丢弃**
 * （首屏是水合，所以完全看不出来）。同一条坑适用于「await 之后注册任何生命周期钩子」。
 * 现在每页都显示、不需要靠路由收起，但「别放进页面组件」这条结论没变（见第 3 条）。
 */

const LIVE2D_SRC =
  'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.1/dist/autoload.js'

/**
 * 屏幕比这个窄就不放小人。
 *
 * 原版 autoload.js 里本来就有 `screen.width >= 768` 这道判断（被官方注释掉了），
 * 我们改成动态加载时又丢了一次，结果手机上小人把正文盖住了。
 *
 * 两个条件都要满足：
 * - `window.innerWidth` —— 窗口：桌面端把窗口拖成窄条时也会盖住正文
 * - `screen.width` —— 设备屏幕：手机横屏时 innerWidth 可能变宽，但那还是块小屏幕
 *
 * 手机上前面的判断不通过 → 脚本压根不会下载，顺带省下 0.85MB 流量。
 */
const WIDGET_MIN_WIDTH = 768
const roomForWidget = () =>
  window.innerWidth >= WIDGET_MIN_WIDTH && screen.width >= WIDGET_MIN_WIDTH

// 脚本会把 #waifu 插到 <body> 上，注入两次页面上就有两个小人。
// 模块级变量挡的是客户端热更新那种「插件重跑一遍」的情况。
let injected = false

export default defineNuxtPlugin(() => {
  /** 屏幕放得下就显示；拖窄的窗口藏起来（手机上从来没注入过，这里是空转） */
  function applyVisibility() {
    const show = roomForWidget()
    for (const id of ['waifu', 'waifu-toggle']) {
      const el = document.getElementById(id)
      if (el) el.style.display = show ? '' : 'none'
    }
  }

  /** 下载并注入一次（房间不够宽时压根不会被调用到） */
  function ensureInjected() {
    if (injected) return
    injected = true

    const script = document.createElement('script')
    script.src = LIVE2D_SRC
    script.async = true
    document.head.appendChild(script)

    // 小人是脚本加载完之后才异步插进 <body> 的（要先下完样式和模型列表）。
    // 观察它的出现，是为了处理「窗口在它出来之前就被拖窄了」这种情况。
    const observer = new MutationObserver(() => {
      applyVisibility()
      if (document.getElementById('waifu')) observer.disconnect()
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })

    // 兜底：万一 #waifu 一直没出现（脚本被墙、模型加载失败），
    // 别让这个观察者跟着整页的 DOM 变动一直跑下去。
    setTimeout(() => observer.disconnect(), 30_000)
  }

  // 等水合彻底结束再动手：这脚本是纯装饰，没必要跟首屏抢带宽，
  // 更要紧的是别在初始化 / Suspense 推进的过程中往 <head> 里插东西。
  onNuxtReady(() => {
    if (roomForWidget()) ensureInjected()

    // 窗口拖窄了先藏起来（display:none，不删节点），再拉宽自己会回来。
    // 手机上这个判断永远不成立，所以 resize（地址栏收起也会触发）不会造成下载。
    window.addEventListener('resize', () => {
      applyVisibility()
      if (roomForWidget()) ensureInjected()
    }, { passive: true })
  })
})
