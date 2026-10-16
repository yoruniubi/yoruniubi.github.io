/**
 * 站点文案 —— 想改首页上的字，只改这个文件。
 * 组件里用 const { site } = useAppConfig() 读取。
 */
export default defineAppConfig({
  site: {
    name: 'Frankxyh\'s_Blog',

    /** 首页最上面那句话 */
    motto: '生活不顺，但明天会更好。',

    /** 顶部「现在」这一栏：正在做什么。换内容只改这里 */
    now: '在不断完善这个博客，顺手学一点新东西。',

    /** 可选：更新时间，留空则不显示 */
    nowUpdated: '',

    github:'https://github.com/yoruniubi'
  },

  /**
   * 首页把文章按分类分组，这里决定分组的先后顺序。
   *
   * 分类名 = `content/blogs/` 下面的文件夹名（改文件夹名就是改分类名）。
   * 没列在这里的分类会排在后面（按名字），直接放在 blogs/ 下的算「未分类」。
   */
  categories: ['学习笔记', '开发折腾', '生活随想'],
  uncategorized: '未分类',
})
