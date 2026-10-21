/**
 * @local/image-gen — 收藏索引（纯 Host 侧，无路由、无 ctx 副作用）。
 *
 * 收藏**不再复制文件**：所有图片始终只有一份，躺在统一的 images/ 目录里；
 * 收藏只是索引里的一个字段标记，因此「取消收藏」不删图、「删图」也不残留副本。
 *
 *   { version: 1, images: { '<文件名>': { favoritedAt: 1712345678901 } } }
 *
 * 文件路径：`IMAGE_GEN_FAVORITES` → image-gen/favorites.json
 * （默认 $DSH_HOME/dsh-toolkit/image-gen/favorites.json）。
 *
 * 写读原则与 usage.js / prompts.js 一致：读不到/损坏降级成空索引，
 * 写入失败返回 false，绝不把异常抛给路由层。
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { cleanText, favoritesFile } from './paths.js?v=44'

const FAVORITES_ENV = 'IMAGE_GEN_FAVORITES'

/** 收藏索引路径：`IMAGE_GEN_FAVORITES` 优先，默认 image-gen/favorites.json。 */
export function favoritesPath() {
  return cleanText(process.env[FAVORITES_ENV]) ?? favoritesFile()
}

function emptyIndex() {
  return { version: 1, images: {} }
}

/** 读取整份索引；文件不存在 / 损坏 / 结构不对都降级成空索引。 */
export async function readFavoritesIndex() {
  let text
  try {
    text = await readFile(favoritesPath(), 'utf8')
  } catch {
    return emptyIndex()
  }
  try {
    const parsed = JSON.parse(text)
    const images = parsed !== null && typeof parsed === 'object' && parsed.images !== null && typeof parsed.images === 'object'
      ? parsed.images
      : {}
    return { version: 1, images }
  } catch {
    return emptyIndex()
  }
}

/** 原子写（临时文件 + rename），0600；失败返回 false。 */
async function writeFavoritesIndex(index) {
  const file = favoritesPath()
  const tmp = `${file}.${process.pid}.tmp`
  try {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(tmp, JSON.stringify(index, null, 2) + '\n', { mode: 0o600 })
    await rename(tmp, file)
    return true
  } catch {
    try { await writeFile(tmp, '', { mode: 0o600 }) } catch { /* 忽略清理失败 */ }
    return false
  }
}

/** 收藏标记表：`{ 文件名: favoritedAt }`。 */
export async function favoriteMarks() {
  const index = await readFavoritesIndex()
  const marks = {}
  for (const [name, value] of Object.entries(index.images)) {
    marks[name] = Number(value?.favoritedAt) || 0
  }
  return marks
}

/** 收藏名列表：按收藏时间倒序（同刻按文件名），供列表路由做顺序。 */
export async function favoriteNames() {
  const marks = await favoriteMarks()
  return Object.keys(marks).sort((a, b) => marks[b] - marks[a] || a.localeCompare(b))
}

/** 某张图是否已被收藏。 */
export async function isFavorite(name) {
  const index = await readFavoritesIndex()
  return index.images[name] !== undefined
}

/**
 * 标记收藏。已收藏时只刷新时间戳（幂等）。
 * 返回 `{ changed, names }`，names 是收藏后的完整名列表（便于路由一次回齐）。
 */
export async function markFavorite(name, at = Date.now()) {
  const key = cleanText(name)
  if (key === null) return { changed: false, names: await favoriteNames() }
  const index = await readFavoritesIndex()
  const existed = index.images[key] !== undefined
  index.images[key] = { favoritedAt: Number(at) || Date.now() }
  const written = await writeFavoritesIndex(index)
  return { changed: written && !existed, names: Object.keys(index.images) }
}

/** 取消收藏：只删标记，不动图片文件。返回是否真的删掉了标记。 */
export async function clearFavorite(name) {
  const key = cleanText(name)
  if (key === null) return false
  const index = await readFavoritesIndex()
  if (index.images[key] === undefined) return false
  delete index.images[key]
  await writeFavoritesIndex(index)
  return true
}

/** 删图时同步清掉标记（批量），避免收藏索引留下指向不存在文件的条目。 */
export async function forgetFavorites(names) {
  const list = (Array.isArray(names) ? names : [names])
    .map((name) => cleanText(name))
    .filter((name) => name !== null)
  if (list.length === 0) return false
  const index = await readFavoritesIndex()
  let changed = false
  for (const name of list) {
    if (index.images[name] !== undefined) {
      delete index.images[name]
      changed = true
    }
  }
  if (!changed) return false
  return writeFavoritesIndex(index)
}
