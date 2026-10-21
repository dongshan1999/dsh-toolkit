/**
 * @local/image-gen — 生成链路（纯 Host 侧共享逻辑，被 generate_image 工具
 * 与面板生图路由同时使用）。
 *
 * 统一走**标准 OpenAI Images 接口**：`POST {baseURL}/images/generations`，
 * 请求体为 `{ model, prompt, n, size, image? }`，`size` 为像素尺寸
 * （`1024x1024` 等 OpenAI 规范取值）。不走 chat/completions，也没有任何厂商私有协议。
 *
 * 落盘统一在 imageDir()（默认数据目录 images/，即 $DSH_HOME/dsh-toolkit/image-gen/images，
 * `IMAGE_GEN_DIR` 可覆盖），不写入项目目录。
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

import { imagesDir } from './paths.js?v=44'
import { recordImagePrompts } from './prompts.js?v=44'
import { appendImageUsage } from './usage.js?v=44'

/** OpenAI Images API 的标准尺寸（兼容网关普遍接受这组取值）。 */
export const SIZES = ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792']
export const DEFAULT_SIZE = '1024x1024'
export const MAX_REFERENCES = 9
export const MAX_COUNT = 4

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

/** 生成图统一落盘目录：`IMAGE_GEN_DIR` 优先，默认数据目录 images。 */
export function imageDir() {
  return imagesDir()
}

/** 读取端扫描的目录：只有统一目录（不做历史路径兼容）。 */
export function scanImageDirs() {
  return [imageDir()]
}

/**
 * 参考图体积上限（10 MB）。参考图会被 base64 后塞进请求体发给第三方接口，
 * 不设上限时一个大文件就能把请求撑爆、或拖慢整条生成链路。
 */
export const MAX_REFERENCE_BYTES = 10 * 1024 * 1024

/**
 * 按文件头判断真实图片类型（不信任扩展名）。
 * 返回 data URI 用的 MIME；不是已知图片格式则返回 null。
 */
function sniffImageMime(bytes) {
  const head = bytes.subarray(0, 12)
  const ascii = (from, to) => head.subarray(from, to).toString('latin1')
  if (head.length >= 8 && head[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png'
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg'
  if (head.length >= 6 && (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a')) return 'image/gif'
  if (head.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  return null
}

/**
 * 归一一张参考图为上游接受的形式：https URL 原样、data URL 原样、
 * 本地路径读字节转 data URI（服务端不 fetch 本地路径）。
 *
 * 本地路径这条分支必须校验：它读到什么就原样 base64 发给第三方生图接口，
 * 不设限就等于一条「把本机任意文件外发出去」的通路。
 * 因此只认「扩展名在图片白名单内 + 文件头确实是图片 + 体积不超上限」的文件，
 * 其余一律拒绝，绝不退化成按 `image/png` 硬发。
 */
export async function resolveReferenceImage(raw) {
  const value = String(raw ?? '').trim()
  if (value === '') return { error: '参考图片为空' }
  if (/^https:\/\//i.test(value) || /^data:image\//i.test(value)) return { value }
  const file = value.startsWith('file://') ? value.slice('file://'.length) : value
  if (MIME_BY_EXT[extname(file).toLowerCase()] === undefined) {
    return { error: `参考图只接受 https URL、data URL 或图片文件（png/jpg/jpeg/webp/gif）：${file.slice(0, 120)}` }
  }
  let bytes
  try {
    const info = await stat(file)
    if (info.size > MAX_REFERENCE_BYTES) {
      return { error: `参考图超过 ${Math.round(MAX_REFERENCE_BYTES / 1024 / 1024)} MB 上限：${file.slice(0, 120)}` }
    }
    bytes = await readFile(file)
  } catch {
    return { error: `参考图不是可读文件、https URL 或 data URL：${value.slice(0, 120)}` }
  }
  const mime = sniffImageMime(bytes)
  if (mime === null) return { error: `参考图内容不是有效图片（扩展名与文件头不符）：${file.slice(0, 120)}` }
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
 * 每张成功落盘都记一条花费（data/usage.jsonl），供 token-usage 计费合并。
 */
export async function generateMany({ baseURL, apiKey, model, prompt, size, count, references = [], signal }) {
  const results = []
  const failures = []
  const recorded = []
  const mode = references.length > 0 ? 'image' : 'text'
  for (let index = 0; index < count; index++) {
    signal?.throwIfAborted?.()
    const one = await generateOnce(baseURL, apiKey, model, prompt, size, signal, references)
    if (!one.ok) {
      failures.push(one.error)
      continue
    }
    const file = await saveImage(index, one.url)
    if (file !== null) await appendImageUsage(model, size)
    const name = file === null ? null : file.slice(file.lastIndexOf('/') + 1)
    // 记下「这张图是用哪段提示词生成的」：面板据此在图片旁边直接标注，
    // 不用回头翻对话记录。落盘失败（file 为 null）就不记，免得索引指向不存在的图。
    if (name !== null) recorded.push({ name, prompt, model, size, mode })
    results.push({ url: one.url, file: file === null ? null : file, name })
  }
  // 一次生成可能多张，统一写一遍索引文件（失败静默，不影响生成结果）。
  if (recorded.length > 0) await recordImagePrompts(recorded)
  return { results, failures }
}