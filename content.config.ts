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
      schema: z.object({
        date: z.string().optional(),
        description: z.string().optional(),
      }),
    }),
    // 根目录下的独立页面（about.md 等）
    pages: defineCollection({
      type: 'page',
      source: '*.md',
    }),
  },
})
