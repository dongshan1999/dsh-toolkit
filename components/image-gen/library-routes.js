/**
 * @local/image-gen — 提示词库路由。
 *
 *   GET  /api/image-gen/library        返回 { prompts: [...], skills: [] }（含每条 images）
 *   POST /api/image-gen/library        单一写入口，按 action 区分（kind 只接受 prompt）：
 *       { action: 'upsert', kind: 'prompt', id?, title?, text, size? }
 *       { action: 'delete', kind: 'prompt', id }
 *       { action: 'tag',    kind: 'prompt', id, names: [name...] }
 *
 * 每次写都直接回传全量 library，客户端拿一份全量渲染。
 * 库文件路径与结构见 ./library.js。
 */
// ?v=34：共享模块在 Host ESM 缓存里按 URL 区分，不带 query 会命中旧实例。
import { libraryPath, readLibrary, remove, tagImages, upsert, writeLibrary } from './library.js?v=34'

export const name = 'image-gen-library'
export const inject = ['connection']

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export function apply(ctx) {
  ctx.effect(() => {
    let disposeRoute
    const attempt = (remaining) => {
      try {
        disposeRoute = ctx.connection.fetch.register({
          path: '/api/image-gen/library',
          methods: ['GET', 'POST'],
          requestBody: 'buffered',
          fetch: async (request) => {
            try {
              const lib = await readLibrary()
              if (request.method === 'GET') {
                return json({ ok: true, library: lib, path: libraryPath() })
              }
              const body = await request.json().catch(() => ({}))
              const action = String(body?.action ?? '')
              const kind = String(body?.kind ?? '')
              if (action === 'upsert') {
                const result = await upsert(lib, kind, body)
                if (result.ok !== true) return json({ ok: false, message: result.error }, 400)
                await writeLibrary(result.library)
                return json({ ok: true, id: result.id, entry: result.entry, library: result.library })
              }
              if (action === 'delete') {
                const result = await remove(lib, kind, body?.id)
                if (result.ok !== true) return json({ ok: false, message: '记录不存在' }, 404)
                await writeLibrary(result.library)
                return json({ ok: true, library: result.library })
              }
              if (action === 'tag') {
                const tagged = await tagImages(lib, kind, body?.id, Array.isArray(body?.names) ? body.names : [])
                await writeLibrary(tagged)
                return json({ ok: true, library: tagged })
              }
              return json({ ok: false, message: `未知动作：${action}` }, 400)
            } catch (cause) {
              return json({ ok: false, message: String(cause?.message || cause) }, 500)
            }
          },
        })
        return true
      } catch (cause) {
        const message = String((cause && cause.message) || cause)
        if (remaining > 0 && message.includes('already registered')) {
          ctx.timeout(() => {
            if (disposeRoute === undefined) attempt(remaining - 1)
          }, 400)
          return false
        }
        return false
      }
    }
    attempt(10)
    return () => {
      if (disposeRoute !== undefined) disposeRoute()
    }
  }, 'image-gen: /api/image-gen/library')
}