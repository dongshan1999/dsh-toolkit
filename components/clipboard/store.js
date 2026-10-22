/**
 * @local/clipboard — 落盘、索引、配置（纯 Host 侧，无路由、无 ctx 副作用）。
 *
 * 一条粘贴内容的完整生命周期：
 *   文本 → 指纹（sha1 前 8 位）→ 复用或新建文件 → 写索引 →
 *   返回索引项（含绝对路径，供输入框插入 `@"…"`）。
 *
 * 内容一律整份落盘，不设大小上限、不做截断：粘进来多少就写多少。
 *
 * 落盘约定与 image-gen 的收藏索引一致：
 *   - 目录 0700、文件 0600；
 *   - 索引 tmp + rename 原子写，失败静默（返回 false，不抛给路由）；
 *   - 索引只存元数据，不存正文（正文就在同目录的文件里）。
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, rmdir, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

import {
  clipboardDir,
  configFile,
  indexPath,
  resolveClipboardPaths,
} from './paths.js?v=3'

/** 扩展名只由剪贴板提供的格式决定，绝不按内容猜。 */
const EXT_BY_MIME = {
  'text/plain': '.txt',
  'text/html': '.html',
  'text/csv': '.csv',
  'text/markdown': '.md',
}

/** 文件名白名单：接口只接受这种形状，杜绝 ../ 与路径分隔符。 */
export const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

const DEFAULT_CONFIG = {
  version: 1,
  enabled: true,
  thresholdChars: 2000,
  thresholdLines: 30,
  cleanupEnabled: false,
  cleanupMaxAgeDays: 30,
  cleanupMaxTotalBytes: 0,
}

/** 日期文件夹名：清理只认这个形状，`index.json` / 别的目录一律不碰。 */
export const DATE_DIR_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const DAY_MS = 24 * 60 * 60 * 1000

/** 带 HTTP 语义的错误：host.js 直接把 code/status 放进响应。 */
export class ClipboardError extends Error {
  constructor(code, status, message) {
    super(message)
    this.name = 'ClipboardError'
    this.code = code
    this.status = status
  }
}

export function extensionFor(mime) {
  const key = typeof mime === 'string' ? mime.trim().toLowerCase() : ''
  return EXT_BY_MIME[key] ?? '.txt'
}

export function fingerprint(text) {
  return createHash('sha1').update(text, 'utf8').digest('hex').slice(0, 8)
}

function pad(value) {
  return String(value).padStart(2, '0')
}

/** 本地日期文件夹名：YYYY-MM-DD。 */
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 文件名的时间前缀：HHmmss。 */
function timeKey(date = new Date()) {
  return `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

/** 行数：末尾换行不算多出来的一行。 */
export function countLines(text) {
  if (typeof text !== 'string' || text === '') return 0
  return text.replace(/\n$/, '').split('\n').length
}

function emptyIndex() {
  return { version: 1, items: [] }
}

function normalizeItem(raw) {
  if (raw === null || typeof raw !== 'object') return null
  const name = typeof raw.name === 'string' ? raw.name : ''
  if (!NAME_PATTERN.test(name)) return null
  return {
    name,
    dir: typeof raw.dir === 'string' ? raw.dir : '',
    path: typeof raw.path === 'string' ? raw.path : '',
    bytes: Number(raw.bytes) || 0,
    lines: Number(raw.lines) || 0,
    mime: typeof raw.mime === 'string' ? raw.mime : 'text/plain',
    at: Number(raw.at) || 0,
    hits: Number(raw.hits) || 1,
  }
}

/** 读取索引；文件不存在 / 损坏 / 结构不对都降级成空索引。 */
export async function readIndex() {
  let text
  try {
    text = await readFile(indexPath(), 'utf8')
  } catch {
    return emptyIndex()
  }
  try {
    const parsed = JSON.parse(text)
    const items = Array.isArray(parsed?.items) ? parsed.items.map(normalizeItem).filter(Boolean) : []
    return { version: 1, items }
  } catch {
    return emptyIndex()
  }
}

/** 原子写索引（tmp + rename），0600；失败返回 false。 */
async function writeIndex(index) {
  const file = indexPath()
  const tmp = `${file}.${process.pid}.tmp`
  try {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 })
    await writeFile(tmp, JSON.stringify(index, null, 2) + '\n', { mode: 0o600 })
    await rename(tmp, file)
    return true
  } catch {
    try { await rm(tmp, { force: true }) } catch { /* 忽略清理失败 */ }
    return false
  }
}

/** 用户配置：合并默认值，数值字段只接受正整数。 */
function normalizeConfig(raw) {
  const next = { ...DEFAULT_CONFIG }
  if (raw !== null && typeof raw === 'object') {
    if (typeof raw.enabled === 'boolean') next.enabled = raw.enabled
    for (const key of ['thresholdChars', 'thresholdLines']) {
      const value = Number(raw[key])
      if (Number.isFinite(value) && value >= 1) next[key] = Math.floor(value)
    }
    if (typeof raw.cleanupEnabled === 'boolean') next.cleanupEnabled = raw.cleanupEnabled
    for (const key of ['cleanupMaxAgeDays', 'cleanupMaxTotalBytes']) {
      const value = Number(raw[key])
      if (Number.isFinite(value) && value >= 0) next[key] = Math.floor(value)
    }
  }
  next.version = 1
  return next
}

/** 读取 config.json（不存在时返回默认配置）。 */
export async function readConfig() {
  try {
    return normalizeConfig(JSON.parse(await readFile(configFile(), 'utf8')))
  } catch {
    return normalizeConfig(null)
  }
}

/** 合并写入 config.json：只覆盖传进来的字段。 */
export async function writeConfig(patch) {
  const stored = await readConfig()
  // 显式 undefined 不能覆盖已存的值：host 只把请求里出现的字段传进来，
  // 未出现的字段是 undefined，直接展开会让阈值被清回默认。
  const incoming = {}
  if (patch !== null && typeof patch === 'object') {
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) incoming[key] = value
    }
  }
  const next = normalizeConfig({ ...stored, ...incoming })
  const file = configFile()
  const tmp = `${file}.${process.pid}.tmp`
  try {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 })
    await writeFile(tmp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 })
    await rename(tmp, file)
    return next
  } catch (cause) {
    try { await rm(tmp, { force: true }) } catch { /* 忽略清理失败 */ }
    throw new ClipboardError('clipboard/unavailable', 503, '配置目录不可写：' + String(cause?.message || cause))
  }
}

/** 生效阈值：环境变量优先，其次 config.json，最后默认值。 */
export async function effectiveLimits() {
  const env = resolveClipboardPaths()
  const stored = await readConfig()
  return {
    enabled: stored.enabled,
    thresholdChars: env.overridden.chars ? env.thresholdChars : stored.thresholdChars,
    thresholdLines: env.overridden.lines ? env.thresholdLines : stored.thresholdLines,
    cleanupEnabled: stored.cleanupEnabled,
    cleanupMaxAgeDays: stored.cleanupMaxAgeDays,
    cleanupMaxTotalBytes: stored.cleanupMaxTotalBytes,
  }
}

/** 把路径缩成 `~/…` 只用于展示；插入输入框时始终用绝对路径。 */
export function displayPath(absolute) {
  const home = process.env.HOME
  if (typeof home === 'string' && home !== '' && absolute.startsWith(home + '/')) {
    return '~' + absolute.slice(home.length)
  }
  return absolute
}

/**
 * 落盘一条文本。
 *
 * 去重：同一天内「同指纹 + 同扩展名」直接复用已有文件（`hits + 1`）；
 * 跨天不复用 —— 日期文件夹本身就是「哪天粘的」这一信息。
 */
export async function storeText(input) {
  const raw = input !== null && typeof input === 'object' ? input.text : undefined
  if (typeof raw !== 'string' || raw === '') {
    throw new ClipboardError('clipboard/invalid', 400, 'text 缺失或为空')
  }
  const mime = typeof input.mime === 'string' && input.mime.trim() !== '' ? input.mime.trim().toLowerCase() : 'text/plain'
  const text = raw
  const ext = extensionFor(mime)
  const hash = fingerprint(text)
  const now = new Date()
  const dir = dayKey(now)
  const absDir = join(clipboardDir(), dir)
  const index = await readIndex()

  // 复用：同一天、内容指纹相同、扩展名相同 —— 不必再写一份文件。
  const reused = index.items.find((item) => item.dir === dir && item.name.endsWith('-' + hash + ext))
  if (reused !== undefined) {
    try {
      const info = await stat(reused.path)
      if (info.isFile()) {
        reused.hits += 1
        reused.at = now.getTime()
        await writeIndex(index)
        await maybeCleanup()
        return { item: reused, reused: true }
      }
    } catch { /* 文件没了 → 当作没有，重建 */ }
    index.items = index.items.filter((item) => item !== reused)
  }

  const base = `${timeKey(now)}-${hash}${ext}`
  let name = base
  let counter = 2
  for (;;) {
    try {
      await stat(join(absDir, name))
      name = `${timeKey(now)}-${hash}-${counter}${ext}`
      counter += 1
    } catch {
      break
    }
  }
  const absolute = join(absDir, name)
  try {
    await mkdir(absDir, { recursive: true, mode: 0o700 })
    await writeFile(absolute, text, { mode: 0o600 })
  } catch (cause) {
    throw new ClipboardError('clipboard/unavailable', 503, '数据目录不可写：' + String(cause?.message || cause))
  }

  const item = {
    name,
    dir,
    path: absolute,
    bytes: Buffer.byteLength(text, 'utf8'),
    lines: countLines(text),
    mime,
    at: now.getTime(),
    hits: 1,
  }
  index.items.unshift(item)
  await writeIndex(index)
  await maybeCleanup()
  return { item, reused: false }
}

/** 列出条目（最新在前），顺手剔除已被用户手工删掉的文件。 */
export async function listItems(options) {
  await maybeCleanup()
  const offset = Math.max(0, Number(options?.offset) || 0)
  const limit = Math.min(500, Math.max(1, Number(options?.limit) || 50))
  const index = await readIndex()
  const alive = []
  for (const item of index.items) {
    try {
      const info = await stat(item.path)
      if (info.isFile()) alive.push(item)
    } catch { /* 文件被手工删掉 */ }
  }
  if (alive.length !== index.items.length) {
    index.items = alive
    await writeIndex(index)
  }
  const totalBytes = alive.reduce((sum, item) => sum + (Number(item.bytes) || 0), 0)
  const items = alive.slice(offset, offset + limit).map((item) => ({ ...item, displayPath: displayPath(item.path) }))
  return { total: alive.length, totalBytes, offset, limit, hasMore: offset + limit < alive.length, items }
}

/** 按文件名找索引项；找不到就是 404。 */
export async function itemByName(name) {
  const key = typeof name === 'string' ? name.trim() : ''
  if (!NAME_PATTERN.test(key)) {
    throw new ClipboardError('clipboard/invalid', 400, 'name 不合法（只允许字母、数字、点、下划线、连字符）')
  }
  const index = await readIndex()
  const item = index.items.find((entry) => entry.name === key)
  if (item === undefined) {
    throw new ClipboardError('clipboard/not-found', 404, '索引里没有这个文件：' + key)
  }
  return item
}

/** 读正文（预览用）；`head` 是行数上限，默认 200 行且不超过 64 KiB。 */
export async function readText(name, head) {
  const item = await itemByName(name)
  let text
  try {
    text = await readFile(item.path, 'utf8')
  } catch {
    throw new ClipboardError('clipboard/not-found', 404, '文件已不存在：' + item.name)
  }
  const requested = Math.max(1, Number(head) || 200)
  const lineCount = countLines(text)
  let cut = text.split('\n').slice(0, requested).join('\n')
  const overflow = cut.length > 64 * 1024
  if (overflow) cut = Buffer.from(cut, 'utf8').subarray(0, 64 * 1024).toString('utf8')
  return {
    item,
    text: cut,
    head: requested,
    lines: lineCount,
    trimmed: lineCount > requested || overflow,
  }
}

/** 删除一个条目：先删文件再删索引项（文件已不在也算成功）。 */
export async function removeItem(name) {
  const item = await itemByName(name)
  try {
    await rm(item.path, { force: true })
  } catch (cause) {
    throw new ClipboardError('clipboard/unavailable', 503, '删除文件失败：' + String(cause?.message || cause))
  }
  const index = await readIndex()
  index.items = index.items.filter((entry) => entry.name !== item.name)
  await writeIndex(index)
  return item
}

/**
 * 只认「索引里登记、且确实落在 <根>/<YYYY-MM-DD>/ 下」的文件。
 *
 * 索引是用户可写的本地文件，路径可能被手工改成任意位置；
 * 清理是删除操作，绝不能信任索引里的 path —— 目标不合法就整条跳过。
 */
function insideDayDir(item) {
  const dir = dirname(item.path)
  return DATE_DIR_PATTERN.test(basename(dir)) && dirname(dir) === clipboardDir()
}

function positiveOrZero(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback
}

/**
 * 清理旧条目。
 *
 *   - 按天数：`at` 早于 `now - cleanupMaxAgeDays` 的删（0 = 不限）；
 *   - 按总量：仍超过 `cleanupMaxTotalBytes` 时，从最旧的开始删到不超（0 = 不限）。
 *
 * 单项删除失败不影响其它项（留在索引里下次再试）；删空的日期目录顺手 rmdir，
 * 只删一层、只删名字像日期的目录，绝不递归。
 */
export async function cleanupItems(options) {
  const now = positiveOrZero(options?.now, Date.now())
  const config = await readConfig()
  const maxAgeDays = positiveOrZero(options?.maxAgeDays, config.cleanupMaxAgeDays)
  const maxTotalBytes = positiveOrZero(options?.maxTotalBytes, config.cleanupMaxTotalBytes)
  const index = await readIndex()
  const kept = []
  const victims = []
  let skipped = 0

  for (const item of index.items) {
    if (!insideDayDir(item)) {
      skipped += 1
      kept.push(item)
      continue
    }
    const at = Number(item.at) || 0
    if (maxAgeDays > 0 && at > 0 && now - at > maxAgeDays * DAY_MS) victims.push(item)
    else kept.push(item)
  }

  // 总量只管我们自己的日期目录：索引里若出现越界路径（指向沙箱外），
  // 既不参与统计，也绝不当成可删项。
  let totalBytes = kept.reduce((sum, item) => sum + (insideDayDir(item) ? (Number(item.bytes) || 0) : 0), 0)
  if (maxTotalBytes > 0 && totalBytes > maxTotalBytes) {
    const byAge = kept.filter(insideDayDir).sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0))
    for (const item of byAge) {
      if (totalBytes <= maxTotalBytes) break
      const position = kept.indexOf(item)
      if (position === -1) continue
      kept.splice(position, 1)
      victims.push(item)
      totalBytes -= Number(item.bytes) || 0
    }
  }

  const removed = []
  let freedBytes = 0
  for (const item of victims) {
    try {
      await rm(item.path, { force: true })
      removed.push(item)
      freedBytes += Number(item.bytes) || 0
    } catch {
      kept.push(item)
    }
  }

  if (removed.length > 0) {
    index.items = kept
    await writeIndex(index)
    const dirs = new Set(removed.map((item) => dirname(item.path)))
    for (const dir of dirs) {
      try { await rmdir(dir) } catch { /* 目录非空或已不存在：都不是错误 */ }
    }
  }

  return {
    checked: index.items.length,
    removed: removed.length,
    freedBytes,
    names: removed.map((item) => item.name),
    skipped,
    maxAgeDays,
    maxTotalBytes,
  }
}

/**
 * 粘贴与刷新列表时顺手清理一次。
 *
 * 默认关闭（`cleanupEnabled: false`），开启后失败也不外抛 ——
 * 清理是维护性动作，不能因为它让粘贴失败。
 */
export async function maybeCleanup(options) {
  try {
    const config = await readConfig()
    if (config.cleanupEnabled !== true) return null
    return await cleanupItems(options)
  } catch {
    return null
  }
}
