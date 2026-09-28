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

## 网页内容编辑器

`admin/` 是可视化内容编辑界面，`editor-service/` 是负责 GitHub 登录和安全保存内容的 Cloudflare Worker。编辑器把文章保存为 Markdown，并提交回本仓库，再由 GitHub Actions 自动发布。

第一次部署与 GitHub App / Cloudflare Worker 的设置步骤见 [`editor-service/README.md`](editor-service/README.md)。Cloudflare Worker 需要通过密钥配置 GitHub App，密钥不能提交到仓库。
