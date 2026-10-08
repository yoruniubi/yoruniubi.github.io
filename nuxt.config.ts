import tailwindcss from "@tailwindcss/vite";
import { resolve } from 'node:path'
import { applyAutoFrontmatter } from "./auto-frontmatter";

const rawBaseURL = process.env.NUXT_APP_BASE_URL || '/'
const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`

export default defineNuxtConfig({
  modules: ['@nuxt/content'],
  devtools: { enabled: true },
  compatibilityDate: '2024-04-03',
  css: [
    '@fontsource/fraunces/400.css',
    '@fontsource/fraunces/500.css',
    '@fontsource/fraunces/600.css',
    '@fontsource/fraunces/700.css',
    '@fontsource-variable/noto-serif-sc/index.css',
    '@fontsource/newsreader/400.css',
    '@fontsource/newsreader/500.css',
    '@fontsource/newsreader/600.css',
    '@fontsource/ibm-plex-mono/400.css',
    '@fontsource/ibm-plex-mono/500.css',
    '~/assets/css/main.css',
  ],

  content: {
    build: {
      pathMeta: {
        slugifyOptions: {
          remove: /[^\w\s\u4e00-\u9fff\u3400-\u4dbf$*_+~.()'"!\-:@]+/g,
        },
      },
    },
  },

  hooks: {
    /**
     * 写文章只写正文，frontmatter 由 auto-frontmatter.ts 自动补全。
     * 想改规则（比如换一种日期来源）去改那个文件，不用动这里。
     */
    'content:file:afterParse'(ctx) {
      applyAutoFrontmatter(ctx.file.path, ctx.collection.name, ctx.content)
    },
  },

  /**
   * GitHub Pages 只能托管静态文件，没有 Node 服务，
   * 所以部署时用 `nuxt generate`：构建阶段把所有页面渲染成 HTML。
   *
   * 注意：这里没有数据库，文章查询全部发生在构建时。
   * 新增文章后必须重新构建（push 到 GitHub 会自动触发 workflow）。
   */
  nitro: {
    /**
     * 让跟文章放在一起的图片在 **dev** 下能访问到：
     *   content/blogs/某篇/image-8.png  →  /images/blogs/某篇/image-8.png
     *
     * 正文里写相对地址（`![](image-8.png)`）也能用的另一半在 auto-frontmatter.ts
     * 里（把相对地址改写成上面这个绝对地址），两边合起来，图片跟 `.md` 放一起就行。
     *
     * 这条只管 dev。静态产物（`nuxt generate` → `.output/public`）不吃它：
     * Nuxt 的构建路径不会调 Nitro 的 copyPublicAssets，产物里的 public/ 是 Vite
     * 拷 publicDir 拷进去的。所以产物里那份由 `npm run generate` 的 postgenerate
     * 自动跑 scripts/sync-images.mjs 补上（声明式、钩子两种写法都试过，产物里都没效果）。
     *
     * fallthrough 必须写 true：`/images/` 这个前缀现在有两个来源
     * （public/images/ 里的老图、content/ 里的新图），少了它，
     * content/ 里找不到的会把 public/ 里的也一起变成 404。
     */
    publicAssets: [
      {
        baseURL: '/images/',
        dir: resolve('content'),
        maxAge: 60 * 60 * 24 * 30, // 30 天
        fallthrough: true,
      },
    ],
    prerender: {
      crawlLinks: true, // 首页链到的每一篇文章都会自动被渲染
      routes: ['/', '/about'],
      failOnError: true, // 有页面渲染失败就让构建直接挂掉，避免部署出半个站
    },
  },

  app: {
    baseURL,
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: 'Frankxyh\'s_Blog',
      meta: [
        { name: 'description', content: '个人博客。生活不顺，但明天会更好。' },
      ],
      // 图标：public/icon.ico 是唯一的源，favicon.ico 是它在默认路径上的副本
      // href 前面必须拼上 baseURL，否则部署到子路径下会 404
      link: [
        { rel: 'icon', type: 'image/x-icon', href: `${baseURL}icon.ico` },
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
