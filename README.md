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

## 写一篇新文章：只写正文

在 `content/blogs/` 下新建一个 `.md` 文件，**正文怎么写就怎么写**，frontmatter 会自动补：

```md
# 读研心得

关于读研的一些感想。

## 第一节

正文从这里开始。
```

上面这个文件**一行 frontmatter 都不用写**，博客会这样理解它：

| 字段 | 从哪来 |
| --- | --- |
| `title` | 正文第一个 `# 标题` → 「读研心得」 |
| `description` | `# 标题` 后面的第一段 → 「关于读研的一些感想。」 |
| `date` | 这个文件在 git 里最后一次被改动的日期 |
| 网址 | 文件名：`content/blogs/读研心得.md` → `/blogs/读研心得` |

几条规则：

- **`# 标题` 只会出现一次。** 它被当成文章大标题渲染在页面顶部，不会再在正文里重复出现。所以不要在正文里再抄一遍标题。
- **第一段会被当成摘要**，显示在首页卡片上（最多两行）和文章标题下面，不会再在正文里重复出现。
- **日期来自 git 提交记录**，不是文件里写的。还没提交过的新文章会用「文件最后一次保存的时间」兜底。

想单独控制某一项，就在文件开头写 frontmatter，**写了就以你写的为准**：

```md
---
title: 读研心得                    # 覆盖正文里的 # 标题
date: 2026-09-30                   # 覆盖 git 日期
description: 关于读研的一些感想     # 覆盖自动摘要
---

## 从这里开始写正文
```

这套自动补全的逻辑在 `auto-frontmatter.ts`，想改规则（比如换一种日期来源）改那个文件就行。

写完直接 push，GitHub Actions 会自动重新构建并发布。

> **新增文章后必须重新构建。** GitHub Pages 是纯静态托管，文章查询全部发生在构建时，不是「传个 md 上去就生效」——push 上去 workflow 会自动重跑。

## 想改东西，去哪改

| 想改什么 | 改哪 |
| --- | --- |
| 站名、首页那句 motto、「现在」这一栏、GitHub 链接 | `app/app.config.ts` |
| 颜色（浅色 / 深色两套） | `app/theme.ts` |
| 字号、行高、间距、所有自定义样式 | `app/assets/css/main.css` |
| frontmatter 自动补全的规则 | `auto-frontmatter.ts` |
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
git add -A
git commit -m "更新"
git push
```

去仓库的 **Settings → Pages**，把 **Source** 改成 **GitHub Actions**（只需要设置一次）。

workflow 在 `.github/workflows/deploy.yml`，push 到 `main` 或 `master` 都会触发。

这个仓库叫 `yoruniubi.github.io`，属于**用户站**，地址就是：

```
https://yoruniubi.github.io/
```

> 如果以后换成别的仓库名（比如 `my-blog`），地址会变成
> `https://yoruniubi.github.io/my-blog/`，**不用改任何配置** —— workflow 会把
> 路径传给 `NUXT_APP_BASE_URL`，`nuxt.config.ts` 读它来决定资源路径。

### 为什么必须是 `generate` 而不是 `build`

GitHub Pages 只能放静态文件，没有 Node 进程。`nuxt build` 产出的是需要跑
Node 的服务端产物；`nuxt generate` 会在构建阶段把每个页面都渲染成 HTML。

本地想预览静态产物：

```bash
npm run generate
npx serve .output/public
```
