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
    now: '在重写这个博客，顺手学一点新东西。',

    /** 可选：更新时间，留空则不显示 */
    nowUpdated: '',

    github:'https://github.com/yoruniubi'
  },
})
