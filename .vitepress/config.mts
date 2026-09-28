import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: '万物折腾局',
  description: '杂学开发者的笔记、实验与教程。',
  base: '/',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    siteTitle: '万物折腾局',
    nav: [
      { text: '首页', link: '/' },
      { text: '知识笔记', link: '/notes/' },
      { text: '动手实验', link: '/demos/' },
      { text: '教学内容', link: '/tutorials/' },
      { text: '关于', link: '/about' },
    ],
    sidebar: {
      '/notes/': [
        {
          text: '知识笔记',
          items: [
            { text: '笔记总览', link: '/notes/' },
            { text: '前端基础', link: '/notes/frontend/' },
          ],
        },
      ],
      '/tutorials/': [
        {
          text: '循序渐进',
          items: [
            { text: '教学总览', link: '/tutorials/' },
            { text: '从零开始认识网页', link: '/tutorials/first-webpage' },
          ],
        },
      ],
      '/demos/': [
        {
          text: '动手实验',
          items: [
            { text: '实验总览', link: '/demos/' },
            { text: '第一个交互示例', link: '/demos/first-demo' },
          ],
        },
      ],
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索笔记', buttonAriaLabel: '搜索笔记' },
          modal: {
            noResultsText: '没有找到相关内容',
            resetButtonTitle: '清除搜索',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },
    editLink: {
      pattern: 'https://github.com/goodmanXyk/goodmanxyk.github.io/edit/main/:path',
      text: '在 GitHub 上编辑此页',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/goodmanXyk' },
    ],
    footer: {
      message: '把好奇心留下，把想法做出来。',
      copyright: '© 2026 万物折腾局',
    },
    outline: { label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新于' },
  },
})
