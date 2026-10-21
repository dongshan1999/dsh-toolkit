/**
 * @local/image-gen — 生图模型目录（纯 Host 侧，无路由、无 ctx 副作用）。
 *
 * 目录按「**组**（一个网关一条）+ 组内模型」组织，不内置任何厂商模型：
 *
 *   providers: [ { id, name, baseURL, keyEnv } ]                   一组 = 名字 + 链接 + 该组自己的密钥
 *   models:    [ { id, providerId, name, model, pricePerImage } ]  组内模型
 *   defaultId: 默认模型（models[].id）
 *   keys:      { [keyEnv]: 明文密钥 }（凭据服务可用时优先写凭据库）
 *
 * 配置文件：`IMAGE_GEN_CONFIG` → 数据目录 config.json（默认 $DSH_HOME/dsh-toolkit/config.json）
 * 密钥解析顺序：配置文件 keys[keyEnv] → DSH 凭据库 → 环境变量（keyEnv 由所属组决定）。
 *
 * 兼容 v1（平铺 `models[]` 带 group/baseURL/keyEnv）：读到即按 (baseURL, keyEnv) 归组迁移，
 * 组名取域名、组 id 用 p1/p2…（确定性，保证同一份文件每次读出的 id 一致），首次写入落成 v2。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { cleanText, configFile } from './paths.js?v=44'

/** OpenAI Images API 的标准尺寸。 */
export const SIZES = ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792']
export const DEFAULT_SIZE = '1024x1024'
export const DEFAULT_KEY_ENV = 'CUSTOM_API_KEY'

/** 当前配置文件结构版本。 */
export const CONFIG_VERSION = 2

const CONFIG_FILE_ENV = 'IMAGE_GEN_CONFIG'
const KEY_ENV_PREFIX = 'IMAGE_GEN_KEY_'

/** 配置文件路径：`IMAGE_GEN_CONFIG` 优先，默认数据目录 config.json。 */
export function configPath() {
  const override = cleanText(process.env[CONFIG_FILE_ENV])
  if (override !== null) return override
  return configFile()
}

/** baseURL 去尾斜杠；非 http(s) 视为无效。 */
function cleanBaseUrl(value) {
  const text = cleanText(value)
  if (text === null) return null
  const trimmed = text.replace(/\/+$/, '')
  return /^https?:\/\//i.test(trimmed) ? trimmed : null
}

/** 每张单价（美元/张）：正数保留；非法/负值视为未配置（undefined）。 */
function cleanPricePerImage(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** 组名缺省取域名，例如 https://images.example.com/v1 → images.example.com。 */
function hostOf(baseURL) {
  try {
    return new URL(baseURL).host
  } catch {
    return baseURL
  }
}

/** 新建组的 id：随机但稳定落盘（形如 p1a2b3c4d）。 */
function makeProviderId() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/** 组自己的密钥环境变量名（按组隔离，两个网关不会互相覆盖）。 */
function keyEnvFor(providerId) {
  return KEY_ENV_PREFIX + String(providerId).toUpperCase().replace(/[^A-Z0-9]+/g, '_')
}

function normalizeProvider(raw, fallbackId) {
  const baseURL = cleanBaseUrl(raw?.baseURL)
  if (baseURL === null) return null
  const id = cleanText(raw?.id) || fallbackId
  return {
    id,
    name: cleanText(raw?.name) || hostOf(baseURL),
    baseURL,
    keyEnv: cleanText(raw?.keyEnv) || keyEnvFor(id),
  }
}

function normalizeModel(raw, provider) {
  const model = cleanText(raw?.model)
  if (model === null) return null
  return {
    id: `${provider.id}:${model}`,
    providerId: provider.id,
    model,
    name: cleanText(raw?.name) || model,
    pricePerImage: cleanPricePerImage(raw?.pricePerImage),
  }
}

/**
 * 任意版本的配置对象 → 规范化的 v2（纯函数）。
 * v1（无 providers / version ≠ 2）：平铺条目按 (baseURL, keyEnv) 归组，defaultId 跟着新 id 走。
 */
export function normalizeFile(file) {
  const keys = file?.keys !== null && typeof file?.keys === 'object' ? { ...file.keys } : {}
  const providers = []
  const models = []
  const idMap = new Map()
  const rawModels = Array.isArray(file?.models) ? file.models : []
  const isV2 = Number(file?.version) === CONFIG_VERSION && Array.isArray(file?.providers)

  if (isV2) {
    for (const raw of file.providers) {
      const provider = normalizeProvider(raw, `p${providers.length + 1}`)
      if (provider !== null) providers.push(provider)
    }
    for (const raw of rawModels) {
      const provider = providers.find((item) => item.id === cleanText(raw?.providerId))
      if (provider === undefined) continue
      const model = normalizeModel(raw, provider)
      if (model === null) continue
      idMap.set(cleanText(raw?.id), model.id)
      models.push(model)
    }
  } else {
    for (const raw of rawModels) {
      const baseURL = cleanBaseUrl(raw?.baseURL)
      if (baseURL === null) continue
      const keyEnv = cleanText(raw?.keyEnv) || DEFAULT_KEY_ENV
      let provider = providers.find((item) => item.baseURL === baseURL && item.keyEnv === keyEnv)
      if (provider === undefined) {
        provider = normalizeProvider({ baseURL, keyEnv, name: cleanText(raw?.groupLabel) }, `p${providers.length + 1}`)
        providers.push(provider)
      }
      const model = normalizeModel(raw, provider)
      if (model === null) continue
      idMap.set(cleanText(raw?.id), model.id)
      models.push(model)
    }
  }

  // 同一个组里同名模型只留一条（id 相同即重复）。
  const unique = []
  for (const model of models) {
    if (!unique.some((item) => item.id === model.id)) unique.push(model)
  }

  const wanted = cleanText(file?.defaultId)
  const mapped = idMap.get(wanted)
  const defaultId = unique.some((item) => item.id === wanted)
    ? wanted
    : (mapped !== undefined && unique.some((item) => item.id === mapped) ? mapped : (unique[0]?.id ?? ''))

  return { version: CONFIG_VERSION, providers, models: unique, defaultId, keys }
}

/** 读配置文件（永远返回规范化 v2；缺失/损坏都当空目录，不抛）。 */
export async function readConfigFile() {
  let parsed = null
  try {
    parsed = JSON.parse(await readFile(configPath(), 'utf8'))
  } catch {
    parsed = null
  }
  return normalizeFile(parsed)
}

async function writeRaw(next) {
  const file = normalizeFile(next)
  await mkdir(dirname(configPath()), { recursive: true })
  await writeFile(configPath(), JSON.stringify(file, null, 2) + '\n', { mode: 0o600 })
  return file
}

/** 组 + 组内模型（视图用），模型带 isDefault。 */
export function materializeProviders(file) {
  return file.providers.map((provider) => ({
    ...provider,
    models: file.models
      .filter((item) => item.providerId === provider.id)
      .map((item) => ({ ...item, isDefault: item.id === file.defaultId })),
  }))
}

/** 平铺目录条目（生成链路与旧视图兼容用）。 */
export function materializeCatalog(file) {
  const entries = []
  for (const provider of file.providers) {
    for (const model of file.models) {
      if (model.providerId !== provider.id) continue
      entries.push({
        id: model.id,
        providerId: provider.id,
        group: provider.id,
        groupLabel: provider.name,
        name: model.name,
        model: model.model,
        baseURL: provider.baseURL,
        keyEnv: provider.keyEnv,
        pricePerImage: model.pricePerImage,
        builtin: false,
        isDefault: model.id === file.defaultId,
      })
    }
  }
  return { defaultId: file.defaultId, entries }
}

/** 默认模型回落：原默认还在就保留，否则取第一条，没有就是空串。 */
function pickDefault(models, current) {
  const wanted = cleanText(current)
  if (models.some((item) => item.id === wanted)) return wanted
  return models[0]?.id ?? ''
}

// ── 组与模型的增删改（每个动作一次写盘）──

/** 把 [{model, name?, pricePerImage?}] 归一成可加入的模型（跳过重复与非法）。 */
function collectModels(file, provider, items) {
  const added = []
  for (const raw of Array.isArray(items) ? items : []) {
    const model = normalizeModel({ ...raw, providerId: provider.id }, provider)
    if (model === null) continue
    if (file.models.some((item) => item.id === model.id) || added.some((item) => item.id === model.id)) continue
    added.push(model)
  }
  return added
}

/** 新增一个模型组（可顺带写入勾选的模型与该组密钥）。 */
export async function addProvider(ctx, input) {
  const baseURL = cleanBaseUrl(input?.baseURL)
  if (baseURL === null) return { ok: false, error: '请填写接口链接（形如 https://…/v1）' }
  const file = await readConfigFile()
  const id = makeProviderId()
  const provider = { id, name: cleanText(input?.name) || hostOf(baseURL), baseURL, keyEnv: keyEnvFor(id) }
  const added = collectModels(file, provider, input?.models)
  const models = [...file.models, ...added]
  await writeRaw({ ...file, providers: [...file.providers, provider], models, defaultId: pickDefault(models, file.defaultId) })
  const keyNote = await attachKey(ctx, input?.apiKey, provider.keyEnv)
  return {
    ok: true,
    id,
    added: added.length,
    message: `已添加模型组「${provider.name}」` + (added.length > 0 ? `，含 ${added.length} 个模型` : '') + keyNote,
  }
}

/** 改组的名字 / 链接 / 密钥（密钥留空不动）。 */
export async function updateProvider(ctx, input) {
  const id = cleanText(input?.id)
  if (id === null) return { ok: false, error: '缺少模型组 id' }
  const file = await readConfigFile()
  const provider = file.providers.find((item) => item.id === id)
  if (provider === undefined) return { ok: false, error: '没有这个模型组' }
  const baseURL = input?.baseURL === undefined ? provider.baseURL : cleanBaseUrl(input.baseURL)
  if (baseURL === null) return { ok: false, error: '链接无效（需 http(s)://…）' }
  const next = {
    ...file,
    providers: file.providers.map((item) => (item.id === id
      ? { ...item, name: cleanText(input?.name) || item.name, baseURL }
      : item)),
  }
  await writeRaw(next)
  const keyNote = await attachKey(ctx, input?.apiKey, provider.keyEnv)
  return { ok: true, id, message: '模型组已更新' + keyNote }
}

/** 删组：连同组里的模型一起删。 */
export async function removeProvider(id) {
  const wanted = cleanText(id)
  if (wanted === null) return { ok: false, error: '缺少模型组 id' }
  const file = await readConfigFile()
  if (!file.providers.some((item) => item.id === wanted)) return { ok: false, error: '没有这个模型组' }
  const models = file.models.filter((item) => item.providerId !== wanted)
  const removed = file.models.length - models.length
  await writeRaw({
    ...file,
    providers: file.providers.filter((item) => item.id !== wanted),
    models,
    defaultId: pickDefault(models, file.defaultId),
  })
  return { ok: true, removed, message: `已删除模型组` + (removed > 0 ? `及其 ${removed} 个模型` : '') }
}

/** 往组里加模型（已在组里的跳过）。 */
export async function addModels(providerId, items) {
  const file = await readConfigFile()
  const provider = file.providers.find((item) => item.id === cleanText(providerId))
  if (provider === undefined) return { ok: false, error: '没有这个模型组' }
  const added = collectModels(file, provider, items)
  if (added.length === 0) return { ok: true, added: 0, message: '没有新增模型（勾选的都已在该组里）' }
  const models = [...file.models, ...added]
  await writeRaw({ ...file, models, defaultId: pickDefault(models, file.defaultId) })
  return { ok: true, added: added.length, message: `已加入 ${added.length} 个模型` }
}

/** 改一条模型：显示名 / 上游模型 id / 每张单价（单价清空即取消计费）。 */
export async function updateModel(input) {
  const id = cleanText(input?.id)
  if (id === null) return { ok: false, error: '缺少模型 id' }
  const file = await readConfigFile()
  const current = file.models.find((item) => item.id === id)
  if (current === undefined) return { ok: false, error: '没有这个模型' }
  const model = cleanText(input?.model) || current.model
  const nextId = `${current.providerId}:${model}`
  if (nextId !== id && file.models.some((item) => item.id === nextId)) {
    return { ok: false, error: '这个组里已经有同名模型' }
  }
  const updated = {
    ...current,
    id: nextId,
    model,
    name: cleanText(input?.name) || model,
    pricePerImage: input?.pricePerImage === undefined ? current.pricePerImage : cleanPricePerImage(input.pricePerImage),
  }
  const models = file.models.map((item) => (item.id === id ? updated : item))
  await writeRaw({ ...file, models, defaultId: file.defaultId === id ? nextId : file.defaultId })
  return { ok: true, id: nextId, message: '模型已更新' }
}

/** 删一条模型。 */
export async function removeModel(id) {
  const wanted = cleanText(id)
  if (wanted === null) return { ok: false, error: '缺少模型 id' }
  const file = await readConfigFile()
  if (!file.models.some((item) => item.id === wanted)) return { ok: false, error: '没有这个模型' }
  const models = file.models.filter((item) => item.id !== wanted)
  await writeRaw({ ...file, models, defaultId: pickDefault(models, file.defaultId) })
  return { ok: true, message: '已删除模型' }
}

export async function setDefaultModel(id) {
  const wanted = cleanText(id)
  const file = await readConfigFile()
  if (!file.models.some((item) => item.id === wanted)) return { ok: false, error: '目录里没有这个模型' }
  await writeRaw({ ...file, defaultId: wanted })
  return { ok: true, id: wanted }
}

// ── 密钥 ──

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

/** 写入密钥时的提示语（复用 add/update 的返回）。 */
async function attachKey(ctx, value, keyEnv) {
  const key = cleanText(value)
  if (key === null) return ''
  const stored = await saveApiKey(ctx, key, keyEnv)
  return stored?.stored === 'credentials' ? '，密钥已写入凭据库' : '，密钥已写入配置文件'
}

// ── 解析（生成链路与面板共用）──

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
      group: '',
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

/** 按模型 id 解析单条（用所属组的密钥），供「按条测试连通性」。 */
export async function resolveModelById(ctx, id) {
  const wanted = cleanText(id)
  if (wanted === null) return null
  const file = await readConfigFile()
  const active = materializeCatalog(file).entries.find((item) => item.id === wanted)
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

/** 按组 id 解析（用该组自己的 baseURL + 密钥），供「获取模型 / 更新模型」。 */
export async function resolveProviderById(ctx, id) {
  const wanted = cleanText(id)
  if (wanted === null) return null
  const file = await readConfigFile()
  const provider = file.providers.find((item) => item.id === wanted)
  if (provider === undefined) return null
  const key = await resolveKey(ctx, file, provider.keyEnv)
  return {
    id: provider.id,
    name: provider.name,
    baseURL: provider.baseURL,
    keyEnv: provider.keyEnv,
    apiKey: key.apiKey,
    keySource: key.keySource,
    models: file.models.filter((item) => item.providerId === provider.id).map((item) => item.model),
  }
}

/** 面板用的脱敏视图：永不返回密钥明文。 */
export async function configView(ctx) {
  const resolved = await resolveConfig(ctx)
  const file = resolved.file
  const providers = []
  const flat = []
  let modelCount = 0
  for (const provider of file.providers) {
    const key = await resolveKey(ctx, file, provider.keyEnv)
    const hasKey = key.apiKey !== null
    const models = []
    for (const model of file.models) {
      if (model.providerId !== provider.id) continue
      models.push({
        id: model.id,
        name: model.name,
        model: model.model,
        pricePerImage: model.pricePerImage,
        isDefault: model.id === file.defaultId,
      })
      flat.push({
        id: model.id,
        providerId: provider.id,
        group: provider.id,
        groupLabel: provider.name,
        name: model.name,
        model: model.model,
        baseURL: provider.baseURL,
        keyEnv: provider.keyEnv,
        pricePerImage: model.pricePerImage,
        builtin: false,
        isDefault: model.id === file.defaultId,
        hasKey,
        keySource: key.keySource,
      })
      modelCount += 1
    }
    providers.push({
      id: provider.id,
      name: provider.name,
      baseURL: provider.baseURL,
      keyEnv: provider.keyEnv,
      hasKey,
      keySource: key.keySource,
      models,
    })
  }
  return {
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
    providerCount: providers.length,
    modelCount,
    providers,
    catalog: { defaultId: resolved.defaultId, entries: flat },
  }
}