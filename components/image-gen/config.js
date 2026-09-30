/**
 * @local/image-gen — 生图模型目录（纯 Host 侧，无路由、无 ctx 副作用）。
 *
 * 通用设计：**不内置任何厂商模型**，目录完全由用户添加（接口地址 + 模型 id + 密钥）。
 * 所有模型都走标准 OpenAI Images 接口，没有协议分支、没有厂商预设。
 * `defaultId` 决定文生图 / 图生图 / Agent 实际调用哪一条；目录为空时生成链路会明确报错。
 *
 * 配置文件：`IMAGE_GEN_CONFIG` → 插件目录 data/config.json
 * 密钥解析顺序：配置文件 keys[keyEnv] → DSH 凭据库 → 环境变量。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { CONFIG_FILE } from './paths.js?v=35'

/** OpenAI Images API 的标准尺寸。 */
export const SIZES = ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792']
export const DEFAULT_SIZE = '1024x1024'
export const DEFAULT_KEY_ENV = 'CUSTOM_API_KEY'

/** 分组：默认只有「自定义」，可在此基础上扩展多网关预设。 */
export const GROUPS = {
  custom: { id: 'custom', label: '自定义', baseURL: '', keyEnv: DEFAULT_KEY_ENV },
}

const CONFIG_FILE_ENV = 'IMAGE_GEN_CONFIG'

function cleanText(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/** 配置文件路径：`IMAGE_GEN_CONFIG` 优先，默认插件目录 data/config.json。 */
export function configPath() {
  const override = cleanText(process.env[CONFIG_FILE_ENV])
  if (override !== null) return override
  return CONFIG_FILE
}

/** baseURL 去尾斜杠；非 http(s) 视为无效。 */
function cleanBaseUrl(value) {
  const text = cleanText(value)
  if (text === null) return null
  const trimmed = text.replace(/\/+$/, '')
  return /^https?:\/\//i.test(trimmed) ? trimmed : null
}

function groupOf(id) {
  return GROUPS[id] || GROUPS.custom
}

function normalizeEntry(raw) {
  const model = cleanText(raw?.model)
  if (model === null) return null
  const group = groupOf(cleanText(raw?.group) || 'custom')
  const baseURL = cleanBaseUrl(raw?.baseURL) || group.baseURL || null
  const id = cleanText(raw?.id) || `${group.id}:${model}`
  return {
    id,
    group: group.id,
    name: cleanText(raw?.name) || model,
    model,
    baseURL,
    keyEnv: cleanText(raw?.keyEnv) || group.keyEnv,
    builtin: false,
  }
}

/** 读配置文件；缺失或损坏都当空对象（不抛）。 */
export async function readConfigFile() {
  try {
    const parsed = JSON.parse(await readFile(configPath(), 'utf8'))
    return parsed !== null && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function writeRaw(next) {
  const file = configPath()
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 })
  return next
}

/** 用户添加的模型 → 目录条目。目录可以为空（此时 defaultId 为空串）。 */
export function materializeCatalog(file) {
  const entries = []
  for (const raw of Array.isArray(file?.models) ? file.models : []) {
    const entry = normalizeEntry(raw)
    if (entry !== null) entries.push(entry)
  }
  if (entries.length === 0) return { defaultId: '', entries: [] }
  let defaultId = cleanText(file?.defaultId)
  if (!entries.some((item) => item.id === defaultId)) defaultId = entries[0].id
  return { defaultId, entries }
}

export async function setDefaultModel(id) {
  const file = await readConfigFile()
  const catalog = materializeCatalog(file)
  if (!catalog.entries.some((item) => item.id === id)) return { ok: false, error: '目录里没有这个模型' }
  await writeRaw({ ...file, defaultId: id })
  return { ok: true, id }
}

/** 新增或覆盖一条模型（同 id 覆盖，即「编辑」）。 */
export async function addModel(input) {
  const entry = normalizeEntry(input)
  if (entry === null) return { ok: false, error: '模型 id 不能为空' }
  if (entry.baseURL === null) return { ok: false, error: '需要接口地址' }
  const file = await readConfigFile()
  const models = (Array.isArray(file.models) ? file.models : []).filter((item) => item?.id !== entry.id)
  models.push(entry)
  const next = { ...file, models }
  if (input?.makeDefault === true) next.defaultId = entry.id
  await writeRaw(next)
  return { ok: true, id: entry.id, entry }
}

export async function removeModel(id) {
  const wanted = String(id ?? '').trim()
  if (wanted === '') return { ok: false, error: '缺少模型 id' }
  const file = await readConfigFile()
  const next = { ...file }
  next.models = (Array.isArray(file.models) ? file.models : []).filter((item) => item?.id !== wanted)
  if (next.defaultId === wanted) delete next.defaultId
  await writeRaw(next)
  return { ok: true }
}

async function credentialKey(ctx, keyEnv) {
  try {
    const resolved = await ctx?.get?.('credentials')?.resolve?.(keyEnv)
    return resolved?.value ? String(resolved.value) : null
  } catch {
    return null
  }
}

async function resolveKey(ctx, file, keyEnv) {
  const fileKey = cleanText(file?.keys?.[keyEnv])
  if (fileKey !== null) return { apiKey: fileKey, keySource: 'config' }
  const stored = await credentialKey(ctx, keyEnv)
  if (stored !== null) return { apiKey: stored, keySource: 'credentials' }
  const envKey = cleanText(process.env[keyEnv])
  if (envKey !== null) return { apiKey: envKey, keySource: 'env' }
  return { apiKey: null, keySource: 'none' }
}

/** 解析当前默认模型（含密钥来源）。生成链路只认这一条；目录为空时返回可渲染的 empty 状态。 */
export async function resolveConfig(ctx) {
  const file = await readConfigFile()
  const catalog = materializeCatalog(file)
  const active = catalog.entries.find((item) => item.id === catalog.defaultId) || catalog.entries[0]
  if (active === undefined) {
    return {
      baseURL: '',
      model: null,
      apiKey: null,
      keySource: 'none',
      keyEnv: DEFAULT_KEY_ENV,
      group: 'custom',
      name: '',
      defaultId: '',
      empty: true,
      path: configPath(),
      catalog,
      file,
    }
  }
  const key = await resolveKey(ctx, file, active.keyEnv)
  return {
    baseURL: active.baseURL,
    model: active.model,
    apiKey: key.apiKey,
    keySource: key.keySource,
    keyEnv: active.keyEnv,
    group: active.group,
    name: active.name,
    defaultId: active.id,
    empty: false,
    path: configPath(),
    catalog,
    file,
  }
}

/** 按目录 id 解析单条模型（用该条 keyEnv 解析密钥），供「按条测试连通性」。 */
export async function resolveModelById(ctx, id) {
  const wanted = String(id ?? '').trim()
  if (wanted === '') return null
  const file = await readConfigFile()
  const catalog = materializeCatalog(file)
  const active = catalog.entries.find((item) => item.id === wanted)
  if (active === undefined) return null
  const key = await resolveKey(ctx, file, active.keyEnv)
  return {
    id: active.id,
    name: active.name,
    baseURL: active.baseURL,
    model: active.model,
    apiKey: key.apiKey,
    keyEnv: active.keyEnv,
  }
}

/** 面板用的脱敏视图：永不返回密钥明文。 */
export async function configView(ctx) {
  const resolved = await resolveConfig(ctx)
  const file = resolved.file
  const groups = []
  for (const group of Object.values(GROUPS)) {
    const key = await resolveKey(ctx, file, group.keyEnv)
    groups.push({
      id: group.id,
      label: group.label,
      baseURL: group.baseURL,
      keyEnv: group.keyEnv,
      hasKey: key.apiKey !== null,
      keySource: key.keySource,
    })
  }
  const view = {
    baseURL: resolved.baseURL,
    model: resolved.model,
    name: resolved.name,
    group: resolved.group,
    defaultId: resolved.defaultId,
    hasKey: resolved.apiKey !== null,
    keySource: resolved.keySource,
    keyEnv: resolved.keyEnv,
    empty: resolved.empty === true,
    path: resolved.path,
    sizes: SIZES,
    defaultSize: DEFAULT_SIZE,
    catalog: {
      defaultId: resolved.defaultId,
      entries: [],
      groups,
    },
  }
  for (const item of resolved.catalog.entries) {
    const key = await resolveKey(ctx, file, item.keyEnv)
    view.catalog.entries.push({
      id: item.id,
      group: item.group,
      groupLabel: groupOf(item.group).label,
      name: item.name,
      model: item.model,
      baseURL: item.baseURL,
      keyEnv: item.keyEnv,
      builtin: item.builtin === true,
      isDefault: item.id === resolved.defaultId,
      hasKey: key.apiKey !== null,
      keySource: key.keySource,
    })
  }
  return view
}

/**
 * 保存密钥：优先写 DSH 凭据库（跨工作区生效、不进明文配置），
 * 凭据服务不可写时回落配置文件的 keys[keyEnv]。
 */
export async function saveApiKey(ctx, value, keyEnv = DEFAULT_KEY_ENV) {
  const key = cleanText(value)
  if (key === null) return { stored: 'unchanged' }
  try {
    const credentials = ctx?.get?.('credentials')
    if (typeof credentials?.set === 'function') {
      await credentials.set(keyEnv, key)
      return { stored: 'credentials' }
    }
  } catch { /* 回落配置文件 */ }
  const file = await readConfigFile()
  const keys = { ...(file.keys && typeof file.keys === 'object' ? file.keys : {}) }
  keys[keyEnv] = key
  await writeRaw({ ...file, keys })
  return { stored: 'config' }
}

/** 清除密钥：配置文件删字段；凭据库尽力删除（无权限时忽略）。 */
export async function clearApiKey(ctx, keyEnv = DEFAULT_KEY_ENV) {
  const file = await readConfigFile()
  const next = { ...file }
  if (next.keys && typeof next.keys === 'object') delete next.keys[keyEnv]
  await writeRaw(next)
  try {
    const credentials = ctx?.get?.('credentials')
    if (typeof credentials?.unset === 'function') await credentials.unset(keyEnv)
    return { cleared: true }
  } catch {
    return { cleared: true, credentialUnset: false }
  }
}