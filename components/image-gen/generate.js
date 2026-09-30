/**
 * @local/image-gen — 生成链路（纯 Host 侧共享逻辑，被 generate_image 工具
 * 与面板生图路由同时使用）。
 *
 * 统一走**标准 OpenAI Images 接口**：`POST {baseURL}/images/generations`，
 * 请求体为 `{ model, prompt, n, size, image? }`，`size` 为像素尺寸
 * （`1024x1024` 等 OpenAI 规范取值）。不走 chat/completions，也没有任何厂商私有协议。
 *
 * 落盘统一在 imageDir()（默认 ~/image-gen，`IMAGE_GEN_DIR` 可覆盖），不写入项目目录。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, extname, isAbsolute, join } from 'node:path'

/** OpenAI Images API 的标准尺寸（兼容网关普遍接受这组取值）。 */
export const SIZES = ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792']
export const DEFAULT_SIZE = '1024x1024'
export const MAX_REFERENCES = 9
export const MAX_COUNT = 4

const IMAGE_DIR_ENV = 'IMAGE_GEN_DIR'
const DIR_NAME = 'image-gen'
const FAVORITES_DIR_NAME = 'image-gen-favorites'
const FILE_PREFIX = 'image-gen'

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export function pickSize(value) {
  return SIZES.includes(value) ? value : DEFAULT_SIZE
}

export function pickCount(value) {
  return Math.min(Math.max(Number.isInteger(value) ? value : 1, 1), MAX_COUNT)
}

/** 环境变量覆盖目录：支持 `~` 前缀展开；空串或非绝对路径视为无效。 */
function dirOverride(value) {
  if (typeof value !== 'string' || value.trim() === '') return null
  let text = value.trim().replace(/\/+$/, '')
  if (text === '') return null
  if (text === '~' || text.startsWith('~/')) text = join(homedir(), text.slice(1))
  return isAbsolute(text) ? text : null
}

/** 生成图统一落盘目录：`IMAGE_GEN_DIR` 优先，默认 ~/image-gen。 */
export function imageDir() {
  return dirOverride(process.env[IMAGE_DIR_ENV]) ?? join(homedir(), DIR_NAME)
}

/** 收藏目录：固定与 imageDir() 同级。 */
export function favoritesDir() {
  return join(dirname(imageDir()), FAVORITES_DIR_NAME)
}

/** 读取端扫描的目录：只有统一目录（不做历史路径兼容）。 */
export function scanImageDirs() {
  return [imageDir()]
}

export function scanFavoriteDirs() {
  return [favoritesDir()]
}

/**
 * 归一一张参考图为上游接受的形式：https URL 原样、data URL 原样、
 * 本地路径读字节转 data URI（服务端不 fetch 本地路径）。
 */
export async function resolveReferenceImage(raw) {
  const value = String(raw ?? '').trim()
  if (value === '') return { error: '参考图片为空' }
  if (/^https:\/\//i.test(value) || /^data:image\//i.test(value)) return { value }
  const file = value.startsWith('file://') ? value.slice('file://'.length) : value
  let bytes
  try {
    bytes = await readFile(file)
  } catch {
    return { error: `参考图片不是可读文件、https URL 或 data URL：${value.slice(0, 120)}` }
  }
  const mime = MIME_BY_EXT[extname(file).toLowerCase()] ?? 'image/png'
  return { value: `data:${mime};base64,${bytes.toString('base64')}` }
}

/** 标准 OpenAI Images 请求体；参考图作为 image 数组附加（图生图 / 编辑）。 */
function requestBody(model, prompt, size, references) {
  const body = { model, prompt, n: 1, size }
  if (references.length > 0) body.image = references
  return body
}

/** 单张生成（n=1，兼容性最好）。references 为可选参考图（图生图/编辑）。 */
export async function generateOnce(baseURL, apiKey, model, prompt, size, signal, references = []) {
  let response
  try {
    response = await fetch(`${baseURL}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody(model, prompt, size, references)),
      signal,
    })
  } catch (error) {
    return { ok: false, error: `生图 API 请求失败: ${String(error?.cause?.message ?? error?.message ?? error)}` }
  }
  const text = await response.text().catch(() => '')
  if (response.status !== 200) {
    return { ok: false, error: `生图 API HTTP ${response.status}: ${text.slice(0, 400) || '无响应体'}` }
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: `生图 API 响应解析失败: ${text.slice(0, 300)}` }
  }
  const items = Array.isArray(parsed?.data) ? parsed.data : []
  for (const item of items) {
    if (item === null || typeof item !== 'object') continue
    if (typeof item.url === 'string' && item.url !== '') return { ok: true, url: item.url }
    if (typeof item.b64_json === 'string' && item.b64_json !== '') {
      return { ok: true, url: `data:image/png;base64,${item.b64_json}` }
    }
  }
  return { ok: false, error: '生图 API 返回空结果' }
}

/** 把生成的图片（URL 或 data URL）落到统一目录 imageDir()；失败只忽略，不影响主结果。 */
export async function saveImage(index, url) {
  try {
    const dir = imageDir()
    await mkdir(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '')
    const file = join(dir, `${FILE_PREFIX}-${stamp}-${index + 1}.png`)
    if (url.startsWith('data:')) {
      await writeFile(file, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'))
    } else {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      await writeFile(file, Buffer.from(await response.arrayBuffer()))
    }
    return file
  } catch {
    return null
  }
}

/**
 * 生成 count 张并统一落盘到 imageDir()，逐张串行（接口对并发不友好）。
 * 返回原始 URL + 落盘本地路径，失败原因按张收集，不影响已成功的部分。
 */
export async function generateMany({ baseURL, apiKey, model, prompt, size, count, references = [], signal }) {
  const results = []
  const failures = []
  for (let index = 0; index < count; index++) {
    signal?.throwIfAborted?.()
    const one = await generateOnce(baseURL, apiKey, model, prompt, size, signal, references)
    if (!one.ok) {
      failures.push(one.error)
      continue
    }
    const file = await saveImage(index, one.url)
    results.push({ url: one.url, file: file === null ? null : file, name: file === null ? null : file.slice(file.lastIndexOf('/') + 1) })
  }
  return { results, failures }
}