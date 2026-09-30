# Frankxyh 的个人博客

Nuxt 4 + Nuxt Content + Tailwind CSS v4，部署在 GitHub Pages 上。

## 常用命令

```bash
npm install        # 装依赖
npm run dev        # 本地开发，http://localhost:3000
npm run generate   # 生成纯静态站点到 .output/public（部署用）
npm run build      # 构建成需要 Node 运行的服务端产物（本地预览用）
npm run typecheck  # 类型检查
```

## 写一篇新文章

在 `content/blogs/` 下新建一个 `.md` 文件，文件名就是网址：

```
content/blogs/my-post.md   →   /blogs/my-post
```

文件开头必须有 frontmatter：

```md
---
title: 文章标题
date: 2025-03-01
description: 一句话简介，会显示在卡片和文章标题下面。可选。
---

正文从这里开始。

## 用二级标题开头，不要用一级标题
```

**为什么不用 `#`**：页面顶部的大标题由 `title` 自动渲染，正文再写 `#` 会出现两个 `h1`。

写完直接 push，GitHub Actions 会自动重新构建并发布。

## 想改东西，去哪改

| 想改什么 | 改哪 |
| --- | --- |
| 站名、首页那句 motto、「现在」这一栏、GitHub 链接 | `app/app.config.ts` |
| 颜色（浅色 / 深色两套） | `app/theme.ts` |
| 字号、行高、间距、所有自定义样式 | `app/assets/css/main.css` |
| 图标 | 替换 `public/icon.ico`，然后 `cp public/icon.ico public/favicon.ico` |
| 顶部导航 | `app/components/AppHeader.vue` |
| 关于页 | `content/about.md` |

字号那张表在 `main.css` 的 `@theme static` 里，全站文字都从那里取值：

```css
--text-label: 0.875rem;   /* 14px  日期、眉标、栏目名 */
--text-eyebrow: 1.125rem; /* 18px  眉标 +「现在」 */
--text-body: 1.0625rem;   /* 17px  正文 */
--text-title: 1.375rem;   /* 22px  卡片标题 */
--text-heading: 1.875rem; /* 30px  区块标题 */
```

## 部署到 GitHub Pages

已经配好了，推上去就行：

```bash
git init
git add -A
git commit -m "init"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

然后去仓库的 **Settings → Pages**，把 **Source** 改成 **GitHub Actions**。

workflow 在 `.github/workflows/deploy.yml`，push 到 `main` 或 `master` 都会触发。

访问地址：

| 仓库名 | 地址 |
| --- | --- |
| `<用户名>.github.io` | `https://<用户名>.github.io/` |
| 其它名字（如 `my-blog`） | `https://<用户名>.github.io/my-blog/` |

两种情况都不用改配置 —— workflow 会自动把路径传给 `NUXT_APP_BASE_URL`，
`nuxt.config.ts` 读它来决定资源路径。

### 为什么必须是 `generate` 而不是 `build`

GitHub Pages 只能放静态文件，没有 Node 进程。`nuxt build` 产出的是需要跑
Node 的服务端产物；`nuxt generate` 会在构建阶段把每个页面都渲染成 HTML。

所以：**文章查询全部发生在构建时。** 新增文章后必须重新构建（push 即可，
workflow 会自动跑）。本地想预览静态产物：

```bash
npm run generate
npx serve .output/public
```
