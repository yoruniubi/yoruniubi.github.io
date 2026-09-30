import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blogs: defineCollection({
      type: 'page',
      source: 'blogs/*.md',
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
