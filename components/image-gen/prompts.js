/**
 * @local/image-gen — 图片 → 提示词索引（纯 Host 侧，无路由、无 ctx 副作用）。
 *
 * 每张落盘的图片记一条「生成它时用的提示词」，让面板能在图片**旁边**直接展示，
 * 不用回头翻聊天记录：
 *
 *   { version: 1, images: { '<文件名>': { prompt, model, size, mode, createdAt } } }
 *
 * 文件路径：`IMAGE_GEN_PROMPTS` → 数据目录 image-prompts.json
 * （默认 $DSH_HOME/dsh-toolkit/image-prompts.json）。
 *
 * 写读原则与 usage.js 一致：记录失败**静默**（少一条注记不影响生成），
 * 但读取时会回退到提示词库（library.json 的 prompts[].images 反查），
 * 这样索引功能上线前就归档过的老图也能显示提示词。
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { readLibrary } from './library.js?v=44'
import { cleanText, imagePromptsFile } from './paths.js?v=44'

const PROMPTS_ENV = 'IMAGE_GEN_PROMPTS'

/** 索引文件路径：`IMAGE_GEN_PROMPTS` 优先，默认数据目录 image-prompts.json。 */
export function promptsPath() {
  return cleanText(process.env[PROMPTS_ENV]) ?? imagePromptsFile()
}

function emptyIndex() {
  return { version: 1, images: {} }
}

/**
 * 读取整份索引。文件不存在 / 损坏 / 结构不对都降级成空索引（面板少显示提示词，
 * 不影响图片本身可读）。
 */
export async function readPromptIndex() {
  let text
  try {
    text = await readFile(promptsPath(), 'utf8')
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

/** 原子写（临时文件 + rename），0600；失败返回 false，绝不抛给调用方。 */
async function writePromptIndex(index) {
  const file = promptsPath()
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

/**
 * 批量记一批「图片名 → 提示词」。records 项：{ name, prompt, model?, size?, mode?, createdAt? }。
 * 提示词为空的项直接跳过（没有可记的内容）。一次生成（可能多张）建议一次调用，只写一遍文件。
 */
export async function recordImagePrompts(records) {
  const list = (Array.isArray(records) ? records : [])
    .filter((item) => item !== null && typeof item === 'object')
    .map((item) => ({
      name: cleanText(item.name),
      prompt: cleanText(item.prompt),
      model: typeof item.model === 'string' ? item.model : '',
      size: typeof item.size === 'string' ? item.size : '',
      mode: item.mode === 'image' ? 'image' : 'text',
      createdAt: Number(item.createdAt) || Date.now(),
    }))
    .filter((item) => item.name !== null && item.prompt !== null)
  if (list.length === 0) return false
  const index = await readPromptIndex()
  for (const item of list) {
    index.images[item.name] = {
      prompt: item.prompt,
      model: item.model,
      size: item.size,
      mode: item.mode,
      createdAt: item.createdAt,
    }
  }
  return writePromptIndex(index)
}

/** 单张记录（内部走批量，保持同一写路径）。 */
export async function recordImagePrompt(name, info = {}) {
  return recordImagePrompts([{ ...info, name }])
}

/** 删除图片时同步清掉索引条目，避免索引无限增长。 */
export async function forgetImagePrompts(names) {
  const list = (Array.isArray(names) ? names : [names])
    .map((name) => cleanText(name))
    .filter((name) => name !== null)
  if (list.length === 0) return false
  const index = await readPromptIndex()
  let changed = false
  for (const name of list) {
    if (index.images[name] !== undefined) {
      delete index.images[name]
      changed = true
    }
  }
  if (!changed) return false
  return writePromptIndex(index)
}

/**
 * 提示词库反查表：`{ 图片名: { prompt, title, stamp } }`。
 * 同一个文件名出现在多条提示词里时，取 updatedAt 最新的那条。
 */
async function libraryPromptMap() {
  let library
  try {
    library = await readLibrary()
  } catch {
    return {}
  }
  const entries = Array.isArray(library?.prompts) ? library.prompts : []
  const map = {}
  for (const entry of entries) {
    if (entry === null || typeof entry !== 'object') continue
    const text = cleanText(entry.text)
    if (text === null) continue
    const stamp = Number(entry.updatedAt) || Number(entry.createdAt) || 0
    const names = Array.isArray(entry.images) ? entry.images : []
    for (const name of names) {
      if (typeof name !== 'string' || name === '') continue
      const prev = map[name]
      if (prev === undefined || stamp >= prev.stamp) {
        map[name] = { prompt: text, title: typeof entry.title === 'string' ? entry.title : '', stamp }
      }
    }
  }
  return map
}

/**
 * 查一批图片名对应的提示词，返回 `{ 图片名: { prompt, title, model, size, mode, createdAt, source } }`。
 * source：'index'（生成时记录）| 'library'（提示词库反查出的老图）。
 * 没查到的名字不出现在结果里。
 */
export async function lookupImagePrompts(names) {
  const wanted = [...new Set((Array.isArray(names) ? names : []).filter((name) => typeof name === 'string' && name !== ''))]
  if (wanted.length === 0) return {}
  const index = await readPromptIndex()
  const found = {}
  const missing = []
  for (const name of wanted) {
    const hit = index.images[name]
    const prompt = hit !== null && typeof hit === 'object' ? cleanText(hit.prompt) : null
    if (prompt === null) {
      missing.push(name)
      continue
    }
    found[name] = {
      prompt,
      title: '',
      model: typeof hit.model === 'string' ? hit.model : '',
      size: typeof hit.size === 'string' ? hit.size : '',
      mode: hit.mode === 'image' ? 'image' : 'text',
      createdAt: Number(hit.createdAt) || 0,
      source: 'index',
    }
  }
  if (missing.length > 0) {
    const byLib = await libraryPromptMap()
    for (const name of missing) {
      const hit = byLib[name]
      if (hit === undefined) continue
      found[name] = {
        prompt: hit.prompt,
        title: hit.title,
        model: '',
        size: '',
        mode: 'text',
        createdAt: 0,
        source: 'library',
      }
    }
  }
  return found
}

/**
 * 给一批图库文件项（`{ name, bytes, mtime, dir }`）附上提示词字段：
 * `prompt`（无记录为 null）/ `promptSource` / `promptTitle` / `promptModel` / `promptSize`。
 * 画廊与收藏库共用，保证两边的列表项形状一致。
 */
export async function attachImagePrompts(files) {
  const list = Array.isArray(files) ? files : []
  if (list.length === 0) return []
  const map = await lookupImagePrompts(list.map((file) => file.name))
  return list.map((file) => {
    const hit = map[file.name]
    if (hit === undefined) {
      return { ...file, prompt: null, promptSource: null, promptTitle: '', promptModel: '', promptSize: '', promptCreatedAt: 0 }
    }
    return {
      ...file,
      prompt: hit.prompt,
      promptSource: hit.source,
      promptTitle: hit.title,
      promptModel: hit.model,
      promptSize: hit.size,
      promptCreatedAt: hit.createdAt,
    }
  })
}
