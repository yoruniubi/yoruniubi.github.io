import tailwindcss from "@tailwindcss/vite";
import { applyAutoFrontmatter } from "./auto-frontmatter";

/**
 * 部署到 GitHub Pages 时，站点会放在子路径下（例如 /my-blog/），
 * 所有资源路径必须跟着变，否则 CSS / 字体 / 图标全部 404。
 *
 * 这个值由 .github/workflows/deploy.yml 注入，两种情况都自动适配：
 *   用户站  https://<用户名>.github.io/          →  '/'
 *   项目站  https://<用户名>.github.io/<仓库名>/ →  '/<仓库名>/'
 * 本地开发不设置这个变量，默认 '/'
 */
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
    // 中文衬线（按需子集，浏览器只下用得上的那些切片）
    '@fontsource-variable/noto-serif-sc/index.css',
    '@fontsource/newsreader/400.css',
    '@fontsource/newsreader/500.css',
    '@fontsource/newsreader/600.css',
    '@fontsource/ibm-plex-mono/400.css',
    '@fontsource/ibm-plex-mono/500.css',
    '~/assets/css/main.css',
  ],

  /**
   * 中文文件名默认会被 slugify 清空：`关于读研生活.md` 的路径会变成 `/blogs`，
   * 两篇中文名的文章就互相覆盖了。
   * 这里把中日韩文字加进「允许保留」的字符集，让文件名原样当网址：
   *   content/blogs/关于读研生活.md  →  /blogs/关于读研生活
   */
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
      title: 'Frankxyh的个人博客',
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
