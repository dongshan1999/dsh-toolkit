// components/notifications/host.js — 站内 / 系统通知（Host 侧）
//
// 路由：
//   GET  /api/notifications        通知列表 + 场景目录 + 当前配置 + 落盘位置 + 系统通知通道状态
//   POST /api/notifications        动作：read / readAll / clear / clearAll / config / test
//                                        / focus / native-test
//
// 三路投递（面板和 toast 在 client.js 里，这里负责后两路的数据与投递）：
//   1. 队列：每条通知落 $DSH_HOME/dsh-toolkit/notifications/queue.json，前端轮询取
//   2. 系统通知：native.js 直接调操作系统通知中心（macOS osascript / Linux notify-send），
//      窗口最小化、被遮挡、切到别的 app 都能收到。这是 desktop 里唯一「关掉窗口也看得见」的通道
//   3. 免打扰：`focus` 动作上报窗口是否真的在前台（可见且有焦点）。
//      action / error 永远推；info / warning 只在窗口不在前台时推
//
// 为什么通知必须在 Host 侧收集：
//   Client 的 `ctx.remote.$on` 只转发一张白名单里的事件（dsh-api-remotes 的
//   API_REMOTE_FORWARDED_EVENTS），`agent/status`、`agent/error`、
//   `agent/request-error`、`subagent/start|end`、`session/event`、
//   `compaction/summary-error` 都不在里面。也就是说「会话完成了」「子智能体挂了」
//   这件事浏览器里的插件根本收不到。所以本组件在 Host 侧订阅这些事件、落一条
//   队列，再让前端来取；前端只负责「怎么显示」。
//
// 订阅的事件（覆盖用户点名的三类 + 补充场景，共 16 种通知）：
//
//   session/event → turn/end        会话完成 / 出错 / 截断 / 阻断 / 中断（5 种）
//   approval/request                (waterfall) 需要权限确认
//   user-questions/request          (waterfall) 需要你回答 / 计划待审批
//   agent/request-error             (waterfall) 模型请求失败
//   agent/error                     步骤级异常
//   subagent/end                    子智能体完成 / 失败 / 中断
//   compaction/summary-error        (waterfall) 上下文压缩失败
//   agent-loop/config-start-failed  会话配置解析失败
//   deepseek-account/session-expired 账号凭据被服务端拒绝
//
// 三条红线（写错会真的改变 DSH 的行为，不是「只是没通知」）：
//   1. **waterfall 事件必须 `return next()`**。approval/request 的默认落点是
//      `'unavailable'`，请求被吞掉就等于悄悄拒绝了用户的工具调用；
//      agent/request-error 不调 next() 就是「我来接管恢复」，会让重试逻辑走偏。
//   2. **监听器绝不能让异常冒出去**。cordis 的 emit 不捕获单条 listener 的错，
//      抛出去会把会话打挂。所有回调都套 try/catch，只打日志。
//   3. **同一件事不能重复通知**（去重键 + 时间窗），否则模型一次失败重试 3 次
//      就是 3 条通知。

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { notificationsDir } from '../image-gen/paths.js?v=44'
import { openSettings as openNativeSettings, probe as probeNative, send as sendNative } from './native.js'

export const name = 'notifications'
export const inject = ['connection', 'timer']

/** 通知场景目录。顺序即面板里的展示顺序；enabled 只是默认值，用户配置会覆盖它。 */
const KINDS = [
  { id: 'approval-required', label: '需要权限确认', level: 'action', enabled: true, hint: '工具调用在等你批准（最需要立刻处理）' },
  { id: 'question-required', label: '需要你回答', level: 'action', enabled: true, hint: '模型提问在等你的答案' },
  { id: 'plan-review', label: '计划待审批', level: 'action', enabled: true, hint: '计划模式提交了待确认的计划' },
  { id: 'turn-completed', label: '会话完成', level: 'info', enabled: true, hint: '一轮对话正常结束' },
  { id: 'turn-error', label: '会话出错', level: 'error', enabled: true, hint: '回合以错误结束（模型失败会走到这里）' },
  { id: 'turn-max-tokens', label: '输出被截断', level: 'warning', enabled: true, hint: '达到最大输出长度，回复没写完' },
  { id: 'turn-blocked', label: '回合被阻断', level: 'warning', enabled: false, hint: '审批被拒或工具把这一轮拦下了' },
  { id: 'turn-aborted', label: '会话被中断', level: 'warning', enabled: false, hint: '你自己、父会话或钩子取消了这一轮' },
  { id: 'model-error', label: '模型请求失败', level: 'error', enabled: true, hint: '一次模型请求失败，附带 provider 与错误码' },
  { id: 'agent-error', label: '步骤异常', level: 'error', enabled: false, hint: '比「会话出错」更细的步骤级错误（默认关，避免重复）' },
  { id: 'subagent-completed', label: '子智能体完成', level: 'info', enabled: true, hint: '子会话正常结束' },
  { id: 'subagent-failed', label: '子智能体失败', level: 'error', enabled: true, hint: '子会话报错 / 拒答 / 输出超长' },
  { id: 'subagent-stopped', label: '子智能体中断', level: 'warning', enabled: false, hint: '子会话被中断（你主动停的那种）' },
  { id: 'compaction-error', label: '压缩失败', level: 'error', enabled: true, hint: '上下文压缩没完成，长会话可能受影响' },
  { id: 'config-error', label: '会话启动失败', level: 'error', enabled: true, hint: '会话配置解析失败，模型根本没跑起来' },
  { id: 'account-expired', label: '账号凭据失效', level: 'error', enabled: true, hint: '服务端拒绝了当前登录状态，需要重新登录' },
]

const KIND_INDEX = new Map(KINDS.map((kind) => [kind.id, kind]))

const CONFIG_VERSION = 1
const DEFAULTS = {
  version: CONFIG_VERSION,
  enabled: true,
  maxItems: 300,
  maxAgeMs: 7 * 86400000,
  dedupeMs: 45000,
  kinds: Object.fromEntries(KINDS.map((kind) => [kind.id, kind.enabled])),
  // 兜底通道：由 Host 自己起子进程去调操作系统通知中心（见 native.js）。
  // 正常路径不用它——前端的 Notification 就能弹系统通知，而且署名是 DSH 本体、
  // 能停在屏幕上等用户点掉。这条兜底是给「前端根本没加载起来」的极端情况准备的，
  // 代价是会多弹一条、署名也不是 DSH（macOS 上是 Script Editor），所以默认关闭。
  native: { enabled: false, sound: true },
}
/** 队列落盘合并窗口：一轮对话里可能连续来好几条，攒一下再写，避免每次 push 都碰磁盘。 */
const PERSIST_DEBOUNCE_MS = 800
/** 会话身份缓存（标题 / 工作区 / 父会话）的上限，超了丢最早插入的（Map 迭代顺序即插入顺序）。 */
const TITLE_LIMIT = 500
/** 会话身份缓存上限（id → 工作区 / 父会话 / origin），与标题缓存同源同寿命。 */
const SESSION_LIMIT = 500
/** 正文里错误文本的截断长度，太长会把通知撑爆。 */
const TEXT_LIMIT = 240

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function messageOf(cause) {
  if (cause === null || cause === undefined) return 'unknown'
  if (typeof cause === 'string') return cause
  if (typeof cause === 'object' && typeof cause.message === 'string' && cause.message !== '') return cause.message
  return String(cause)
}

/** 单行化 + 截断：错误信息经常带换行和堆栈，通知里只要第一行。 */
function clip(value, limit = TEXT_LIMIT) {
  const text = String(value === null || value === undefined ? '' : value).replace(/\s+/g, ' ').trim()
  return text.length <= limit ? text : text.slice(0, limit - 1) + '…'
}

function envPath(name) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : ''
}

export function configFile() {
  return envPath('NOTIFICATIONS_CONFIG') || join(notificationsDir(), 'config.json')
}

export function queueFile() {
  return envPath('NOTIFICATIONS_QUEUE') || join(notificationsDir(), 'queue.json')
}

function readJson(file) {
  try {
    if (!existsSync(file)) return null
    const value = JSON.parse(readFileSync(file, 'utf8'))
    return value !== null && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

function writeJsonAtomic(file, value) {
  mkdirSync(dirname(file), { recursive: true })
  const temp = file + '.tmp-' + process.pid + '-' + Date.now()
  writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
  renameSync(temp, file)
}

/** 配置归一：只认已知字段与已知场景，坏值一律回退默认，绝不让坏配置把通知关死。 */
function normalizeConfig(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  const kinds = {}
  for (const kind of KINDS) {
    const stored = source.kinds !== null && typeof source.kinds === 'object' ? source.kinds[kind.id] : undefined
    kinds[kind.id] = typeof stored === 'boolean' ? stored : kind.enabled
  }
  const intOf = (value, fallback, min, max) => {
    const number = Number(value)
    if (!Number.isFinite(number)) return fallback
    return Math.min(max, Math.max(min, Math.round(number)))
  }
  return {
    version: CONFIG_VERSION,
    enabled: typeof source.enabled === 'boolean' ? source.enabled : DEFAULTS.enabled,
    maxItems: intOf(source.maxItems, DEFAULTS.maxItems, 20, 2000),
    maxAgeMs: intOf(source.maxAgeMs, DEFAULTS.maxAgeMs, 3600000, 30 * 86400000),
    dedupeMs: intOf(source.dedupeMs, DEFAULTS.dedupeMs, 0, 600000),
    kinds,
    native: {
      enabled: typeof source.native?.enabled === 'boolean' ? source.native.enabled : DEFAULTS.native.enabled,
      sound: typeof source.native?.sound === 'boolean' ? source.native.sound : DEFAULTS.native.sound,
    },
  }
}

function metaOf(kind) {
  const found = KIND_INDEX.get(kind)
  return found !== undefined ? found : { id: kind, label: kind, level: 'info', enabled: false, hint: '' }
}

/** 会话 header 的薄封装：拿不到就当空对象，所有读 header 的地方都该走它。 */
function headerOf(session) {
  return session !== null && typeof session === 'object' && session.header !== null && typeof session.header === 'object'
    ? session.header
    : {}
}

/**
 * 会话的**真名**：`session/title` 缓存 → cwd 末段 → 空串。
 *
 * 与 {@link titleOf} 的唯一区别是「拿不到真名时返回空串而不是『会话 abc123』」。
 * 需要区分「有名字」和「只有兜底」的调用方必须用这个——把『会话 abc123』
 * 拼进通知标题，比只显示工作区更难读。
 */
function nameOf(session, titles, fallbackId) {
  const header = headerOf(session)
  const id = sessionIdOf(session) || String(fallbackId || '')
  const cached = id === '' ? undefined : titles.get(id)
  if (typeof cached === 'string' && cached !== '') return cached
  const cwd = typeof header.cwd === 'string' ? header.cwd : ''
  const base = cwd.split(/[\\/]/).filter(Boolean).pop()
  return typeof base === 'string' ? base : ''
}

/** 会话标题：优先事件流里的 `session/title`（与客户端会话列表同源），回退目录名。 */
function titleOf(session, titles, fallbackId) {
  const name = nameOf(session, titles, fallbackId)
  if (name !== '') return name
  const id = sessionIdOf(session) || String(fallbackId || '')
  return id === '' ? '会话' : '会话 ' + id.slice(0, 6)
}

/** header.parentSession：子会话指回父会话 id，根会话没有。 */
function parentIdOf(session) {
  const parent = headerOf(session).parentSession
  return typeof parent === 'string' ? parent : ''
}

/** header.origin：`'subagent'` 表示这是子智能体的子会话。 */
function originOf(session) {
  const origin = headerOf(session).origin
  return typeof origin === 'string' ? origin : ''
}

/**
 * 工作区名：会话 header 的 cwd 末段。没有 cwd 就回退到缓存，再回退到空串
 * （空串表示「不知道工作区」，渲染方自己决定要不要占位）。
 */
function workspaceOf(session, workspaces, fallbackId) {
  const header = session !== null && typeof session === 'object' && session.header !== null && typeof session.header === 'object'
    ? session.header
    : {}
  const id = sessionIdOf(session) || String(fallbackId || '')
  const cwd = typeof header.cwd === 'string' ? header.cwd : ''
  const base = cwd.split(/[\\/]/).filter(Boolean).pop()
  if (typeof base === 'string' && base !== '') {
    if (id !== '' && workspaces !== undefined) workspaces.set(id, base)
    return base
  }
  const cached = id === '' || workspaces === undefined ? undefined : workspaces.get(id)
  return typeof cached === 'string' ? cached : ''
}

/**
 * 通知的主标题：先工作区、再会话。
 * 系统通知里最该被一眼看到的是「哪个项目 / 哪个会话」，而不是「会话完成」——
 * 后者是原因，放在副标题（或正文开头）更合适。
 * 工作区名与会话名相同时只留一个，避免「demo-app / demo-app」这种废话。
 */
function composeTitle(workspace, sessionTitle, fallback) {
  const space = typeof workspace === 'string' ? workspace.trim() : ''
  const session = typeof sessionTitle === 'string' ? sessionTitle.trim() : ''
  if (space !== '' && session !== '' && space !== session) return space + ' / ' + session
  if (space !== '') return space
  if (session !== '') return session
  return typeof fallback === 'string' && fallback !== '' ? fallback : 'DSH'
}

function sessionIdOf(session) {
  if (session === null || typeof session !== 'object') return ''
  const id = session.id
  return id === undefined || id === null ? '' : String(id)
}

function agentIdOf(agent) {
  if (agent === null || typeof agent !== 'object') return ''
  const id = agent.id
  return id === undefined || id === null ? '' : String(id)
}

/** 审批原因：displayReason 是按语言分桶的，优先中文，其次 en，最后随便取一个非空。 */
function displayReasonOf(req) {
  const value = req !== null && typeof req === 'object' ? req.displayReason : undefined
  if (value === null || typeof value !== 'object') return ''
  for (const key of ['zh', 'zh-CN', 'zh-Hans', 'zh-Hant', 'en']) {
    const text = value[key]
    if (typeof text === 'string' && text.trim() !== '') return text.trim()
  }
  for (const key of Object.keys(value)) {
    const text = value[key]
    if (typeof text === 'string' && text.trim() !== '') return text.trim()
  }
  return ''
}

/** 取 `lastAssistantMessage` 里最后一段文本：子智能体结束时唯一能拿到的「它说了什么」。 */
function lastTextOf(blocks) {
  if (!Array.isArray(blocks)) return ''
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index]
    if (block !== null && typeof block === 'object' && typeof block.text === 'string' && block.text.trim() !== '') {
      return block.text
    }
  }
  return ''
}

export function apply(ctx) {
  const state = {
    seq: 0,
    items: [],
    config: DEFAULTS,
    titles: new Map(),
    // 会话 id → 工作区名（cwd 末段）。agent 级事件只给得到 sessionId，
    // 所以要在 session/event 里顺手把 cwd 记下来，否则通知里没有工作区。
    workspaces: new Map(),
    // 会话 id → { workspace, parentSession, origin }。子智能体事件（subagent/end）
    // 只给一个裸 id，既没有 session 对象也没有父会话，`sessions.get()` 对已经
    // 落盘退出的子会话也常常拿不到。所以凡是经过 session/event 的会话都记一份
    // 身份，subagent/end 才有办法回答「这是哪个工作区、哪个会话派出来的」。
    hosts: new Map(),
    persistTimer: null,
    pendingPersist: false,
    // 兜底通道的运行时状态：已成功投递条数、是否已经就「通道不可用」报过
    // 警告（只报一次）。windowFocused 保留但不再参与任何判断——系统通知现在
    // 一律直接弹，不再做「人在看屏幕就不打扰」的取舍。
    windowFocused: true,
    nativeOk: 0,
    nativeChannel: 'none',
    nativeWarned: false,
    // 启动时异步探测一次，结果缓存在这里供 GET 直接读出（GET 不等子进程）。
    nativeSupported: false,
    nativePlatform: process.platform,
    nativeReason: '',
  }

  const warn = (message) => {
    try {
      if (typeof ctx.logger?.warn === 'function') ctx.logger.warn('[notifications] ' + message)
    } catch { /* 日志失败无所谓 */ }
  }

  // ── 队列持久化 ────────────────────────────────────────────────
  function trim() {
    const maxItems = Math.max(1, Number(state.config.maxItems) || DEFAULTS.maxItems)
    const maxAgeMs = Math.max(0, Number(state.config.maxAgeMs) || 0)
    const now = Date.now()
    if (maxAgeMs > 0) {
      state.items = state.items.filter((item) => now - (Number(item.createdAt) || 0) <= maxAgeMs)
    }
    if (state.items.length > maxItems) state.items.length = maxItems
  }

  function persistNow() {
    state.pendingPersist = false
    try {
      writeJsonAtomic(queueFile(), { version: CONFIG_VERSION, seq: state.seq, items: state.items })
    } catch (cause) {
      warn('写队列失败：' + messageOf(cause))
    }
  }

  function schedulePersist() {
    state.pendingPersist = true
    if (state.persistTimer !== null) return
    state.persistTimer = setTimeout(() => {
      state.persistTimer = null
      if (state.pendingPersist === true) persistNow()
    }, PERSIST_DEBOUNCE_MS)
    // setTimeout 不该拖住进程退出。
    if (typeof state.persistTimer?.unref === 'function') state.persistTimer.unref()
  }

  /**
   * 把一个会话的身份记进缓存：工作区（cwd 末段）、父会话、origin。
   *
   * `subagent/end` 只给子会话 id，而那时子会话往往已经落盘退出、`sessions.get()`
   * 返回 undefined——光靠 live session 查不到「哪个工作区哪个会话」。凡是经由
   * `session/event` 流过的会话都在这里留一份身份，就是给这种情况兜底。
   * 逐字段合并：后一次事件只带了部分字段时，不清掉之前记下的。
   */
  function rememberSession(session) {
    const id = sessionIdOf(session)
    if (id === '') return
    const header = headerOf(session)
    const cwd = typeof header.cwd === 'string' ? header.cwd : ''
    const workspace = cwd.split(/[\\/]/).filter(Boolean).pop() || ''
    const parentSession = parentIdOf(session)
    const origin = originOf(session)
    const previous = state.hosts.get(id)
    const base = previous !== undefined && typeof previous === 'object' ? previous : {}
    state.hosts.set(id, {
      workspace: workspace !== '' ? workspace : (typeof base.workspace === 'string' ? base.workspace : ''),
      parentSession: parentSession !== '' ? parentSession : (typeof base.parentSession === 'string' ? base.parentSession : ''),
      origin: origin !== '' ? origin : (typeof base.origin === 'string' ? base.origin : ''),
    })
    if (state.hosts.size > SESSION_LIMIT) {
      const oldest = state.hosts.keys().next()
      if (oldest.done !== true) state.hosts.delete(oldest.value)
    }
  }

  /** 取会话缓存的身份，拿不到就给一个空壳，所有字段使用方都要容忍空串。 */
  function hostOf(sessionId) {
    const found = typeof sessionId === 'string' && sessionId !== '' ? state.hosts.get(sessionId) : undefined
    return found !== undefined && typeof found === 'object' ? found : { workspace: '', parentSession: '', origin: '' }
  }

  /**
   * 解析一个会话的「通知身份」：通知标题该写谁、属于哪个工作区。
   *
   * 关键在于**子会话不是它自己的主语**。子智能体请求审批、模型失败、子会话
   * 结束时，事件里给的 id 都是子会话的 id；直接拿它当标题，用户看到的是
   * 「Mnemon idle checkpoint review」这种内部 label，完全不知道是哪个项目、
   * 哪个会话派出来的。所以只要判定是子会话，就把主语上提到父会话，子会话
   * 自己的名字降级成正文里的「子智能体「xxx」」。
   *
   * 三条信息各有自己的回退链，全部容许为空：
   * - 名字：session/title 缓存 → cwd 末段 → 「会话 abc123」；
   * - 工作区：live header.cwd → session/event 记下的身份 → 父会话的 cwd；
   * - 父会话：live header.parentSession → session/event 记下的身份。
   */
  function identityOf(sessionId) {
    const live = liveSession(sessionId)
    const known = hostOf(sessionId)
    const origin = originOf(live) || known.origin
    const liveParent = parentIdOf(live)
    const parentId = liveParent !== '' ? liveParent : known.parentSession
    const isChild = origin === 'subagent' || parentId !== ''
    const ownerId = isChild && parentId !== '' ? parentId : sessionId
    const ownerLive = ownerId === sessionId ? live : liveSession(ownerId)
    const ownerKnown = ownerId === sessionId ? known : hostOf(ownerId)
    const workspace = workspaceOf(ownerLive, state.workspaces, ownerId)
      || ownerKnown.workspace
      || workspaceOf(live, state.workspaces, sessionId)
      || known.workspace
    return {
      sessionId,
      parentId: isChild ? parentId : '',
      isChild,
      ownerId,
      sessionTitle: titleOf(ownerLive, state.titles, ownerId),
      workspace,
      // 只有子会话才需要这个：正文里点名「哪一个子智能体」。
      childName: isChild ? nameOf(live, state.titles, sessionId) : '',
    }
  }

  /**
   * 按 id 取 live session。子智能体事件（`subagent/end`）只给 id，不带 session 对象，
   * 而标题需要 header.cwd —— 只能回头问 sessions 服务。拿不到就返回 undefined，
   * 所有调用方都必须容忍（用 `titleOf(undefined, ...)` 的兜底路径）。
   */
  function liveSession(sessionId) {
    if (typeof sessionId !== 'string' || sessionId === '') return undefined
    let sessions = null
    try {
      sessions = typeof ctx.get === 'function' ? ctx.get('sessions') : undefined
    } catch { sessions = undefined }
    if (sessions === null || sessions === undefined || typeof sessions.get !== 'function') return undefined
    try {
      return sessions.get(sessionId) ?? undefined
    } catch {
      return undefined
    }
  }

  /**
   * 尝试从 sessionTitle 服务回填标题缓存。
   *
   * HMR 重载后 state.titles 被清空，而 session/title 事件不会重发——
   * 标题只在变更时发一次。所以每次拿到 live session 时，如果缓存里
   * 没有这个会话的标题，就问 sessionTitle 服务要一次。
   */
  function backfillTitle(session) {
    const id = sessionIdOf(session)
    if (id === '' || state.titles.has(id)) return
    let service = null
    try {
      service = typeof ctx.get === 'function' ? ctx.get('sessionTitle') : undefined
    } catch { service = undefined }
    if (service === null || service === undefined || typeof service.get !== 'function') return
    try {
      const snapshot = service.get(session)
      const title = snapshot !== null && typeof snapshot === 'object' && typeof snapshot.title === 'string' ? snapshot.title.trim() : ''
      if (title !== '') {
        state.titles.set(id, title)
        if (state.titles.size > TITLE_LIMIT) {
          const oldest = state.titles.keys().next()
          if (oldest.done !== true) state.titles.delete(oldest.value)
        }
      }
    } catch { /* session 已释放或服务不可用，静默跳过 */ }
  }

  function loadConfig() {
    const stored = readJson(configFile())
    state.config = normalizeConfig(stored)
  }

  function saveConfig(next) {
    state.config = normalizeConfig(next)
    try {
      writeJsonAtomic(configFile(), state.config)
    } catch (cause) {
      warn('写配置失败：' + messageOf(cause))
    }
    trim()
    schedulePersist()
    return state.config
  }

  function loadQueue() {
    const stored = readJson(queueFile())
    if (stored === null) return
    const items = Array.isArray(stored.items) ? stored.items : []
    state.seq = Number.isSafeInteger(stored.seq) && stored.seq >= 0 ? stored.seq : 0
    state.items = items.filter((item) => {
      if (item === null || typeof item !== 'object') return false
      if (typeof item.id !== 'string' || item.id === '') return false
      if (typeof item.kind !== 'string' || KIND_INDEX.has(item.kind) === false) return false
      if (typeof item.createdAt !== 'number') return false
      const meta = KIND_INDEX.get(item.kind)
      // 老队列没有 status / workspace（那时 title 存的是场景 label）。这里补一次，
      // 不然后台升级后历史条目会显示成「会话完成 / 会话完成」这种重复。
      if (typeof item.status !== 'string' || item.status === '') item.status = meta.label
      if (typeof item.workspace !== 'string') {
        item.workspace = clip(workspaceOf(undefined, state.workspaces, typeof item.sessionId === 'string' ? item.sessionId : ''), 80)
      }
      if (typeof item.title !== 'string' || item.title === '' || item.title === meta.label) {
        item.title = composeTitle(item.workspace, typeof item.sessionTitle === 'string' ? item.sessionTitle : '', meta.label)
      }
      return true
    })
    trim()
  }

  /**
   * 最近是否已经为同一个去重键发过一条通知（精确匹配或前缀匹配）。
   *
   * 审批和提问各有两个来源（waterfall 事件 + 持久化的 session 事件），同一次
   * 请求会被两边都看到。这个函数让「第二个来源」闭嘴，只用来补全正文，不重复弹。
   *
   * prefix 为 true 时按 startsWith 匹配：model-error 的键带 step 号，
   * 而 turn/end 的 error 分支拿不到 step，只能用 session+turn 前缀去撞。
   */
  function alreadyNotified(dedupeKey, windowMs = 8000, prefix = false) {
    if (typeof dedupeKey !== 'string' || dedupeKey === '') return false
    const now = Date.now()
    return state.items.some((item) => {
      if (now - (Number(item.createdAt) || 0) > windowMs) return false
      return prefix ? item.dedupeKey.startsWith(dedupeKey) : item.dedupeKey === dedupeKey
    })
  }

  // ── 入队 ──────────────────────────────────────────────────────
  function push(entry) {
    const config = state.config
    if (config.enabled === false) return null
    if (config.kinds[entry.kind] === false) return null
    const meta = metaOf(entry.kind)
    const now = Date.now()
    const dedupeKey = typeof entry.dedupeKey === 'string' ? entry.dedupeKey : ''
    if (dedupeKey !== '') {
      const windowMs = Math.max(0, Number(config.dedupeMs) || 0)
      const hit = state.items.find((item) => item.dedupeKey === dedupeKey && item.read !== true && now - (Number(item.createdAt) || 0) <= windowMs)
      if (hit !== undefined) {
        hit.count = (Number(hit.count) || 1) + 1
        hit.createdAt = now
        hit.body = clip(entry.body)
        if (typeof entry.detail === 'string' && entry.detail !== '') hit.detail = clip(entry.detail, 600)
        schedulePersist()
        return hit
      }
    }
    state.seq += 1
    const sessionIdOfEntry = typeof entry.sessionId === 'string' ? entry.sessionId : ''
    const sessionTitle = typeof entry.sessionTitle === 'string' ? clip(entry.sessionTitle, 80) : ''
    const workspace = typeof entry.workspace === 'string'
      ? clip(entry.workspace, 80)
      : clip(workspaceOf(undefined, state.workspaces, sessionIdOfEntry), 80)
    const item = {
      id: 'n' + state.seq,
      kind: entry.kind,
      level: meta.level,
      // `status` 是「原因」——通知的副标题 / 面板里的徽章，始终取场景目录的 label，
      // 不受调用方影响，这样 16 种场景的措辞在面板里永远一致。
      status: meta.label,
      // `title` 是「谁」——工作区 / 会话。用户要的顺序是「先标题，后原因」。
      title: entry.title !== undefined && entry.title !== '' ? clip(entry.title, 80) : composeTitle(workspace, sessionTitle, meta.label),
      workspace,
      body: clip(entry.body),
      detail: typeof entry.detail === 'string' ? clip(entry.detail, 600) : '',
      sessionId: sessionIdOfEntry,
      sessionTitle,
      dedupeKey,
      count: 1,
      createdAt: now,
      read: false,
    }
    state.items.unshift(item)
    trim()
    schedulePersist()
    deliverNative(item)
    return item
  }

  const unreadCount = () => state.items.reduce((total, item) => (item.read === true ? total : total + 1), 0)

  // ── 系统（应用级）通知 ────────────────────────────────────────
  // 只有「新条目」才发，去重合并（count+1）不发：模型重试 4 次只该响一次。
  // 全程异步、不 await、失败只记日志——turn/end 的监听器里同步等子进程会把
  // 整个 agent 卡住。
  function deliverNative(item) {
    // 默认关闭：前端的 Notification 才是主通道。这里一旦打开，每条通知都会
    // 多弹一条（因为 Host 看不到前端到底弹没弹），只有在前端通道不可用时才值得开。
    if (state.config.native?.enabled !== true) return
    // 和前端通道保持一致的信息顺序：标题（工作区 / 会话）+ 副标题（场景）+ 正文（明细）。
    // 两条通道措辞不一样会让人以为是两件事。
    const status = typeof item.status === 'string' ? item.status : ''
    const detail = typeof item.body === 'string' ? item.body : ''
    Promise.resolve()
      .then(() => sendNative({
        title: item.title,
        body: status === '' ? detail : detail === '' ? status : status + ' · ' + detail,
        subtitle: typeof item.workspace === 'string' ? item.workspace : '',
        level: item.level,
        sound: state.config.native?.sound !== false,
      }))
      .then((result) => {
        if (result.ok === true) {
          state.nativeOk += 1
          state.nativeChannel = result.channel !== undefined ? result.channel : state.nativeChannel
          return
        }
        // 只记一次日志：这条通道不可用时，每条通知都刷一遍日志会把终端刷满。
        if (state.nativeWarned === false) {
          state.nativeWarned = true
          warn('系统通知不可用（' + (result.reason !== undefined ? result.reason : 'unknown') + '）：' + (result.message !== undefined ? result.message : '') + '；站内通知不受影响')
        }
      }, (cause) => {
        if (state.nativeWarned === false) {
          state.nativeWarned = true
          warn('系统通知投递异常：' + messageOf(cause))
        }
      })
  }

  async function nativeStatus() {
    const info = await probeNative()
    return {
      supported: info.supported === true,
      platform: info.platform !== undefined ? info.platform : process.platform,
      channel: info.channel !== undefined ? info.channel : 'none',
      reason: info.reason !== undefined ? info.reason : '',
      enabled: state.config.native?.enabled === true,
      sound: state.config.native?.sound !== false,
      sent: state.nativeOk,
    }
  }


  // 为什么要 `{ global: true }`：
  //   DSH 的 agent 事件是通过 scope 载体分发的（dsh-scope 的 scopeTarget），
  //   dispatch 时 filter 会检查 listener 所属 ctx 的 scope 标签——只有标签在
  //   目标 key 的祖先链上才放行。本 bundle 挂在 loader 根上下文上，标签是
  //   undefined，理论上会被 scopeTarget 的 `tag === undefined → true` 放行，
  //   但依赖这个隐含分支太脆（内置组件里就有显式传 global 的写法）。
  //   显式写上 global 才是契约：无论将来 bundle 被装到哪个子上下文，都能收到。

  /** 包装 emit 监听器：任何异常都只记日志，绝不冒到事件分发里去。 */
  const safe = (run) => function guarded(...args) {
    try {
      run.apply(this, args)
    } catch (cause) {
      warn('监听器异常：' + messageOf(cause))
    }
  }

  /** 包装 waterfall 监听器：先跑自己的逻辑，**无论如何**把 next() 交回去。 */
  const safeNext = (run) => function guarded(...args) {
    const next = args.length > 0 && typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined
    try {
      run.apply(this, args)
    } catch (cause) {
      warn('监听器异常：' + messageOf(cause))
    }
    return typeof next === 'function' ? next() : undefined
  }

  // ── 事件监听 ──────────────────────────────────────────────────
  function attach() {
    // 会话内事件：标题缓存 + 回合结束（完成 / 出错 / 截断 / 阻断 / 中断）。
    ctx.effect(() => ctx.on('session/event', safe((session, event) => {
      if (event === null || typeof event !== 'object') return
      // 任何一条会话事件都顺手记身份（工作区 / 父会话 / origin）。子智能体的
      // 子会话也会走到这里，而 subagent/end 只给一个裸 id——身份只能靠现在记。
      rememberSession(session)
      backfillTitle(session)
      if (event.type === 'session/title') {
        const data = event.data
        const title = data !== null && typeof data === 'object' && typeof data.title === 'string' ? data.title.trim() : ''
        const id = sessionIdOf(session)
        if (title !== '' && id !== '') {
          state.titles.delete(id)
          state.titles.set(id, title)
          if (state.titles.size > TITLE_LIMIT) {
            const oldest = state.titles.keys().next()
            if (oldest.done !== true) state.titles.delete(oldest.value)
          }
        }
        return
      }
      // ── 审批的兜底来源 ────────────────────────────────────────
      // 审批正常由 `approval/request` waterfall 通知，但那条链会被 api-remotes
      // 的转发桥短路（浏览器一作答就不再 next()），而审批策略是 `never` 时
      // `ApprovalService.decide()` 更是直接 return 'rejected'、连 waterfall 都不
      // dispatch。这两种情况下监听器一次都不执行，通知就永久缺失。
      //
      // `approval/asked` 是审批**持久化**进会话的事件（`session.append` 时派发
      // session/event），与 waterfall 的注册顺序无关，所以拿它兜底最稳。它只有
      // id / toolName / callId / reason，没有 displayReason——所以正文用原始
      // reason，宁可糙一点也不能漏。
      if (event.type === 'approval/asked') {
        const data = event.data !== null && typeof event.data === 'object' ? event.data : {}
        const sessionId = sessionIdOf(session)
        if (sessionId === '') return
        const identity = identityOf(sessionId)
        const toolName = typeof data.toolName === 'string' && data.toolName !== '' ? data.toolName : '工具'
        const reason = typeof data.reason === 'string' ? clip(data.reason) : ''
        push({
          kind: 'approval-required',
          body: reason === '' ? '工具 ' + toolName + ' 在等你批准' : '工具 ' + toolName + ' 在等你批准：' + reason,
          detail: typeof data.callId === 'string' ? '调用 ' + data.callId : '',
          sessionId,
          sessionTitle: identity.sessionTitle,
          workspace: identity.workspace,
          // 与 waterfall 侧用**同一个**去重键：两条来源看到的是同一次审批，
          // 后到的那条只会合并计数、不会重复弹一次（waterfall 的 displayReason
          // 更漂亮，合并时正好把正文换掉）。
          dedupeKey: 'approval:' + sessionId + ':' + toolName,
        })
        return
      }

      // ── 提问的兜底来源 ────────────────────────────────────────
      // 提问**没有**任何专属的持久化事件（`KNOWN_SESSION_EVENT_TYPES` 里没有
      // user-question* 之类），只能从工具调用里认：`ask_user_question` 的
      // `tool/call`。`arguments` 是 JSON 字符串，得自己 parse。
      // 计划审批（plan-mode 的 `exit_plan_mode`）走的是同一个工具，靠
      // `questions[0].intent.kind === 'plan-review'` 区分。
      if (event.type === 'tool/call') {
        const data = event.data !== null && typeof event.data === 'object' ? event.data : {}
        if (data.name !== 'ask_user_question') return
        const callId = typeof data.callId === 'string' ? data.callId : ''
        const sessionId = sessionIdOf(session)
        if (sessionId === '') return
        if (callId !== '' && alreadyNotified('question-call:' + sessionId + ':' + callId)) return
        let questions = []
        if (typeof data.arguments === 'string' && data.arguments.trim() !== '') {
          try {
            const parsed = JSON.parse(data.arguments)
            if (parsed !== null && typeof parsed === 'object' && Array.isArray(parsed.questions)) questions = parsed.questions
          } catch { questions = [] }
        }
        if (questions.length === 0) return
        const first = questions[0] !== null && typeof questions[0] === 'object' ? questions[0] : {}
        const intent = first.intent !== null && typeof first.intent === 'object' ? first.intent : {}
        const isPlan = typeof intent.kind === 'string' && intent.kind === 'plan-review'
        const identity = identityOf(sessionId)
        const question = typeof first.question === 'string' ? clip(first.question, 160) : ''
        push({
          kind: isPlan ? 'plan-review' : 'question-required',
          body: questions.length > 1
            ? '共 ' + questions.length + ' 项在等你，第一项：' + question
            : question === '' ? '有一个问题在等你回答' : question,
          detail: typeof first.header === 'string' && first.header !== '' ? first.header : '',
          sessionId,
          sessionTitle: identity.sessionTitle,
          workspace: identity.workspace,
          dedupeKey: 'question-call:' + sessionId + ':' + callId,
        })
        return
      }

      if (event.type !== 'turn/end') return
      const header = session !== null && typeof session === 'object' && session.header !== null && typeof session.header === 'object'
        ? session.header
        : {}
      // 子会话的回合结束由 subagent/end 覆盖，否则一次子智能体完成会通知两遍。
      if (header.origin === 'subagent') return
      const data = event.data !== null && typeof event.data === 'object' ? event.data : {}
      const turn = Number.isSafeInteger(data.turn) ? data.turn : 0
      const reason = data.reason !== null && typeof data.reason === 'object' ? data.reason : {}
      const kindOfReason = typeof reason.kind === 'string' ? reason.kind : ''
      const sessionId = sessionIdOf(session)
      const sessionTitle = titleOf(session, state.titles, sessionId)
      const workspace = workspaceOf(session, state.workspaces, sessionId)
      const turnLabel = turn > 0 ? '第 ' + turn + ' 轮' : '本轮'

      if (kindOfReason === 'completed') {
        push({
          kind: 'turn-completed',
          body: turnLabel + '已回复完成',
          workspace,
          sessionId,
          sessionTitle,
          // 同一会话同一轮只可能是同一次完成，键里带 turn 避免跨轮合并。
          dedupeKey: 'turn-completed:' + sessionId + ':' + turn,
        })
        return
      }
      if (kindOfReason === 'error') {
        const failure = reason.error !== null && typeof reason.error === 'object' ? reason.error : {}
        const message = clip(messageOf(failure.message !== undefined ? failure.message : failure), 160)
        const code = typeof failure.code === 'string' && failure.code !== '' ? failure.code : ''
        // 模型请求失败已经由 agent/request-error 报过 model-error（带 provider、错误码、重试策略），
        // 这里的 turn-error 只是「这一轮挂了」的重复，没有新信息，跳过。
        if (alreadyNotified('model-error:' + sessionId + ':' + turn + ':', 8000, true)) return
        push({
          kind: 'turn-error',
          body: turnLabel + '失败：' + (message === '' ? '未知错误' : message),
          detail: code === '' ? '' : '错误码：' + code + (failure.status !== undefined ? ' · HTTP ' + failure.status : ''),
          workspace,
          sessionId,
          sessionTitle,
          dedupeKey: 'turn-error:' + sessionId + ':' + turn,
        })
        return
      }
      if (kindOfReason === 'max-tokens') {
        push({
          kind: 'turn-max-tokens',
          body: turnLabel + '达到输出上限，回复没写完',
          workspace,
          sessionId,
          sessionTitle,
          dedupeKey: 'turn-max-tokens:' + sessionId + ':' + turn,
        })
        return
      }
      if (kindOfReason === 'blocked') {
        push({
          kind: 'turn-blocked',
          body: turnLabel + '被拦下了（审批被拒或工具拒绝执行）',
          workspace,
          sessionId,
          sessionTitle,
          dedupeKey: 'turn-blocked:' + sessionId + ':' + turn,
        })
        return
      }
      if (kindOfReason === 'aborted' || kindOfReason === 'interrupted') {
        const inner = reason.reason !== null && typeof reason.reason === 'object' ? reason.reason : {}
        const causeKind = typeof inner.kind === 'string' ? inner.kind : 'legacy'
        const byWhom = causeKind === 'user' ? '你' : causeKind === 'parent' ? '父会话' : causeKind === 'disposed' ? '会话关闭' : '系统'
        push({
          kind: 'turn-aborted',
          body: turnLabel + '被' + byWhom + '取消',
          workspace,
          sessionId,
          sessionTitle,
          dedupeKey: 'turn-aborted:' + sessionId + ':' + turn,
        })
      }
    }), { global: true }), 'notifications: session events')

    // 需要权限：waterfall，通知后必须把 next() 交回去，否则等于悄悄拒绝。
    //
    // `prepend` 不是性能优化，是正确性要求。cordis 的 waterfall 是一条链表
    // （`waterfall()` 里 `const cbs = this.dispatch(...)`，注册顺序即执行顺序，
    // 先注册者在外层先跑），而 `dsh-api-remotes` 把 `approval/request` 转发到
    // 浏览器后，一旦拿到答案就直接 resolve、**不再调用 next()**。它排在我们
    // 前面时，我们的监听器一次都不会执行——真机上「审批卡片明明弹了，通知里
    // 却一条 approval-required 都没有」就是这么来的。unshift 到最外层、处理完
    // 照常 `return next()`（safeNext 保证），转发桥才轮得到。
    ctx.effect(() => ctx.on('approval/request', safeNext((req) => {
      if (req === null || typeof req !== 'object') return
      const agent = req.agent
      const sessionId = agentIdOf(agent)
      const identity = identityOf(sessionId)
      const toolName = typeof req.toolName === 'string' && req.toolName !== '' ? req.toolName : '工具'
      const reason = displayReasonOf(req)
      const extra = reason !== '' ? reason : typeof req.reason === 'string' ? req.reason : ''
      push({
        kind: 'approval-required',
        body: extra === '' ? '工具 ' + toolName + ' 在等你批准' : '工具 ' + toolName + ' 在等你批准：' + clip(extra),
        detail: typeof req.callId === 'string' ? '调用 ' + req.callId : '',
        sessionId,
        sessionTitle: identity.sessionTitle,
        workspace: identity.workspace,
        dedupeKey: 'approval:' + sessionId + ':' + toolName,
      })
    }), { global: true, prepend: true }), 'notifications: approval')

    // 需要用户作答 / 计划审批：同样是 waterfall，同样必须 next()。
    // 同样 prepend：`user-questions/request` 也在 api-remotes 的转发白名单里，
    // 理由与上面 approval 完全一致——真机上「选项卡片弹了但没有通知」就是被
    // 转发桥短路掉了。计划审批（`intent.kind === 'plan-review'`）也走这条。
    ctx.effect(() => ctx.on('user-questions/request', safeNext((request) => {
      if (request === null || typeof request !== 'object') return
      const questions = Array.isArray(request.questions) ? request.questions : []
      if (questions.length === 0) return
      const agent = request.agent
      const sessionId = agentIdOf(agent)
      const identity = identityOf(sessionId)
      const first = questions[0] !== null && typeof questions[0] === 'object' ? questions[0] : {}
      const question = typeof first.question === 'string' ? clip(first.question, 160) : ''
      const intent = first.intent !== null && typeof first.intent === 'object' ? first.intent : {}
      const isPlan = typeof intent.kind === 'string' && intent.kind === 'plan-review'
      const body = questions.length > 1
        ? '共 ' + questions.length + ' 项在等你，第一项：' + question
        : question === '' ? '有一个问题在等你回答' : question
      push({
        kind: isPlan ? 'plan-review' : 'question-required',
        body,
        detail: typeof first.header === 'string' && first.header !== '' ? first.header : '',
        sessionId,
        sessionTitle: identity.sessionTitle,
        workspace: identity.workspace,
        dedupeKey: (isPlan ? 'plan:' : 'question:') + sessionId + ':' + (typeof first.id === 'string' ? first.id : ''),
      })
    }), { global: true, prepend: true }), 'notifications: questions')

    // 模型请求失败：只读监听，绝不返回 { kind: 'retry' } 去抢恢复逻辑。
    // 同一次请求失败会被重试策略重复触发，所以按 session + turn + step 去重。
    ctx.effect(() => ctx.on('agent/request-error', safeNext((payload) => {
      if (payload === null || typeof payload !== 'object') return
      const sessionId = agentIdOf(payload.agent)
      const identity = identityOf(sessionId)
      const failure = payload.failure !== null && typeof payload.failure === 'object' ? payload.failure : {}
      const provider = typeof payload.provider === 'string' && payload.provider !== '' ? payload.provider : '模型'
      const message = clip(messageOf(failure.message), 160)
      const code = typeof failure.code === 'string' && failure.code !== '' ? failure.code : ''
      const retry = payload.retryPolicy !== null && typeof payload.retryPolicy === 'object' ? payload.retryPolicy : undefined
      const details = []
      if (code !== '') details.push('错误码 ' + code)
      if (failure.status !== undefined) details.push('HTTP ' + failure.status)
      if (retry !== undefined) details.push('策略 ' + (typeof retry.maxRetries === 'number' ? '最多重试 ' + retry.maxRetries + ' 次' : '有重试'))
      push({
        kind: 'model-error',
        body: provider + '：' + (message === '' ? '没有错误详情' : message),
        detail: details.join(' · '),
        sessionId,
        sessionTitle: identity.sessionTitle,
        workspace: identity.workspace,
        dedupeKey: 'model-error:' + sessionId + ':' + (payload.turn || 0) + ':' + (payload.step || 0),
      })
    }), { global: true }), 'notifications: model errors')

    // 步骤级异常：emit 后 DSH 必然会抛，和 turn-error 高度重合，所以默认关闭。
    ctx.effect(() => ctx.on('agent/error', safe((payload) => {
      if (payload === null || typeof payload !== 'object') return
      const sessionId = agentIdOf(payload.agent)
      const identity = identityOf(sessionId)
      push({
        kind: 'agent-error',
        body: '第 ' + (payload.turn || 0) + ' 轮第 ' + (payload.step || 0) + ' 步出错：' + clip(messageOf(payload.error), 160),
        sessionId,
        sessionTitle: identity.sessionTitle,
        workspace: identity.workspace,
        dedupeKey: 'agent-error:' + sessionId + ':' + (payload.turn || 0) + ':' + (payload.step || 0),
      })
    }), { global: true }), 'notifications: agent errors')

    // 子智能体：stopReason 决定是「完成 / 失败 / 中断」。
    ctx.effect(() => ctx.on('subagent/end', safe((info) => {
      if (info === null || typeof info !== 'object') return
      const stopReason = typeof info.stopReason === 'string' ? info.stopReason : 'completed'
      const sessionId = typeof info.id === 'string' ? info.id : String(info.id || '')
      const provider = typeof info.provider === 'string' && info.provider !== '' ? info.provider : '子智能体'
      const identity = identityOf(sessionId)
      // 正文里点名是哪个子智能体，这样「标题=哪个工区哪个会话」之外还能看出是哪一个。
      const who = identity.childName === '' ? '子智能体' : '子智能体「' + identity.childName + '」'
      const said = clip(lastTextOf(info.lastAssistantMessage), 160)
      const suffix = said === '' ? '' : '：' + said
      const base = {
        sessionId,
        sessionTitle: identity.sessionTitle,
        workspace: identity.workspace,
        dedupeKey: 'subagent:' + (typeof info.runId === 'string' ? info.runId : sessionId),
        detail: 'provider ' + provider + (info.local === true ? ' · 本地会话' : ''),
      }
      if (stopReason === 'completed') {
        push({ ...base, kind: 'subagent-completed', body: who + '已完成' + suffix })
        return
      }
      if (stopReason === 'aborted') {
        push({ ...base, kind: 'subagent-stopped', body: who + '被中断' + suffix })
        return
      }
      const label = stopReason === 'error' ? '报错' : stopReason === 'max-tokens' ? '输出超长' : stopReason === 'refusal' ? '拒绝执行' : stopReason
      push({ ...base, kind: 'subagent-failed', body: who + label + suffix })
    }), { global: true }), 'notifications: subagents')

    // 上下文压缩失败：waterfall，同样必须 next()。
    ctx.effect(() => ctx.on('compaction/summary-error', safeNext((payload) => {
      if (payload === null || typeof payload !== 'object') return
      const sessionId = sessionIdOf(payload.session)
      const count = Array.isArray(payload.sourceEventSeqs) ? payload.sourceEventSeqs.length : 0
      push({
        kind: 'compaction-error',
        body: '上下文压缩没完成：' + clip(messageOf(payload.error), 160),
        detail: count > 0 ? '涉及 ' + count + ' 条源事件，长会话可能受影响' : '',
        sessionId,
        sessionTitle: titleOf(payload.session, state.titles, sessionId),
        dedupeKey: 'compaction:' + sessionId,
      })
    }), { global: true }), 'notifications: compaction')

    // 会话配置解析失败：模型根本没起来，这是最需要人管的失败之一。
    ctx.effect(() => ctx.on('agent-loop/config-start-failed', safe((payload) => {
      if (payload === null || typeof payload !== 'object') return
      const sessionId = payload.sessionId === undefined || payload.sessionId === null ? '' : String(payload.sessionId)
      const identity = identityOf(sessionId)
      push({
        kind: 'config-error',
        body: '会话配置没能生效：' + clip(messageOf(payload.error), 200),
        sessionId,
        sessionTitle: identity.sessionTitle,
        workspace: identity.workspace,
        dedupeKey: 'config-error:' + sessionId,
      })
    }), { global: true }), 'notifications: config failures')

    // 账号凭据被服务端拒绝：整台机器上所有会话都会受影响。
    ctx.effect(() => ctx.on('deepseek-account/session-expired', safe(() => {
      push({
        kind: 'account-expired',
        body: '服务端拒绝了当前登录状态，需要重新登录后才能继续对话',
        dedupeKey: 'account-expired',
      })
    }), { global: true }), 'notifications: account')
  }

  // ── 路由 ──────────────────────────────────────────────────────
  function describeKinds() {
    return KINDS.map((kind) => ({
      id: kind.id,
      label: kind.label,
      level: kind.level,
      hint: kind.hint,
      enabled: state.config.kinds[kind.id] !== false,
    }))
  }

  function snapshot(query) {
    const now = Date.now()
    const since = Number(query.get('since'))
    const limitRaw = Number(query.get('limit'))
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(1000, Math.round(limitRaw)) : 300
    const unreadOnly = query.get('unread') === '1' || query.get('unread') === 'true'
    let items = state.items
    if (Number.isFinite(since) && since > 0) items = items.filter((item) => (Number(item.createdAt) || 0) > since)
    if (unreadOnly) items = items.filter((item) => item.read !== true)
    items = items.slice(0, limit)
    return {
      ok: true,
      now,
      unread: unreadCount(),
      total: state.items.length,
      items,
      kinds: describeKinds(),
      config: state.config,
      native: {
        supported: state.nativeSupported,
        platform: state.nativePlatform,
        channel: state.nativeChannel,
        reason: state.nativeReason,
        enabled: state.config.native?.enabled === true,
        sound: state.config.native?.sound !== false,
        sent: state.nativeOk,
      },
      focused: state.windowFocused === true,
      files: { config: configFile(), queue: queueFile() },
    }
  }

  async function onGet(request) {
    try {
      const url = new URL(request.url)
      return json(snapshot(url.searchParams))
    } catch (cause) {
      return json({ ok: false, code: 'notifications/list-failed', message: messageOf(cause) }, 500)
    }
  }

  async function onPost(request) {
    let body
    try {
      body = await request.json()
    } catch (cause) {
      return json({ ok: false, code: 'notifications/bad-json', message: '请求体不是合法 JSON' }, 400)
    }
    if (body === null || typeof body !== 'object') {
      return json({ ok: false, code: 'notifications/bad-json', message: '请求体必须是对象' }, 400)
    }
    const action = typeof body.action === 'string' ? body.action : ''
    try {
      if (action === 'read') {
        const ids = Array.isArray(body.ids) ? new Set(body.ids.map((id) => String(id))) : null
        let changed = 0
        for (const item of state.items) {
          if (item.read === true) continue
          if (ids !== null && ids.has(item.id) === false) continue
          item.read = true
          changed += 1
        }
        if (changed > 0) schedulePersist()
        return json({ ok: true, changed, unread: unreadCount() })
      }
      if (action === 'readAll') {
        let changed = 0
        for (const item of state.items) {
          if (item.read === true) continue
          item.read = true
          changed += 1
        }
        if (changed > 0) schedulePersist()
        return json({ ok: true, changed, unread: unreadCount() })
      }
      if (action === 'clear') {
        // 清空已读：给「已经处理完的通知」留个出口，未读的一条不删。
        const before = state.items.length
        state.items = state.items.filter((item) => item.read !== true)
        if (state.items.length !== before) schedulePersist()
        return json({ ok: true, removed: before - state.items.length, unread: unreadCount() })
      }
      if (action === 'clearAll') {
        const before = state.items.length
        state.items = []
        if (before > 0) schedulePersist()
        return json({ ok: true, removed: before, unread: 0 })
      }
      if (action === 'config') {
        const patch = body.config !== null && typeof body.config === 'object' ? body.config : {}
        const merged = normalizeConfig({
          ...state.config,
          ...patch,
          kinds: { ...state.config.kinds, ...(patch.kinds !== null && typeof patch.kinds === 'object' ? patch.kinds : {}) },
        })
        const saved = saveConfig(merged)
        return json({ ok: true, config: saved, kinds: describeKinds() })
      }
      if (action === 'test') {
        const item = push({
          kind: 'turn-completed',
          title: '测试通知',
          body: '这条是手动触发的测试通知，用来确认「Host 记录 → 前端显示 → 系统通知」整条链路是通的。',
          sessionTitle: 'dsh-toolkit',
          dedupeKey: '',
        })
        if (item === null) {
          return json({
            ok: false,
            code: 'notifications/disabled',
            message: '通知总开关或「会话完成」场景是关闭的，先打开再试',
          }, 409)
        }
        return json({ ok: true, item, unread: unreadCount() })
      }
      if (action === 'focus') {
        // 保留这个动作只为兼容旧前端与自检：前台状态已经不再影响任何投递决策。
        state.windowFocused = body.focused === true
        return json({ ok: true, focused: state.windowFocused })
      }
      if (action === 'native-test') {
        const info = await probeNative()
        if (info.supported !== true) {
          return json({
            ok: false,
            code: 'notifications/native-unavailable',
            message: '当前平台没有可用的系统通知通道（' + (info.reason !== undefined ? info.reason : 'unknown') + '）',
            native: { supported: false, platform: info.platform, channel: info.channel },
          }, 409)
        }
        const result = await sendNative({
          title: 'DSH 系统通知测试',
          body: '看到这条说明应用级通知已经打通：即使 DSH 窗口在后面，也能收到。',
          subtitle: 'dsh-toolkit / notifications',
          level: 'info',
          sound: state.config.native?.sound !== false,
        })
        if (result.ok !== true) {
          return json({
            ok: false,
            code: 'notifications/native-failed',
            message: '系统通知发送失败：' + (result.reason !== undefined ? result.reason : 'unknown') + (result.message !== undefined && result.message !== '' ? '（' + result.message + '）' : ''),
            native: { supported: true, platform: info.platform, channel: info.channel },
          }, 502)
        }
        state.nativeOk += 1
        state.nativeChannel = result.channel !== undefined ? result.channel : state.nativeChannel
        return json({ ok: true, native: await nativeStatus() })
      }
      if (action === 'open-settings') {
        // 「为什么我没收到通知」的最后一公里：把用户直接送到系统通知设置页。
        // 引导不动的两件事只能用户自己改——开关、以及「提醒样式」是不是横幅。
        const result = await openNativeSettings()
        if (result.ok !== true) {
          return json({
            ok: false,
            code: 'notifications/settings-unavailable',
            message: '打不开系统设置：' + (result.reason !== undefined ? result.reason : 'unknown') + (result.message !== undefined && result.message !== '' ? '（' + result.message + '）' : ''),
          }, 502)
        }
        return json({ ok: true, channel: result.channel })
      }
      return json({ ok: false, code: 'notifications/unknown-action', message: '未知动作：' + (action || '(空)') }, 400)
    } catch (cause) {
      return json({ ok: false, code: 'notifications/action-failed', message: messageOf(cause) }, 500)
    }
  }

  function registerRoutes() {
    ctx.effect(() => {
      let dispose
      const attempt = (remaining) => {
        try {
          dispose = ctx.connection.fetch.register({
            path: '/api/notifications',
            methods: ['GET', 'POST'],
            requestBody: 'buffered',
            fetch: (request) => (request.method === 'POST' ? onPost(request) : onGet(request)),
          })
          return true
        } catch (cause) {
          const message = String(cause?.message || cause)
          if (remaining > 0 && message.includes('already registered')) {
            ctx.timeout(() => {
              if (dispose === undefined) attempt(remaining - 1)
            }, 400)
            return false
          }
          warn('注册 /api/notifications 失败：' + message)
          return false
        }
      }
      attempt(10)
      return () => {
        if (dispose !== undefined) dispose()
      }
    }, 'notifications: /api/notifications')
  }

  // ── 启动 ──────────────────────────────────────────────────────
  loadConfig()
  loadQueue()
  attach()
  registerRoutes()
  // 系统通知能力探测放在后台跑：osascript 冷启动 ~100ms，不该挡住宿主启动。
  Promise.resolve().then(() => probeNative()).then((info) => {
    state.nativeSupported = info.supported === true
    state.nativePlatform = info.platform !== undefined ? info.platform : process.platform
    state.nativeChannel = info.channel !== undefined ? info.channel : 'none'
    state.nativeReason = info.reason !== undefined ? info.reason : ''
  }, (cause) => {
    state.nativeReason = 'probe-failed'
    warn('探测系统通知通道失败：' + messageOf(cause))
  })

  ctx.effect(() => () => {
    if (state.persistTimer !== null) {
      clearTimeout(state.persistTimer)
      state.persistTimer = null
    }
    if (state.pendingPersist === true) persistNow()
    state.titles.clear()
  }, 'notifications: cleanup')
}
