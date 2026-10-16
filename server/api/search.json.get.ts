/**
 * 搜索索引 —— 构建时生成一次，产物里就是一个静态 JSON（`/api/search.json`）。
 *
 * 静态托管没有数据库可查，所以搜索的原料必须在构建阶段就备好：
 *   posts    —— 每篇的标题 / 日期 / 分类，用来拼结果的头
 *   sections —— 正文按标题切成的小节，用来在正文里搜
 *
 * sections 交给 Nuxt Content 的 queryCollectionSearchSections：它把 markdown 转成纯文本
 * （代码块、链接语法这些都被剥掉），并带上「这一段的标题」和「它在第几层」，
 * 所以结果里能显示命中在哪一节、也能只给标题命中的结果排前面。
 *
 * 这个文件只在打开 /search 时才被下载（见 app/pages/search.vue），其它页面不受影响。
 * 路由在 nuxt.config.ts 的 nitro.prerender.routes 里，构建时会被写成静态文件。
 *
 * 下面两个函数必须从 '@nuxt/content/server' 显式引入，不能靠自动导入：
 * 自动导入在这里解析到的是「客户端版本」（签名是 queryCollection(collection)），
 * 跟带 event 的 H3 版本对不上 —— vue-tsc 会报「Expected 1 arguments, but got 2」、
 * 以及 select('date') 不被接受。运行时能跑，但类型是错的，所以还是写明。
 */
import { queryCollection, queryCollectionSearchSections } from '@nuxt/content/server'

export default defineEventHandler(async (event) => {
  const [sections, posts] = await Promise.all([
    queryCollectionSearchSections(event, 'blogs'),
    queryCollection(event, 'blogs')
      .select('path', 'title', 'description', 'date', 'category')
      .all(),
  ])

  return { posts, sections }
})
