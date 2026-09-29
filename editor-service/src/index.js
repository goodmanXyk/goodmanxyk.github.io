const SESSION_COOKIE = 'wanwu_editor_session'
const STATE_COOKIE = 'wanwu_editor_oauth_state'
const SESSION_SECONDS = 6 * 60 * 60

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
})

function cookieValue(request, name) {
  const cookie = request.headers.get('Cookie') || ''
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return ''
}

function randomToken(size = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function toBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function encodeUtf8Base64(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeUtf8Base64(value) {
  const base64 = value.replace(/\s/g, '')
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function encryptionKey(secret) {
  const material = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', material, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encryptSession(payload, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await encryptionKey(secret)
  const encoded = new TextEncoder().encode(JSON.stringify(payload))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipher))}`
}

async function decryptSession(value, secret) {
  try {
    const [ivPart, cipherPart] = value.split('.')
    if (!ivPart || !cipherPart) return null
    const key = await encryptionKey(secret)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64Url(ivPart) },
      key,
      fromBase64Url(cipherPart),
    )
    const session = JSON.parse(new TextDecoder().decode(plain))
    return session.expiresAt > Date.now() ? session : null
  } catch {
    return null
  }
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
}

function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

function cleanPath(path) {
  if (typeof path !== 'string' || path.length > 240) return ''
  const normalized = path.replace(/^\/+/, '')
  if (!normalized || normalized.includes('..') || normalized.includes('\\') || normalized.includes('\0')) return ''
  if (!normalized.endsWith('.md')) return ''
  if (/^(notes|demos|tutorials)\/index\.md$/i.test(normalized)) return ''
  if (normalized.toLowerCase() === 'guide/index.md') return ''

  const allowedDirectory = /^(notes|demos|tutorials)\/.+\.md$/i.test(normalized)
  const allowedPage = normalized === 'about.md' || /^guide\/.+\.md$/i.test(normalized)
  return allowedDirectory || allowedPage ? normalized : ''
}

function encodedPath(path) {
  return path.split('/').map(encodeURIComponent).join('/')
}

async function githubFetch(path, token, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'wanwu-editor',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  return response
}

async function getAuthorizedSession(request, env) {
  const encrypted = cookieValue(request, SESSION_COOKIE)
  if (!encrypted || !env.SESSION_SECRET) return null
  const session = await decryptSession(encrypted, env.SESSION_SECRET)
  if (!session?.accessToken) return null

  const response = await githubFetch('/user', session.accessToken)
  if (!response.ok) return null
  const user = await response.json()
  if (user.login?.toLowerCase() !== env.ALLOWED_GITHUB_LOGIN?.toLowerCase()) return null
  return { user, accessToken: session.accessToken }
}

async function githubContentsPath(path, env) {
  return `/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/contents/${encodedPath(path)}`
}

async function handleApi(request, env, url) {
  const session = await getAuthorizedSession(request, env)
  if (!session) return json({ error: '请先使用站点所有者的 GitHub 账号登录。' }, 401)

  if (request.method === 'GET' && url.pathname === '/api/me') {
    return json({ user: { login: session.user.login, avatarUrl: session.user.avatar_url } })
  }

  if (request.method === 'GET' && url.pathname === '/api/content') {
    const path = url.searchParams.get('path')
    if (path) {
      const safePath = cleanPath(path)
      if (!safePath) return json({ error: '这个文件不在可编辑范围内。' }, 400)

      const response = await githubFetch(
        `${await githubContentsPath(safePath, env)}?ref=${encodeURIComponent(env.GITHUB_BRANCH || 'main')}`,
        session.accessToken,
      )
      if (!response.ok) return json({ error: '读取内容失败，请刷新后重试。' }, response.status)
      const file = await response.json()
      return json({
        document: {
          path: safePath,
          sha: file.sha,
          content: decodeUtf8Base64(file.content || ''),
        },
      })
    }

    const ref = encodeURIComponent(env.GITHUB_BRANCH || 'main')
    const treeResponse = await githubFetch(
      `/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/git/trees/${ref}?recursive=1`,
      session.accessToken,
    )
    if (!treeResponse.ok) return json({ error: '读取文章列表失败。' }, treeResponse.status)
    const tree = await treeResponse.json()
    const entries = (tree.tree || [])
      .filter((item) => item.type === 'blob' && cleanPath(item.path))
      .map((item) => ({
        path: item.path,
        section: item.path.startsWith('notes/') ? 'notes'
          : item.path.startsWith('demos/') ? 'demos'
            : item.path.startsWith('tutorials/') ? 'tutorials' : 'pages',
      }))
      .sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
    return json({ entries })
  }

  if (request.method === 'PUT' && url.pathname === '/api/content') {
    if (request.headers.get('Origin') !== url.origin) return json({ error: '来源校验失败。' }, 403)

    let body
    try { body = await request.json() } catch { return json({ error: '保存内容格式错误。' }, 400) }
    const path = cleanPath(body.path)
    if (!path) return json({ error: '这个文件不在可编辑范围内。' }, 400)
    if (typeof body.content !== 'string' || new TextEncoder().encode(body.content).length > 300_000) {
      return json({ error: '正文为空或超过 300 KB 限制。' }, 400)
    }

    const contentUrl = await githubContentsPath(path, env)
    const ref = encodeURIComponent(env.GITHUB_BRANCH || 'main')
    const current = await githubFetch(`${contentUrl}?ref=${ref}`, session.accessToken)
    let sha
    if (current.ok) {
      if (body.create === true) return json({ error: '这个页面地址已经存在，请换一个地址。' }, 409)
      sha = (await current.json()).sha
    } else if (current.status !== 404) {
      return json({ error: '检查文章版本失败，请稍后再试。' }, current.status)
    }

    const payload = {
      message: `Update ${path} via Wanwu Editor`,
      content: encodeUtf8Base64(body.content),
      branch: env.GITHUB_BRANCH || 'main',
      ...(sha ? { sha } : {}),
    }
    const saved = await githubFetch(contentUrl, session.accessToken, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    if (!saved.ok) {
      const errorData = await saved.json().catch(() => ({}))
      return json({ error: errorData.message || 'GitHub 保存失败，请刷新后重试。' }, saved.status)
    }
    const result = await saved.json()
    return json({ ok: true, path, sha: result.content?.sha, commit: result.commit?.sha })
  }

  if (request.method === 'DELETE' && url.pathname === '/api/content') {
    if (request.headers.get('Origin') !== url.origin) return json({ error: '来源校验失败。' }, 403)

    const path = cleanPath(url.searchParams.get('path'))
    if (!path) return json({ error: '这个文件不在可删除范围内。' }, 400)

    let body
    try { body = await request.json() } catch { return json({ error: '删除校验信息无效，请重新打开文章后再试。' }, 400) }
    if (typeof body.sha !== 'string' || !body.sha) {
      return json({ error: '缺少文章版本信息，请重新打开文章后再试。' }, 400)
    }

    const contentUrl = await githubContentsPath(path, env)
    const ref = encodeURIComponent(env.GITHUB_BRANCH || 'main')
    const current = await githubFetch(`${contentUrl}?ref=${ref}`, session.accessToken)
    if (current.status === 404) return json({ error: '这篇内容已不存在，请刷新列表。' }, 404)
    if (!current.ok) return json({ error: '读取文章版本失败，请稍后再试。' }, current.status)

    const file = await current.json()
    if (file.sha !== body.sha) {
      return json({ error: '这篇内容在打开后已更新。请刷新并重新打开文章，再确认删除。' }, 409)
    }
    const deleted = await githubFetch(contentUrl, session.accessToken, {
      method: 'DELETE',
      body: JSON.stringify({
        message: `Delete ${path} via Wanwu Editor`,
        sha: file.sha,
        branch: env.GITHUB_BRANCH || 'main',
      }),
    })
    if (!deleted.ok) {
      const errorData = await deleted.json().catch(() => ({}))
      return json({ error: errorData.message || 'GitHub 删除失败，请刷新后重试。' }, deleted.status)
    }

    const result = await deleted.json()
    return json({ ok: true, path, commit: result.commit?.sha })
  }

  return json({ error: '找不到这个接口。' }, 404)
}

async function handleAuth(request, env, url) {
  if (!env.GITHUB_APP_CLIENT_ID || !env.GITHUB_APP_CLIENT_SECRET || !env.SESSION_SECRET) {
    return json({ error: '编辑服务尚未完成密钥配置。' }, 503)
  }

  if (url.pathname === '/auth/login' && request.method === 'GET') {
    const state = randomToken()
    const callback = new URL('/auth/callback', url.origin)
    const params = new URLSearchParams({
      client_id: env.GITHUB_APP_CLIENT_ID,
      redirect_uri: callback.toString(),
      state,
      allow_signup: 'false',
    })
    return new Response(null, {
      status: 302,
      headers: {
        Location: `https://github.com/login/oauth/authorize?${params}`,
        'Set-Cookie': cookie(STATE_COOKIE, state, 600),
        'Cache-Control': 'no-store',
      },
    })
  }

  if (url.pathname === '/auth/callback' && request.method === 'GET') {
    const expectedState = cookieValue(request, STATE_COOKIE)
    const receivedState = url.searchParams.get('state') || ''
    const clearState = clearCookie(STATE_COOKIE)
    if (!expectedState || expectedState !== receivedState || !url.searchParams.get('code')) {
      return new Response('登录验证失败，请关闭窗口并重试。', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Set-Cookie': clearState },
      })
    }

    const exchange = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_APP_CLIENT_ID,
        client_secret: env.GITHUB_APP_CLIENT_SECRET,
        code: url.searchParams.get('code'),
        redirect_uri: new URL('/auth/callback', url.origin).toString(),
      }),
    })
    const auth = await exchange.json().catch(() => ({}))
    if (!exchange.ok || !auth.access_token) {
      return new Response('无法完成 GitHub 登录，请稍后重试。', {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Set-Cookie': clearState },
      })
    }

    const profileResponse = await githubFetch('/user', auth.access_token)
    const profile = profileResponse.ok ? await profileResponse.json() : null
    if (profile?.login?.toLowerCase() !== env.ALLOWED_GITHUB_LOGIN?.toLowerCase()) {
      return new Response('这个 GitHub 账号没有编辑权限。', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Set-Cookie': clearState },
      })
    }

    const encrypted = await encryptSession({
      accessToken: auth.access_token,
      expiresAt: Date.now() + SESSION_SECONDS * 1000,
    }, env.SESSION_SECRET)
    const headers = new Headers({
      Location: url.origin,
      'Cache-Control': 'no-store',
    })
    headers.append('Set-Cookie', clearState)
    headers.append('Set-Cookie', cookie(SESSION_COOKIE, encrypted, SESSION_SECONDS))
    return new Response(null, {
      status: 302,
      headers,
    })
  }

  if (url.pathname === '/auth/logout' && request.method === 'POST') {
    if (request.headers.get('Origin') !== url.origin) return json({ error: '来源校验失败。' }, 403)
    return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(SESSION_COOKIE) })
  }

  return json({ error: '找不到这个登录接口。' }, 404)
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://api.github.com https://github.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    let response

    if (url.pathname.startsWith('/auth/')) {
      response = await handleAuth(request, env, url)
    } else if (url.pathname.startsWith('/api/')) {
      response = await handleApi(request, env, url)
    } else {
      response = await env.ASSETS.fetch(request)
    }

    return withSecurityHeaders(response)
  },
}
