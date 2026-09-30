import { unlink } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { scanImageDirs } from './generate.js?v=34'

export const name = 'image-gen-actions'
export const inject = ['connection', 'sessions']

const IMAGE_NAME = /^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/i

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

async function deleteSaved(dirs, name) {
  let deleted = 0
  for (const dir of dirs) {
    try {
      await unlink(join(dir, name))
      deleted += 1
    } catch { /* try next */ }
  }
  return deleted
}

export function apply(ctx) {
  ctx.effect(() => {
    let disposeRoute
    const attempt = (remaining) => {
      try {
        disposeRoute = ctx.connection.fetch.register({
          path: '/api/image-gen/delete',
          methods: ['POST'],
          requestBody: 'buffered',
          fetch: async (request) => {
            try {
              const body = await request.json().catch(() => ({}))
              const name = basename(String(body?.name ?? ''))
              if (!IMAGE_NAME.test(name)) return json({ ok: false, message: '非法文件名' }, 400)
              const deleted = await deleteSaved(scanImageDirs(ctx), name)
              if (deleted === 0) return json({ ok: false, message: '文件不存在' }, 404)
              return json({ ok: true, name, deleted })
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
  }, 'image-gen: /api/image-gen/delete')
}
