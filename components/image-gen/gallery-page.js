import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'

import { SIZES, resolveConfig } from './config.js?v=34'
import { imageDir, scanImageDirs } from './generate.js?v=34'

export const name = 'image-gen-gallery-page'
export const inject = ['settings', 'credentials', 'connection', 'sessions']

const IMAGE_NAME = /^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/i
const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

async function listSaved(dirs) {
  const byName = new Map()
  for (const dir of dirs) {
    let names
    try {
      names = await readdir(dir)
    } catch {
      continue
    }
    for (const name of names) {
      if (!IMAGE_NAME.test(name)) continue
      try {
        const full = join(dir, name)
        const info = await stat(full)
        if (!info.isFile()) continue
        const mtime = Number(info.mtimeMs) || 0
        const prev = byName.get(name)
        if (prev === undefined || mtime >= prev.mtime) {
          byName.set(name, { name, bytes: info.size, mtime, dir })
        }
      } catch { /* skip */ }
    }
  }
  return [...byName.values()].sort((a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name))
}

async function readSaved(dirs, name) {
  for (const dir of dirs) {
    try {
      return await readFile(join(dir, name))
    } catch { /* try next dir */ }
  }
  return null
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function parseUrl(request) {
  try {
    return new URL(request.url)
  } catch {
    return new URL(String(request.url || '/'), 'http://127.0.0.1')
  }
}

function pageParams(request) {
  const url = parseUrl(request)
  const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0)
  const limit = Math.min(60, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '24', 10) || 24))
  return { offset, limit }
}

export function apply(ctx) {
  function registerRoute(path, methods, handler) {
    ctx.effect(() => {
      let disposeRoute
      const attempt = (remaining) => {
        try {
          disposeRoute = ctx.connection.fetch.register({
            path,
            methods,
            requestBody: 'buffered',
            fetch: handler,
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
    }, `image-gen: ${path}`)
  }

  registerRoute('/api/image-gen', ['GET'], async (request) => {
    try {
      const { offset, limit } = pageParams(request)
      const dirs = scanImageDirs(ctx)
      const { baseURL, model, apiKey } = await resolveConfig(ctx)
      const all = await listSaved(dirs)
      const files = all.slice(offset, offset + limit)
      return json({
        generatedAt: Date.now(),
        tool: 'generate_image',
        model,
        baseURL,
        hasKey: apiKey !== null,
        sizes: SIZES,
        saveDir: imageDir(),
        dirs,
        offset,
        limit,
        total: all.length,
        hasMore: offset + files.length < all.length,
        files,
      })
    } catch (cause) {
      return json({ code: 'image-gen/failed', message: String((cause && cause.message) || cause) }, 500)
    }
  })

  registerRoute('/api/image-gen/file', ['GET'], async (request) => {
    try {
      const url = parseUrl(request)
      const name = basename(String(url.searchParams.get('name') ?? ''))
      if (!IMAGE_NAME.test(name)) {
        return json({ code: 'image-gen/bad-name', message: '非法文件名' }, 400)
      }
      const bytes = await readSaved(scanImageDirs(ctx), name)
      if (bytes === null) return json({ code: 'image-gen/not-found', message: '文件不存在' }, 404)
      const ext = extname(name).toLowerCase()
      const mime = MIME_BY_EXT[ext] ?? 'image/png'
      return new Response(bytes, {
        status: 200,
        headers: { 'content-type': mime, 'cache-control': 'private, max-age=3600' },
      })
    } catch {
      return json({ code: 'image-gen/not-found', message: '文件不存在' }, 404)
    }
  })
}
