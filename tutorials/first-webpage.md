---
title: 从零开始认识网页
description: 用一个 HTML 文件创建并理解第一个网页。
---

# 从零开始认识网页

本教程先从最直接的网页文件开始。无需框架，只要一个文本编辑器和浏览器。

## 1. 创建一个 HTML 文件

新建 `index.html`，写入下面的内容：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>我的第一个网页</title>
  </head>
  <body>
    <h1>你好，网页！</h1>
    <p>这是我创建的第一个页面。</p>
  </body>
</html>
```

## 2. 在浏览器中打开

保存文件后，用浏览器打开它。你会看到标题和段落已经显示在页面上。

## 3. 认识几个关键部分

- `<!doctype html>` 声明这是一个 HTML 文档。
- `<head>` 保存页面的标题和字符编码等信息。
- `<body>` 包含用户实际看到的网页内容。
- `<h1>` 和 `<p>` 分别表示标题和段落。

接下来可以尝试修改标题、文字和标签，再重新加载页面观察差异。
