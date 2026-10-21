/**
 * @local/model-test — 模型参数预设与逐模型覆盖（纯 Host 侧：无路由、无 ctx 副作用）。
 *
 * 解决的是「第三方 API 的模型参数每次都要手填」：按**模型名**匹配一张主流模型
 * 参数预设表，得到 recommended 的 temperature / reasoningEffort / contextWindow /
 * maxTokens / 是否支持思考；面板里可以逐模型（或整组）手工覆盖，覆盖持久化。
 *
 * 数据来源三层，优先级从高到低：
 *   1. 用户覆盖       $DSH_HOME/dsh-toolkit/model-test/params.json（本模块读写）
 *   2. models.dev 同步 $DSH_HOME/dsh-toolkit/model-test/presets.json（用户点「同步」才有）
 *   3. 内置精选表      ./presets-data.mjs（离线可用，随插件版本发布）
 *
 * 运行时另有「live」能力来自 ctx.llm.resolveModelInfo()，那是适配器给出的**真实**
 * 可选档位（reasoning.efforts）与 defaultMaxTokens，解析参数时优先级最高——
 * 预设表只是推荐值，真正能发什么以适配器为准（发不支持的 effort 会被 DSH 拒绝，
 * 不做 clamp）。
 *
 * 路径一律**调用时**解析（跟 image-gen/paths.js 同一套环境变量语义），
 * 自检可以改 DSH_TOOLKIT_DATA 把读写重定向到临时目录。
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { BUILT_AT, SOURCE_LABEL, aliases as BUILTIN_ALIASES, families as BUILTIN_FAMILIES } from './presets-data.mjs'
import { modelTestDir } from '../image-gen/paths.js?v=44'

/** 覆盖键分隔符：provider + KEY_SEP + (modelId | '*')。与 host.js 的 targets 去重键一致。 */
export const KEY_SEP = '\u0000'
/** 整组默认的模型位。 */
export const GROUP_MODEL = '*'

/** DSH pi-ai 适配器接受的思考档位（THINKING_LEVELS），按升档顺序排列。 */
export const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']

export const TEMPERATURE_MIN = 0
export const TEMPERATURE_MAX = 2
export const MAX_TOKENS_MIN = 1
export const MAX_TOKENS_MAX = 1000000

/** 运行时可改的 models.dev 地址（自检/内网镜像用）。 */
const MODELS_DEV_API = 'https://models.dev/api.json'

const PARAMS_FILE_ENV = 'MODEL_TEST_PARAMS'
const PRESETS_FILE_ENV = 'MODEL_TEST_PRESETS'
const SYNC_TIMEOUT_MS = 20000

/** 覆盖文件：`MODEL_TEST_PARAMS` → 数据目录/model-test/params.json。 */
export function paramsFile() {
  const fromEnv = process.env[PARAMS_FILE_ENV]
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim()
  return join(modelTestDir(), 'params.json')
}

/** models.dev 同步结果：`MODEL_TEST_PRESETS` → 数据目录/model-test/presets.json。 */
export function presetsFile() {
  const fromEnv = process.env[PRESETS_FILE_ENV]
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim()
  return join(modelTestDir(), 'presets.json')
}

function messageOf(cause) {
  if (cause === null || cause === undefined) return '未知错误'
  if (typeof cause === 'string') return cause
  if (typeof cause.message === 'string' && cause.message !== '') return cause.message
  return String(cause)
}

/** 原子写：同目录临时文件 + rename，避免写一半被读到。 */
function writeJsonAtomic(file, value) {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = file + '.' + process.pid + '.tmp'
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n')
  renameSync(tmp, file)
}

function readJson(file) {
  try {
    if (!existsSync(file)) return null
    const text = readFileSync(file, 'utf8')
    if (text.trim() === '') return null
    const parsed = JSON.parse(text)
    return parsed !== null && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

// ───────────────────────── 参数归一化 ─────────────────────────

function finiteOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function clampNumber(value, min, max) {
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * 归一化一条「测试参数」。null / 缺省 / 非法值一律变 null（= 不发送该字段）：
 * 面板里「自动」就是 null，绝不偷偷塞一个用户没选的值。
 * @returns {{ temperature: number|null, maxTokens: number|null, reasoningEffort: string|null }}
 */
export function normalizeParams(raw) {
  const out = { temperature: null, maxTokens: null, reasoningEffort: null }
  if (raw === null || typeof raw !== 'object') return out
  if (raw.temperature !== undefined && raw.temperature !== null && raw.temperature !== '') {
    const n = finiteOrNull(raw.temperature)
    if (n !== null) out.temperature = Math.round(clampNumber(n, TEMPERATURE_MIN, TEMPERATURE_MAX) * 100) / 100
  }
  if (raw.maxTokens !== undefined && raw.maxTokens !== null && raw.maxTokens !== '') {
    const n = finiteOrNull(raw.maxTokens)
    if (n !== null) out.maxTokens = Math.round(clampNumber(n, MAX_TOKENS_MIN, MAX_TOKENS_MAX))
  }
  if (typeof raw.reasoningEffort === 'string' && THINKING_LEVELS.includes(raw.reasoningEffort.trim())) {
    out.reasoningEffort = raw.reasoningEffort.trim()
  }
  return out
}

/** 一条覆盖是否「什么都没配」（三个字段都 null）——这种条目视为删除。 */
export function isEmptyParams(params) {
  return params.temperature === null && params.maxTokens === null && params.reasoningEffort === null
}

/** 覆盖键。model 缺省 = 整组。 */
export function overrideKey(provider, model) {
  return String(provider) + KEY_SEP + (typeof model === 'string' && model !== '' ? model : GROUP_MODEL)
}

// ───────────────────────── 覆盖持久化 ─────────────────────────

/**
 * 读覆盖表。文件缺失/损坏只当空表（参数配置丢了大不了回到预设，不该让面板整个挂掉）。
 * @returns {Record<string, { temperature: number|null, maxTokens: number|null, reasoningEffort: string|null }>}
 */
export function readOverrides() {
  const file = readJson(paramsFile())
  const raw = file !== null && file.overrides !== null && typeof file.overrides === 'object' ? file.overrides : {}
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    const params = normalizeParams(value)
    if (!isEmptyParams(params)) out[key] = params
  }
  return out
}

export function writeOverrides(overrides) {
  const file = paramsFile()
  writeJsonAtomic(file, { version: 1, updatedAt: Date.now(), overrides })
  return file
}

/**
 * 应用一批覆盖变更（面板「保存」走这里）。
 * @param entries   [{ provider, model, params }]，params 为 null 或三字段全空 = 删除
 * @returns {{ ok: boolean, message?: string, overrides?: object, file?: string }}
 */
export function mutateOverrides(entries) {
  if (!Array.isArray(entries)) return { ok: false, message: 'entries 必须是数组' }
  const overrides = readOverrides()
  for (const entry of entries) {
    if (entry === null || typeof entry !== 'object') return { ok: false, message: 'entries 里存在非对象条目' }
    const provider = typeof entry.provider === 'string' ? entry.provider.trim() : ''
    if (provider === '') return { ok: false, message: '每条覆盖都要带 provider' }
    const model = typeof entry.model === 'string' && entry.model.trim() !== '' ? entry.model.trim() : GROUP_MODEL
    const key = overrideKey(provider, model)
    const params = normalizeParams(entry.params)
    if (entry.params === null || isEmptyParams(params)) delete overrides[key]
    else overrides[key] = params
  }
  const file = writeOverrides(overrides)
  return { ok: true, overrides, file }
}

// ───────────────────────── 预设匹配 ─────────────────────────

/** 模型 id 归一化：去 provider 前缀、去 tag 后缀、压小写、@ → -。 */
export function normalizeModelId(value) {
  let id = String(value === null || value === undefined ? '' : value).trim().toLowerCase()
  const slash = id.lastIndexOf('/')
  if (slash >= 0) id = id.slice(slash + 1)
  id = String(id.split(':')[0] ?? '').trim().replaceAll('@', '-')
  if (id.endsWith('[1m]')) id = id.slice(0, -'[1m]'.length).trim()
  return id
}

/** 把内置表编译成「正则 + 元数据」，一次性缓存（模块级，进程内复用）。 */
let builtinCache = null
function builtinFamilies() {
  if (builtinCache !== null) return builtinCache
  const compiled = []
  for (const family of Array.isArray(BUILTIN_FAMILIES) ? BUILTIN_FAMILIES : []) {
    if (family === null || typeof family !== 'object' || typeof family.id !== 'string') continue
    const patterns = []
    for (const source of Array.isArray(family.matches) ? family.matches : []) {
      try {
        patterns.push(new RegExp(source, 'i'))
      } catch {
        // 单条正则写错不该让整个预设库失效
      }
    }
    if (patterns.length === 0) continue
    compiled.push({ ...family, patterns })
  }
  // order 小者优先；同 order 时按 id 稳定排序，保证结果可复现。
  compiled.sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000) || String(a.id).localeCompare(String(b.id)))
  builtinCache = compiled
  return compiled
}

/** 内置表数据（面板展示/导出用，过滤掉内部字段）。 */
export function builtinPresets() {
  return builtinFamilies().map((family) => {
    const { patterns, ...rest } = family
    return rest
  })
}

export function builtinMeta() {
  const families = builtinFamilies()
  return {
    builtinAt: typeof BUILT_AT === 'string' ? BUILT_AT : '',
    builtinLabel: typeof SOURCE_LABEL === 'string' ? SOURCE_LABEL : '',
    familyCount: families.length,
    aliases: BUILTIN_ALIASES !== null && typeof BUILTIN_ALIASES === 'object' ? BUILTIN_ALIASES : {},
  }
}

/**
 * 读 models.dev 同步结果。条目形状与内置族一致（额外带 `from: 'models-dev'`）。
 * 文件不存在 → 空库，不报错。
 */
export function readSyncedPresets() {
  const file = readJson(presetsFile())
  if (file === null) return { at: null, count: 0, families: [] }
  const families = []
  for (const raw of Array.isArray(file.families) ? file.families : []) {
    if (raw === null || typeof raw !== 'object' || typeof raw.id !== 'string') continue
    const patterns = []
    for (const source of Array.isArray(raw.matches) ? raw.matches : []) {
      try {
        patterns.push(new RegExp(source, 'i'))
      } catch {
        // 同上：坏一条跳过一条
      }
    }
    if (patterns.length === 0) continue
    families.push({ ...raw, patterns, from: 'models-dev' })
  }
  families.sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000) || String(a.id).localeCompare(String(b.id)))
  return {
    at: typeof file.at === 'number' ? file.at : null,
    count: families.length,
    families,
  }
}

/** 输出给面板的「预设摘要」：抹掉内部正则，保留可展示/可用的字段。 */
function publicPreset(family, from) {
  if (family === null || family === undefined) return null
  const {
    patterns,
    from: _ignored,
    ...rest
  } = family
  return { ...rest, from }
}

const CACHE_TTL_MS = 5000
let presetCache = { at: 0, key: '', value: null }

/**
 * 合并后的预设库：models.dev 同步条目优先于内置条目（同名 id 覆盖）。
 * 5 秒缓存，避免 catalog 一次请求里每条模型都重读文件。
 */
export function loadPresetLibrary() {
  const key = presetsFile()
  const now = Date.now()
  if (presetCache.value !== null && presetCache.key === key && now - presetCache.at < CACHE_TTL_MS) return presetCache.value
  const synced = readSyncedPresets()
  const syncedIds = new Set(synced.families.map((family) => family.id))
  const families = [...synced.families, ...builtinFamilies().filter((family) => !syncedIds.has(family.id))]
  const value = {
    families,
    aliases: builtinMeta().aliases,
    meta: { ...builtinMeta(), syncedAt: synced.at, syncedCount: synced.count },
  }
  presetCache = { at: now, key, value }
  return value
}

/** 写盘后立刻让缓存失效（否则面板要等 5 秒才看到新同步结果）。 */
export function invalidatePresetCache() {
  presetCache = { at: 0, key: '', value: null }
}

/**
 * 按模型名匹配预设族。
 * 顺序：归一化名 → 用户别名 → 精确 id → 正则（order 小者优先）。
 * @param modelId  原始模型 id（大小写、provider 前缀都无所谓）
 * @returns {object|null} 命中族（带 from），没命中 null
 */
export function matchPreset(modelId, library) {
  const lib = library !== undefined && library !== null ? library : loadPresetLibrary()
  const normalized = normalizeModelId(modelId)
  if (normalized === '') return null

  const aliasId = lib.aliases !== null && typeof lib.aliases === 'object' ? lib.aliases[normalized] : undefined
  const candidates = []
  if (typeof aliasId === 'string') {
    const aliased = lib.families.find((family) => family.id === aliasId)
    if (aliased !== undefined) candidates.push({ family: aliased, via: 'alias' })
  }
  for (const family of lib.families) {
    if (String(family.id).toLowerCase() === normalized) {
      candidates.push({ family, via: 'id' })
      break
    }
  }
  for (const family of lib.families) {
    if (family.patterns.some((pattern) => pattern.test(normalized))) {
      candidates.push({ family, via: 'match' })
      break
    }
  }
  if (candidates.length === 0) return null
  // 别名 > 精确 id > 正则；同一层里 loadPresetLibrary 已按 order 排好序。
  const picked = candidates[0]
  return { ...publicPreset(picked.family, picked.family.from ?? 'builtin'), via: picked.via }
}

// ───────────────────────── 生效参数解析 ─────────────────────────

const SOURCE_LABEL_OF = {
  target: '本次指定',
  override: '手工配置',
  group: '整组默认',
  preset: '预设命中',
  default: '全局默认',
}

const REASONING_LABEL = {
  off: '关闭',
  minimal: '最低',
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '极高',
  max: '最高',
}

function compatibleParam(value, params) {
  if (params === null || params === undefined) return null
  return params[value] !== null && params[value] !== undefined ? params[value] : null
}

/**
 * 解析一个模型真正要发送的测试参数。
 *
 * 优先级：targets[].params > 单模型覆盖 > 整组覆盖 > 预设 suggest > 全局默认。
 * 再叠「能不能发」的安全阀：
 *   - reasoningEffort 必须在 live.efforts（适配器真实档位）里；
 *     不在就退到 live.defaultEffort / 第一档，并标明「已改档」；
 *     live 缺失时退到 preset.reasoning.levels；都没有就不发。
 *   - temperature：preset.supportsTemperature === false 时不发（模型不接受温度）。
 *
 * @param input {
 *   provider, model, params?,           // params: 本次请求里逐 target 指定的参数
 *   overrides,                          // 覆盖表（readOverrides() 的结果）
 *   preset,                             // matchPreset() 的结果（可为 null）
 *   live,                               // { efforts, defaultEffort } 适配器真实能力（可为 null）
 *   fallback                            // 全局默认 { temperature, maxTokens, reasoningEffort }
 * }
 * @returns {{ temperature: number|null, maxTokens: number|null, reasoningEffort: string|null, source: string, note: string }}
 */
export function resolveParams(input) {
  const overrides = input.overrides !== null && typeof input.overrides === 'object' ? input.overrides : {}
  const preset = input.preset !== null && typeof input.preset === 'object' ? input.preset : null
  const live = input.live !== null && typeof input.live === 'object' ? input.live : null
  const fallback = normalizeParams(input.fallback)

  const single = overrides[overrideKey(input.provider, input.model)] ?? null
  const group = overrides[overrideKey(input.provider, GROUP_MODEL)] ?? null
  const target = normalizeParams(input.params)

  const layers = [
    { source: 'target', params: input.params === undefined || input.params === null ? null : target },
    { source: 'override', params: single },
    { source: 'group', params: group },
    { source: 'preset', params: preset !== null && preset.suggest !== null && typeof preset.suggest === 'object' ? normalizeParams(preset.suggest) : null },
    { source: 'default', params: fallback },
  ]

  /** 逐字段取第一个「显式给出」的值，并记下来源。 */
  const pick = (field) => {
    for (const layer of layers) {
      const value = compatibleParam(field, layer.params)
      if (value !== null) return { value, source: layer.source }
    }
    return { value: null, source: null }
  }

  const temperature = pick('temperature')
  const maxTokens = pick('maxTokens')
  const reasoningEffort = pick('reasoningEffort')

  const notes = []
  if (preset !== null && preset.label !== undefined) notes.push('预设 · ' + preset.label)

  // 温度安全阀：预设明确说不接受温度时，即使配了也不发。
  let tempValue = temperature.value
  if (tempValue !== null && preset !== null && preset.supportsTemperature === false) {
    notes.push('该模型不接受 temperature，已略过 ' + tempValue)
    tempValue = null
  }

  // 思考档位安全阀：只发适配器真的接受的档。
  let effortValue = reasoningEffort.value
  if (effortValue !== null) {
    const liveEfforts = live !== null && Array.isArray(live.efforts) ? live.efforts.filter((item) => THINKING_LEVELS.includes(item)) : []
    if (liveEfforts.length > 0) {
      if (!liveEfforts.includes(effortValue)) {
        const fallbackEffort = live !== null && THINKING_LEVELS.includes(live.defaultEffort) && liveEfforts.includes(live.defaultEffort)
          ? live.defaultEffort
          : liveEfforts[0]
        notes.push('该模型不支持 ' + effortLabel(effortValue) + '，已改用 ' + effortLabel(fallbackEffort))
        effortValue = fallbackEffort
      }
    } else if (preset !== null && preset.reasoning !== null && typeof preset.reasoning === 'object' && Array.isArray(preset.reasoning.levels)) {
      const presetLevels = preset.reasoning.levels.filter((item) => THINKING_LEVELS.includes(item))
      if (presetLevels.length > 0 && !presetLevels.includes(effortValue)) {
        const fallbackEffort = presetLevels.includes(preset.reasoning.default) ? preset.reasoning.default : presetLevels[0]
        notes.push('预设档位里没有 ' + effortLabel(effortValue) + '，已改用 ' + effortLabel(fallbackEffort))
        effortValue = fallbackEffort
      }
    }
  }

  // maxTokens 也要服从适配器的 defaultMaxTokens 上限（超了适配器会拒绝）。
  let maxTokensValue = maxTokens.value
  const liveMax = live !== null && Number.isFinite(live.defaultMaxTokens) && live.defaultMaxTokens > 0 ? live.defaultMaxTokens : null
  if (maxTokensValue !== null && liveMax !== null && maxTokensValue > liveMax) {
    notes.push('输出上限超过模型配置的 maxTokens（' + liveMax + '），已收到 ' + liveMax)
    maxTokensValue = liveMax
  }

  const source = [temperature.source, maxTokens.source, reasoningEffort.source].find((item) => item !== null) ?? 'default'
  return {
    temperature: tempValue,
    maxTokens: maxTokensValue,
    reasoningEffort: effortValue,
    source: tempValue === null && maxTokensValue === null && effortValue === null ? 'default' : source,
    note: notes.join('；'),
  }
}

export function effortLabel(id) {
  return REASONING_LABEL[id] !== undefined ? REASONING_LABEL[id] + '(' + id + ')' : String(id)
}

export function sourceLabel(id) {
  return SOURCE_LABEL_OF[id] !== undefined ? SOURCE_LABEL_OF[id] : String(id)
}

// ───────────────────────── models.dev 同步 ─────────────────────────

/** 非文本模型标记（与 token-usage 的口径一致：这些不该出现在参数预设里）。 */
const NON_TEXT_MARKERS = ['audio', 'deprecated', 'embedding', 'image', 'moderation', 'realtime', 'transcribe', 'tts', 'video']

function inferReasoning(model) {
  const options = Array.isArray(model.reasoning_options) ? model.reasoning_options : null
  if (options === null || options.length === 0) {
    return model.reasoning === true ? { mode: 'toggle', levels: ['off', 'low'], default: 'low', wire: {} } : { mode: 'none', levels: [], default: null, wire: {} }
  }
  const efforts = options.find((item) => item !== null && typeof item === 'object' && item.type === 'effort')
  if (efforts !== undefined && Array.isArray(efforts.values) && efforts.values.length > 0) {
    const levels = []
    for (const raw of efforts.values) {
      const id = String(raw).trim().toLowerCase()
      if (THINKING_LEVELS.includes(id) && !levels.includes(id)) levels.push(id)
      // 厂商用 none 表示「不思考」，在 DSH 的档位里对应 off
      if (id === 'none' && !levels.includes('off')) levels.push('off')
    }
    if (levels.length > 0) {
      levels.sort((a, b) => THINKING_LEVELS.indexOf(a) - THINKING_LEVELS.indexOf(b))
      const pick = levels.includes('medium') ? 'medium' : levels[levels.length - 1]
      return { mode: 'effort', levels, default: pick, wire: {} }
    }
  }
  const budget = options.find((item) => item !== null && typeof item === 'object' && item.type === 'budget_tokens')
  if (budget !== undefined) {
    return { mode: 'budget', levels: ['off', 'low', 'medium', 'high'], default: 'medium', wire: {}, budgetTokens: { min: Number(budget.min) || null, max: Number(budget.max) || null } }
  }
  return { mode: 'toggle', levels: ['off', 'low'], default: 'low', wire: {} }
}

/**
 * models.dev api.json → 预设族（只保留文本进、文本/思考模型；厂商原生 provider 优先）。
 * 聚合商（openrouter/poe/vercel/jiekou 等）的条目会被厂商原生条目覆盖：同一归一化 id
 * 只保留第一个，原生 provider 排前面。
 */
export function flattenModelsDev(data, options = {}) {
  if (data === null || typeof data !== 'object') return []
  const allow = Array.isArray(options.providers) && options.providers.length > 0 ? new Set(options.providers) : null
  const entries = []

  const providers = Object.entries(data).filter(([providerId]) => allow === null || allow.has(providerId))
  // 原生厂商（非聚合商）优先：名字里带这些标记的排后面。
  const AGGREGATORS = ['openrouter', 'poe', 'vercel', 'jiekou', 'together', 'fireworks', 'groq', 'cloudflare', 'ollama', 'lmstudio', 'huggingface', 'nvidia', 'abacus', 'requesty', 'zenmux', 'modelscope']
  const isAggregator = (providerId) => AGGREGATORS.some((name) => providerId.includes(name))
  providers.sort((a, b) => Number(isAggregator(a[0])) - Number(isAggregator(b[0])) || a[0].localeCompare(b[0]))

  for (const [providerId, provider] of providers) {
    if (provider === null || typeof provider !== 'object') continue
    const models = provider.models !== null && typeof provider.models === 'object' ? provider.models : {}
    for (const [rawModelId, model] of Object.entries(models)) {
      if (model === null || typeof model !== 'object') continue
      if (String(model.status === undefined ? '' : model.status).toLowerCase() === 'deprecated') continue
      const modalities = model.modalities !== null && typeof model.modalities === 'object' ? model.modalities : {}
      const input = Array.isArray(modalities.input) ? modalities.input.map((item) => String(item).toLowerCase()) : ['text']
      const output = Array.isArray(modalities.output) ? modalities.output.map((item) => String(item).toLowerCase()) : ['text']
      if (!input.includes('text') || !output.includes('text')) continue
      if (output.some((item) => item !== 'text')) continue
      const haystack = (rawModelId + ' ' + String(model.name === undefined ? '' : model.name)).toLowerCase()
      if (NON_TEXT_MARKERS.some((marker) => haystack.includes(marker))) continue
      const id = normalizeModelId(rawModelId)
      if (id === '') continue
      const limit = model.limit !== null && typeof model.limit === 'object' ? model.limit : {}
      const reasoning = inferReasoning(model)
      const supportsTemperature = model.temperature !== false
      entries.push({
        id: 'modelsdev:' + id,
        label: typeof model.name === 'string' && model.name.trim() !== '' ? model.name.trim() : id,
        vendor: providerId,
        matches: ['^' + escapeRegExp(id) + '$'],
        order: 500,
        supportsTemperature,
        reasoning,
        contextWindow: Number.isFinite(limit.context) && limit.context > 0 ? limit.context : null,
        maxTokens: Number.isFinite(limit.output) && limit.output > 0 ? limit.output : null,
        suggest: {
          temperature: supportsTemperature ? 0.7 : null,
          maxTokens: 256,
          reasoningEffort: reasoning.default,
        },
        source: 'https://models.dev/?provider=' + encodeURIComponent(providerId),
        note: '来自 models.dev（' + providerId + '）' + (reasoning.mode === 'budget' ? '，思考预算模式' : ''),
        modelId: id,
      })
    }
  }

  // 同一归一化 id 只留第一个（原生 provider 已在前面）。
  const seen = new Set()
  const out = []
  for (const entry of entries) {
    if (seen.has(entry.modelId)) continue
    seen.add(entry.modelId)
    out.push(entry)
  }
  out.sort((a, b) => a.modelId.localeCompare(b.modelId))
  return out
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 拉 models.dev，把「当前目录里出现的模型」对应的预设写进 presets.json。
 * 只同步用得到的模型：全量两千多条既慢又没意义。
 * @param modelIds  目录里所有模型 id（或 { provider, model } 的数组）
 * @returns {{ ok: boolean, count?: number, at?: number, message: string }}
 */
export async function syncPresetsFromModelsDev(modelIds) {
  const api = typeof process.env.MODELS_DEV_API_URL === 'string' && process.env.MODELS_DEV_API_URL !== ''
    ? process.env.MODELS_DEV_API_URL
    : MODELS_DEV_API
  const wanted = new Set()
  for (const item of Array.isArray(modelIds) ? modelIds : []) {
    const raw = item !== null && typeof item === 'object' ? item.model : item
    const id = normalizeModelId(raw)
    if (id !== '') wanted.add(id)
  }

  let payload
  try {
    const response = await fetch(api, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(SYNC_TIMEOUT_MS) })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    payload = await response.json()
  } catch (cause) {
    return { ok: false, message: '同步失败：' + messageOf(cause) }
  }

  const all = flattenModelsDev(payload)
  if (all.length === 0) return { ok: false, message: '同步失败：models.dev 返回的条目为空' }
  const selected = wanted.size === 0 ? [] : all.filter((entry) => wanted.has(entry.modelId))
  if (wanted.size > 0 && selected.length === 0) {
    return { ok: false, message: 'models.dev 上未匹配到当前目录里的模型（' + Array.from(wanted).slice(0, 8).join('、') + '…）' }
  }

  const at = Date.now()
  const payloadOut = {
    version: 1,
    at,
    source: api,
    total: all.length,
    matched: selected.length,
    families: selected.map((entry) => {
      const { modelId, ...rest } = entry
      return rest
    }),
  }
  const file = presetsFile()
  writeJsonAtomic(file, payloadOut)
  invalidatePresetCache()
  const preview = selected.slice(0, 5).map((entry) => entry.modelId).join('、')
  return {
    ok: true,
    count: selected.length,
    at,
    message: wanted.size === 0
      ? '当前目录里没有模型，未同步（先刷新目录）'
      : '同步完成：' + selected.length + ' 个在用模型（' + preview + (selected.length > 5 ? ' 等' : '') + '）',
  }
}

// ───────────────────────── 生成 provider 配置片段 ─────────────────────────

/**
 * 把一个模型的预设 + live 能力拼成 llm-pi-ai 的 models 条目 YAML 片段。
 * 用户配第三方 provider 时直接粘贴，省掉手填 contextWindow / maxTokens / reasoningEfforts。
 * @returns {string} 可直接粘到 cordis.patch.yml 的 models 数组里
 */
export function providerSnippet(input) {
  const preset = input.preset !== null && typeof input.preset === 'object' ? input.preset : null
  const live = input.live !== null && typeof input.live === 'object' ? input.live : null
  const modelId = typeof input.model === 'string' ? input.model : ''
  const lines = []
  lines.push('- id: ' + modelId)
  if (preset !== null && typeof preset.label === 'string' && preset.label !== '') lines.push('  name: ' + preset.label)
  const contextWindow = live !== null && Number.isFinite(live.contextWindow) ? live.contextWindow : preset !== null ? preset.contextWindow : null
  if (Number.isFinite(contextWindow) && contextWindow > 0) lines.push('  contextWindow: ' + contextWindow)
  const maxTokens = live !== null && Number.isFinite(live.defaultMaxTokens) ? live.defaultMaxTokens : preset !== null ? preset.maxTokens : null
  if (Number.isFinite(maxTokens) && maxTokens > 0) lines.push('  maxTokens: ' + maxTokens)
  const modalities = live !== null && Array.isArray(live.inputModalities) && live.inputModalities.length > 0
    ? live.inputModalities
    : ['text']
  lines.push('  input:')
  for (const modality of modalities) lines.push('    - ' + modality)

  const levels = live !== null && Array.isArray(live.efforts) && live.efforts.length > 0
    ? live.efforts
    : preset !== null && preset.reasoning !== null && typeof preset.reasoning === 'object' ? preset.reasoning.levels ?? [] : []
  const usable = levels.filter((level) => THINKING_LEVELS.includes(level) && level !== 'off')
  if (usable.length === 0) {
    lines.push('  reasoningEfforts: false')
  } else {
    lines.push('  reasoningEfforts:')
    const wire = preset !== null && preset.reasoning !== null && typeof preset.reasoning === 'object' && preset.reasoning.wire !== null && typeof preset.reasoning.wire === 'object' ? preset.reasoning.wire : {}
    for (const level of usable) {
      const spelling = typeof wire[level] === 'string' && wire[level] !== '' ? wire[level] : level
      lines.push('    ' + level + ': ' + spelling)
    }
  }
  if (preset !== null && preset.supportsTemperature === false) {
    lines.push('  compat:')
    lines.push('    supportsTemperature: false')
  }
  return lines.join('\n') + '\n'
}
