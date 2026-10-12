import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { entries as builtinPricingEntries, SOURCE_LABEL as BUILTIN_SOURCE_LABEL } from './pricing-defaults.mjs?v=15'
import { DATA_DIR } from '../image-gen/paths.js?v=36'

export const name = 'token-usage'
export const inject = ['fs', 'sessions', 'sessionPersistence', 'sessionController', 'connection', 'llm']

// 插件自有价目文件：用户自定义/修改 + models.dev 同步结果都存这里（内置表仍打底）。
// 默认收在插件统一数据目录（<插件根>/data/token-usage/pricing.json），与 image-gen
// 的图库/配置/花费记录同进退；TOKEN_USAGE_PRICING 环境变量可改路径（自检注入用）。
// 文件缺失/损坏只降级到内置表。
const PRICING_FILE = join(DATA_DIR, 'token-usage', 'pricing.json')
const MODELS_DEV_API = 'https://models.dev/api.json'
const DEFAULT_USD_CNY = 7.2
// 诊断日志默认关闭：设 TOKEN_USAGE_DIAG=1 才写入系统临时目录（排障用，不污染 TMPDIR）。
const DIAG_LOG = process.env.TOKEN_USAGE_DIAG === '1' ? join(tmpdir(), 'dsh-token-usage-host.log') : null

// 请求侧 modelId 与 models.dev 的名字常不一致（网关带日期后缀、家族名不同等），
// 精确匹配与前缀匹配都覆盖不到时在这里显式对齐，例如：
//   { 'deepseek-v4.1-flash': 'deepseek-flash' }
const MODEL_ALIASES = {}

function diag(line) {
  if (DIAG_LOG === null) return
  try {
    appendFileSync(DIAG_LOG, `[${new Date().toISOString()}] ${line}\n`)
  } catch {}
}

let INSTANCE_ID = ''

diag('module evaluated build=alias-v15')

function numberOf(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function pricingFilePath() {
  const fromEnv = process.env.TOKEN_USAGE_PRICING
  return fromEnv !== undefined && fromEnv !== '' ? fromEnv : PRICING_FILE
}

// ── models.dev 同步（过滤与 ID 归一化规则见 flattenModelsDev）──

const NON_TEXT_MARKERS = ['audio', 'deprecated', 'embedding', 'image', 'moderation', 'realtime', 'transcribe', 'tts', 'video']
const NON_TEXT_OUTPUT = new Set(['audio', 'image', 'video'])

function normalizeModelsDevId(value) {
  let id = String(value === null || value === undefined ? '' : value)
  const slash = id.lastIndexOf('/')
  if (slash >= 0) id = id.slice(slash + 1)
  id = String(id.split(':')[0] ?? '').trim().replaceAll('@', '-').toLowerCase()
  if (id.endsWith('[1m]')) id = id.slice(0, -'[1m]'.length).trim()
  return id
}

/** models.dev api.json → 去重后的价目条目（同 ID 取最新发布；过滤非文本模型）。 */
export function flattenModelsDev(data) {
  const entries = []
  if (data === null || typeof data !== 'object') return entries
  for (const provider of Object.values(data)) {
    if (provider === null || typeof provider !== 'object') continue
    for (const [rawModelId, model] of Object.entries(provider.models !== null && typeof provider.models === 'object' ? provider.models : {})) {
      if (model === null || typeof model !== 'object') continue
      if (String(model.status === null || model.status === undefined ? '' : model.status).toLowerCase() === 'deprecated') continue
      const outputs = Array.isArray(model.modalities !== null && typeof model.modalities === 'object' ? model.modalities.output : null)
        ? model.modalities.output.map((value) => String(value).toLowerCase())
        : null
      if (outputs !== null && outputs.length > 0 && (!outputs.includes('text') || outputs.some((value) => NON_TEXT_OUTPUT.has(value)))) continue
      const haystack = (rawModelId + ' ' + String(model.name === null || model.name === undefined ? '' : model.name)).toLowerCase()
      if (NON_TEXT_MARKERS.some((marker) => haystack.includes(marker))) continue
      const cost = model.cost !== null && typeof model.cost === 'object' ? model.cost : {}
      const input = typeof cost.input === 'number' && cost.input >= 0 ? cost.input : null
      const output = typeof cost.output === 'number' && cost.output >= 0 ? cost.output : null
      if (input === null && output === null) continue
      const modelId = normalizeModelsDevId(rawModelId)
      if (modelId === '') continue
      entries.push({
        modelId,
        displayName: typeof model.name === 'string' && model.name.trim() !== '' ? model.name.trim() : modelId,
        input: input ?? 0,
        output: output ?? 0,
        cacheRead: typeof cost.cache_read === 'number' && cost.cache_read >= 0 ? cost.cache_read : 0,
        cacheWrite: typeof cost.cache_write === 'number' && cost.cache_write >= 0 ? cost.cache_write : 0,
        releaseDate: typeof model.release_date === 'string' ? model.release_date : '',
      })
    }
  }
  entries.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.displayName.localeCompare(b.displayName))
  const byId = new Map()
  for (const entry of entries) if (!byId.has(entry.modelId)) byId.set(entry.modelId, entry)
  return Array.from(byId.values())
}

function tokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let index = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (index < items.length) {
      const current = index++
      results[current] = await fn(items[current])
    }
  })
  await Promise.all(workers)
  return results
}

export function apply(ctx) {
  INSTANCE_ID = Math.random().toString(36).slice(2, 7)
  diag(`apply called inst=${INSTANCE_ID}`)
  try {
    applyInner(ctx)
    diag(`applied ok inst=${INSTANCE_ID}`)
  } catch (cause) {
    diag(`apply failed: ${(cause && cause.stack) || String(cause)}`)
    throw cause
  }
}

function applyInner(ctx) {
  let builtinRate
  let pricingCache
  const cache = new Map()
  const pending = new Map()
  // 每会话增量缓存：calls 为全量解析结果，revision/sourceUpdatedAt 判断是否需要重读
  const sessionCache = new Map()
  // 最近一次 scan 看到的在用模型（计价明细「只看在用」过滤用）
  let lastUsedModels = []

  // DSH 设置里配置的全部模型（llm 服务 listConfigurableProviders，形状未公开，防御性提取）。
  // 「只看在用」= 实际用过（会话事件流）∪ 设置里已配置，两边任一命中即显示。
  function configuredModels() {
    const llm = ctx.get('llm')
    if (llm === null || llm === undefined || typeof llm.listConfigurableProviders !== 'function') return []
    let providers
    try {
      providers = llm.listConfigurableProviders()
    } catch {
      return []
    }
    const names = new Set()
    for (const provider of Array.isArray(providers) ? providers : []) {
      if (provider === null || typeof provider !== 'object') {
        if (typeof provider === 'string' && provider.trim() !== '') names.add(provider.trim())
        continue
      }
      for (const list of [provider.models, provider.modelIds, provider.entries]) {
        if (!Array.isArray(list)) continue
        for (const item of list) {
          const id = typeof item === 'string'
            ? item
            : item !== null && typeof item === 'object' ? (item.id ?? item.model ?? item.modelId) : null
          if (typeof id === 'string' && id.trim() !== '') names.add(id.trim())
        }
      }
    }
    return Array.from(names)
  }

  function inUseModelNames() {
    const merged = new Set(lastUsedModels.map((name) => String(name)))
    for (const name of configuredModels()) merged.add(name)
    return Array.from(merged)
  }

  // 内置价目：随插件分发（pricing-defaults.mjs），进程内只构建一次。
  function builtinPricing() {
    if (builtinRate !== undefined) return builtinRate
    const table = Object.create(null)
    const entries = []
    for (const item of Array.isArray(builtinPricingEntries) ? builtinPricingEntries : []) {
      if (item === null || typeof item !== 'object' || typeof item.modelId !== 'string' || item.modelId === '') continue
      const rate = {
        input: numberOf(item.input),
        output: numberOf(item.output),
        cacheRead: numberOf(item.cacheRead),
        cacheWrite: numberOf(item.cacheWrite),
        displayName: typeof item.displayName === 'string' && item.displayName !== '' ? item.displayName : item.modelId,
      }
      table[item.modelId.toLowerCase()] = rate
      entries.push({
        modelId: item.modelId,
        displayName: rate.displayName,
        input: rate.input,
        output: rate.output,
        cacheRead: rate.cacheRead,
        cacheWrite: rate.cacheWrite,
      })
    }
    entries.sort((a, b) => a.modelId.localeCompare(b.modelId))
    builtinRate = { table, entries }
    return builtinRate
  }

  // ── 用户价目文件（<插件根>/data/token-usage/pricing.json，TOKEN_USAGE_PRICING 可改路径）──
  // { version, models: [{modelId, displayName, input, output, cacheRead, cacheWrite, source}],
  //   deletedModelIds: [...], modelsDevSync: { lastSyncAt, lastSyncError, lastCount } }
  // source: 'user' 手工增改（同步不覆盖）| 'models-dev' 同步写入（下次同步刷新）。

  function emptyUserFile() {
    return {
      version: 1,
      models: [],
      deletedModelIds: [],
      modelsDevSync: { lastSyncAt: 0, lastSyncError: null, lastCount: 0 },
      exchangeRate: DEFAULT_USD_CNY,
    }
  }

  function normalizeUserFile(raw) {
    const file = emptyUserFile()
    if (raw === null || typeof raw !== 'object') return file
    for (const item of Array.isArray(raw.models) ? raw.models : []) {
      if (item === null || typeof item !== 'object') continue
      const modelId = typeof item.modelId === 'string' ? item.modelId.trim() : ''
      if (modelId === '') continue
      const displayName = typeof item.displayName === 'string' && item.displayName.trim() !== '' ? item.displayName.trim() : modelId
      file.models.push({
        modelId,
        displayName,
        input: numberOf(item.input),
        output: numberOf(item.output),
        cacheRead: numberOf(item.cacheRead),
        cacheWrite: numberOf(item.cacheWrite),
        source: item.source === 'models-dev' ? 'models-dev' : 'user',
      })
    }
    file.deletedModelIds = Array.from(new Set(
      (Array.isArray(raw.deletedModelIds) ? raw.deletedModelIds : [])
        .map((value) => String(value === null || value === undefined ? '' : value).trim())
        .filter((value) => value !== ''),
    ))
    const sync = raw.modelsDevSync !== null && typeof raw.modelsDevSync === 'object' ? raw.modelsDevSync : {}
    const syncError = typeof sync.lastSyncError === 'string' && sync.lastSyncError.trim() !== '' ? sync.lastSyncError.trim().slice(0, 500) : null
    file.modelsDevSync = {
      lastSyncAt: numberOf(sync.lastSyncAt),
      lastSyncError: syncError,
      lastCount: numberOf(sync.lastCount),
    }
    const rawRate = Number(raw.exchangeRate)
    file.exchangeRate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : DEFAULT_USD_CNY
    return file
  }

  function readUserPricing() {
    const path = pricingFilePath()
    try {
      const stat = statSync(path)
      const mtimeMs = numberOf(stat.mtimeMs)
      const file = normalizeUserFile(JSON.parse(readFileSync(path, 'utf8')))
      return { mtimeMs, file, error: null }
    } catch (cause) {
      if (cause !== null && typeof cause === 'object' && cause.code === 'ENOENT') {
        return { mtimeMs: 0, file: null, error: null }
      }
      return { mtimeMs: 0, file: null, error: String(cause && cause.message ? cause.message : cause) }
    }
  }

  function writeUserPricing(file) {
    const path = pricingFilePath()
    mkdirSync(dirname(path), { recursive: true })
    const data = JSON.stringify(file, null, 2) + '\n'
    const tmp = path + '.tmp'
    writeFileSync(tmp, data)
    renameSync(tmp, path)
  }

  function mutateUserPricing(mutate) {
    const current = readUserPricing()
    const file = current.file === null ? emptyUserFile() : normalizeUserPricingClone(current.file)
    mutate(file)
    writeUserPricing(file)
    pricingCache = undefined // 强制下次 pricing() 重建合并表
    return file
  }

  function normalizeUserPricingClone(file) {
    // mutate 前的浅保护：JSON 往返一次，避免共享引用被意外改写。
    return normalizeUserFile(JSON.parse(JSON.stringify(file)))
  }

  async function syncModelsDevPricing() {
    const api = process.env.MODELS_DEV_API_URL && process.env.MODELS_DEV_API_URL !== '' ? process.env.MODELS_DEV_API_URL : MODELS_DEV_API
    let entries
    try {
      const response = await fetch(api, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000) })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      entries = flattenModelsDev(await response.json())
    } catch (cause) {
      const message = String(cause && cause.message ? cause.message : cause)
      try {
        mutateUserPricing((file) => { file.modelsDevSync.lastSyncError = message })
      } catch {}
      diag(`models.dev sync failed: ${message}`)
      return { ok: false, message: '同步失败：' + message }
    }
    // 只挑当前实际用过的模型（全部会话、全部时间的 scan 结果），不同步 models.dev 全量。
    let usedModels = []
    try {
      const usage = await getUsage('all', false)
      usedModels = Array.isArray(usage.models) ? usage.models.map((item) => String(item.model || '')) : []
    } catch {}
    const wanted = new Set()
    for (const name of usedModels) {
      const key = name.toLowerCase()
      if (key === '') continue
      wanted.add(key)
      const alias = MODEL_ALIASES[key]
      if (alias !== undefined) wanted.add(alias)
    }
    if (wanted.size === 0) {
      return { ok: false, message: '当前没有任何已使用的模型记录，未同步价目' }
    }
    // 匹配：精确 / 别名 / 「日期快照」式后缀。家族变体（glm-x-flash-eu、grok-4.7 这类）
    // 不再被前缀扩散带进来——宁可留空显示「未配价」，也不要一堆用不上的条目。
    const SNAPSHOT_TAIL = /^(?:\d{6,8}|latest|preview)$/
    const selected = entries.filter((entry) => {
      if (wanted.has(entry.modelId)) return true
      for (const key of wanted) {
        if (entry.modelId.length > key.length && entry.modelId.startsWith(key + '-')
          && SNAPSHOT_TAIL.test(entry.modelId.slice(key.length + 1))) return true
        if (key.length > entry.modelId.length && key.startsWith(entry.modelId + '-')
          && SNAPSHOT_TAIL.test(key.slice(entry.modelId.length + 1))) return true
      }
      return false
    })
    if (selected.length === 0) {
      return { ok: false, message: 'models.dev 上未匹配到当前使用的模型（' + Array.from(wanted).join('、') + '），未写入价目' }
    }
    mutateUserPricing((file) => {
      // 合并优先级：用户手工条目 > models.dev 同步条目。手工条目永远保留；
      // 删除墓碑继续生效（用户删过的同步条目不会被同步复活）。
      // 同步条目整体替换：之前同步进来的多余模型随之清理。
      const tombstones = new Set(file.deletedModelIds.map((id) => id.toLowerCase()))
      const kept = file.models.filter((item) => item.source !== 'models-dev')
      const userIds = new Set(kept.map((item) => item.modelId.toLowerCase()))
      const fresh = selected
        .filter((entry) => !userIds.has(entry.modelId.toLowerCase()) && !tombstones.has(entry.modelId.toLowerCase()))
        .map((entry) => ({ ...entry, source: 'models-dev' }))
      file.models = [...kept, ...fresh]
      file.modelsDevSync = { lastSyncAt: Date.now(), lastSyncError: null, lastCount: fresh.length }
    })
    const preview = selected.slice(0, 5).map((entry) => entry.modelId).join('、')
    diag(`models.dev synced: ${selected.length}/${entries.length} models for used=[${Array.from(wanted).join(', ')}]`)
    return { ok: true, message: '同步完成：' + selected.length + ' 个在用模型（' + preview + (selected.length > 5 ? ' 等' : '') + '）' }
  }

  // ── 图片生成（image-gen）计费：读插件 data/config.json 里的「每张单价」──
  // 返回 Map<模型名, { pricePerImage, name }>；未配置/读不到时为空（生图不计成本，只记次数）。
  let imagePriceCache
  // image-gen 配置/花费文件的 mtime：任一变化都让 pricing() 与 usage 缓存失效。
  function imageMtimeOf() {
    let mtime = 0
    for (const file of ['config.json', 'usage.jsonl']) {
      try {
        mtime = Math.max(mtime, numberOf(statSync(join(DATA_DIR, file)).mtimeMs))
      } catch {}
    }
    return mtime
  }

  // data/usage.jsonl（图片生成记录）带 mtime 缓存的全量读取。
  let imageUsageCache
  function imageUsages() {
    const mtime = imageMtimeOf()
    if (imageUsageCache !== undefined && imageUsageCache.mtime === mtime) return imageUsageCache.list
    let list = []
    try {
      const raw = JSON.parse('[' + readFileSync(join(DATA_DIR, 'usage.jsonl'), 'utf8').trim().replace(/\n+/g, ',') + ']')
      if (Array.isArray(raw)) {
        list = raw
          .filter((item) => item !== null && typeof item === 'object' && typeof item.model === 'string' && item.model !== '')
          .map((item) => ({ time: numberOf(item.time), model: item.model }))
      }
    } catch {}
    imageUsageCache = { mtime, list }
    return list
  }

  function imageGenPricing() {
    try {
      const raw = JSON.parse(readFileSync(join(DATA_DIR, 'config.json'), 'utf8'))
      const models = Array.isArray(raw?.models) ? raw.models : []
      const map = new Map()
      for (const item of models) {
        const model = typeof item?.model === 'string' ? item.model.trim() : ''
        const price = Number(item?.pricePerImage)
        if (model === '' || !Number.isFinite(price) || price <= 0) continue
        map.set(model, { pricePerImage: price, name: typeof item?.name === 'string' && item.name !== '' ? item.name : model })
      }
      imagePriceCache = map
      return map
    } catch {
      imagePriceCache = new Map()
      return imagePriceCache
    }
  }

  function imagePricing() {
    return imagePriceCache !== undefined ? imagePriceCache : imageGenPricing()
  }

  async function pricing() {
    const builtins = builtinPricing()
    const current = readUserPricing()
    const path = pricingFilePath()
    const imageMtime = imageMtimeOf()
    if (pricingCache !== undefined && pricingCache.fileMtime === current.mtimeMs && pricingCache.imageMtime === imageMtime) return pricingCache
    // 合并：内置表打底 → 用户/同步文件覆盖新增 → 图片生成（按张）→ 删除墓碑剔除。
    const merged = new Map(builtins.entries.map((item) => [item.modelId.toLowerCase(), { ...item }]))
    let overrides = 0
    if (current.file !== null) {
      for (const item of current.file.models) {
        merged.set(item.modelId.toLowerCase(), {
          modelId: item.modelId,
          displayName: item.displayName,
          input: item.input,
          output: item.output,
          cacheRead: item.cacheRead,
          cacheWrite: item.cacheWrite,
        })
        overrides += 1
      }
      for (const id of current.file.deletedModelIds) merged.delete(id.toLowerCase())
    }
    // 图片生成模型：token 单价为 0，按「每张单价」计费（perImage，美元/张）。
    for (const [model, info] of imageGenPricing()) {
      merged.set(model.toLowerCase(), {
        modelId: model,
        displayName: info.name + '（图片·按张）',
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        perImage: info.pricePerImage,
      })
    }
    const entries = Array.from(merged.values()).sort((a, b) => a.modelId.localeCompare(b.modelId))
    const table = Object.create(null)
    for (const item of entries) {
      table[item.modelId.toLowerCase()] = {
        input: item.input,
        output: item.output,
        cacheRead: item.cacheRead,
        cacheWrite: item.cacheWrite,
        displayName: item.displayName,
      }
    }
    pricingCache = {
      table,
      entries,
      source: overrides > 0 ? 'builtin+user' : 'builtin',
      sourceLabel: overrides > 0 ? path : BUILTIN_SOURCE_LABEL,
      path: current.mtimeMs > 0 ? path : null,
      overrides,
      builtin: builtins.entries.length,
      sync: current.file !== null ? current.file.modelsDevSync : emptyUserFile().modelsDevSync,
      exchangeRate: current.file !== null ? current.file.exchangeRate : DEFAULT_USD_CNY,
      error: current.error,
      available: true,
      fileMtime: current.mtimeMs,
      imageMtime,
    }
    diag(`pricing loaded: builtin=${builtins.entries.length} overrides=${overrides} source=${pricingCache.source} path=${path}${current.mtimeMs > 0 ? ' mtime=' + current.mtimeMs : ' (missing)'} error=${current.error === null ? 'none' : current.error}`)
    return pricingCache
  }

  function priceFor(table, model) {
    const key = String(model || '').toLowerCase()
    const alias = MODEL_ALIASES[key]
    if (alias !== undefined && table[alias] !== undefined) return table[alias]
    if (table[key] !== undefined) return table[key]
    let best = null
    let size = 0
    for (const candidate of Object.keys(table)) {
      if (key.startsWith(candidate) && candidate.length > size) {
        best = table[candidate]
        size = candidate.length
      }
    }
    return best
  }

  function rangeWindow(range, customStart, customEnd) {
    const end = Date.now()
    if (range === 'all') return { range, start: null, end }
    if (range === 'custom') {
      const start = Number(customStart)
      const stop = Number(customEnd)
      if (Number.isFinite(start) && Number.isFinite(stop) && stop > start) {
        return { range: 'custom', start, end: stop }
      }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return { range: 'today', start: today.getTime(), end }
    }
    if (range === 'today') {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      return { range, start: date.getTime(), end }
    }
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    return { range, start: end - days * 86400000, end }
  }

  function usageOf(event) {
    if (event === null || typeof event !== 'object' || event.type !== 'assistant/message') return null
    const data = event.data
    if (data === null || typeof data !== 'object' || data.usage === null || typeof data.usage !== 'object') return null
    const source = data.message !== null && typeof data.message === 'object' ? data.message.source : null
    return { usage: data.usage, source, time: typeof event.time === 'number' ? event.time : 0 }
  }

  function extractCalls(events, inherited) {
    const calls = []
    for (const event of events) {
      if (tokenCount(event.seq) < inherited) continue
      const found = usageOf(event)
      if (found === null) continue
      const source = found.source
      calls.push({
        time: found.time,
        model: source !== null && typeof source === 'object' && typeof source.model === 'string' ? source.model : '',
        provider: source !== null && typeof source === 'object' && typeof source.provider === 'string' ? source.provider : '',
        input: tokenCount(found.usage.inputTokens),
        output: tokenCount(found.usage.outputTokens),
        cacheRead: tokenCount(found.usage.cacheReadTokens),
        cacheWrite: tokenCount(found.usage.cacheWriteTokens),
        reasoning: tokenCount(found.usage.reasoningTokens),
      })
    }
    return calls
  }

  // 会话标题存放在事件流的 `session/title` 事件（data: { title, messageSeqs, source }），
  // 与客户端 UI 的会话列表同源；取 seq 最大的一条作为当前标题。
  function extractTitle(events) {
    let title
    let bestSeq = -1
    for (const event of events) {
      if (event === null || typeof event !== 'object' || event.type !== 'session/title') continue
      if (tokenCount(event.seq) < bestSeq) continue
      const data = event.data
      const value = data !== null && typeof data === 'object' && typeof data.title === 'string' ? data.title.trim() : ''
      if (value === '') continue
      title = value
      bestSeq = tokenCount(event.seq)
    }
    return title
  }

  async function readEvents(entry, persistence, controller) {
    if (persistence !== undefined) {
      try {
        const handle = await persistence.open(entry.id, 'read')
        try {
          const result = await handle.read()
          return { events: result.events, inherited: tokenCount(handle.inheritedEventCount) }
        } finally {
          await handle.close()
        }
      } catch (cause) {}
    }
    if (controller !== undefined) {
      try {
        const result = await controller.inspect(entry.id)
        return { events: result.events, inherited: tokenCount(result.inheritedEventCount) }
      } catch (cause) {}
    }
    return null
  }

  async function listEntries(selected, sessions, persistence, controller) {
    const result = new Map()
    if (sessions !== undefined) {
      for (const session of sessions.list()) {
        result.set(String(session.id), {
          id: String(session.id),
          header: session.header || {},
          session,
          live: true,
          updatedAt: Date.now(),
        })
      }
    }

    let indexed = false
    if (controller !== undefined) {
      try {
        const listed = await controller.list({})
        for (const item of listed && Array.isArray(listed.items) ? listed.items : []) {
          const id = String(item.sessionId)
          const updatedAt = Number(item.updatedAt) || 0
          if (selected.start !== null && updatedAt > 0 && updatedAt < selected.start) continue
          if (!result.has(id)) {
            result.set(id, {
              id,
              header: { id, cwd: item.cwd || '', origin: item.origin },
              live: false,
              updatedAt,
            })
          }
        }
        indexed = true
      } catch (cause) {}
    }

    if (!indexed && persistence !== undefined) {
      try {
        for (const snapshot of await persistence.list()) {
          const header = snapshot && snapshot.header
          if (header === undefined || header === null) continue
          const id = String(header.id)
          if (id === 'undefined' || result.has(id)) continue
          if (selected.start !== null && Number(header.createdAt) > 0 && Number(header.createdAt) < selected.start) continue
          result.set(id, {
            id,
            header,
            live: false,
            updatedAt: Number(header.createdAt) || 0,
          })
        }
      } catch (cause) {}
    }
    return Array.from(result.values())
  }

  async function scan(selected) {
    const scanStart = Date.now()
    const sessions = ctx.get('sessions')
    const persistence = ctx.get('sessionPersistence')
    const controller = ctx.get('sessionController')
    const rates = await pricing()
    const entries = await listEntries(selected, sessions, persistence, controller)

    async function sessionRevision(id) {
      if (persistence === undefined) return undefined
      try {
        const snapshot = await persistence.stat(id)
        return snapshot === undefined || snapshot === null ? undefined : String(snapshot.revision)
      } catch (cause) {
        return undefined
      }
    }

    const prepared = await mapLimit(entries, 6, async (entry) => {
      const header = entry.header || {}
      const cwd = typeof header.cwd === 'string' ? header.cwd : ''
      const fallbackTitle = cwd.split('/').filter(Boolean).pop() || entry.id
      const row = {
        id: entry.id,
        title: fallbackTitle,
        cwd,
        origin: header.origin === 'subagent' ? 'subagent' : 'session',
        live: entry.live,
        updatedAt: entry.updatedAt || Number(header.createdAt) || 0,
        calls: [],
      }
      if (entry.live) {
        const events = entry.session.snapshotEvents()
        row.calls = extractCalls(events, tokenCount(entry.session.inheritedEventCount))
        row.title = extractTitle(events) || fallbackTitle
        return row
      }
      const revision = await sessionRevision(entry.id)
      const cached = sessionCache.get(entry.id)
      if (cached !== undefined) {
        const revisionMatch = revision !== undefined && cached.revision === revision
        const updatedMatch = revision === undefined && cached.sourceUpdatedAt > 0 && cached.sourceUpdatedAt === row.updatedAt
        if (revisionMatch || updatedMatch) {
          row.calls = cached.calls
          row.title = cached.title || fallbackTitle
          return row
        }
      }
      const collected = await readEvents(entry, persistence, controller)
      if (collected === null) return row
      row.calls = extractCalls(collected.events, collected.inherited)
      row.title = extractTitle(collected.events) || fallbackTitle
      sessionCache.set(entry.id, { revision, sourceUpdatedAt: row.updatedAt, calls: row.calls, title: row.title })
      return row
    })

    const totals = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0,
      cost: 0,
      requests: 0,
      unpriced: 0,
      loop: 0,
    }
    const models = new Map()
    const rows = []

    for (const item of prepared) {
      const windowCalls = selected.start === null
        ? item.calls
        : item.calls.filter((call) => call.time >= selected.start && call.time <= selected.end)
      if (windowCalls.length === 0) continue
      const row = {
        ...item,
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        reasoning: 0,
        cost: 0,
        requests: 0,
        unpriced: 0,
        loop: 0,
        calls: [],
      }
      for (const call of windowCalls) {
        const rate = priceFor(rates.table, call.model)
        const cost = rate === null ? 0 : (call.input * rate.input + call.output * rate.output + call.cacheRead * rate.cacheRead + call.cacheWrite * rate.cacheWrite) / 1000000
        row.input += call.input
        row.output += call.output
        row.cacheRead += call.cacheRead
        row.cacheWrite += call.cacheWrite
        row.reasoning += call.reasoning
        row.cost += cost
        row.requests += 1
        row.unpriced += rate === null ? 1 : 0
        row.updatedAt = Math.max(row.updatedAt, call.time)
        row.calls.push({ time: call.time, model: call.model, provider: call.provider, input: call.input, output: call.output, cacheRead: call.cacheRead, cacheWrite: call.cacheWrite, cost, priced: rate !== null })

        totals.input += call.input
        totals.output += call.output
        totals.cacheRead += call.cacheRead
        totals.cacheWrite += call.cacheWrite
        totals.reasoning += call.reasoning
        totals.cost += cost
        totals.requests += 1
        totals.unpriced += rate === null ? 1 : 0

        const key = call.model || '(unknown)'
        let bucket = models.get(key)
        if (bucket === undefined) {
          bucket = {
            model: key,
            displayName: rate === null ? key : rate.displayName,
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            cost: 0,
            requests: 0,
            loop: 0,
          }
          models.set(key, bucket)
        }
        bucket.input += call.input
        bucket.output += call.output
        bucket.cacheRead += call.cacheRead
        bucket.cacheWrite += call.cacheWrite
        bucket.cost += cost
        bucket.requests += 1
        bucket.loop += call.input + call.output + call.cacheRead + call.cacheWrite
      }

      row.loop = row.input + row.output + row.cacheRead + row.cacheWrite
      rows.push(row)
    }

    // ── 图片生成（image-gen）花费合并：伪会话行「图片生成」+ 模型分布累计 ──
    const imagePrices = imagePricing()
    const imageCalls = imageUsages()
      .filter((item) => selected.start === null || (item.time >= selected.start && item.time <= selected.end))
    if (imageCalls.length > 0) {
      const imageRow = {
        id: 'image-gen', title: '图片生成', cwd: '', origin: 'session', live: false,
        updatedAt: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0,
        cost: 0, requests: 0, unpriced: 0, loop: 0, calls: [],
      }
      for (const item of imageCalls) {
        const price = imagePrices.get(item.model)
        const cost = price !== undefined ? price.pricePerImage : 0
        imageRow.updatedAt = Math.max(imageRow.updatedAt, item.time)
        imageRow.cost += cost
        imageRow.requests += 1
        imageRow.unpriced += price === undefined ? 1 : 0
        imageRow.calls.push({ time: item.time, model: item.model, provider: 'image-gen', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost, priced: price !== undefined, image: true })
        totals.cost += cost
        totals.requests += 1
        totals.unpriced += price === undefined ? 1 : 0
        let bucket = models.get(item.model)
        if (bucket === undefined) {
          bucket = {
            model: item.model,
            displayName: price !== undefined ? price.name + '（图片·按张）' : item.model,
            input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, requests: 0, loop: 0,
          }
          models.set(item.model, bucket)
        }
        bucket.cost += cost
        bucket.requests += 1
      }
      if (imageRow.updatedAt === 0) imageRow.updatedAt = Date.now()
      rows.push(imageRow)
    }

    totals.loop = totals.input + totals.output + totals.cacheRead + totals.cacheWrite
    rows.sort((a, b) => b.cost - a.cost || b.loop - a.loop)
    lastUsedModels = Array.from(models.keys())
    diag(`scan(${selected.range}) entries=${entries.length} sessions=${rows.length} pricing=${rates.entries.length}models unpriced=${totals.unpriced}/${totals.requests} cost=$${totals.cost.toFixed(4)} inst=${INSTANCE_ID} ms=${Date.now() - scanStart}`)
    return {
      generatedAt: Date.now(),
      range: selected.range,
      start: selected.start,
      end: selected.end,
      pricingSource: rates.source,
      totals,
      models: Array.from(models.values()).sort((a, b) => b.cost - a.cost || b.input - a.input),
      sessions: rows,
    }
  }

  async function getUsage(range, force, start, end) {
    const key = range === 'custom' ? 'custom:' + start + ':' + end : (range || 'today')
    const cached = cache.get(key)
    if (!force && cached !== undefined && Date.now() - cached.at < 4000) return cached.value
    if (pending.has(key)) return pending.get(key)
    const task = scan(rangeWindow(range, start, end))
      .then((value) => {
        cache.set(key, { at: Date.now(), value })
        return value
      })
      .finally(() => pending.delete(key))
    pending.set(key, task)
    return task
  }

  const json = (value, status = 200) => new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

  function registerRoute(path, handler, methods = ['GET']) {
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
          diag(`registered ${path}`)
          return true
        } catch (cause) {
          const message = String((cause && cause.message) || cause)
          if (remaining > 0 && message.includes('already registered')) {
            ctx.timeout(() => {
              if (disposeRoute === undefined) attempt(remaining - 1)
            }, 400)
            return false
          }
          throw cause
        }
      }
      attempt(10)
      return () => {
        if (disposeRoute !== undefined) disposeRoute()
      }
    }, `token-usage: ${path}`)
  }

  registerRoute('/api/token-usage', async (request) => {
    try {
      const url = new URL(request.url)
      const range = url.searchParams.get('range') ?? 'today'
      const start = url.searchParams.get('start') ?? undefined
      const end = url.searchParams.get('end') ?? undefined
      const data = await getUsage(range, url.searchParams.get('force') === 'true', start, end)
      return json(data)
    } catch (cause) {
      return json({ code: 'token-usage/failed', message: String(cause && cause.message ? cause.message : cause) }, 500)
    }
  })

  registerRoute('/api/token-usage/summary', async (request) => {
    try {
      const url = new URL(request.url)
      const data = await getUsage(
        url.searchParams.get('range') ?? 'today',
        url.searchParams.get('force') === 'true',
        url.searchParams.get('start') ?? undefined,
        url.searchParams.get('end') ?? undefined,
      )
      return json({
        range: data.range,
        loop: data.totals.loop,
        cost: data.totals.cost,
        requests: data.totals.requests,
        sessions: data.sessions.length,
        input: data.totals.input,
        output: data.totals.output,
        cacheRead: data.totals.cacheRead,
        cacheWrite: data.totals.cacheWrite,
      })
    } catch (cause) {
      return json({ code: 'token-usage/failed', message: String(cause && cause.message ? cause.message : cause) }, 500)
    }
  })

  // 价格输入归一：非法/负值一律 0（与成本计算口径一致）。
  function priceValue(value) {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  registerRoute('/api/token-usage/pricing', async (request) => {
    try {
      if (request.method !== 'POST') {
        const data = await pricing()
        return json({
          available: data.entries.length > 0,
          source: data.source,
          sourceLabel: data.sourceLabel,
          builtin: builtinPricing().entries.length,
          path: data.path,
          overrides: data.overrides,
          sync: data.sync,
          exchangeRate: data.exchangeRate,
          error: data.error,
          used: inUseModelNames(),
          entries: data.entries,
        })
      }
      const body = await request.json()
      const action = body !== null && typeof body === 'object' ? body.action : ''
      if (action === 'sync') {
        const result = await syncModelsDevPricing()
        return json(result, result.ok ? 200 : 502)
      }
      if (action === 'upsert') {
        const inputs = Array.isArray(body.entries) ? body.entries : body.entry !== undefined ? [body.entry] : []
        const valid = []
        for (const item of inputs) {
          if (item === null || typeof item !== 'object') continue
          const modelId = typeof item.modelId === 'string' ? item.modelId.trim() : ''
          if (modelId === '') continue
          valid.push({
            modelId,
            displayName: typeof item.displayName === 'string' && item.displayName.trim() !== '' ? item.displayName.trim() : modelId,
            input: priceValue(item.input),
            output: priceValue(item.output),
            cacheRead: priceValue(item.cacheRead),
            cacheWrite: priceValue(item.cacheWrite),
            source: 'user',
          })
        }
        if (valid.length === 0) return json({ ok: false, message: '没有有效的价目条目（modelId 必填）' }, 400)
        mutateUserPricing((file) => {
          for (const entry of valid) {
            const key = entry.modelId.toLowerCase()
            file.models = file.models.filter((item) => item.modelId.toLowerCase() !== key)
            file.models.push(entry)
            file.deletedModelIds = file.deletedModelIds.filter((id) => id.toLowerCase() !== key)
          }
        })
        diag(`pricing upsert: ${valid.length} entries (${valid.map((item) => item.modelId).join(', ')})`)
        return json({ ok: true, message: '已保存 ' + valid.length + ' 条价目（用户自定义，不会被同步覆盖）' })
      }
      if (action === 'rate') {
        const rate = Number(body.usdToCny)
        if (!Number.isFinite(rate) || rate <= 0 || rate > 1000) {
          return json({ ok: false, message: '汇率无效：需为 0–1000 之间的数值（美元 → 人民币）' }, 400)
        }
        mutateUserPricing((file) => { file.exchangeRate = rate })
        diag(`pricing exchangeRate set: ${rate}`)
        return json({ ok: true, message: '汇率已保存：1 美元 ≈ ' + rate + ' 元人民币', exchangeRate: rate })
      }
      if (action === 'delete') {
        const modelId = String(body.modelId === null || body.modelId === undefined ? '' : body.modelId).trim()
        if (modelId === '') return json({ ok: false, message: '缺少 modelId' }, 400)
        mutateUserPricing((file) => {
          const key = modelId.toLowerCase()
          file.models = file.models.filter((item) => item.modelId.toLowerCase() !== key)
          if (!file.deletedModelIds.some((id) => id.toLowerCase() === key)) file.deletedModelIds.push(modelId)
        })
        diag(`pricing delete: ${modelId}`)
        return json({ ok: true, message: '已删除 ' + modelId + '（写入删除墓碑，同步不会复活）' })
      }
      return json({ ok: false, message: '未知操作：' + String(action) }, 400)
    } catch (cause) {
      return json({ code: 'token-usage/failed', message: String(cause && cause.message ? cause.message : cause) }, 500)
    }
  }, ['GET', 'POST'])

  const invalidate = () => cache.clear()
  ctx.effect(() => ctx.on('session/event', (session, event) => {
    if (event !== null && typeof event === 'object' && event.type === 'assistant/message') invalidate()
  }), 'token-usage: session events')
  ctx.effect(() => ctx.on('session/created', invalidate), 'token-usage: session created')
  ctx.effect(() => ctx.on('session/disposed', invalidate), 'token-usage: session disposed')
  ctx.effect(() => ctx.on('api-session/added', invalidate), 'token-usage: session added')
}
