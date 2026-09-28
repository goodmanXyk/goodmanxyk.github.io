import './style.css'

const app = document.querySelector('#app')

const state = {
  user: null,
  entries: [],
  selectedPath: '',
  document: null,
  editor: null,
  isNew: false,
}

const sections = [
  { id: 'notes', label: '知识笔记' },
  { id: 'demos', label: '动手实验' },
  { id: 'tutorials', label: '教学内容' },
  { id: 'pages', label: '站点页面' },
]

function renderShell() {
  app.innerHTML = `
    <main class="admin-shell">
      <header class="topbar">
        <a class="brand" href="https://goodmanxyk.github.io/" aria-label="返回万物折腾局首页">
          <span class="brand-mark">万</span>
          <span><strong>万物折腾局</strong><small>内容工作台</small></span>
        </a>
        <div class="topbar-actions">
          <span class="account" id="account-state">正在检查登录状态…</span>
          <button class="button button-quiet" id="logout-button" hidden>退出登录</button>
        </div>
      </header>

      <section class="welcome" id="welcome-panel" hidden>
        <div class="welcome-copy">
          <span class="eyebrow">PRIVATE EDITOR</span>
          <h1>把想法写下来。</h1>
          <p>登录后可以用可视化编辑器整理笔记、实验和教程，保存后网站会自动更新。</p>
        </div>
        <button class="button button-primary" id="login-button">使用 GitHub 登录 <span aria-hidden="true">↗</span></button>
      </section>

      <section class="workspace" id="workspace" hidden>
        <aside class="sidebar">
          <div class="sidebar-heading">
            <div><span class="eyebrow">YOUR LIBRARY</span><h2>内容库</h2></div>
            <button class="icon-button" id="new-button" aria-label="新建文章" title="新建文章">＋</button>
          </div>
          <label class="filter-label" for="section-filter">内容分类</label>
          <select id="section-filter" class="select-control">
            ${sections.map((section) => `<option value="${section.id}">${section.label}</option>`).join('')}
          </select>
          <div class="entry-list" id="entry-list" aria-live="polite"></div>
          <a class="back-link" href="https://goodmanxyk.github.io/">← 查看公开网站</a>
        </aside>

        <section class="editor-panel" id="editor-panel">
          <div class="empty-state" id="empty-state">
            <div class="empty-icon">✳</div>
            <h2>这里是你的内容工作台</h2>
            <p>选择左侧已有文章，或新建一篇内容。正文可以像文档一样编辑，不需要手写 Markdown。</p>
            <button class="button button-primary" id="empty-new-button">新建内容</button>
          </div>
          <div class="empty-state" id="protected-state" hidden>
            <div class="empty-icon">⌘</div>
            <h2>这是一个带交互代码的页面</h2>
            <p>为了避免可视化编辑时改坏 Demo 的运行代码，这篇文章暂时保留在代码编辑流程中。</p>
            <a class="button button-quiet" id="source-link" href="#" target="_blank" rel="noreferrer">在 GitHub 上查看源文件 ↗</a>
          </div>
          <form class="document-form" id="document-form" hidden>
            <div class="form-heading">
              <div>
                <span class="eyebrow" id="document-kind">知识笔记</span>
                <h1 id="form-heading">编辑内容</h1>
              </div>
              <div class="form-actions">
                <a class="button button-quiet" id="preview-link" href="#" target="_blank" rel="noreferrer" hidden>查看已发布页 ↗</a>
                <button class="button button-primary" id="save-button" type="submit">保存并发布</button>
              </div>
            </div>
            <div class="metadata-grid">
              <label class="field-label">标题<input class="text-control" id="title-input" maxlength="100" required placeholder="例如：浏览器是怎样绘制页面的？" /></label>
              <label class="field-label">简短说明<input class="text-control" id="description-input" maxlength="180" placeholder="用一句话概括这篇内容" /></label>
            </div>
            <div class="slug-row" id="slug-row" hidden>
              <label class="field-label">页面地址<input class="text-control" id="slug-input" maxlength="80" placeholder="保存时会根据标题生成" /></label>
              <p>地址会自动生成，也可以改成简短的英文或拼音。</p>
            </div>
            <div class="body-heading"><label class="field-label" for="body-editor">正文</label><span>可用工具栏设置标题、加粗、列表和链接</span></div>
            <div class="editor-frame" id="body-editor"></div>
            <div class="status-line" id="save-status" role="status" aria-live="polite"></div>
          </form>
        </section>
      </section>
      <footer class="footer">保存后，GitHub 会自动重新构建并发布网站。</footer>
    </main>
  `
}

function setStatus(message, kind = '') {
  const status = document.querySelector('#save-status')
  if (!status) return
  status.textContent = message
  status.dataset.kind = kind
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (response.status === 401) {
    state.user = null
    showLoggedOut()
    throw new Error('登录已过期，请重新登录。')
  }

  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || '请求失败，请稍后再试。')
  return result
}

function showLoggedOut() {
  document.querySelector('#account-state').textContent = '仅限 Goodman 账号编辑'
  document.querySelector('#welcome-panel').hidden = false
  document.querySelector('#workspace').hidden = true
  document.querySelector('#logout-button').hidden = true
  destroyEditor()
}

function showLoggedIn(user) {
  state.user = user
  document.querySelector('#account-state').textContent = `已登录 @${user.login}`
  document.querySelector('#welcome-panel').hidden = true
  document.querySelector('#workspace').hidden = false
  document.querySelector('#logout-button').hidden = false
  loadEntries()
}

function destroyEditor() {
  state.editor?.destroy()
  state.editor = null
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/) 
  if (!match) return { title: '', description: '', body: raw, frontmatter: '' }

  const frontmatter = match[1]
  const getValue = (key) => {
    const line = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))
    if (!line) return ''
    const value = line[1].trim()
    try { return JSON.parse(value) } catch { return value.replace(/^['"]|['"]$/g, '') }
  }

  return {
    title: getValue('title'),
    description: getValue('description'),
    body: raw.slice(match[0].length),
    frontmatter,
  }
}

function updateFrontmatter(frontmatter, title, description) {
  const retained = frontmatter
    .split(/\r?\n/)
    .filter((line) => !/^\s*(title|description):/.test(line))
    .filter(Boolean)
  return [
    `title: ${JSON.stringify(title)}`,
    ...(description ? [`description: ${JSON.stringify(description)}`] : []),
    ...retained,
  ].join('\n')
}

function pathTitle(path) {
  return path.split('/').at(-1).replace(/\.md$/i, '').replace(/[-_]/g, ' ')
}

function currentSection() {
  return sections.find((section) => section.id === document.querySelector('#section-filter').value)
}

function renderEntries() {
  const list = document.querySelector('#entry-list')
  const selectedSection = currentSection().id
  const entries = state.entries.filter((entry) => entry.section === selectedSection)

  if (!entries.length) {
    list.innerHTML = '<p class="list-empty">这个分类还没有文章。<br>点右上角＋开始写。</p>'
    return
  }

  list.innerHTML = entries.map((entry) => `
    <button class="entry-button ${entry.path === state.selectedPath ? 'is-selected' : ''}" data-path="${escapeHtml(entry.path)}">
      <span class="entry-title">${escapeHtml(pathTitle(entry.path))}</span>
      <span class="entry-path">${escapeHtml(entry.path)}</span>
    </button>
  `).join('')

  list.querySelectorAll('[data-path]').forEach((button) => {
    button.addEventListener('click', () => openEntry(button.dataset.path))
  })
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char])
}

async function loadEntries() {
  const list = document.querySelector('#entry-list')
  list.innerHTML = '<p class="list-empty">正在载入内容…</p>'
  try {
    const { entries } = await request('/api/content')
    state.entries = entries
    renderEntries()
  } catch (error) {
    list.innerHTML = `<p class="list-error">${escapeHtml(error.message)}</p>`
  }
}

async function makeEditor(markdown = '') {
  destroyEditor()
  const [{ default: Editor }] = await Promise.all([
    import('@toast-ui/editor'),
    import('@toast-ui/editor/dist/toastui-editor.css'),
    import('@toast-ui/editor/dist/i18n/zh-cn'),
  ])
  state.editor = new Editor({
    el: document.querySelector('#body-editor'),
    height: '480px',
    initialEditType: 'wysiwyg',
    previewStyle: 'vertical',
    usageStatistics: false,
    language: 'zh-CN',
    initialValue: markdown,
    toolbarItems: [
      ['heading', 'bold', 'italic', 'strike'],
      ['hr', 'quote'],
      ['ul', 'ol', 'task'],
      ['table', 'link'],
      ['code', 'codeblock'],
    ],
  })
}

async function showEditor(documentData, isNew = false) {
  state.document = documentData
  state.isNew = isNew
  state.selectedPath = isNew ? '' : documentData.path
  document.querySelector('#empty-state').hidden = true
  document.querySelector('#protected-state').hidden = true
  document.querySelector('#document-form').hidden = false
  document.querySelector('#form-heading').textContent = isNew ? '新建内容' : '编辑内容'
  document.querySelector('#document-kind').textContent = currentSection().label
  document.querySelector('#title-input').value = documentData.title || ''
  document.querySelector('#description-input').value = documentData.description || ''
  document.querySelector('#slug-row').hidden = !isNew
  document.querySelector('#slug-input').value = ''
  document.querySelector('#preview-link').hidden = isNew
  document.querySelector('#save-button').disabled = false
  setStatus('')
  await makeEditor(documentData.body || '')
  renderEntries()
}

async function openEntry(path) {
  try {
    const { document: documentData } = await request(`/api/content?path=${encodeURIComponent(path)}`)
    if (documentData.body.includes('<script setup')) {
      document.querySelector('#protected-state').hidden = false
      document.querySelector('#empty-state').hidden = true
      document.querySelector('#document-form').hidden = true
      document.querySelector('#source-link').href = `https://github.com/goodmanXyk/goodmanxyk.github.io/blob/main/${path.split('/').map(encodeURIComponent).join('/')}`
      destroyEditor()
      state.selectedPath = path
      renderEntries()
      return
    }

    await showEditor(documentData)
    const previewPath = path.replace(/\.md$/i, '').replace(/\/index$/, '/')
    document.querySelector('#preview-link').href = `https://goodmanxyk.github.io/${previewPath.replace(/^\//, '')}`
  } catch (error) {
    setStatus(error.message, 'error')
  }
}

async function startNewEntry() {
  document.querySelector('#empty-state').hidden = true
  document.querySelector('#protected-state').hidden = true
  await showEditor({ title: '', description: '', body: '', frontmatter: '' }, true)
}

function makeSlug(title) {
  const normalized = title.trim().toLocaleLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[\\/]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || `note-${new Date().toISOString().slice(0, 10)}`
}

async function saveDocument(event) {
  event.preventDefault()
  const title = document.querySelector('#title-input').value.trim()
  const description = document.querySelector('#description-input').value.trim()
  if (!title) return

  let path = state.document.path
  if (state.isNew) {
    const slug = makeSlug(document.querySelector('#slug-input').value || title)
    path = currentSection().id === 'pages'
      ? `guide/${slug}.md`
      : `${currentSection().id}/${slug}.md`
  }

  const frontmatter = updateFrontmatter(state.document.frontmatter || '', title, description)
  let body = state.editor.getMarkdown().trim()
  if (/^#\s.+$/m.test(body)) body = body.replace(/^#\s.+$/m, `# ${title}`)
  else body = `# ${title}${body ? `\n\n${body}` : ''}`
  const markdown = `---\n${frontmatter}\n---\n\n${body}\n`
  const saveButton = document.querySelector('#save-button')
  saveButton.disabled = true
  setStatus('正在保存并触发网站更新…')

  try {
    await request('/api/content', {
      method: 'PUT',
      body: JSON.stringify({ path, content: markdown, create: state.isNew }),
    })
    state.document = { path, title, description, body: state.editor.getMarkdown(), frontmatter }
    state.isNew = false
    state.selectedPath = path
    document.querySelector('#form-heading').textContent = '编辑内容'
    document.querySelector('#document-kind').textContent = currentSection().label
    document.querySelector('#slug-row').hidden = true
    document.querySelector('#preview-link').hidden = false
    const previewPath = path.replace(/\.md$/i, '').replace(/\/index$/, '/')
    document.querySelector('#preview-link').href = `https://goodmanxyk.github.io/${previewPath.replace(/^\//, '')}`
    setStatus('已保存。网站正在自动重新构建，稍等片刻即可查看。', 'success')
    await loadEntries()
  } catch (error) {
    setStatus(error.message, 'error')
  } finally {
    saveButton.disabled = false
  }
}

async function start() {
  renderShell()
  document.querySelector('#login-button').addEventListener('click', () => {
    window.location.assign('/auth/login')
  })
  document.querySelector('#logout-button').addEventListener('click', async () => {
    await request('/auth/logout', { method: 'POST' }).catch(() => {})
    window.location.reload()
  })
  document.querySelector('#section-filter').addEventListener('change', () => {
    state.selectedPath = ''
    document.querySelector('#document-form').hidden = true
    document.querySelector('#protected-state').hidden = true
    document.querySelector('#empty-state').hidden = false
    destroyEditor()
    renderEntries()
  })
  document.querySelector('#new-button').addEventListener('click', () => { void startNewEntry() })
  document.querySelector('#empty-new-button').addEventListener('click', () => { void startNewEntry() })
  document.querySelector('#document-form').addEventListener('submit', saveDocument)

  try {
    const { user } = await request('/api/me')
    showLoggedIn(user)
  } catch {
    showLoggedOut()
  }
}

start()
