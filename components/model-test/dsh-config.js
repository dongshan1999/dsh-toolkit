// components/model-test/dsh-config.js — 读写 DSH 真实的模型配置（Host 侧，无副作用）
//
// 面板里那套「参数」只存在插件自己的 params.json，只影响点「测试」时发什么参数。
// 这个模块解决另一半：把参数**写进 DSH 自己的 provider 配置**，让真实对话也用上。
//
// 为什么不自解析 YAML：
//   ~/.dsh/profiles/desktop/cordis.patch.yml 里有 14 处 !!js 标签、7 处块标量、注释，
//   手写字符串替换必错。DSH 的 settings 服务已经提供了一条安全通道：
//     settings.mutate(ns, ops) → configEditor.edit() → 文件锁 + 格式保留 + schema 校验
//                               + 原子写 + 失败回滚 + Loader 热重载
//   所以这里只做「算出 ops」，落盘交给官方服务。
//
// 能写什么：
//   llm-pi-ai 的 model 条目字段 = id / name / contextWindow / maxTokens / input /
//   reasoningEfforts / compat。**没有 temperature** —— DSH 的 temperature 是每次调用
//   的参数（LlmCallControls），不是模型级配置，所以它只能留在插件的 params.json 里。
//   想表达「这个模型不吃 temperature」，写在 compat.supportsTemperature: false。

/** llm-pi-ai 在 profile 里的条目 id（= settings 的 ns）。 */
export const DEFAULT_CONFIG_NS = 'llm-pi-ai'

/** 我们能安全写入的模型字段。id / name 不在内：id 是定位键，name 由用户决定。 */
export const WRITABLE_FIELDS = ['contextWindow', 'maxTokens', 'input', 'reasoningEfforts', 'compat']

const FIELD_LABEL = {
  contextWindow: '上下文窗口',
  maxTokens: '输出上限',
  input: '输入模态',
  reasoningEfforts: '思考档位',
  compat: '兼容开关',
}

/**
 * 每种 wire 协议真正接受的 compat 开关。
 *
 * pi-ai 的 COMPAT_GATES 按协议把每个字段标成 offer / withhold / 未声明，
 * 模型级 compat 里出现该协议不接受的键会**直接解析失败**：
 *   model "X" sets compat "F", but its api is "Y", which does not take it
 * 而且这条错误会被 Loader 当成配置非法，整次写入回滚。
 *
 * 最典型的坑：`supportsTemperature` **只有 anthropic-messages 接受**，
 * openai-completions / openai-responses 系一律不认 —— 往这些 provider 写
 * `compat.supportsTemperature: false` 会直接把配置写坏（写入被拒）。
 *
 * 这里只列本模块可能产出的字段；其余字段我们从不写，就不抄整张大表以免漂移。
 */
const COMPAT_ACCEPTS = {
  'anthropic-messages': ['supportsTemperature'],
  'openai-completions': [],
  'openai-responses': [],
  'azure-openai-responses': [],
  'openai-codex-responses': [],
  'mistral-conversations': [],
  'bedrock-converse-stream': [],
}

/** 该协议是否接受某个 compat 开关。未知协议按「不接受」处理（宁可不写，也不写坏）。 */
export function compatAccepts(api, field) {
  const offered = typeof api === 'string' ? COMPAT_ACCEPTS[api] : undefined
  return Array.isArray(offered) && offered.includes(field)
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * 剪掉「等于没配」的 compat 条目。
 *
 * schemastery 会把没写的 dict 物化成 `{}`，所以 parsed profile 里每个模型都带着
 * chatTemplateKwargs / chatTemplateArgs 两个空对象。pi-ai 自己也把它们当「没配」
 * （configuredCompatEntries 过滤空 dict），面板若照抄就会把空对象当成真实开关。
 */
function pruneCompat(value) {
  if (!isPlainObject(value)) return {}
  const out = {}
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || item === null) continue
    if (isPlainObject(item) && Object.keys(item).length === 0) continue
    if (Array.isArray(item) && item.length === 0) continue
    out[key] = item
  }
  return out
}

function positiveInt(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

function sameValue(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

/**
 * 在 settings.describe() 里找「带 providers 的那条」。
 * 不写死 ns：不同 profile 装的模型插件条目 id 可能不同（llm-pi-ai / 别的适配器）。
 * @returns {null | {ns: string, revision: number|undefined, providers: object}}
 */
export function findModelsEntry(settings) {
  if (settings === null || settings === undefined || typeof settings.describe !== 'function') return null
  let rows
  try {
    rows = settings.describe()
  } catch {
    return null
  }
  if (!Array.isArray(rows)) return null
  // 先按已知 ns 找，找不到再按形状找（value.providers 是对象）。
  const named = rows.find((row) => isPlainObject(row) && row.ns === DEFAULT_CONFIG_NS && isPlainObject(row.value?.providers))
  const shaped = rows.find((row) => isPlainObject(row) && isPlainObject(row.value?.providers))
  const row = named ?? shaped
  if (row === undefined) return null
  return { ns: row.ns, revision: typeof row.revision === 'number' ? row.revision : undefined, providers: row.value.providers }
}

/**
 * 读某个 provider 在 DSH 配置里的真实形状。
 * models 为 null 表示该 provider 没声明 models 数组（走内置目录 + modelOverrides），
 * 这种情况下不能直接往里塞一个 models —— 那会把目录缩成一个模型。
 */
export function readProviderConfig(settings, providerId) {
  const entry = findModelsEntry(settings)
  if (entry === null) {
    return {
      available: false,
      ns: null,
      models: null,
      reason: 'DSH 没有暴露可写的模型配置（settings 服务不可用，或没有带 providers 的插件条目）',
    }
  }
  const profile = entry.providers[providerId]
  if (!isPlainObject(profile)) {
    return {
      available: false,
      ns: entry.ns,
      models: null,
      reason: 'llm-pi-ai 配置里没有 provider "' + providerId + '"（这个组可能来自别的适配器）',
    }
  }
  const declared = Array.isArray(profile.models) ? profile.models : null
  return {
    available: true,
    ns: entry.ns,
    revision: entry.revision,
    profile,
    models: declared,
  }
}

/** 读单个模型条目；index 为 -1 表示模型不在 models 数组里。 */
export function readModelConfig(settings, providerId, modelId) {
  const provider = readProviderConfig(settings, providerId)
  if (provider.available !== true) return provider
  const models = provider.models
  if (models === null) {
    return {
      available: false,
      ns: provider.ns,
      revision: provider.revision,
      profile: provider.profile,
      reason: '该 provider 没有声明 models 数组（用内置目录 + modelOverrides），直接写 models 会把目录缩成一个模型；请在 cordis.patch.yml 里先补齐 models',
    }
  }
  const index = models.findIndex((item) => isPlainObject(item) && item.id === modelId)
  const entry = index >= 0 ? models[index] : null
  return {
    available: true,
    ns: provider.ns,
    revision: provider.revision,
    profile: provider.profile,
    models,
    index,
    entry,
    /** 已声明的可写字段（未声明的就是「没配」）。 */
    declared: entry === null ? {} : pickWritable(entry),
  }
}

/** 从条目里挑出可写字段（其余字段原样保留、不参与 diff）。 */
export function pickWritable(entry) {
  const out = {}
  if (!isPlainObject(entry)) return out
  for (const field of WRITABLE_FIELDS) {
    if (entry[field] === undefined) continue
    if (field === 'compat') {
      // 空 dict = 没配（schemastery 物化的空 chatTemplateKwargs 就属于这种），别当成真实开关。
      const pruned = pruneCompat(entry.compat)
      if (Object.keys(pruned).length > 0) out.compat = pruned
      continue
    }
    out[field] = entry[field]
  }
  return out
}

/**
 * 把预设 + 适配器真实能力推导成一组「建议写进 DSH 的字段」。
 * 只产出模型级字段；temperature 不在这里（它不是模型级配置）。
 *
 * 取值取向很重要：
 *   - contextWindow / maxTokens 取**预设表**的值（= 主流参数汇总的结论），
 *     而不是 live 的现值 —— live 的值本来就来自配置，用它当建议值等于永远没差异。
 *   - input 取 live 的适配器能力；reasoningEfforts 优先取按模型名命中的预设，
 *     否则 live 若来自错误的手写 models 条目，就会让多写的档位永远无法出现在 diff 中。
 *     预设只是配置建议，不代表网关一定会按该档位执行。
 */
export function proposeFields(input) {
  const preset = isPlainObject(input?.preset) ? input.preset : null
  const live = isPlainObject(input?.live) ? input.live : null
  const api = typeof input?.api === 'string' ? input.api : ''
  const fields = {}

  const contextWindow = positiveInt(preset?.contextWindow) ?? positiveInt(live?.contextWindow)
  if (contextWindow !== null) fields.contextWindow = contextWindow

  const maxTokens = positiveInt(preset?.maxTokens) ?? positiveInt(live?.defaultMaxTokens)
  if (maxTokens !== null) fields.maxTokens = maxTokens

  const modalities = Array.isArray(live?.inputModalities)
    ? live.inputModalities.filter((item) => item === 'text' || item === 'image')
    : []
  if (modalities.length > 0) fields.input = modalities

  // 先用按模型名匹配的预设检查手写档位；没有预设时才退回适配器目录能力。
  const liveLevels = Array.isArray(live?.efforts) ? live.efforts : []
  const presetLevels = isPlainObject(preset?.reasoning) && Array.isArray(preset.reasoning.levels) ? preset.reasoning.levels : []
  const levels = presetLevels.length > 0 ? presetLevels : liveLevels
  const usable = levels.filter((level) => typeof level === 'string' && level !== '' && level !== 'off')
  const wire = isPlainObject(preset?.reasoning) && isPlainObject(preset.reasoning.wire) ? preset.reasoning.wire : {}
  if (usable.length === 0) {
    fields.reasoningEfforts = false
  } else {
    const map = {}
    // 只建议「思考档位」本身：off 不进 diff（维持原有语义，避免把关闭开关塞进配置）。
    for (const level of usable) {
      const spelling = typeof wire[level] === 'string' && wire[level] !== '' ? wire[level] : level
      map[level] = spelling
    }
    fields.reasoningEfforts = map
  }

  // 「不吃 temperature」只能用 compat 表达，但 supportsTemperature 只有 anthropic-messages 协议
  // 接受；写到 openai-* 系 provider 上会被 pi-ai 的 compat gate 直接判非法，所以先按协议筛一遍。
  if (preset !== null && preset.supportsTemperature === false && compatAccepts(api, 'supportsTemperature')) {
    fields.compat = { supportsTemperature: false }
  }
  return fields
}

/** 把建议值和现有条目对比，产出逐字段差异。 */
export function diffFields(entry, proposed) {
  const existing = pickWritable(entry)
  const diff = []
  const keys = new Set([...Object.keys(existing), ...Object.keys(proposed)])
  for (const field of WRITABLE_FIELDS) {
    if (!keys.has(field)) continue
    const before = existing[field]
    const after = proposed[field]
    // compat 是「开关集合」，而且里面常常混着用户手写的开关（chatTemplateKwargs 之类，
    // 甚至有些是适配器从 catalog 合并进来的）。所以：
    //   1. 只比较**我们建议里出现的键**，用户自己的开关一律不碰、也不报差异；
    //   2. 建议里没有 compat 时整行不出现（否则会把「不提供这个开关」误报成「要把它们删掉」）。
    if (field === 'compat') {
      const a = pruneCompat(before)
      const b = pruneCompat(after)
      const wanted = Object.keys(b)
      if (wanted.length === 0) continue
      const compatKeys = wanted.filter((key) => !sameValue(a[key], b[key]))
      if (compatKeys.length === 0) continue
      const beforePart = {}
      const afterPart = {}
      for (const key of compatKeys) {
        if (a[key] !== undefined) beforePart[key] = a[key]
        afterPart[key] = b[key]
      }
      diff.push({
        field,
        label: FIELD_LABEL[field] ?? field,
        before: compatKeys.some((key) => a[key] !== undefined) ? beforePart : null,
        after: afterPart,
        missing: compatKeys.every((key) => a[key] === undefined),
        changed: true,
        compatKeys,
      })
      continue
    }
    diff.push({
      field,
      label: FIELD_LABEL[field] ?? field,
      before: before === undefined ? null : before,
      after: after === undefined ? null : after,
      missing: before === undefined,
      changed: !sameValue(before, after),
    })
  }
  return diff
}

/**
 * 算写入用的 ops（不改动任何东西，纯函数，便于自检）。
 *
 * mode:
 *   'fill'    —— 只补 DSH 里缺的字段（missing === true），已有值一概不动；
 *   'replace' —— 用建议值覆盖所有有差异的字段（changed === true）。
 *
 * @returns {{ok: boolean, reason?: string, ops?: object[], next?: object, applied?: string[], appliedRows?: object[]}}
 */
export function planWrite(input) {
  const { entry, proposed, mode } = input
  const replace = mode === 'replace'
  const diff = diffFields(entry, proposed)
  // replace 只挑「有差异」的字段；fill 只挑「DSH 里还没有」的字段。
  // 两者都要求建议值非 null（null = 建议「不配这个字段」，不能拿来写入）。
  const applied = diff.filter((row) => (replace ? row.changed : row.missing) && row.after !== null)
  if (applied.length === 0) {
    return {
      ok: true,
      ops: [],
      next: pickWritable(entry),
      applied: [],
      appliedRows: [],
      reason: replace ? '建议值与 DSH 现有配置一致，无需写入' : 'DSH 里该模型的字段都已存在，没有要补的',
    }
  }
  const next = { ...pickWritable(entry) }
  for (const row of applied) {
    // compat 是开关集合：合并进已有键，而不是用建议值整块替换（否则会抹掉别的开关）。
    if (row.field === 'compat') {
      next.compat = { ...pruneCompat(next.compat), ...pruneCompat(row.after) }
      continue
    }
    next[row.field] = row.after
  }
  return { ok: true, ops: [], next, applied: applied.map((row) => row.field), appliedRows: applied }
}

/**
 * 真正写入。
 * @param {object} settings ctx.get('settings')
 * @param {{provider: string, model: string, proposed: object, mode?: 'fill'|'replace', expectedRevision?: number}} input
 * @returns {Promise<{ok: boolean, code?: string, message?: string, ns?: string, index?: number, applied?: string[], before?: object, after?: object}>}
 */
export async function writeModelConfig(settings, input) {
  if (settings === null || settings === undefined || typeof settings.mutate !== 'function') {
    return { ok: false, code: 'model-test/dsh-unavailable', message: 'settings 服务不可用，无法写入 DSH 配置' }
  }
  const providerId = typeof input?.provider === 'string' ? input.provider : ''
  const modelId = typeof input?.model === 'string' ? input.model : ''
  if (providerId === '' || modelId === '') {
    return { ok: false, code: 'model-test/dsh-invalid', message: 'provider 与 model 都必须提供' }
  }
  const current = readModelConfig(settings, providerId, modelId)
  if (current.available !== true) {
    return { ok: false, code: 'model-test/dsh-unavailable', message: current.reason }
  }

  const plan = planWrite({ entry: current.entry, proposed: input.proposed ?? {}, mode: input.mode === 'replace' ? 'replace' : 'fill' })
  if (plan.ok !== true) {
    return { ok: false, code: 'model-test/dsh-invalid', message: plan.reason }
  }
  if (plan.applied.length === 0) {
    return { ok: true, ns: current.ns, index: current.index, applied: [], before: current.declared, after: current.declared, message: plan.reason }
  }

  const ops = []
  const base = ['providers', providerId, 'models']
  if (current.index >= 0) {
    // 只改动的字段：id / name 等用户字段原样保留。
    for (const row of plan.appliedRows ?? []) {
      // compat 逐键写：整块 set 会把用户在 YAML 里手写的其它开关一起抹掉。
      if (row.field === 'compat') {
        for (const key of row.compatKeys ?? []) {
          const value = pruneCompat(row.after)[key]
          if (value === undefined) ops.push({ op: 'unset', path: [...base, String(current.index), 'compat', key] })
          else ops.push({ op: 'set', path: [...base, String(current.index), 'compat', key], value })
        }
        continue
      }
      ops.push({ op: 'set', path: [...base, String(current.index), row.field], value: plan.next[row.field] })
    }
  } else {
    // 模型不在 models 里：追加一整条。name 只在有预设标签时带，避免凭空造名字。
    const appended = { id: modelId, ...plan.next }
    if (typeof input?.preset?.label === 'string' && input.preset.label !== '') appended.name = input.preset.label
    ops.push({ op: 'set', path: [...base, String(current.models.length)], value: appended })
  }

  try {
    await settings.mutate(current.ns, ops, input.expectedRevision)
  } catch (cause) {
    const message = cause !== null && typeof cause === 'object' && typeof cause.message === 'string' ? cause.message : String(cause)
    // SETTINGS_CONFLICT = 读完之后别人改过配置，DSH 用 revision 拒掉这次写入（不覆盖别人的改动）。
    // 这不是失败而是「请先重读」，所以单独给个码，面板据此提示刷新。
    if (cause !== null && typeof cause === 'object' && cause.code === 'SETTINGS_CONFLICT') {
      return { ok: false, code: 'model-test/dsh-conflict', message: 'DSH 配置在读取之后被改过（revision 已过期），已拒绝覆盖；请重新读取后再写。' }
    }
    return { ok: false, code: 'model-test/dsh-write-failed', message }
  }

  // 写完回读一遍，把「真的落盘成什么」交给上层展示（而不是回声自己算的值）。
  const after = readModelConfig(settings, providerId, modelId)
  return {
    ok: true,
    ns: current.ns,
    index: after.available === true ? after.index : current.index,
    applied: plan.applied,
    before: current.declared,
    after: after.available === true ? after.declared : plan.next,
  }
}

/** 嵌套值的一行紧凑表示：对象/数组展开成 JSON，标量原样。 */
function compact(value) {
  if (value === null || value === undefined) return '（空）'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/** 人类可读的单字段值（面板直接显示）。 */
export function describeValue(field, value) {
  if (value === null || value === undefined) return '（未配置）'
  if (field === 'input') return Array.isArray(value) ? value.join(' + ') : String(value)
  if (field === 'reasoningEfforts') {
    if (value === false) return '非推理模型（false）'
    if (isPlainObject(value)) {
      const keys = Object.keys(value)
      return keys.length === 0 ? '（空）' : keys.join(' / ')
    }
    return String(value)
  }
  if (field === 'compat' && isPlainObject(value)) {
    const pruned = pruneCompat(value)
    const keys = Object.keys(pruned)
    // 嵌套对象（chatTemplateKwargs 之类）要展开，不能显示成 [object Object]。
    return keys.length === 0 ? '（空）' : keys.map((key) => key + ': ' + compact(pruned[key])).join(' · ')
  }
  return typeof value === 'object' ? compact(value) : String(value)
}

/** 一整个条目压成一行摘要（面板/日志用）。 */
export function summarizeEntry(entry) {
  const picked = pickWritable(entry)
  const parts = []
  for (const field of WRITABLE_FIELDS) {
    if (picked[field] === undefined) continue
    parts.push((FIELD_LABEL[field] ?? field) + ' ' + describeValue(field, picked[field]))
  }
  return parts.length === 0 ? '（DSH 里这条没有任何可写字段）' : parts.join(' · ')
}
