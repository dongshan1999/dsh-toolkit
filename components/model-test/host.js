// components/model-test/host.js — 模型「连接 + 速度」测试（Host 侧）
//
// 路由：
//   GET  /api/model-test/catalog        列出当前可路由的「组（provider）→ 模型」目录（含命中的参数预设）
//   POST /api/model-test/run            跑测试：{} 全部；{ provider } 整组；{ provider, model } 单组单模型
//   GET  /api/model-test/presets        参数预设库（内置精选 + models.dev 同步 + 用户覆盖）
//   POST /api/model-test/presets/sync   按当前目录里的模型，从 models.dev 拉一份预设
//   GET  /api/model-test/config         逐模型 / 整组的手工参数覆盖
//   POST /api/model-test/config         写入或删除覆盖（params: null 或三字段全空 = 删除）
//   POST /api/model-test/inspect        单个模型的能力画像：预设命中 / 适配器真实档位 / 生效参数 / YAML 片段
//   GET  /api/model-test/dsh            读 DSH 里该 provider/model 的真实配置，并与预设建议逐字段比对
//   POST /api/model-test/dsh            把预设建议写进 DSH 真实配置（mode=fill 只补缺 / replace 覆盖差异）
//   POST /api/model-test/probe          按需探测单个模型的网关能力（真实计费，三态：支持/不支持/无法判定）
//
// 测试参数不再只有一个 maxTokens：按「本次指定 > 手工覆盖 > 整组默认 > 全局设置 > 预设建议」
// 逐字段取值，再用适配器给出的**真实**能力（reasoning.efforts / defaultMaxTokens）做安全阀，
// 于是第三方 API 的模型只要名字对得上，就不用每次手填 temperature / 思考档位。
//
// 测试直接走 ctx.llm.stream —— 与 agent 会话完全同一条适配器链路（凭证解析、
// 路由选择、重试策略都由 DSH 负责），所以「能否连通」的结论与真实对话一致。
// 默认 prompt 会要求一段可流式输出的文本，这样「输出速度」才有生成窗口可测。
// 这条路径会真实发起 provider 请求并计费，不是纯探活。
//
// 参数分两层落点，别混淆：
//   - params.json（本插件自己的旁路文件）：temperature / maxTokens / reasoningEffort，
//     只影响这里点「测试」时发什么参数；
//   - DSH 真实配置（~/.dsh/profiles/<profile>/cordis.patch.yml 里 llm-pi-ai 的 models 条目）：
//     contextWindow / maxTokens / input / reasoningEfforts / compat，写进去之后**真实对话也生效**。
//     写入走官方 settings.mutate（文件锁 + 格式保留 + schema 校验 + 原子写 + 失败回滚 + 热重载），
//     细节见 ./dsh-config.js。temperature 不是模型级配置，只能留在 params.json。
//
// 一次测试同时给出连接结果与速度指标：
//   ok / error / timeout / aborted  +  ttftMs（首字延迟）/ totalMs / outputTokens / tokensPerSecond
// 输出速度 = outputTokens / 总耗时，与网关「输出 TPS」同一口径（256 tokens / 4.61s = 55.5）。
// 本机计时从发起 stream() 起算，含适配器准备，会比网关入站计时略长，所以秒数更高、TPS 略低。

import {
  GROUP_MODEL,
  THINKING_LEVELS,
  builtinMeta,
  builtinPresets,
  invalidatePresetCache,
  loadPresetLibrary,
  matchPreset,
  mutateOverrides,
  normalizeParams,
  overrideKey,
  paramsFile,
  presetsFile,
  providerSnippet,
  readOverrides,
  readSyncedPresets,
  resolveParams,
  sourceLabel,
  syncPresetsFromModelsDev,
} from './presets.js?v=12'
import {
  compatAccepts,
  describeValue,
  diffFields,
  planWrite,
  proposeFields,
  readModelConfig,
  readProviderConfig,
  summarizeEntry,
  writeModelConfig,
  WRITABLE_FIELDS,
} from './dsh-config.js?v=12'

export const name = 'model-test'
export const inject = ['connection', 'llm', 'timer']

const DEFAULT_TIMEOUT_MS = 120000
const DEFAULT_MAX_TOKENS = 256
const DEFAULT_CONCURRENCY = 3
const DEFAULT_PROMPT = '请连续输出 80 个「测速」，词与词之间只用空格，不要解释。'
const TIMEOUT_MIN_MS = 1000
const TIMEOUT_MAX_MS = 180000
const MAX_TOKENS_MIN = 1
const MAX_TOKENS_MAX = 1024
const CONCURRENCY_MIN = 1
const CONCURRENCY_MAX = 8
/** 硬超时保护：即使适配器不响应 abort，也要在 timeoutMs + 该宽限内返回结果。 */
const HARD_GRACE_MS = 5000
/** targets 去重用的连接键，避免 provider/model 里的 ':' 造成歧义。 */
const KEY_SEP = '\u0000'

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function messageOf(cause) {
  if (cause === null || cause === undefined) return '未知错误'
  if (typeof cause === 'string') return cause
  if (typeof cause.message === 'string' && cause.message !== '') return cause.message
  try {
    const text = JSON.stringify(cause)
    return typeof text === 'string' && text !== '' ? text : String(cause)
  } catch {
    return String(cause)
  }
}

function numberOf(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function clampInt(value, fallback, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const rounded = Math.round(n)
  if (rounded < min) return min
  if (rounded > max) return max
  return rounded
}

async function readBody(request) {
  try {
    const body = await request.json()
    return body !== null && typeof body === 'object' ? body : {}
  } catch {
    return {}
  }
}

/** GET 的查询串转普通对象（读路由用它，方便直接 curl 验证）。 */
function queryOf(request) {
  try {
    const url = new URL(request.url)
    const out = {}
    for (const [key, value] of url.searchParams) out[key] = value
    return out
  } catch {
    return {}
  }
}

/** 固定并发的保序 map（与 token-usage 同款，这里独立一份避免跨组件耦合）。 */
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

function modelEntry(raw) {
  if (raw === null || typeof raw !== 'object') return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  if (id === '') return null
  const name = typeof raw.name === 'string' && raw.name.trim() !== '' ? raw.name.trim() : id
  const modalities = Array.isArray(raw.inputModalities) ? raw.inputModalities.filter((item) => typeof item === 'string') : []
  return { id, name, inputModalities: modalities }
}

/**
 * 预设摘要：面板与「生成 YAML 片段」需要的字段，去掉内部正则与冗长的 source 列表。
 * @returns {null|object}
 */
function compactPreset(preset) {
  if (preset === null || preset === undefined || typeof preset !== 'object') return null
  const reasoning = preset.reasoning !== null && typeof preset.reasoning === 'object'
    ? {
        mode: typeof preset.reasoning.mode === 'string' ? preset.reasoning.mode : 'none',
        levels: Array.isArray(preset.reasoning.levels) ? preset.reasoning.levels.filter((item) => THINKING_LEVELS.includes(item)) : [],
        default: THINKING_LEVELS.includes(preset.reasoning.default) ? preset.reasoning.default : null,
        wire: preset.reasoning.wire !== null && typeof preset.reasoning.wire === 'object' ? preset.reasoning.wire : {},
      }
    : null
  return {
    id: typeof preset.id === 'string' ? preset.id : '',
    label: typeof preset.label === 'string' ? preset.label : '',
    vendor: typeof preset.vendor === 'string' ? preset.vendor : '',
    from: preset.from === 'models-dev' ? 'models-dev' : 'builtin',
    via: typeof preset.via === 'string' ? preset.via : 'match',
    supportsTemperature: preset.supportsTemperature !== false,
    contextWindow: Number.isFinite(preset.contextWindow) ? preset.contextWindow : null,
    maxTokens: Number.isFinite(preset.maxTokens) ? preset.maxTokens : null,
    reasoning,
    suggest: normalizeParams(preset.suggest),
    note: typeof preset.note === 'string' ? preset.note : '',
  }
}

/**
 * 目录 = DSH 正在路由的组（provider）→ 模型。
 * 只用 listProviders()：只有已注册的 route 才真能发起调用，未激活的组测了也只会报错。
 * 每组单独 try：某组 listModels 失败不影响其它组，失败信息进 failures 供面板展示。
 * 每个模型顺手挂上命中了的参数预设（纯本地正则匹配，不发请求）。
 */
async function buildCatalog(llm) {
  const groups = []
  const failures = []
  const library = loadPresetLibrary()
  const overrides = readOverrides()
  const meta = {
    presets: { ...library.meta, overridden: Object.keys(overrides).length },
    files: { params: paramsFile(), presets: presetsFile() },
  }
  if (llm === null || llm === undefined || typeof llm.listProviders !== 'function') {
    return { groups, failures, providerCount: 0, modelCount: 0, declared: 0, overrides, ...meta }
  }

  let configurable = []
  try {
    const listed = typeof llm.listConfigurableProviders === 'function' ? llm.listConfigurableProviders() : []
    if (Array.isArray(listed)) configurable = listed
  } catch {
    configurable = []
  }
  const displayNames = new Map()
  for (const entry of configurable) {
    if (entry === null || typeof entry !== 'object' || typeof entry.provider !== 'string') continue
    const label = typeof entry.displayName === 'string' && entry.displayName !== '' ? entry.displayName : entry.provider
    displayNames.set(entry.provider, label)
  }

  let registered = []
  try {
    const listed = llm.listProviders()
    if (Array.isArray(listed)) registered = listed
  } catch (cause) {
    return {
      groups, failures: [{ id: '', name: '', message: messageOf(cause) }], providerCount: 0, modelCount: 0,
      declared: configurable.length, overrides, ...meta,
    }
  }

  for (const provider of registered) {
    const id = typeof provider === 'string' ? provider : provider !== null && typeof provider === 'object' && typeof provider.id === 'string' ? provider.id : ''
    if (id === '') continue
    const named = provider !== null && typeof provider === 'object' && typeof provider.name === 'string' && provider.name !== '' ? provider.name : ''
    const name = named !== '' ? named : displayNames.get(id) !== undefined ? displayNames.get(id) : id
    let models = []
    try {
      const listed = await llm.listModels(id)
      models = (Array.isArray(listed) ? listed : []).map(modelEntry).filter((item) => item !== null)
    } catch (cause) {
      failures.push({ id, name, message: messageOf(cause) })
      continue
    }
    const groupOverride = overrides[overrideKey(id, '')] ?? null
    groups.push({
      id,
      name,
      models: models.map((model) => ({
        ...model,
        preset: compactPreset(matchPreset(model.id, library)),
        paramsOverride: overrides[overrideKey(id, model.id)] ?? null,
      })),
      paramsOverride: groupOverride,
    })
  }

  groups.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
  const modelCount = groups.reduce((sum, group) => sum + group.models.length, 0)
  return { groups, failures, providerCount: groups.length, modelCount, declared: configurable.length, overrides, ...meta }
}

/** 把请求参数解析成待测 (provider, model) 列表；默认全部。
 *  每条 target 可带自己的 params（本次指定，优先级最高）。 */
function resolveTargets(body, catalog) {
  const byProvider = new Map(catalog.groups.map((group) => [group.id, group]))
  const seen = new Set()
  const targets = []
  const push = (provider, modelId, params) => {
    if (typeof provider !== 'string' || provider === '' || typeof modelId !== 'string' || modelId === '') return
    const key = provider + KEY_SEP + modelId
    if (seen.has(key)) return
    seen.add(key)
    const group = byProvider.get(provider)
    const found = group === undefined ? undefined : group.models.find((model) => model.id === modelId)
    targets.push({
      provider,
      model: modelId,
      providerName: group !== undefined ? group.name : provider,
      modelName: found !== undefined ? found.name : modelId,
      params: params === undefined ? null : params,
    })
  }

  if (Array.isArray(body.targets) && body.targets.length > 0) {
    for (const item of body.targets) {
      if (item === null || typeof item !== 'object') continue
      push(item.provider, typeof item.model === 'string' ? item.model : item.id, item.params)
    }
    return targets
  }

  const provider = typeof body.provider === 'string' && body.provider !== '' ? body.provider : null
  const model = typeof body.model === 'string' && body.model !== '' ? body.model : null
  const params = body.params !== null && typeof body.params === 'object' ? body.params : null
  if (provider !== null && model !== null) {
    push(provider, model, params)
    return targets
  }
  if (provider !== null) {
    const group = byProvider.get(provider)
    if (group !== undefined) for (const item of group.models) push(provider, item.id, params)
    return targets
  }
  for (const group of catalog.groups) for (const item of group.models) push(group.id, item.id, params)
  return targets
}

function readUsage(usage) {
  if (usage === null || typeof usage !== 'object') return null
  return {
    inputTokens: numberOf(usage.inputTokens),
    outputTokens: numberOf(usage.outputTokens),
    totalTokens: numberOf(usage.totalTokens),
    cacheReadTokens: numberOf(usage.cacheReadTokens),
    cacheWriteTokens: numberOf(usage.cacheWriteTokens),
    reasoningTokens: numberOf(usage.reasoningTokens),
  }
}

/**
 * 适配器给出的**真实**模型能力。预设只是推荐值，能不能发以这里为准：
 *   efforts        —— model 支持的思考档位（reasoning.efforts[].id）
 *   defaultEffort  —— 适配器默认档位
 *   defaultMaxTokens / contextWindow —— 上限与上下文窗口
 * 拿不到（老适配器没有 resolveModelInfo，或解析失败）就返回 null，调用方退回预设推断。
 * 这里刻意吞掉异常：能力探测失败不该让「测速」这件事本身失败。
 */
async function readLiveCapability(llm, provider, model) {
  if (llm === null || llm === undefined || typeof llm.resolveModelInfo !== 'function') return null
  try {
    const info = await llm.resolveModelInfo(provider, model)
    if (info === null || typeof info !== 'object') return null
    const efforts = Array.isArray(info.reasoning?.efforts)
      ? info.reasoning.efforts.map((item) => (item !== null && typeof item === 'object' ? item.id : item)).filter((item) => typeof item === 'string')
      : []
    const defaultEffort = typeof info.reasoning?.defaultEffort === 'string' ? info.reasoning.defaultEffort : null
    const contextWindow = Number.isFinite(info.context?.contextWindow) ? info.context.contextWindow : null
    const defaultMaxTokens = Number.isFinite(info.defaultMaxTokens) ? info.defaultMaxTokens : null
    const inputModalities = Array.isArray(info.inputModalities) ? info.inputModalities.filter((item) => typeof item === 'string') : []
    return { efforts, defaultEffort, contextWindow, defaultMaxTokens, inputModalities, name: typeof info.name === 'string' ? info.name : '' }
  } catch {
    return null
  }
}

/**
 * 解析一个目标真正要发送的参数，并把「为什么是这个值」一起带出去。
 *
 * `options.forTest` 时 preset 建议的 maxTokens 不参与（预设里的 8192/16384 是给真实
 * 对话用的输出上限，测速照着发会白烧几千 tokens）；测试的输出上限以 options.maxTokens
 * 为准，手工覆盖/本次指定的 maxTokens 仍然有效但会被它收顶。
 *
 * @returns {{temperature, maxTokens, reasoningEffort, source, sourceLabel, note, preset}}
 */
function planParams(target, options, library, overrides, live) {
  const matched = target.preset ?? (typeof target.model === 'string' ? matchPreset(target.model, library) : null)
  const preset = matched !== null && options.forTest === true && matched.suggest !== null && typeof matched.suggest === 'object'
    ? { ...matched, suggest: { ...matched.suggest, maxTokens: null } }
    : matched
  const resolved = resolveParams({
    provider: target.provider,
    model: target.model,
    params: target.params ?? null,
    overrides,
    preset,
    live,
    fallback: options.fallback,
  })
  let maxTokens = resolved.maxTokens
  const notes = resolved.note === '' ? [] : [resolved.note]
  if (options.forTest === true) {
    const cap = Number.isFinite(options.maxTokens) && options.maxTokens > 0 ? options.maxTokens : DEFAULT_MAX_TOKENS
    if (maxTokens === null) {
      maxTokens = cap
    } else if (maxTokens > cap) {
      notes.push('测试输出上限 ' + cap + '，已从 ' + maxTokens + ' 收到 ' + cap)
      maxTokens = cap
    }
  }
  return {
    temperature: resolved.temperature,
    maxTokens,
    reasoningEffort: resolved.reasoningEffort,
    source: resolved.source,
    sourceLabel: sourceLabel(resolved.source),
    note: notes.join('；'),
    preset: compactPreset(matched),
  }
}

/**
 * 单个模型的连接 + 速度测试。
 * 计时口径：ttftMs 取首个文本分片（text-delta / reasoning-delta）到达时间，
 * 没有文本分片时退化为首个分片。
 * tokensPerSecond = outputTokens / 总耗时，与网关「输出 TPS」一致。
 * 适配器若把整段一次交上来，首字会接近总耗时；速度仍按总耗时算，不改成 —。
 * 参数：temperature / maxTokens / reasoningEffort 三个都只在非 null 时才放进 stream() 调用，
 * 绝不给模型塞一个它不接受的字段（DSH 对 reasoningEffort 是硬校验，不做 clamp）。
 */
async function probeModel(llm, target, options) {
  const startedAt = Date.now()
  const controller = new AbortController()
  const state = {
    timedOut: false,
    firstChunkAt: 0,
    firstTextAt: 0,
    usage: null,
    finish: null,
    failure: null,
  }
  let iterator = null
  let settled = false

  const abortNow = () => {
    state.timedOut = true
    try {
      controller.abort()
    } catch {
      // 适配器已结束，忽略
    }
    try {
      if (iterator !== null && typeof iterator.return === 'function') {
        // return() 返回 promise：适配器在收尾时抛错不能变成 unhandledRejection 打到进程上。
        const closed = iterator.return()
        if (closed !== null && typeof closed === 'object' && typeof closed.catch === 'function') closed.catch(() => {})
      }
    } catch {
      // 同上
    }
  }
  const timer = setTimeout(abortNow, options.timeoutMs)

  const consume = (async () => {
    try {
      const call = {
        provider: target.provider,
        model: target.model,
        messages: [{ role: 'user', content: [{ type: 'text', text: options.prompt }] }],
        signal: controller.signal,
      }
      // 未解析出值就不带该字段：适配器可能对它硬校验（尤其 reasoningEffort），宁可省略。
      if (options.params.maxTokens !== null) call.maxTokens = options.params.maxTokens
      if (options.params.temperature !== null) call.temperature = options.params.temperature
      if (options.params.reasoningEffort !== null) call.reasoningEffort = options.params.reasoningEffort
      const stream = llm.stream(call)
      iterator = stream[Symbol.asyncIterator]()
      for (;;) {
        const step = await iterator.next()
        if (step === null || typeof step !== 'object' || step.done === true) break
        const chunk = step.value
        if (chunk === null || typeof chunk !== 'object') continue
        const now = Date.now()
        if (chunk.type === 'finish') {
          state.finish = chunk
          break
        }
        if (state.firstChunkAt === 0) state.firstChunkAt = now
        if (state.firstTextAt === 0 && (chunk.type === 'text-delta' || chunk.type === 'reasoning-delta') && typeof chunk.text === 'string' && chunk.text !== '') {
          state.firstTextAt = now
        }
        if (chunk.type === 'usage' && chunk.usage !== null && typeof chunk.usage === 'object') {
          state.usage = chunk.usage
        }
      }
    } catch (cause) {
      state.failure = messageOf(cause)
    } finally {
      settled = true
      clearTimeout(timer)
    }
  })()

  let guardTimer = null
  const guard = new Promise((resolve) => {
    guardTimer = setTimeout(resolve, options.timeoutMs + HARD_GRACE_MS)
  })
  await Promise.race([consume, guard])
  clearTimeout(guardTimer)
  if (!settled) abortNow()
  clearTimeout(timer)

  const totalMs = Date.now() - startedAt
  const usage = readUsage(state.usage)
  const firstAt = state.firstTextAt > 0 ? state.firstTextAt : state.firstChunkAt
  const ttftMs = firstAt > 0 ? firstAt - startedAt : null
  const outputTokens = usage !== null ? usage.outputTokens : 0
  const streamMs = ttftMs !== null ? Math.max(0, totalMs - ttftMs) : null
  // 网关「输出 TPS」= 输出 tokens / 总耗时，不是 / (总耗时 − 首字)。
  const tokensPerSecond = outputTokens > 0 && totalMs > 0 ? outputTokens / (totalMs / 1000) : null
  const speedNote = null

  const reason = state.finish !== null && typeof state.finish === 'object' ? state.finish.reason : null
  const kind = reason !== null && typeof reason === 'object' && typeof reason.kind === 'string' ? reason.kind : null
  let status = 'ok'
  let message = ''
  if (state.failure !== null) {
    status = state.timedOut ? 'timeout' : 'error'
    message = state.failure
  } else if (kind === 'error') {
    status = 'error'
    message = reason.failure !== undefined && reason.failure !== null ? messageOf(reason.failure) : '模型返回错误'
  } else if (kind === 'aborted') {
    status = state.timedOut ? 'timeout' : 'aborted'
    message = state.timedOut
      ? '超过 ' + options.timeoutMs + 'ms 未返回'
      : reason.failure !== undefined && reason.failure !== null ? messageOf(reason.failure) : '请求被中断'
  } else if (reason === null) {
    // 适配器把失败归一成终态 finish，正常不会走到这里；真走到说明流被提前掐断。
    // 如果同时已经超时，结论应归到「超时」而不是笼统的「失败」。
    status = state.timedOut ? 'timeout' : 'error'
    message = state.timedOut ? '超过 ' + options.timeoutMs + 'ms 未返回' : '流已结束但没有收到 finish 分片'
  }

  return {
    provider: target.provider,
    providerName: target.providerName,
    model: target.model,
    modelName: target.modelName,
    ok: status === 'ok',
    status,
    finishKind: kind,
    message,
    ttftMs,
    totalMs,
    streamMs,
    outputTokens,
    usage,
    tokensPerSecond,
    speedNote,
    // 这次实际发出去的参数 + 为什么是它（面板展示「预设命中 / 手工配置」的依据）
    params: {
      temperature: options.params.temperature,
      maxTokens: options.params.maxTokens,
      reasoningEffort: options.params.reasoningEffort,
      source: options.params.source,
      sourceLabel: options.params.sourceLabel,
      note: options.params.note,
      preset: options.params.preset,
    },
    at: Date.now(),
  }
}

function errorFields(cause) {
  if (cause === null || typeof cause !== 'object') return { code: '', status: null }
  return {
    code: typeof cause.code === 'string' ? cause.code : '',
    status: Number.isFinite(cause.status) ? cause.status : null,
  }
}

function isExplicitlyUnsupported(result, hints) {
  const message = `${result.code} ${result.message}`.toLowerCase()
  const rejected = /unsupported|not supported|does not support|invalid parameter|unknown parameter|不支持|不接受/.test(message)
  return rejected && hints.some((hint) => message.includes(hint))
}

async function runCapabilityCall(llm, target, spec) {
  const startedAt = Date.now()
  const controller = new AbortController()
  const state = { finishKind: null, usage: null, text: '', toolCall: false, failure: null, timedOut: false }
  let iterator = null
  let settled = false
  let timer = null

  const abortNow = () => {
    state.timedOut = true
    try { controller.abort() } catch {}
    try {
      if (iterator !== null && typeof iterator.return === 'function') {
        const closing = iterator.return()
        if (closing !== null && typeof closing === 'object' && typeof closing.catch === 'function') closing.catch(() => {})
      }
    } catch {}
  }

  const consume = (async () => {
    try {
      const call = {
        provider: target.provider,
        model: target.model,
        messages: [{ role: 'user', content: spec.content ?? [{ type: 'text', text: spec.prompt }] }],
        signal: controller.signal,
      }
      if (Number.isFinite(spec.maxTokens)) call.maxTokens = spec.maxTokens
      if (typeof spec.reasoningEffort === 'string') call.reasoningEffort = spec.reasoningEffort
      if (Array.isArray(spec.tools)) call.tools = spec.tools
      const stream = llm.stream(call)
      iterator = stream[Symbol.asyncIterator]()
      for (;;) {
        const step = await iterator.next()
        if (step === null || typeof step !== 'object' || step.done === true) break
        const chunk = step.value
        if (chunk === null || typeof chunk !== 'object') continue
        if (chunk.type === 'text-delta' && typeof chunk.text === 'string') state.text = (state.text + chunk.text).slice(0, 1200)
        if (chunk.type === 'tool-call-delta' && (typeof chunk.name === 'string' || chunk.argumentsDelta !== '')) state.toolCall = true
        if (chunk.type === 'block-end' && chunk.block?.type === 'tool-call') state.toolCall = true
        if (chunk.type === 'usage' && chunk.usage !== null && typeof chunk.usage === 'object') state.usage = chunk.usage
        if (chunk.type === 'finish') {
          const reason = chunk.reason
          state.finishKind = reason !== null && typeof reason === 'object' && typeof reason.kind === 'string' ? reason.kind : null
          if (state.finishKind === 'error' || state.finishKind === 'aborted') state.failure = reason.failure ?? null
          break
        }
      }
    } catch (cause) {
      state.failure = cause
    } finally {
      settled = true
      clearTimeout(timer)
    }
  })()

  timer = setTimeout(abortNow, spec.timeoutMs)
  let guardTimer = null
  const guard = new Promise((resolve) => { guardTimer = setTimeout(resolve, spec.timeoutMs + HARD_GRACE_MS) })
  await Promise.race([consume, guard])
  clearTimeout(guardTimer)
  clearTimeout(timer)
  if (!settled) abortNow()

  const failure = state.failure
  const usage = readUsage(state.usage)
  const error = failure === null ? { message: '', code: '', status: null } : {
    message: messageOf(failure),
    ...errorFields(failure),
  }
  return {
    attempted: true,
    ok: !state.timedOut && failure === null && state.finishKind !== 'error' && state.finishKind !== 'aborted' && state.finishKind !== null,
    timedOut: state.timedOut,
    finishKind: state.finishKind,
    outputTokens: usage?.outputTokens ?? null,
    usage,
    toolCall: state.toolCall,
    text: state.text.trim(),
    message: state.timedOut ? `超过 ${spec.timeoutMs}ms 未返回` : error.message,
    code: error.code,
    httpStatus: error.status,
    elapsedMs: Date.now() - startedAt,
  }
}

const RED_PROBE_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC'
let redProbeImagePromise = null

async function getRedProbeImage(attachments) {
  if (attachments === null || attachments === undefined || typeof attachments.saveImage !== 'function') {
    throw new Error('attachments 图片服务不可用')
  }
  if (redProbeImagePromise === null) {
    redProbeImagePromise = Promise.resolve().then(() => attachments.saveImage({
      data: Uint8Array.from(Buffer.from(RED_PROBE_PNG, 'base64')),
      mediaType: 'image/png',
      name: 'model-test-red-probe.png',
    })).catch((cause) => {
      redProbeImagePromise = null
      throw cause
    })
  }
  return redProbeImagePromise
}

function capabilityCheck(id, label, verdict, evidence, result = null) {
  return {
    id,
    label,
    verdict,
    evidence,
    detail: result?.message || '',
    elapsedMs: result?.elapsedMs ?? null,
    finishKind: result?.finishKind ?? null,
    outputTokens: result?.outputTokens ?? null,
  }
}

function registerRoute(ctx, path, methods, handler) {
  ctx.effect(() => {
    let disposeRoute
    const attempt = (remaining) => {
      try {
        disposeRoute = ctx.connection.fetch.register({ path, methods, requestBody: 'buffered', fetch: handler })
        return true
      } catch (cause) {
        const message = messageOf(cause)
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
  }, `model-test: ${path}`)
}

export function apply(ctx) {
  registerRoute(ctx, '/api/model-test/catalog', ['GET'], async () => {
    try {
      const catalog = await buildCatalog(ctx.get('llm'))
      return json({ ok: true, generatedAt: Date.now(), ...catalog })
    } catch (cause) {
      return json({ ok: false, code: 'model-test/catalog-failed', message: messageOf(cause) }, 500)
    }
  })

  // ── 预设库：内置精选 + models.dev 同步（只读视图，供面板展示/搜索） ──
  registerRoute(ctx, '/api/model-test/presets', ['GET'], async () => {
    try {
      const library = loadPresetLibrary()
      const synced = readSyncedPresets()
      return json({
        ok: true,
        generatedAt: Date.now(),
        meta: { ...library.meta, syncedAt: synced.at, syncedCount: synced.count },
        aliases: library.aliases,
        builtin: builtinPresets(),
        synced: synced.families,
        files: { params: paramsFile(), presets: presetsFile() },
        thinkingLevels: THINKING_LEVELS,
      })
    } catch (cause) {
      return json({ ok: false, code: 'model-test/presets-failed', message: messageOf(cause) }, 500)
    }
  })

  // ── 从 models.dev 拉一份「当前在用的模型」参数预设 ──
  registerRoute(ctx, '/api/model-test/presets/sync', ['POST'], async () => {
    try {
      const catalog = await buildCatalog(ctx.get('llm'))
      const ids = []
      for (const group of catalog.groups) for (const model of group.models) ids.push({ provider: group.id, model: model.id })
      const outcome = await syncPresetsFromModelsDev(ids)
      if (outcome.ok !== true) {
        return json({ ok: false, code: 'model-test/presets-sync-failed', message: outcome.message }, 502)
      }
      const library = loadPresetLibrary()
      return json({
        ok: true,
        count: outcome.count ?? 0,
        at: outcome.at ?? Date.now(),
        message: outcome.message,
        meta: library.meta,
        files: { presets: presetsFile() },
      })
    } catch (cause) {
      return json({ ok: false, code: 'model-test/presets-sync-failed', message: messageOf(cause) }, 500)
    }
  })

  // ── 手工覆盖（逐模型 / 整组） ──
  // 同一个 path 注册两次会被路由表按 path 去重（第二次报 already registered），
  // 所以 GET / POST 合并成一条，靠 request.method 分流。
  registerRoute(ctx, '/api/model-test/config', ['GET', 'POST'], async (request) => {
    const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET'
    try {
      if (method !== 'POST') {
        return json({ ok: true, generatedAt: Date.now(), overrides: readOverrides(), file: paramsFile() })
      }
      const body = await readBody(request)
      if (!Array.isArray(body.entries)) {
        return json({ ok: false, code: 'model-test/config-invalid', message: 'entries 必须是数组' }, 400)
      }
      const outcome = mutateOverrides(body.entries)
      if (outcome.ok !== true) {
        return json({ ok: false, code: 'model-test/config-invalid', message: outcome.message }, 400)
      }
      invalidatePresetCache()
      return json({ ok: true, overrides: outcome.overrides, file: outcome.file, generatedAt: Date.now() })
    } catch (cause) {
      return json({ ok: false, code: 'model-test/config-failed', message: messageOf(cause) }, 500)
    }
  })

  // ── 单个模型的能力画像：预设命中 + 适配器真实档位 + 生效参数 + 可粘贴的 YAML ──
  registerRoute(ctx, '/api/model-test/inspect', ['POST'], async (request) => {
    try {
      const body = await readBody(request)
      const provider = typeof body.provider === 'string' ? body.provider.trim() : ''
      const model = typeof body.model === 'string' ? body.model.trim() : ''
      if (provider === '' || model === '') {
        return json({ ok: false, code: 'model-test/inspect-invalid', message: 'provider 与 model 都必须提供' }, 400)
      }
      const llm = ctx.get('llm')
      const library = loadPresetLibrary()
      const overrides = readOverrides()
      const live = await readLiveCapability(llm, provider, model)
      const target = { provider, model, params: body.params ?? null }
      const planned = planParams(target, { fallback: normalizeParams(body.fallback) }, library, overrides, live)
      return json({
        ok: true,
        provider,
        model,
        preset: planned.preset,
        live,
        overrides: {
          model: overrides[overrideKey(provider, model)] ?? null,
          group: overrides[overrideKey(provider, GROUP_MODEL)] ?? null,
        },
        params: {
          temperature: planned.temperature,
          maxTokens: planned.maxTokens,
          reasoningEffort: planned.reasoningEffort,
          source: planned.source,
          sourceLabel: planned.sourceLabel,
          note: planned.note,
        },
        snippet: providerSnippet({ model, preset: planned.preset, live }),
        thinkingLevels: THINKING_LEVELS,
        files: { params: paramsFile(), presets: presetsFile() },
      })
    } catch (cause) {
      return json({ ok: false, code: 'model-test/inspect-failed', message: messageOf(cause) }, 500)
    }
  })

  // ── DSH 真实配置：读 + 与预设建议比对（GET），写入（POST） ──
  // 参数在这里有两个完全不同的落点，面板要说清：
  //   params.json  → 只影响「测试」发什么参数
  //   DSH 配置     → 写进去后真实对话也生效（temperature 除外，它不是模型级配置）
  // 写盘用官方 settings.mutate：文件锁、保留 !!js/注释/块标量、schema 校验、
  // 原子写、失败回滚、Loader 热重载，全都由 DSH 负责，插件不碰 YAML 文本。
  registerRoute(ctx, '/api/model-test/dsh', ['GET', 'POST'], async (request) => {
    const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET'
    try {
      // GET 用查询串（读操作要能被直接 curl 验证），POST 用 JSON body。
      const query = method === 'POST' ? {} : queryOf(request)
      const body = method === 'POST' ? await readBody(request) : query
      const provider = typeof body.provider === 'string' ? body.provider.trim() : ''
      const model = typeof body.model === 'string' ? body.model.trim() : ''
      if (provider === '') {
        return json({ ok: false, code: 'model-test/dsh-invalid', message: 'provider 必须提供' }, 400)
      }
      if (method === 'POST' && model === '') {
        return json({ ok: false, code: 'model-test/dsh-invalid', message: 'model 必须提供' }, 400)
      }

      const settings = ctx.get('settings')
      if (settings === null || settings === undefined) {
        return json({
          ok: false,
          code: 'model-test/dsh-unavailable',
          message: 'settings 服务不可用（当前 DSH 版本没暴露配置写入通道），只能用「生成 YAML 片段」手工粘贴',
        }, 503)
      }

      // 模型没指定时只读 provider 层，用来给组头显示「这个组有几个模型、配置落在哪个文件」。
      const llm = ctx.get('llm')
      const library = loadPresetLibrary()
      const live = model === '' ? null : await readLiveCapability(llm, provider, model)
      const preset = model === '' ? null : compactPreset(matchPreset(model, library))
      // compat 开关按协议过滤要用 provider 真实的 api（supportsTemperature 只有 anthropic-messages 认）。
      const providerConfig = readProviderConfig(settings, provider)
      const proposed = proposeFields({ preset, live, api: providerConfig.profile?.api })

      if (method !== 'POST') {
        const current = model === '' ? null : readModelConfig(settings, provider, model)
        const declared = current !== null && current.available === true ? current.declared : {}
        // 指定了模型时，可用性以**模型层**为准（provider 存在但没声明 models 也不能写）。
        const available = current === null ? providerConfig.available === true : current.available === true
        const reason = current === null
          ? (providerConfig.available === true ? null : providerConfig.reason ?? null)
          : (current.available === true ? null : current.reason ?? null)
        return json({
          ok: true,
          generatedAt: Date.now(),
          provider,
          model,
          ns: providerConfig.ns ?? null,
          // revision 是 DSH settings 的 CAS 版本号：写入时带上它，别人在这期间改过配置就会被拒。
          revision: typeof providerConfig.revision === 'number' ? providerConfig.revision : null,
          available: available,
          reason: reason,
          declaredCount: Array.isArray(providerConfig.models) ? providerConfig.models.length : null,
          declaredInModels: current !== null && current.available === true ? current.index >= 0 : null,
          preset,
          proposed,
          current: declared,
          diff: model === '' ? [] : diffFields(declared, proposed).map((row) => ({
            ...row,
            beforeText: describeValue(row.field, row.before),
            afterText: describeValue(row.field, row.after),
          })),
          plan: model === '' ? null : planWrite({ entry: declared, proposed, mode: body.mode === 'replace' ? 'replace' : 'fill' }),
          summary: model === '' ? null : summarizeEntry(declared),
          thinkingLevels: THINKING_LEVELS,
          writableFields: WRITABLE_FIELDS,
          note: 'temperature 不是 DSH 的模型级配置（是每次调用参数），只能存在插件的 params.json 里。'
            + (compatAccepts(providerConfig.profile?.api, 'supportsTemperature')
              ? '想表达「这个模型不吃 temperature」，写 compat.supportsTemperature: false。'
              : providerConfig.profile?.api === undefined
                ? '这个 provider 没声明 api 协议，无法判断能不能写 compat 开关，所以不主动写 compat。'
                : `当前 provider 走的是 ${providerConfig.profile.api}，该协议不接受 compat.supportsTemperature（只有 anthropic-messages 认），所以这里不提供这个开关。`),
        })
      }

      const outcome = await writeModelConfig(settings, {
        provider,
        model,
        proposed,
        preset,
        mode: body.mode === 'replace' ? 'replace' : 'fill',
        expectedRevision: typeof body.revision === 'number' ? body.revision : undefined,
      })
      if (outcome.ok !== true) {
        // conflict 是 409（可以重读后重试），写入通道本身出问题是 500，其余是请求不合法。
        const status = outcome.code === 'model-test/dsh-conflict' ? 409
          : outcome.code === 'model-test/dsh-write-failed' ? 500
          : 400
        return json({ ok: false, code: outcome.code, message: outcome.message }, status)
      }
      const after = readModelConfig(settings, provider, model)
      return json({
        ok: true,
        generatedAt: Date.now(),
        provider,
        model,
        ns: outcome.ns ?? null,
        applied: outcome.applied ?? [],
        message: (outcome.applied ?? []).length === 0
          ? 'DSH 里该模型的字段都已经在，无需写入'
          : `已写入 DSH 配置：${(outcome.applied ?? []).map((field) => describeValue(field, proposed[field])).join('、')}`,
        before: outcome.before ?? {},
        after: after.available === true ? after.declared : outcome.after ?? {},
        // 写完立刻回读，把「真的落盘成什么」告诉用户，而不是回声自己算的值。
        summary: after.available === true ? summarizeEntry(after.declared) : null,
      })
    } catch (cause) {
      return json({ ok: false, code: 'model-test/dsh-failed', message: messageOf(cause) }, 500)
    }
  })

  registerRoute(ctx, '/api/model-test/probe', ['POST'], async (request) => {
    try {
      const llm = ctx.get('llm')
      if (llm === null || llm === undefined || typeof llm.stream !== 'function') {
        return json({ ok: false, code: 'model-test/llm-unavailable', message: 'llm 服务不可用，无法探测模型能力' }, 503)
      }
      const body = await readBody(request)
      const provider = typeof body.provider === 'string' ? body.provider.trim() : ''
      const model = typeof body.model === 'string' ? body.model.trim() : ''
      if (provider === '' || model === '') {
        return json({ ok: false, code: 'model-test/probe-target-required', message: '请指定 provider 和 model' }, 400)
      }
      const catalog = await buildCatalog(llm)
      const targets = resolveTargets({ provider, model }, catalog)
      if (targets.length === 0) {
        return json({ ok: false, code: 'model-test/no-target', message: '没有匹配到指定模型', catalog }, 400)
      }
      const target = targets[0]
      const timeoutMs = clampInt(body.timeoutMs, 20000, 1000, 60000)
      const live = await readLiveCapability(llm, provider, model)
      const preset = matchPreset(model, loadPresetLibrary())
      const presetLevels = Array.isArray(preset?.reasoning?.levels) ? preset.reasoning.levels : []
      const liveLevels = Array.isArray(live?.efforts) ? live.efforts : []
      const checks = []
      let calls = 0

      const maxCall = await runCapabilityCall(llm, target, {
        prompt: '请从 1 开始逐个输出自然数，至少写到 100，每个数字用空格分隔，只输出数字。',
        maxTokens: 16,
        timeoutMs,
      })
      calls += 1
      if (maxCall.ok && maxCall.finishKind === 'max-tokens') {
        checks.push(capabilityCheck('maxTokens', '输出上限', 'supported', '设置 maxTokens=16 后，适配器以 max-tokens 结束；该输出上限在此请求中生效。', maxCall))
      } else if (maxCall.ok && maxCall.outputTokens !== null && maxCall.outputTokens > 24) {
        checks.push(capabilityCheck('maxTokens', '输出上限', 'unsupported', `请求上限为 16，但实际输出 ${maxCall.outputTokens} tokens 且未以 max-tokens 结束，疑似网关未遵守上限。`, maxCall))
      } else if (!maxCall.ok && isExplicitlyUnsupported(maxCall, ['max_tokens', 'max_output_tokens', 'token limit', '输出上限'])) {
        checks.push(capabilityCheck('maxTokens', '输出上限', 'unsupported', '网关明确拒绝了输出上限参数。', maxCall))
      } else {
        checks.push(capabilityCheck('maxTokens', '输出上限', 'unknown', maxCall.ok
          ? '这次请求没有触发 max-tokens 截断，无法判断网关是否遵守上限。'
          : '请求失败或超时，不能据此判断输出上限能力。', maxCall))
      }

      const toolCall = await runCapabilityCall(llm, target, {
        prompt: '必须调用 probe_capability 工具，并把 marker 设为 MODEL_TEST_PROBE；不要用普通文本回答。',
        maxTokens: 32,
        timeoutMs,
        tools: [{
          name: 'probe_capability',
          description: 'Return a marker to confirm tool calling.',
          parameters: {
            type: 'object',
            properties: { marker: { type: 'string' } },
            required: ['marker'],
            additionalProperties: false,
          },
        }],
      })
      calls += 1
      if (toolCall.ok && (toolCall.toolCall || toolCall.finishKind === 'tool-calls')) {
        checks.push(capabilityCheck('tools', '工具调用', 'supported', '模型返回了 tool-call 分片，确认此请求链路能发起工具调用。', toolCall))
      } else if (!toolCall.ok && isExplicitlyUnsupported(toolCall, ['tool', 'function', '工具'])) {
        checks.push(capabilityCheck('tools', '工具调用', 'unsupported', '适配器或网关明确拒绝了工具调用。', toolCall))
      } else {
        checks.push(capabilityCheck('tools', '工具调用', 'unknown', toolCall.ok
          ? '请求完成但没有返回工具调用；模型可能选择了普通回答，不能据此判为不支持。'
          : '请求失败或超时，不能据此判断工具调用能力。', toolCall))
      }

      let attachments = null
      try { attachments = ctx.get('attachments') } catch {}
      if (attachments === null || attachments === undefined || typeof attachments.saveImage !== 'function') {
        checks.push(capabilityCheck('vision', '图片输入', 'unknown', 'Host 未提供 attachments 图片服务，本次没有发送图片。'))
      } else {
        try {
          const image = await getRedProbeImage(attachments)
          const visionCall = await runCapabilityCall(llm, target, {
            content: [
              { type: 'text', text: '图像中心是什么颜色？只回答 RED 或 OTHER。' },
              { type: 'image', attachment: image },
            ],
            maxTokens: 16,
            timeoutMs,
          })
          calls += 1
          if (visionCall.ok && /\bRED\b/i.test(visionCall.text)) {
            checks.push(capabilityCheck('vision', '图片输入', 'supported', '模型根据测试图片回答 RED，确认本次链路实际处理了图片内容。', visionCall))
          } else if (!visionCall.ok && isExplicitlyUnsupported(visionCall, ['image', 'vision', '图片', '图像'])) {
            checks.push(capabilityCheck('vision', '图片输入', 'unsupported', '适配器或网关明确拒绝了图片输入。', visionCall))
          } else if (visionCall.ok && /无法.*(看|识别|读取|处理).*(图|图片|图像)|不支持.*(图|图片|图像)|cannot (see|read|process).*(image|picture)|image.*not supported/i.test(visionCall.text)) {
            checks.push(capabilityCheck('vision', '图片输入', 'unsupported', '模型明确表示无法处理图片。', visionCall))
          } else {
            checks.push(capabilityCheck('vision', '图片输入', 'unknown', visionCall.ok
              ? '请求完成，但没有可靠识别出测试图的纯红色内容。'
              : '图片请求失败或超时，不能确定是图片能力还是其他网关错误。', visionCall))
          }
        } catch (cause) {
          checks.push(capabilityCheck('vision', '图片输入', 'unknown', `测试图片准备失败，本次没有发送图片：${messageOf(cause)}`))
        }
      }

      checks.push(capabilityCheck('reasoningEffort', '思考档位', 'unknown',
        '网关可能静默忽略或映射档位；同一档位的重复请求出现过不同 usage 指纹，因此不把单次成功当作支持证明。'))
      checks.push(capabilityCheck('temperature', 'temperature', 'unknown',
        '多次采样结果在不同网关间方向不一致，不能可靠判断该参数是否生效。'))

      return json({
        ok: true,
        generatedAt: Date.now(),
        provider,
        model,
        calls,
        maxCalls: 3,
        timeoutMs,
        declaredEfforts: liveLevels,
        presetEfforts: presetLevels,
        checks,
        note: '这是按需真实请求，会产生上游调用费用。明确拒绝才判不支持；单次成功不证明参数生效。',
      })
    } catch (cause) {
      return json({ ok: false, code: 'model-test/probe-failed', message: messageOf(cause) }, 500)
    }
  })

  registerRoute(ctx, '/api/model-test/run', ['POST'], async (request) => {
    try {
      const llm = ctx.get('llm')
      if (llm === null || llm === undefined || typeof llm.stream !== 'function') {
        return json({ ok: false, code: 'model-test/llm-unavailable', message: 'llm 服务不可用，无法测试模型连接' }, 503)
      }
      const body = await readBody(request)
      const options = {
        timeoutMs: clampInt(body.timeoutMs, DEFAULT_TIMEOUT_MS, TIMEOUT_MIN_MS, TIMEOUT_MAX_MS),
        concurrency: clampInt(body.concurrency, DEFAULT_CONCURRENCY, CONCURRENCY_MIN, CONCURRENCY_MAX),
        prompt: typeof body.prompt === 'string' && body.prompt.trim() !== '' ? body.prompt.trim().slice(0, 200) : DEFAULT_PROMPT,
        // 测试的输出上限：预设建议的 maxTokens 不进测速（会白烧几千 tokens），以这里为准。
        maxTokens: clampInt(body.maxTokens, DEFAULT_MAX_TOKENS, MAX_TOKENS_MIN, MAX_TOKENS_MAX),
        // 全局默认层：面板顶部的 temperature / 思考档位默认值，优先级最低，可被覆盖/预设/本次指定盖掉。
        fallback: normalizeParams({ temperature: body.params?.temperature, reasoningEffort: body.params?.reasoningEffort }),
        forTest: true,
      }
      const catalog = await buildCatalog(llm)
      const targets = resolveTargets(body, catalog)
      if (targets.length === 0) {
        return json({
          ok: false,
          code: 'model-test/no-target',
          message: catalog.providerCount === 0 ? '当前没有可路由的模型组（DSH 里还没有激活的模型配置）' : '没有匹配到要测试的模型',
          catalog,
        }, 400)
      }

      const startedAt = Date.now()
      const library = loadPresetLibrary()
      const overrides = readOverrides()
      // 先并发探一遍「每个目标的真实能力 + 生效参数」，再统一发请求：
      // 这样 resolveModelInfo 的失败只影响该目标的推断，不会把整次测试拆成两段串行。
      const planned = await mapLimit(targets, options.concurrency, async (target) => {
        const live = await readLiveCapability(llm, target.provider, target.model)
        return { target, params: planParams(target, options, library, overrides, live) }
      })
      const results = await mapLimit(planned, options.concurrency, (item) =>
        probeModel(llm, item.target, { ...options, params: item.params }))
      const finishedAt = Date.now()
      const ok = results.filter((item) => item.ok === true).length
      const speeds = results.map((item) => item.tokensPerSecond).filter((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)
      const ttfts = results.map((item) => item.ttftMs).filter((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
      const average = (list) => (list.length === 0 ? null : list.reduce((sum, value) => sum + value, 0) / list.length)

      return json({
        ok: true,
        startedAt,
        finishedAt,
        options,
        catalog,
        summary: {
          total: results.length,
          ok,
          failed: results.length - ok,
          averageTtftMs: average(ttfts),
          averageTokensPerSecond: average(speeds),
          fastest: speeds.length === 0 ? null : Math.max(...speeds),
          slowest: speeds.length === 0 ? null : Math.min(...speeds),
        },
        results,
      })
    } catch (cause) {
      return json({ ok: false, code: 'model-test/run-failed', message: messageOf(cause) }, 500)
    }
  })
}
