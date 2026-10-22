/**
 * @local/clipboard — 长文本粘贴转文件（Host 侧）。
 *
 * 前缀 `/api/clipboard`，六个路由（同前缀分成不同 path，避免同 path 重复注册）：
 *
 *   POST /api/clipboard/paste   {text, mime?}      → {ok, name, dir, path, bytes, lines, mime, hits, reused}
 *   GET  /api/clipboard/list    ?offset=&limit=    → {ok, total, offset, limit, hasMore, items[]}
 *   GET  /api/clipboard/file    ?name=&head=       → {ok, name, bytes, lines, head, text, trimmed}
 *   POST /api/clipboard/delete  {name}             → {ok, name, removed}
 *   GET  /api/clipboard/config                     → {ok, limits, paths, overridden}
 *   POST /api/clipboard/config  {enabled?, …}      → {ok, limits}
 *   POST /api/clipboard/cleanup {maxAgeDays?, maxTotalBytes?} → {ok, checked, removed, freedBytes, names[], skipped}
 *
 * 阈值与扩展名规则见 docs/功能案-剪贴板.md；本文件只做参数校验与响应封装，
 * 落盘/索引/配置都在 store.js，路径在 paths.js。
 */
import { cleanupItems, effectiveLimits, listItems, readText, removeItem, storeText, writeConfig, ClipboardError } from './store.js?v=3'
import { resolveClipboardPaths } from './paths.js?v=3'

export const name = 'clipboard'
export const inject = ['connection', 'timer']

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function failure(cause) {
  if (cause instanceof ClipboardError) {
    return json({ ok: false, code: cause.code, message: cause.message }, cause.status)
  }
  return json({ ok: false, code: 'clipboard/unavailable', message: String(cause?.message || cause) }, 500)
}

/** 读 JSON 请求体：空 body / 坏 JSON 都当空对象（由调用方判必填）。 */
async function bodyOf(request) {
  try {
    const text = await request.text()
    if (text === '') return {}
    const parsed = JSON.parse(text)
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function handlePaste(request) {
  const body = await bodyOf(request)
  try {
    const result = await storeText({ text: body.text, mime: body.mime })
    const { item, reused } = result
    return json({
      ok: true,
      name: item.name,
      dir: item.dir,
      path: item.path,
      bytes: item.bytes,
      lines: item.lines,
      mime: item.mime,
      hits: item.hits,
      reused,
    })
  } catch (cause) {
    return failure(cause)
  }
}

async function handleList(request) {
  const url = new URL(request.url)
  try {
    const data = await listItems({
      offset: Number(url.searchParams.get('offset')) || 0,
      limit: Number(url.searchParams.get('limit')) || 50,
    })
    return json({ ok: true, ...data })
  } catch (cause) {
    return failure(cause)
  }
}

async function handleFile(request) {
  const url = new URL(request.url)
  try {
    const data = await readText(url.searchParams.get('name'), Number(url.searchParams.get('head')) || 200)
    return json({
      ok: true,
      name: data.item.name,
      dir: data.item.dir,
      path: data.item.path,
      bytes: data.item.bytes,
      lines: data.lines,
      head: data.head,
      trimmed: data.trimmed,
      text: data.text,
    })
  } catch (cause) {
    return failure(cause)
  }
}

async function handleDelete(request) {
  const body = await bodyOf(request)
  try {
    const item = await removeItem(typeof body.name === 'string' ? body.name : '')
    return json({ ok: true, name: item.name, removed: true })
  } catch (cause) {
    return failure(cause)
  }
}

async function handleConfigGet() {
  try {
    const paths = resolveClipboardPaths()
    return json({ ok: true, limits: await effectiveLimits(), paths, overridden: paths.overridden })
  } catch (cause) {
    return failure(cause)
  }
}

async function handleConfigPost(request) {
  const body = await bodyOf(request)
  try {
    await writeConfig({
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      thresholdChars: body.thresholdChars,
      thresholdLines: body.thresholdLines,
      cleanupEnabled: typeof body.cleanupEnabled === 'boolean' ? body.cleanupEnabled : undefined,
      cleanupMaxAgeDays: body.cleanupMaxAgeDays,
      cleanupMaxTotalBytes: body.cleanupMaxTotalBytes,
    })
    return json({ ok: true, limits: await effectiveLimits() })
  } catch (cause) {
    return failure(cause)
  }
}

/** 手动清理：参数缺省时用 config.json 里的设置，传了就按这一次的参数执行。 */
async function handleCleanup(request) {
  const body = await bodyOf(request)
  try {
    const result = await cleanupItems({
      maxAgeDays: body.maxAgeDays,
      maxTotalBytes: body.maxTotalBytes,
    })
    return json({ ok: true, ...result })
  } catch (cause) {
    return failure(cause)
  }
}

const ROUTES = [
  { path: '/api/clipboard/paste', methods: ['POST'], requestBody: 'buffered', fetch: handlePaste },
  { path: '/api/clipboard/list', methods: ['GET'], requestBody: 'buffered', fetch: handleList },
  { path: '/api/clipboard/file', methods: ['GET'], requestBody: 'buffered', fetch: handleFile },
  { path: '/api/clipboard/delete', methods: ['POST'], requestBody: 'buffered', fetch: handleDelete },
  { path: '/api/clipboard/config', methods: ['GET', 'POST'], requestBody: 'buffered', fetch: (request) => (request.method === 'POST' ? handleConfigPost(request) : handleConfigGet()) },
  { path: '/api/clipboard/cleanup', methods: ['POST'], requestBody: 'buffered', fetch: handleCleanup },
]

export function apply(ctx) {
  ctx.effect(() => {
    const disposers = []
    const register = (remaining) => {
      for (const route of ROUTES) {
        if (disposers.some((entry) => entry.path === route.path)) continue
        try {
          const dispose = ctx.connection.fetch.register(route)
          disposers.push({ path: route.path, dispose })
        } catch (cause) {
          const message = String((cause && cause.message) || cause)
          if (remaining > 0 && message.includes('already registered')) {
            ctx.timeout(() => register(remaining - 1), 400)
            return
          }
          // 注册失败只影响本组件的接口，不抛出以免整个插件入口激活失败。
          continue
        }
      }
    }
    register(10)
    return () => {
      for (const entry of disposers) {
        try { entry.dispose() } catch { /* 已释放 */ }
      }
    }
  }, 'clipboard: /api/clipboard/*')
}
