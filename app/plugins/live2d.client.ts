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
 * 6. 它自己有一个「模型还没加载完就跟着鼠标跑」的 bug，会在控制台里刷 TypeError，
 *    我们的 installGuard() 替它挡着 —— 那个函数的注释里写了完整来龙去脉。
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

/* ── 给上游 bug 打的补丁 ────────────────────────
 *
 * live2d-widgets@1.0.1（也就是目前最新版）dist/chunk/index.js 里有两处：
 *
 *   followPointer(e){ … (this.live2DMgr?.model.hitTest("body", x, y)) && dispatch(…) }
 *   modelTurnHead(e){ … (this.live2DMgr?.model.hitTest("body", x, y)) && dispatch(…) }
 *
 * 判空只判了 live2DMgr，**没判 model**，而 model 的初始值就是 null。
 * 偏偏 document 上的 mousemove 监听是在模型下载**之前**就挂好的
 * （先 initL2dCanvas，再 await changeModelWithJSON），于是模型下载期间
 * 每一次鼠标移动都会抛：
 *
 *   TypeError: can't access property "hitTest", i.model is null
 *
 * 这个窗口不是一瞬间：它得先下 cubism2 核心（live2d.min.js，129KB，
 * 实测在 jsdelivr 上要 6 秒），再下模型 json + .moc + 贴图。
 * 模型要是根本没下下来（CDN 连不上、请求挂住），就会一直抛下去。
 *
 * 够不着它的代码（都在模块闭包里），所以只能抢在它前面把事件拦住。
 * 就绪的信号是 #waifu 上的 .waifu-active —— waifu-tips.js 里是
 * `await loadModel()` → registerTools → 最后才 classList.add("waifu-active")，
 * 也就是说这个类出现时 model 一定已经有值了。
 *
 * 分寸：
 * - 只 stopPropagation，不 preventDefault —— 不会弄出「滚不动 / 点不动」
 * - mousemove 只能挡在 document 这一层（它的监听就挂在 document 上）；
 *   click / wheel / touch* 它都挂在**自己造的那个 #live2d canvas** 上，
 *   所以就只挡那个 canvas。挡在 document 上会把全站链接的点击一起吃掉。
 * - 最长挡 GUARD_TIMEOUT 就撤，不做永久性的全局改动。
 */

/** 模型就绪的标志类（waifu-tips.js 加载完模型之后才会给 #waifu 加上） */
const READY_CLASS = 'waifu-active'

/** 它自己造的 canvas：所有鼠标 / 触摸事件都挂在这个节点上 */
const CANVAS_ID = 'live2d'
const CANVAS_EVENTS = [
  'click',
  'contextmenu',
  'mousewheel',
  'touchstart',
  'touchmove',
  'touchend',
]

/** 挡板最长挡多久（超过就认输，说一声，然后撤） */
const GUARD_TIMEOUT = 20_000

export default defineNuxtPlugin(() => {
  /**
   * 装挡板（只装一次）。返回两个动作：模型就绪前再补一层 canvas 挡板、就绪后撤销。
   * 完整动机看文件上方那段注释。
   */
  function installGuard() {
    let released = false
    let canvasPatched = false
    const patched: Array<[EventTarget, string]> = []

    const swallow = (event: Event) => {
      if (!released) event.stopPropagation()
    }

    const patch = (target: EventTarget, types: string[]) => {
      for (const type of types) {
        target.addEventListener(type, swallow, true)
        patched.push([target, type])
      }
    }

    patch(document, ['mousemove'])

    return {
      /** canvas 出来之后，把它自己那一堆事件也挡上 */
      patchCanvas() {
        if (released || canvasPatched) return
        const canvas = document.getElementById(CANVAS_ID)
        if (!canvas) return
        canvasPatched = true
        patch(canvas, CANVAS_EVENTS)
      },

      /**
       * 撤销：真的 removeEventListener，而不是「让回调空转」——
       * 免得在 document 上留一个永久性的 mousemove 监听。
       */
      release() {
        if (released) return
        released = true
        for (const [target, type] of patched) {
          target.removeEventListener(type, swallow, true)
        }
        patched.length = 0

        // #waifu 在、就是没就绪 → 模型没下下来。说一句到底怎么了，
        // 别让人对着满屏的 TypeError 猜。（#waifu 压根不在的话是
        // 「用户自己关过小人、24 小时内不再初始化」，那是正常情况，不吭声。）
        const waifu = document.getElementById('waifu')
        if (waifu && !waifu.classList.contains(READY_CLASS)) {
          console.warn(
            '[live2d] 模型一直没加载出来，鼠标跟随的报错已静音。'
            + '多半是模型源（jsdelivr 的 fghrsh/live2d_api）没连上。',
          )
        }
      },
    }
  }

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

    // 先装挡板再注入脚本。反过来的话，脚本开始挂监听的那几帧会漏掉。
    const guard = installGuard()

    const script = document.createElement('script')
    script.src = LIVE2D_SRC
    script.async = true
    document.head.appendChild(script)

    // 小人是脚本加载完之后才异步插进 <body> 的（要先下完样式和模型列表）。
    // 观察它的出现是为了两件事：
    //   1. 窗口在它出来之前就被拖窄了 → 补一次 applyVisibility()
    //   2. 它多久拿到 .waifu-active（模型就绪）→ 挡板靠这个撤
    const observer = new MutationObserver(() => {
      applyVisibility()

      const waifu = document.getElementById('waifu')
      if (!waifu) return

      guard.patchCanvas()
      if (waifu.classList.contains(READY_CLASS)) {
        guard.release()
        observer.disconnect()
      }
    })
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      // 只在 class 变化时再回调一次 —— 那正是 .waifu-active 出现的时刻。
      // 注意 applyVisibility() 改的是 style，不在过滤名单里，不会自己触发自己。
      attributes: true,
      attributeFilter: ['class'],
    })

    // 兜底：别让这个观察者跟着整页的 DOM 变动一直跑下去。
    // 顺带把挡板也撤了 —— 都 20 秒了还不就绪，要么小人压根没被创建，
    // 要么模型没下下来；两种情况都不该让我们继续占着 mousemove。
    setTimeout(() => {
      observer.disconnect()
      guard.release()
    }, GUARD_TIMEOUT)
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
