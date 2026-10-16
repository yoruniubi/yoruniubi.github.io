import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blogs: defineCollection({
      type: 'page',
      // `*` 不跨目录，只能匹配 blogs 这一层；
      // ** 才能递归读到子文件夹里的文章：
      //   content/blogs/a/b.md  →  /blogs/a/b
      source: 'blogs/**/*.md',
      // frontmatter 全部可选：
      //   title       不写 → 用正文第一个 `# 标题`（Nuxt Content 自己抽的）
      //   description 不写 → 用 `# 标题` 后面的第一段
      //   date        不写 → 用 git 提交日期（见 auto-frontmatter.ts）
      //   category    不用写 → 用文件所在的文件夹名
      //
      // 分类就是文件夹：
      //   content/blogs/开发折腾/某篇.md          → 分类“开发折腾”
      //   content/blogs/开发折腾/某篇/某篇.md     → 分类“开发折腾”（带图的文章自己占一层）
      //   content/blogs/某篇.md                   → 未分类
      // 网址里不带分类段，分类只体现在首页的分组上。
      schema: z.object({
        date: z.string().optional(),
        description: z.string().optional(),
        // 必须在这里声明：schema 是 z.object，没声明的字段会被丢掉。
        // 但你自己不用写，auto-frontmatter.ts 会从文件夹推出来。
        category: z.string().optional(),
      }),
    }),
    // 根目录下的独立页面（about.md 等）
    pages: defineCollection({
      type: 'page',
      source: '*.md',
    }),
  },
})
