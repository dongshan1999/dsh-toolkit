import { copyFile, mkdir, readdir, readFile, stat, unlink } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'

import { favoritesDir, scanFavoriteDirs, scanImageDirs } from './generate.js?v=35'

export const name = 'image-gen-favorites'
export const inject = ['connection', 'sessions']

const IMAGE_NAME = /^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/i
const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
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

async function listDirImages(dirs) {
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

async function findFile(dirs, name) {
  for (const dir of dirs) {
    const full = join(dir, name)
    try {
      await stat(full)
      return full
    } catch { /* next */ }
  }
  return null
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
    }, 'image-gen: ' + path)
  }

  registerRoute('/api/image-gen/favorites', ['GET'], async (request) => {
    try {
      const { offset, limit } = pageParams(request)
      const all = await listDirImages(scanFavoriteDirs(ctx))
      const files = all.slice(offset, offset + limit)
      return json({
        total: all.length,
        offset,
        limit,
        hasMore: offset + files.length < all.length,
        names: all.map((item) => item.name),
        files,
      })
    } catch (cause) {
      return json({ code: 'image-gen/fav-failed', message: String(cause?.message || cause) }, 500)
    }
  })

  registerRoute('/api/image-gen/favorites/file', ['GET'], async (request) => {
    try {
      const name = basename(String(parseUrl(request).searchParams.get('name') ?? ''))
      if (!IMAGE_NAME.test(name)) return json({ ok: false, message: '非法文件名' }, 400)
      const full = await findFile(scanFavoriteDirs(ctx), name)
      if (full === null) return json({ ok: false, message: '文件不存在' }, 404)
      const bytes = await readFile(full)
      const mime = MIME_BY_EXT[extname(name).toLowerCase()] ?? 'image/png'
      return new Response(bytes, { status: 200, headers: { 'content-type': mime, 'cache-control': 'private, max-age=3600' } })
    } catch {
      return json({ ok: false, message: '文件不存在' }, 404)
    }
  })

  registerRoute('/api/image-gen/favorite', ['POST'], async (request) => {
    try {
      const body = await request.json().catch(() => ({}))
      const name = basename(String(body?.name ?? ''))
      if (!IMAGE_NAME.test(name)) return json({ ok: false, message: '非法文件名' }, 400)
      const source = await findFile(scanImageDirs(ctx), name)
      if (source === null) return json({ ok: false, message: '原图不存在' }, 404)
      const destDir = favoritesDir()
      await mkdir(destDir, { recursive: true })
      await copyFile(source, join(destDir, name))
      const all = await listDirImages(scanFavoriteDirs(ctx))
      return json({ ok: true, name, names: all.map((item) => item.name), total: all.length })
    } catch (cause) {
      return json({ ok: false, message: String(cause?.message || cause) }, 500)
    }
  })

  registerRoute('/api/image-gen/unfavorite', ['POST'], async (request) => {
    try {
      const body = await request.json().catch(() => ({}))
      const name = basename(String(body?.name ?? ''))
      if (!IMAGE_NAME.test(name)) return json({ ok: false, message: '非法文件名' }, 400)
      const dirs = scanFavoriteDirs(ctx)
      let deleted = 0
      for (const dir of dirs) {
        try {
          await unlink(join(dir, name))
          deleted += 1
        } catch { /* next */ }
      }
      if (deleted === 0) return json({ ok: false, message: '收藏中没有这张图' }, 404)
      const all = await listDirImages(dirs)
      return json({ ok: true, name, names: all.map((item) => item.name), total: all.length })
    } catch (cause) {
      return json({ ok: false, message: String(cause?.message || cause) }, 500)
    }
  })
}
