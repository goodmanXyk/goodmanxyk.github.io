# 网页内容编辑服务部署

编辑器由两部分组成：Cloudflare Worker 托管的编辑页面与 API，以及 GitHub App 提供的身份和仓库写入权限。访客仍然可以正常浏览 GitHub Pages；只有 GitHub 账号 `goodmanXyk` 能打开编辑器并保存内容。

Cloudflare Workers Free 目前包含每天 100,000 次请求，个人编辑流量通常低于这个额度。GitHub App 本身不收费。第一次部署需要一个 Cloudflare 账号和你自己创建的 GitHub App。

## 1. 部署编辑器并取得回调地址

在项目目录运行：

```powershell
npx wrangler login
npm run editor:deploy
```

首次部署会显示编辑器的 `workers.dev` 地址。先记下这个地址，接下来要把它填进 GitHub App。

## 2. 创建并安装 GitHub App

在 GitHub 的 **Settings → Developer settings → GitHub Apps → New GitHub App** 创建应用：

- App name：`Wanwu Editor`（名字可自行调整）
- Homepage URL：刚部署获得的 `workers.dev` 地址
- User authorization callback URL：同一个地址后接 `/auth/callback`
- 关闭 Webhook（不需要接收仓库事件）
- Repository permissions：只给 **Contents: Read and write**；Metadata 保留 GitHub 自动要求的只读权限
- 安装时只选择 `goodmanXyk/goodmanxyk.github.io` 这个仓库
- 生成并保管 Client ID 与 Client secret
- 创建后点 **Install App**，只选择 `goodmanXyk/goodmanxyk.github.io`

不要把 App 的 Client secret 或其他令牌发到聊天，也不要提交到仓库。

## 3. 设置 Worker 密钥

在项目目录分别运行下列命令，按提示输入 GitHub App 的 Client ID、Client secret，并设置一段新的随机 Session secret：

```powershell
npx wrangler secret put GITHUB_APP_CLIENT_ID --config editor-service/wrangler.jsonc
npx wrangler secret put GITHUB_APP_CLIENT_SECRET --config editor-service/wrangler.jsonc
npx wrangler secret put SESSION_SECRET --config editor-service/wrangler.jsonc
```

`SESSION_SECRET` 建议至少 32 个随机字符。Cloudflare 将这些值作为 Worker secrets 保存，源码和浏览器都不会收到它们。

## 编辑范围

后台允许编辑 `notes/`、`demos/`、`tutorials/`、`guide/` 中的 Markdown 页面、三个栏目大纲（`notes/index.md`、`demos/index.md`、`tutorials/index.md`）和 `about.md`。栏目大纲可以编辑但不能从工作台删除，以保留栏目入口。带 `<script setup>` 的交互 Demo 不可视化编辑，但可以在确认后删除。编辑时可预览当前内容；保存或删除会提交到 `main`，触发现有 GitHub Pages 工作流。删除文章前，请同步移除大纲中指向该文章的链接，避免死链阻止网站发布。
