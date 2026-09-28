# 万物折腾局

个人知识库网站，基于 VitePress 与 GitHub Pages。

## 本地开发

```bash
npm install
npm run docs:dev
```

## 构建与预览

```bash
npm run docs:build
npm run docs:preview
```

## 内容目录

- `notes/`：知识笔记
- `demos/`：演示与实验
- `tutorials/`：教学内容
- `about.md`：个人介绍
- `.vitepress/config.mts`：站点名称、导航、侧边栏与主题设置

推送到 `main` 分支后，GitHub Actions 会自动构建并发布到 `https://goodmanxyk.github.io/`。
