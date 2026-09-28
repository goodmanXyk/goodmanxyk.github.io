import { defineConfig } from 'vitepress'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))

function contentItems(section: string) {
  const sectionRoot = join(projectRoot, section)
  const paths: string[] = []
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name)
      if (entry.isDirectory()) visit(absolute)
      else if (entry.isFile() && entry.name.endsWith('.md')) paths.push(absolute)
    }
  }
  visit(sectionRoot)

  return paths
    .map((absolute) => {
      const file = relative(projectRoot, absolute).replaceAll('\\', '/')
      const markdown = readFileSync(absolute, 'utf8')
      const title = markdown.match(/^title:\s*(?:"([^"]*)"|'([^']*)'|(.+))$/m)
        || markdown.match(/^#\s+(.+)$/m)
      const label = title ? (title[1] || title[2] || title[3]).trim() : file.split('/').at(-1)!.replace(/\.md$/, '')
      const route = `/${file.replace(/\.md$/, '').replace(/\/index$/, '')}${file.endsWith('/index.md') ? '/' : ''}`
      return { text: label, link: route }
    })
    .sort((a, b) => Number(b.link.endsWith('/')) - Number(a.link.endsWith('/')) || a.text.localeCompare(b.text, 'zh-CN'))
}

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
      { text: '内容编辑', link: 'https://wanwu-editor.goodmanxyk-github-io.workers.dev' },
      { text: '关于', link: '/about' },
    ],
    sidebar: {
      '/notes/': [
        {
          text: '知识笔记',
          items: contentItems('notes'),
        },
      ],
      '/tutorials/': [
        {
          text: '循序渐进',
          items: contentItems('tutorials'),
        },
      ],
      '/demos/': [
        {
          text: '动手实验',
          items: contentItems('demos'),
        },
      ],
      '/guide/': [
        {
          text: '站点页面',
          items: contentItems('guide'),
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
