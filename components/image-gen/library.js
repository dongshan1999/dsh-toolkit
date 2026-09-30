/**
 * @local/image-gen — 提示词库（纯 Host 侧，无路由、无 ctx 副作用）。
 *
 * 结构：`{ prompts: [ { id, title, text, size, images: [name…], createdAt, updatedAt } ] }`
 * `images` 记录该条提示词生成过的图片名（落在统一目录，按名可直接读）。
 *
 * 库文件路径：`IMAGE_GEN_LIBRARY` → 插件目录 data/library.json。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { LIBRARY_FILE } from './paths.js?v=35'

const LIB_ENV = 'IMAGE_GEN_LIBRARY'

/** 与 generate.js 保持一致的像素尺寸集合。 */
const SIZES = ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792']
const DEFAULT_SIZE = '1024x1024'
const KINDS = ['prompt']
const KEY_BY_KIND = { prompt: 'prompts' }

function cleanText(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/** 库文件路径：`IMAGE_GEN_LIBRARY` 优先，默认插件目录 data/library.json。 */
export function libraryPath() {
  const override = cleanText(process.env[LIB_ENV])
  if (override !== null) return override
  return LIBRARY_FILE
}

function empty() {
  return { prompts: [] }
}

export async function readLibrary() {
  try {
    const parsed = JSON.parse(await readFile(libraryPath(), 'utf8'))
    if (parsed === null || typeof parsed !== 'object') return empty()
    return { prompts: Array.isArray(parsed.prompts) ? parsed.prompts : [] }
  } catch {
    return empty()
  }
}

export async function writeLibrary(lib) {
  const file = libraryPath()
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(lib, null, 2) + '\n', { mode: 0o600 })
  return lib
}

function pickSize(value) {
  return SIZES.includes(value) ? value : DEFAULT_SIZE
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 归一一条库记录；text 为空时返回错误。title 缺省取 text 前 24 字符。 */
function normalizeEntry(raw) {
  const text = typeof raw?.text === 'string' ? raw.text.trim() : ''
  if (text === '') return { error: '提示词内容不能为空' }
  const title = typeof raw?.title === 'string' && raw.title.trim() !== '' ? raw.title.trim() : text.slice(0, 24)
  return { entry: { title, text, size: pickSize(raw?.size) } }
}

function listOf(lib, kind) {
  return lib[KEY_BY_KIND[kind]]
}

/**
 * 新增或更新一条记录。返回 { ok, id, entry, library }。
 * 传 id 则覆盖更新；不传则新建。
 */
export async function upsert(lib, kind, input) {
  if (!KINDS.includes(kind)) return { ok: false, error: '不支持的库类型' }
  const normalized = normalizeEntry(input)
  if (normalized.error !== undefined) return { ok: false, error: normalized.error }
  const list = listOf(lib, kind)
  const id = typeof input?.id === 'string' && input.id !== '' ? input.id : makeId('p')
  const stamp = Date.now()
  let record
  const existing = list.find((item) => item.id === id)
  if (existing) {
    Object.assign(existing, normalized.entry, { updatedAt: stamp })
    record = existing
  } else {
    record = { id, ...normalized.entry, images: [], createdAt: stamp, updatedAt: stamp }
    list.push(record)
  }
  return { ok: true, id, entry: record, library: lib }
}

export async function remove(lib, kind, id) {
  if (!KINDS.includes(kind)) return { ok: false, error: '不支持的库类型' }
  const key = KEY_BY_KIND[kind]
  const before = lib[key].length
  lib[key] = lib[key].filter((item) => item.id !== String(id ?? ''))
  return { ok: before !== lib[key].length, library: lib }
}

/** 把一次生成得到的图片名追加到某条记录的 images（去重）。 */
export async function tagImages(lib, kind, id, names) {
  if (!KINDS.includes(kind)) return lib
  if (id === null || id === undefined || !Array.isArray(names) || names.length === 0) return lib
  const record = listOf(lib, kind).find((item) => item.id === String(id))
  if (record === undefined) return lib
  const set = new Set(record.images || [])
  for (const name of names) set.add(name)
  record.images = [...set]
  record.updatedAt = Date.now()
  return lib
}