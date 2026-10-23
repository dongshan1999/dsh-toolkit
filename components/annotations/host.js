/**
 * @local/annotations — 会话内划词注释（Host 侧）。
 *
 * 前缀 `/api/annotations`，七个路由（同前缀分成不同 path，避免同 path 重复注册）：
 *
 *   GET  /api/annotations         ?sessionId=            → {ok, sessionId, sessionTitle, nextIndex, total, open, items[], limits}
 *   POST /api/annotations         {sessionId, quote, note?, prefix?, suffix?, block?, offset?,
 *                                  blockStart?, blockEnd?, lineStart?, lineEnd?} → {ok, item}
 *   POST /api/annotations/update  {sessionId, id, note?, …, stale?, draftedAt?} → {ok, item}
 *   POST /api/annotations/delete  {sessionId, id}        → {ok, id, item}
 *   POST /api/annotations/clear   {sessionId}            → {ok, sessionId, cleared}
 *   GET  /api/annotations/index                          → {ok, total, sessions[]}
 *   POST /api/annotations/purge   {sessionId?}           → {ok, purged}
 *
 * 规则与验收口径见 docs/功能案-对话注释.md；落盘与编号在 store.js，路径在 paths.js。
 */
import { clearSession, createItem, deleteItem, AnnotationsError, listItems, listSessions, purgeSessions, updateItem } from './store.js?v=2'
import { resolveAnnotationPaths } from './paths.js?v=2'

export const name = 'annotations'
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
  if (cause instanceof AnnotationsError) {
    return json({ ok: false, code: cause.code, message: cause.message }, cause.status)
  }
  return json({ ok: false, code: 'annotations/unavailable', message: String(cause?.message || cause) }, 500)
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

/** 接口响应里带上前端要用的开关（避免再多一条配置路由）。 */
function limits() {
  const paths = resolveAnnotationPaths()
  return {
    maxPerSession: paths.maxPerSession,
    quoteChars: paths.quoteChars,
    selectionDelay: paths.selectionDelay,
    floatingButton: paths.floatingButton,
  }
}

async function handleList(request) {
  const url = new URL(request.url)
  try {
    const data = await listItems(url.searchParams.get('sessionId'))
    return json({ ok: true, ...data, limits: limits() })
  } catch (cause) {
    return failure(cause)
  }
}

async function handleCreate(request) {
  const body = await bodyOf(request)
  try {
    const item = await createItem({
      sessionId: body.sessionId,
      sessionTitle: body.sessionTitle,
      quote: body.quote,
      note: body.note,
      prefix: body.prefix,
      suffix: body.suffix,
      block: body.block,
      offset: body.offset,
      blockStart: body.blockStart,
      blockEnd: body.blockEnd,
      lineStart: body.lineStart,
      lineEnd: body.lineEnd,
    })
    const data = await listItems(body.sessionId)
    return json({ ok: true, item, nextIndex: data.nextIndex, total: data.total, open: data.open })
  } catch (cause) {
    return failure(cause)
  }
}

async function handleUpdate(request) {
  const body = await bodyOf(request)
  try {
    const item = await updateItem(body.sessionId, body.id, {
      note: body.note,
      quote: body.quote,
      prefix: body.prefix,
      suffix: body.suffix,
      block: body.block,
      offset: body.offset,
      blockStart: body.blockStart,
      blockEnd: body.blockEnd,
      lineStart: body.lineStart,
      lineEnd: body.lineEnd,
      stale: body.stale,
      draftedAt: body.draftedAt,
      sessionTitle: body.sessionTitle,
    })
    return json({ ok: true, item })
  } catch (cause) {
    return failure(cause)
  }
}

async function handleDelete(request) {
  const body = await bodyOf(request)
  try {
    const item = await deleteItem(body.sessionId, body.id)
    return json({ ok: true, id: item.id, item })
  } catch (cause) {
    return failure(cause)
  }
}

async function handleClear(request) {
  const body = await bodyOf(request)
  try {
    const result = await clearSession(body.sessionId)
    return json({ ok: true, sessionId: body.sessionId, cleared: result.cleared })
  } catch (cause) {
    return failure(cause)
  }
}

async function handleIndex() {
  try {
    return json({ ok: true, ...(await listSessions()) })
  } catch (cause) {
    return failure(cause)
  }
}

async function handlePurge(request) {
  const body = await bodyOf(request)
  try {
    const result = await purgeSessions(body.sessionId)
    return json({ ok: true, purged: result.purged })
  } catch (cause) {
    return failure(cause)
  }
}

const ROUTES = [
  { path: '/api/annotations', methods: ['GET', 'POST'], requestBody: 'buffered', fetch: (request) => (request.method === 'POST' ? handleCreate(request) : handleList(request)) },
  { path: '/api/annotations/update', methods: ['POST'], requestBody: 'buffered', fetch: handleUpdate },
  { path: '/api/annotations/delete', methods: ['POST'], requestBody: 'buffered', fetch: handleDelete },
  { path: '/api/annotations/clear', methods: ['POST'], requestBody: 'buffered', fetch: handleClear },
  { path: '/api/annotations/index', methods: ['GET'], requestBody: 'buffered', fetch: handleIndex },
  { path: '/api/annotations/purge', methods: ['POST'], requestBody: 'buffered', fetch: handlePurge },
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
  }, 'annotations: /api/annotations/*')
}
