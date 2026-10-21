// components/mcp/host.js — MCP 管理（Host 侧）
//
// DSH 里每个 MCP server 都是一个 `@deepseek-ai/dsh-mcp-client` 插件实例，多 server 靠
// profile 的 cordis.patch.yml 里多条 insert 承载。官方**没有**任何图形化入口，也没有可用的
// 写通道：
//   - settings.mutate 走不了：mcp-client 的 Config 是 z.union([stdio, streamable-http])，
//     源码里没有 volatile 标记，settings.describe() 对这些条目直接返回 []，mutate 抛
//     `Plugin entry "<ns>" has no volatile fields`（model-test 能写 llm-pi-ai 正是因为那个
//     schema 标了 volatile）。
//   - configEditor.edit(entry, change) 只能改**已存在** entry 的 config，不能新增/删除。
//   - pluginManager.setPluginEnabled 只能翻 disabled，写不了 config。
// 所以增删改启停全部由本组件自己操作 YAML。
//
// 为什么可以安全地自己改 YAML：用 yaml 的 parseDocument 并注册 `!!js` 自定义标签
// （tag:yaml.org,2002:js，resolve 原样返回），对该文件可做到**字节级往返** —— 已在真实
// profile（36493 字节、21 个顶层 item、14 处 !!js、7 处块标量、大量注释）上实测：
//   parseDocument(before) → String(doc) === before（完全一致）；
//   新增条目后再删掉它，结果同样与原文逐字节相同。
// 这正是官方 config-editor / plugin-manager 内部用的同一套姿势。
//
// 写文件流程与官方一致：withFileLock(<profile>/package.json) 锁住整个 profile →
// writeFileAtomic(patchPath, String(doc), { mode: 0o600 }) 原子替换 → 重新 parseDocument
// 校验 errors 为 0。写完调 hmr.runExclusive(() => reconcileProfile()) 热更；hmr 不在时
// 降级为「需重启生效」（hmr 本身也 watch 这个文件，不显式调用最终也会生效，只是拿不到 warnings）。
//
// 安全：
//   - 路由只接受 patch 条目 id，**不接受任何文件路径**；patchPath 一律来自 profileContext。
//   - env / headers 里的密钥默认脱敏（前 4 位 + …），要原文必须显式 reveal=1。
//   - 探活是「另起一条一次性 MCP 连接」，不碰运行中的实例；20 秒硬超时，finally 关 transport。
//
// 依赖：本文件**不能**直接 import 'yaml' / '@modelcontextprotocol/client' /
// '@deepseek-ai/dsh-atomic-write'。插件被 link 安装到 profile 的 node_modules，ESM 从真实
// 路径向上解析不到这些包（裸 import 必 ERR_MODULE_NOT_FOUND）。全部走 createRequire 锚到
// profile 的 package.json 惰性解析；解析不到只降级，不抛。

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

export const name = 'mcp'
export const inject = ['connection', 'timer']

/** 提供 MCP server 的插件名。patch 里 `name` 等于这个值的条目就是一条 MCP server。 */
const MCP_CLIENT_MODULE = '@deepseek-ai/dsh-mcp-client'

/** 工具名前缀：运行时的公开工具名是 `mcp__<serverName>__<rawName>`。 */
const TOOL_PREFIX = 'mcp__'

/** DeepSeek function-name 上限：超长或含非法字符时官方会截断并追加 12 位 SHA-256。 */
const FUNCTION_NAME_MAX = 64
const FUNCTION_NAME_SUFFIX = 12

/** 探活硬上限：一条 server 连不上也不能把面板挂住。 */
const PROBE_TIMEOUT_MS = 20000

/** mcp-client 的 Config 常量（照抄官方默认值，表单校验与写入都用这一份）。 */
const SERVER_NAME_RE = /^[A-Za-z0-9_-]{1,32}$/
const TRANSPORTS = ['stdio', 'streamable-http']
const DEFAULT_TOOL_CALL_TIMEOUT_MS = 60000
const DEFAULT_MAX_INSTRUCTION_BYTES = 32768
const RECONNECT_DEFAULTS = { enabled: true, initialDelayMs: 500, maxDelayMs: 30000, maxAttempts: 10 }
const MAX_TIMER_DELAY_MS = 2147483647

/* ------------------------------------------------------------------ 小工具 */

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

async function readBody(request) {
  try {
    const body = await request.json()
    return body !== null && typeof body === 'object' ? body : {}
  } catch {
    return {}
  }
}

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

function cleanText(value) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text === '' ? null : text
}

/** `~` 展开（只处理开头）。 */
function expandHome(text) {
  if (typeof text !== 'string') return null
  const trimmed = text.trim()
  if (trimmed === '') return null
  if (trimmed === '~') return homedir()
  if (trimmed.startsWith('~/')) return join(homedir(), trimmed.slice(2))
  return trimmed
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
          ctx.timeout(() => { if (disposeRoute === undefined) attempt(remaining - 1) }, 400)
          return false
        }
        throw cause
      }
    }
    attempt(10)
    return () => { if (disposeRoute !== undefined) disposeRoute() }
  }, `mcp: ${path}`)
}

/* -------------------------------------------------------------- profile 定位 */

/** patchPath：profileContext.patchPath → <DSH_HOME>/profiles/desktop/cordis.patch.yml。 */
function patchPathOf(ctx) {
  try {
    const profileContext = ctx.get('profileContext')
    const path = profileContext === null || profileContext === undefined ? null : cleanText(profileContext.patchPath)
    if (path !== null) return resolve(expandHome(path) ?? path)
  } catch {
    // profileContext 不在时走兜底。
  }
  const home = cleanText(process.env.DSH_HOME)
  return join(resolve(expandHome(home) ?? join(homedir(), '.dsh')), 'profiles', 'desktop', 'cordis.patch.yml')
}

/** profile 目录：用于 withFileLock 的锁文件（与官方 config-editor 同一个锁）。 */
function profileDirOf(ctx) {
  try {
    const profileContext = ctx.get('profileContext')
    const dir = profileContext === null || profileContext === undefined ? null : cleanText(profileContext.dir)
    if (dir !== null) return resolve(expandHome(dir) ?? dir)
  } catch {
    // 忽略。
  }
  return dirname(patchPathOf(ctx))
}

/** createRequire 锚点候选：profileContext.dir → profileDir → DSH_HOME/profiles/desktop。 */
function requireAnchorCandidates(ctx) {
  const list = []
  const push = (value) => {
    const text = cleanText(value)
    if (text === null) return
    const absolute = resolve(expandHome(text) ?? text)
    const candidate = join(absolute, 'package.json')
    if (!list.includes(candidate)) list.push(candidate)
  }
  try {
    const profileContext = ctx.get('profileContext')
    if (profileContext !== null && profileContext !== undefined) push(profileContext.dir)
  } catch {
    // 忽略。
  }
  push(profileDirOf(ctx))
  const home = cleanText(process.env.DSH_HOME)
  push(join(resolve(expandHome(home) ?? join(homedir(), '.dsh')), 'profiles', 'desktop'))
  return list
}

/**
 * 惰性依赖解析。yaml / atomic-write / MCP client 都从 profile 的 node_modules 取；
 * 三者互相独立，缺一个只禁掉对应能力，面板顶部 meta 会把缺席的那项标出来。
 */
function createDeps(ctx) {
  let cached = null
  const load = () => {
    if (cached !== null) return cached
    const errors = []
    let yaml = null
    let atomic = null
    let mcpClient = null
    for (const anchor of requireAnchorCandidates(ctx)) {
      if (!existsSync(anchor)) continue
      let req = null
      try {
        req = createRequire(anchor)
      } catch (cause) {
        errors.push('anchor ' + anchor + ': ' + messageOf(cause))
        continue
      }
      if (yaml === null) {
        try {
          const mod = req('yaml')
          if (mod !== null && typeof mod.parseDocument === 'function' && typeof mod.stringify === 'function') yaml = mod
        } catch (cause) {
          errors.push('yaml @ ' + anchor + ': ' + messageOf(cause))
        }
      }
      if (atomic === null) {
        try {
          const mod = req('@deepseek-ai/dsh-atomic-write')
          if (mod !== null && typeof mod.withFileLock === 'function' && typeof mod.writeFileAtomic === 'function') atomic = mod
        } catch (cause) {
          errors.push('atomic-write @ ' + anchor + ': ' + messageOf(cause))
        }
      }
      if (mcpClient === null) {
        // stdio 的 transport 在子路径 @modelcontextprotocol/client/stdio 上，官方 mcp-client
        // 也是这么 import 的；旧路径 @modelcontextprotocol/sdk/* 在本机不存在。
        try {
          const mod = req('@modelcontextprotocol/client/stdio')
          if (mod !== null && typeof mod.StdioClientTransport === 'function') mcpClient = mod
        } catch (cause) {
          errors.push('mcp-client/stdio @ ' + anchor + ': ' + messageOf(cause))
        }
      }
      if (yaml !== null && atomic !== null && mcpClient !== null) break
    }
    if (yaml === null) errors.push('未能在 profile 的 node_modules 里解析到 yaml（MCP 配置读写不可用）')
    if (atomic === null) errors.push('未能在 profile 的 node_modules 里解析到 @deepseek-ai/dsh-atomic-write（写入不可用）')
    if (mcpClient === null) errors.push('未能在 profile 的 node_modules 里解析到 @modelcontextprotocol/client/stdio（测试连接不可用）')
    cached = { yaml, atomic, mcpClient, error: errors.length === 0 ? null : errors.join('；') }
    return cached
  }
  return { load }
}

/** hmr：改完 patch 后热更。不存在时返回 null，由调用方降级。 */
function hmrOf(ctx) {
  try {
    const hmr = ctx.get('hmr')
    return hmr === null || hmr === undefined ? null : hmr
  } catch {
    return null
  }
}

/* ------------------------------------------------------------ 配置规范化与校验 */

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value)
}

/** 密钥脱敏：env / headers 的值只给前 4 位，长度 ≤ 8 时只给 …。 */
function maskSecret(value) {
  const text = typeof value === 'string' ? value : String(value)
  if (text.length <= 8) return '…'
  return text.slice(0, 4) + '…'
}

function maskDict(value) {
  if (!isPlainObject(value)) return {}
  const out = {}
  for (const [key, item] of Object.entries(value)) out[key] = maskSecret(item)
  return out
}

function numberOf(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * 规范化用户提交的 config：字段名、类型、默认值全部对齐 mcp-client 的 schema。
 * 写错字段名 Loader 会判非法并整轮回滚，所以这里严格按 schema 收口，不做「顺手补全」。
 */
function normalizeConfig(input) {
  const source = isPlainObject(input) ? input : {}
  const transport = source.transport === 'streamable-http' ? 'streamable-http' : 'stdio'
  const env = {}
  if (isPlainObject(source.env)) {
    for (const [key, value] of Object.entries(source.env)) env[String(key)] = String(value)
  }
  const headers = {}
  if (isPlainObject(source.headers)) {
    for (const [key, value] of Object.entries(source.headers)) headers[String(key)] = String(value)
  }
  const reconnect = isPlainObject(source.reconnect) ? source.reconnect : {}
  const out = {
    transport,
    serverName: cleanText(source.serverName) ?? '',
  }
  if (transport === 'stdio') {
    out.command = cleanText(source.command) ?? ''
    out.args = Array.isArray(source.args) ? source.args.map((item) => String(item)) : []
    out.env = env
    out.cwd = cleanText(source.cwd) ?? ''
  } else {
    out.url = cleanText(source.url) ?? ''
    out.headers = headers
  }
  out.toolCallTimeoutMs = isInteger(source.toolCallTimeoutMs) && source.toolCallTimeoutMs > 0
    ? source.toolCallTimeoutMs
    : DEFAULT_TOOL_CALL_TIMEOUT_MS
  out.failOnStartupError = source.failOnStartupError === true
  out.maxInstructionBytes = isInteger(source.maxInstructionBytes) && source.maxInstructionBytes > 0
    ? source.maxInstructionBytes
    : DEFAULT_MAX_INSTRUCTION_BYTES
  out.reconnect = {
    enabled: reconnect.enabled !== false,
    initialDelayMs: isInteger(reconnect.initialDelayMs) && reconnect.initialDelayMs > 0
      ? reconnect.initialDelayMs
      : RECONNECT_DEFAULTS.initialDelayMs,
    maxDelayMs: isInteger(reconnect.maxDelayMs) && reconnect.maxDelayMs > 0
      ? reconnect.maxDelayMs
      : RECONNECT_DEFAULTS.maxDelayMs,
    maxAttempts: isInteger(reconnect.maxAttempts) && reconnect.maxAttempts >= 1
      ? reconnect.maxAttempts
      : RECONNECT_DEFAULTS.maxAttempts,
  }
  return out
}

/** 表单校验。issues 为空才允许写入。 */
function validateConfig(input) {
  const issues = []
  const source = isPlainObject(input) ? input : {}
  const name = cleanText(source.serverName)
  if (name === null) issues.push('serverName 必填')
  else if (!SERVER_NAME_RE.test(name)) {
    issues.push('serverName 只能包含字母、数字、`-`、`_`，长度 1–32（当前 "' + name + '"）')
  }
  const transport = source.transport === 'streamable-http' ? 'streamable-http' : 'stdio'
  if (!TRANSPORTS.includes(source.transport)) issues.push('transport 必须是 stdio 或 streamable-http')
  if (transport === 'stdio') {
    if (cleanText(source.command) === null) issues.push('stdio 的 command 必填')
  } else if (cleanText(source.url) === null) {
    issues.push('streamable-http 的 url 必填')
  }
  for (const key of ['toolCallTimeoutMs', 'maxInstructionBytes']) {
    if (source[key] !== undefined && !(isInteger(source[key]) && source[key] > 0)) issues.push(key + ' 必须是正整数')
  }
  const reconnect = isPlainObject(source.reconnect) ? source.reconnect : {}
  for (const key of ['initialDelayMs', 'maxDelayMs']) {
    if (reconnect[key] !== undefined && !(isInteger(reconnect[key]) && reconnect[key] > 0 && reconnect[key] <= MAX_TIMER_DELAY_MS)) {
      issues.push('reconnect.' + key + ' 必须是 1–' + MAX_TIMER_DELAY_MS + ' 的整数')
    }
  }
  if (reconnect.maxAttempts !== undefined && !(isInteger(reconnect.maxAttempts) && reconnect.maxAttempts >= 1)) {
    issues.push('reconnect.maxAttempts 必须是 ≥ 1 的整数')
  }
  return issues
}

/** 面板展示用：从 config 推出工具名前缀（真实名字可能被官方追加哈希后缀）。 */
function toolPrefixOf(config) {
  const name = cleanText(config?.serverName)
  if (name === null) return TOOL_PREFIX
  return TOOL_PREFIX + name + '__'
}

/** 敏感字段名：只有这两个 dict 里的值算密钥。 */
function secretKeysOf(config) {
  return config?.transport === 'streamable-http' ? ['headers'] : ['env']
}

/** 对外输出：默认脱敏；reveal 为真才给原文。 */
function publicConfig(config, reveal) {
  const out = { ...config }
  for (const key of secretKeysOf(config)) {
    out[key] = reveal === true ? { ...(isPlainObject(config[key]) ? config[key] : {}) } : maskDict(config[key])
  }
  out.toolPrefix = toolPrefixOf(config)
  out.secretKeys = secretKeysOf(config)
  return out
}

/* --------------------------------------------------------------- patch 读写 */

/** patch 顶层 item 分类：insert 数组里筛 MCP 条目；无 insert 的按 id 收成 override 表。 */
function collectEntries(doc) {
  const items = []
  const overrides = new Map()
  const contents = doc.contents
  if (contents === null || contents === undefined || !Array.isArray(contents.items)) return { items, overrides }
  contents.items.forEach((item, index) => {
    if (item === null || item === undefined || typeof item.get !== 'function') return
    const insert = item.get('insert')
    if (insert !== null && insert !== undefined && Array.isArray(insert.items)) {
      insert.items.forEach((child, childIndex) => {
        if (child === null || child === undefined || typeof child.get !== 'function') return
        if (child.get('name') !== MCP_CLIENT_MODULE) return
        items.push({ index, childIndex, id: String(child.get('id') ?? ''), config: child.get('config') })
      })
      return
    }
    const id = item.get('id')
    if (id === null || id === undefined) return
    overrides.set(String(id), { index, disabled: item.get('disabled') === true })
  })
  return { items, overrides }
}

/** 读 patch：返回 { doc, items, overrides, text }。文件不存在时 items/overrides 为空。 */
async function loadPatch(deps, path) {
  const empty = { doc: null, items: [], overrides: new Map(), text: '' }
  if (deps.yaml === null) return empty
  let text = ''
  try {
    text = await readFile(path, 'utf8')
  } catch {
    return empty
  }
  // !!js 自定义标签：不注册它，parseDocument 会把 `!!js ...` 当未知标签丢掉或报错，
  // String(doc) 也就保不了真。resolve 原样返回字符串，与官方 config-editor 完全一致。
  const doc = deps.yaml.parseDocument(text, {
    customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value) => value }],
  })
  if (doc.errors.length > 0) throw new Error('patch 解析失败：' + doc.errors[0].message)
  const collected = collectEntries(doc)
  return { doc, text, items: collected.items, overrides: collected.overrides }
}

/** YAML 节点转普通对象：yaml 的 YAMLMap/YAMLSeq 都有 toJSON，plain 对象原样返回。 */
function plainOf(node) {
  if (node === null || node === undefined) return {}
  if (typeof node.toJSON === 'function') {
    try {
      const json = node.toJSON()
      return isPlainObject(json) ? json : {}
    } catch {
      return {}
    }
  }
  return isPlainObject(node) ? node : {}
}

/** 配置归一化：patch 里读出来的也要走同一套 normalize（YAML 可能给了字符串数字）。 */
function configOf(raw) {
  return normalizeConfig(plainOf(raw))
}

function buildServers(loaded, reveal) {
  const list = []
  for (const entry of loaded.items) {
    const config = configOf(entry.config)
    const override = loaded.overrides.get(entry.id)
    list.push({
      entryId: entry.id,
      serverName: config.serverName,
      transport: config.transport,
      enabled: override === undefined ? true : override.disabled !== true,
      hasOverride: override !== undefined,
      config: publicConfig(config, reveal),
    })
  }
  list.sort((a, b) => a.entryId.localeCompare(b.entryId))
  return list
}

/** 唯一的 insert 容器：取第一个含 insert 的顶层 item；没有就返回 null（新增时再建）。 */
function insertContainerOf(doc) {
  const contents = doc.contents
  if (contents === null || contents === undefined || !Array.isArray(contents.items)) return null
  for (const item of contents.items) {
    if (item === null || item === undefined || typeof item.get !== 'function') continue
    const insert = item.get('insert')
    if (insert !== null && insert !== undefined && Array.isArray(insert.items)) return insert
  }
  return null
}

/** 找到 entry 在 insert 数组里的位置（按 id 匹配）。 */
function findEntry(doc, entryId) {
  const container = insertContainerOf(doc)
  if (container === null) return null
  const index = container.items.findIndex((child) => child !== null && child !== undefined && typeof child.get === 'function' && String(child.get('id') ?? '') === entryId)
  if (index < 0) return null
  return { container, index }
}

/** 找到/新建 `{id, disabled}` 覆盖行所在的顶层 item。 */
function overrideItemOf(doc, entryId) {
  const contents = doc.contents
  if (contents === null || contents === undefined || !Array.isArray(contents.items)) return null
  for (const item of contents.items) {
    if (item === null || item === undefined || typeof item.get !== 'function') continue
    if (item.get('insert') !== null && item.get('insert') !== undefined) continue
    if (String(item.get('id') ?? '') === entryId) return item
  }
  return null
}

/** 写入 patch 并热更。ops 里已经改完 doc；这里只负责校验、锁、原子写、reconcile。 */
async function commitPatch(ctx, deps, path, doc) {
  const text = String(doc)
  // 写完前先自校验：parseDocument 的 errors 必须为 0，否则绝不落盘。
  const verify = deps.yaml.parseDocument(text, {
    customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value) => value }],
  })
  if (verify.errors.length > 0) throw new Error('写出的 patch 无法重新解析：' + verify.errors[0].message)

  const lockPath = join(profileDirOf(ctx), 'package.json')
  await deps.atomic.withFileLock(lockPath, async () => {
    await deps.atomic.writeFileAtomic(path, text, { mode: 0o600 })
  })

  const hmr = hmrOf(ctx)
  if (hmr === null || typeof hmr.runExclusive !== 'function' || typeof hmr.reconcileProfile !== 'function') {
    return { applied: false, warnings: [], note: 'hmr 服务不可用，配置已写入，需要重启 DSH 生效' }
  }
  // reconcileProfile 必须在 runExclusive 内调用，否则官方抛
  // `HMR profile reconciliation must run inside runExclusive`。
  const result = await hmr.runExclusive(() => hmr.reconcileProfile([MCP_CLIENT_MODULE]))
  return {
    applied: true,
    warnings: Array.isArray(result?.warnings) ? result.warnings : [],
    note: null,
  }
}

/** 读写都要先拿到「能用」的依赖与 patch 文本；缺依赖时给出可读错误。 */
async function prepare(ctx) {
  const deps = createDeps(ctx).load()
  const path = patchPathOf(ctx)
  if (deps.yaml === null || deps.atomic === null) {
    return { ok: false, status: 503, code: 'mcp/dependency-unavailable', message: deps.error ?? '依赖不可用' }
  }
  if (!existsSync(path)) {
    return { ok: false, status: 404, code: 'mcp/patch-missing', message: '找不到 profile patch：' + path }
  }
  return { ok: true, deps, path }
}

/* -------------------------------------------------------------------- 探活 */

/** 官方 mcp-client 的 buildChildEnv 简化版：父进程环境 + 条目自己的 env。 */
function probeEnv(config) {
  const env = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') env[key] = value
  }
  if (isPlainObject(config.env)) {
    for (const [key, value] of Object.entries(config.env)) env[String(key)] = String(value)
  }
  return env
}

function probeArgsOf(config) {
  return Array.isArray(config.args) ? config.args.map((item) => String(item)) : []
}

async function probeStdio(mcpClient, config) {
  const transport = new mcpClient.StdioClientTransport({
    command: String(config.command ?? ''),
    args: probeArgsOf(config),
    env: probeEnv(config),
    cwd: cleanText(config.cwd) ?? '',
  })
  const { Client } = mcpClient
  const client = new Client({ name: 'dsh-toolkit-mcp-probe', version: '1.0.0' })
  try {
    await client.connect(transport)
    const serverVersion = client.getServerVersion()
    const capabilities = client.getServerCapabilities()
    const listed = await client.listTools()
    const tools = Array.isArray(listed?.tools) ? listed.tools : []
    return {
      transport: 'stdio',
      serverInfo: serverVersion ?? null,
      protocolVersion: typeof serverVersion?.protocolVersion === 'string' ? serverVersion.protocolVersion : null,
      capabilities: capabilities ?? null,
      toolCount: tools.length,
      tools: tools.map((tool) => ({
        name: String(tool?.name ?? ''),
        description: typeof tool?.description === 'string' ? tool.description : '',
        // 官方公开名：mcp__<serverName>__<rawName>，超 64 字符或含非法字符则截断 + 12 位哈希。
        publicName: toolPrefixOf(config) + String(tool?.name ?? ''),
      })),
    }
  } finally {
    // 探活是一次性连接：必须两个都关，否则子进程会漏。
    await client.close().catch(() => {})
    await transport.close().catch(() => {})
  }
}

async function probeHttp(config) {
  const { StreamableHTTPClientTransport, Client } = await import('@modelcontextprotocol/client')
  const transport = new StreamableHTTPClientTransport(new URL(String(config.url ?? '')), {
    requestInit: { headers: isPlainObject(config.headers) ? config.headers : {} },
  })
  const client = new Client({ name: 'dsh-toolkit-mcp-probe', version: '1.0.0' })
  try {
    await client.connect(transport)
    const serverVersion = client.getServerVersion()
    const listed = await client.listTools()
    const tools = Array.isArray(listed?.tools) ? listed.tools : []
    return {
      transport: 'streamable-http',
      serverInfo: serverVersion ?? null,
      protocolVersion: typeof serverVersion?.protocolVersion === 'string' ? serverVersion.protocolVersion : null,
      capabilities: client.getServerCapabilities() ?? null,
      toolCount: tools.length,
      tools: tools.map((tool) => ({
        name: String(tool?.name ?? ''),
        description: typeof tool?.description === 'string' ? tool.description : '',
        publicName: toolPrefixOf(config) + String(tool?.name ?? ''),
      })),
    }
  } finally {
    await client.close().catch(() => {})
    await transport.close().catch(() => {})
  }
}

/** 带硬超时的探活。超时/失败都转成结构化结果，绝不挂住请求。 */
async function probeConfig(ctx, rawConfig) {
  const config = normalizeConfig(rawConfig)
  const issues = validateConfig(config)
  if (issues.length > 0) return { ok: false, error: '配置不合法：' + issues.join('；') }

  const deps = createDeps(ctx).load()
  const startedAt = Date.now()
  const guard = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('探活超时（' + PROBE_TIMEOUT_MS + 'ms）')), PROBE_TIMEOUT_MS)
  })
  try {
    const result = config.transport === 'stdio'
      ? (deps.mcpClient === null
          ? (() => { throw new Error('@modelcontextprotocol/client/stdio 不可用（' + (deps.error ?? '未解析到') + '）') })()
          : await Promise.race([probeStdio(deps.mcpClient, config), guard]))
      : await Promise.race([probeHttp(config), guard])
    return { ok: true, durationMs: Date.now() - startedAt, startedAt, ...result }
  } catch (cause) {
    return { ok: false, error: messageOf(cause), durationMs: Date.now() - startedAt, startedAt, transport: config.transport }
  }
}

/* ------------------------------------------------------------------- apply */

export function apply(ctx) {
  registerRoute(ctx, '/api/mcp/meta', ['GET'], async () => {
    try {
      const deps = createDeps(ctx).load()
      const path = patchPathOf(ctx)
      const loaded = await loadPatch(deps, path)
      return json({
        ok: true,
        patchPath: path,
        profileDir: profileDirOf(ctx),
        yamlAvailable: deps.yaml !== null,
        atomicAvailable: deps.atomic !== null,
        mcpClientAvailable: deps.mcpClient !== null,
        hmrAvailable: hmrOf(ctx) !== null,
        mcpEntryCount: loaded.items.length,
        patchExists: existsSync(path),
        defaults: {
          toolCallTimeoutMs: DEFAULT_TOOL_CALL_TIMEOUT_MS,
          maxInstructionBytes: DEFAULT_MAX_INSTRUCTION_BYTES,
          reconnect: RECONNECT_DEFAULTS,
        },
        limits: {
          serverNamePattern: String(SERVER_NAME_RE),
          transports: TRANSPORTS,
          functionNameMax: FUNCTION_NAME_MAX,
          functionNameHashSuffix: FUNCTION_NAME_SUFFIX,
        },
        dependencyError: deps.error,
      })
    } catch (cause) {
      return json({ ok: false, code: 'mcp/meta-failed', message: messageOf(cause) }, 500)
    }
  })

  registerRoute(ctx, '/api/mcp/servers', ['GET'], async (request) => {
    try {
      const query = queryOf(request)
      const prepared = await prepare(ctx)
      if (!prepared.ok) return json({ ok: false, code: prepared.code, message: prepared.message }, prepared.status)
      const loaded = await loadPatch(prepared.deps, prepared.path)
      return json({ ok: true, servers: buildServers(loaded, query.reveal === '1') })
    } catch (cause) {
      return json({ ok: false, code: 'mcp/list-failed', message: messageOf(cause) }, 500)
    }
  })

  // DSH 的 Fetch 路由按 path 唯一（dsh-client-connection 的 fetchRoutes 以 pathname 为 key），
  // 同一 path 注册两次会抛 `connection: exact Fetch route "/api/mcp/server" is already registered`，
  // 因此 GET/POST 与 DELETE 必须合并成一个路由，不能分成两次 registerRoute。
  registerRoute(ctx, '/api/mcp/server', ['GET', 'POST', 'DELETE'], async (request) => {
    const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET'
    if (method === 'DELETE') return deleteServer(request)
    if (method === 'GET') {
      try {
        const query = queryOf(request)
        const entryId = cleanText(query.id)
        if (entryId === null) return json({ ok: false, code: 'mcp/missing-id', message: '缺少 id' }, 400)
        const prepared = await prepare(ctx)
        if (!prepared.ok) return json({ ok: false, code: prepared.code, message: prepared.message }, prepared.status)
        const loaded = await loadPatch(prepared.deps, prepared.path)
        const found = buildServers(loaded, query.reveal === '1').find((server) => server.entryId === entryId)
        if (found === undefined) return json({ ok: false, code: 'mcp/not-found', message: '找不到条目：' + entryId }, 404)
        return json({ ok: true, server: found })
      } catch (cause) {
        return json({ ok: false, code: 'mcp/read-failed', message: messageOf(cause) }, 500)
      }
    }

    // POST：新增（无 entryId）或更新（带 entryId）。
    try {
      const body = await readBody(request)
      const config = normalizeConfig(body.config)
      const issues = validateConfig(config)
      if (issues.length > 0) return json({ ok: false, code: 'mcp/invalid-config', message: issues.join('；') }, 400)

      const prepared = await prepare(ctx)
      if (!prepared.ok) return json({ ok: false, code: prepared.code, message: prepared.message }, prepared.status)
      const { deps, path } = prepared
      const loaded = await loadPatch(deps, path)
      if (loaded.doc === null) return json({ ok: false, code: 'mcp/patch-empty', message: 'patch 为空或不是 YAML 序列' }, 409)

      const entryId = cleanText(body.entryId)
      const enabled = body.enabled !== false
      const existing = entryId === null ? undefined : loaded.items.find((item) => item.id === entryId)
      const finalId = entryId === null ? ('mcp-' + config.serverName) : entryId

      if (entryId !== null && existing === undefined) {
        return json({ ok: false, code: 'mcp/not-found', message: '找不到条目：' + entryId }, 404)
      }
      // 新增时 id 不能撞车（含与 override 行撞车）。
      if (entryId === null && (loaded.items.some((item) => item.id === finalId) || loaded.overrides.has(finalId))) {
        return json({ ok: false, code: 'mcp/id-exists', message: '条目 id 已存在：' + finalId }, 409)
      }

      // 面板默认拿到的是脱敏后的 env/headers。用户没点「显示密钥」时提交的密钥是假的，
      // 这时必须保留磁盘上的原值，绝不能把 "abcd…" 写回去。所以由客户端显式声明
      // preserveSecrets，服务端从旧 config 里搬运真实值。
      if (existing !== undefined && body.preserveSecrets === true) {
        const before = configOf(existing.config)
        if (config.transport === 'streamable-http' && before.transport === 'streamable-http') {
          config.headers = isPlainObject(before.headers) ? { ...before.headers } : {}
        } else if (config.transport === 'stdio' && before.transport === 'stdio') {
          config.env = isPlainObject(before.env) ? { ...before.env } : {}
        }
      }

      if (existing === undefined) {
        const container = insertContainerOf(loaded.doc)
        if (container !== null) {
          container.items.push(loaded.doc.createNode({ id: finalId, name: MCP_CLIENT_MODULE, config }))
        } else {
          loaded.doc.contents.items.push(loaded.doc.createNode({ insert: [{ id: finalId, name: MCP_CLIENT_MODULE, config }] }))
        }
      } else {
        const located = findEntry(loaded.doc, finalId)
        if (located === null) return json({ ok: false, code: 'mcp/not-found', message: '找不到条目：' + finalId }, 404)
        // 只替换 config 键，条目上的其它键（如果有）原样保留。
        located.container.items[located.index].set('config', loaded.doc.createNode(config))
      }

      // 启停覆盖行：新增时按 enabled 落一条；更新时不动原有行（要改用 /server/enabled）。
      if (existing === undefined) {
        const override = overrideItemOf(loaded.doc, finalId)
        if (enabled) {
          if (override !== null) override.set('disabled', false)
          else loaded.doc.contents.items.push(loaded.doc.createNode({ id: finalId, disabled: false }))
        } else if (override !== null) {
          override.set('disabled', true)
        } else {
          loaded.doc.contents.items.push(loaded.doc.createNode({ id: finalId, disabled: true }))
        }
      }

      const reload = await commitPatch(ctx, deps, path, loaded.doc)
      const after = await loadPatch(deps, path)
      return json({
        ok: true,
        applied: reload.applied,
        warnings: reload.warnings,
        note: reload.note,
        created: existing === undefined,
        entryId: finalId,
        servers: buildServers(after, false),
      })
    } catch (cause) {
      return json({ ok: false, code: 'mcp/write-failed', message: messageOf(cause) }, 500)
    }
  })

  registerRoute(ctx, '/api/mcp/server/enabled', ['POST'], async (request) => {
    try {
      const body = await readBody(request)
      const entryId = cleanText(body.id)
      if (entryId === null) return json({ ok: false, code: 'mcp/missing-id', message: '缺少 id' }, 400)
      const enabled = body.enabled === true
      const prepared = await prepare(ctx)
      if (!prepared.ok) return json({ ok: false, code: prepared.code, message: prepared.message }, prepared.status)
      const { deps, path } = prepared
      const loaded = await loadPatch(deps, path)
      if (loaded.doc === null) return json({ ok: false, code: 'mcp/patch-empty', message: 'patch 为空或不是 YAML 序列' }, 409)
      if (!loaded.items.some((item) => item.id === entryId)) {
        return json({ ok: false, code: 'mcp/not-found', message: '找不到条目：' + entryId }, 404)
      }

      const override = overrideItemOf(loaded.doc, entryId)
      if (override !== null) override.set('disabled', !enabled)
      else loaded.doc.contents.items.push(loaded.doc.createNode({ id: entryId, disabled: !enabled }))

      const reload = await commitPatch(ctx, deps, path, loaded.doc)
      const after = await loadPatch(deps, path)
      return json({
        ok: true,
        applied: reload.applied,
        warnings: reload.warnings,
        note: reload.note,
        servers: buildServers(after, false),
      })
    } catch (cause) {
      return json({ ok: false, code: 'mcp/write-failed', message: messageOf(cause) }, 500)
    }
  })

  async function deleteServer(request) {
    try {
      const entryId = cleanText(queryOf(request).id)
      if (entryId === null) return json({ ok: false, code: 'mcp/missing-id', message: '缺少 id' }, 400)
      const prepared = await prepare(ctx)
      if (!prepared.ok) return json({ ok: false, code: prepared.code, message: prepared.message }, prepared.status)
      const { deps, path } = prepared
      const loaded = await loadPatch(deps, path)
      if (loaded.doc === null) return json({ ok: false, code: 'mcp/patch-empty', message: 'patch 为空或不是 YAML 序列' }, 409)

      const located = findEntry(loaded.doc, entryId)
      if (located === null) return json({ ok: false, code: 'mcp/not-found', message: '找不到条目：' + entryId }, 404)
      located.container.items.splice(located.index, 1)

      // 覆盖行一起删，否则会留下一条指向不存在条目的孤儿 disabled 行。
      const contents = loaded.doc.contents
      for (let index = contents.items.length - 1; index >= 0; index -= 1) {
        const item = contents.items[index]
        if (item === null || item === undefined || typeof item.get !== 'function') continue
        if (item.get('insert') !== null && item.get('insert') !== undefined) continue
        if (String(item.get('id') ?? '') === entryId) contents.items.splice(index, 1)
      }

      const reload = await commitPatch(ctx, deps, path, loaded.doc)
      const after = await loadPatch(deps, path)
      return json({
        ok: true,
        applied: reload.applied,
        warnings: reload.warnings,
        note: reload.note,
        deleted: entryId,
        servers: buildServers(after, false),
      })
    } catch (cause) {
      return json({ ok: false, code: 'mcp/write-failed', message: messageOf(cause) }, 500)
    }
  }

  registerRoute(ctx, '/api/mcp/test', ['POST'], async (request) => {
    try {
      const body = await readBody(request)
      let config = null
      const entryId = cleanText(body.id)
      if (entryId !== null) {
        const prepared = await prepare(ctx)
        if (!prepared.ok) return json({ ok: false, code: prepared.code, message: prepared.message }, prepared.status)
        const loaded = await loadPatch(prepared.deps, prepared.path)
        const found = loaded.items.find((item) => item.id === entryId)
        if (found === undefined) return json({ ok: false, code: 'mcp/not-found', message: '找不到条目：' + entryId }, 404)
        config = configOf(found.config)
      } else {
        config = normalizeConfig(body.config)
      }
      const result = await probeConfig(ctx, config)
      if (result.ok !== true) return json({ ok: true, probe: { ok: false, error: result.error, transport: config.transport, serverName: config.serverName, durationMs: result.durationMs ?? 0 } })
      return json({ ok: true, probe: { ok: true, ...result, serverName: config.serverName } })
    } catch (cause) {
      return json({ ok: false, code: 'mcp/test-failed', message: messageOf(cause) }, 500)
    }
  })

  registerRoute(ctx, '/api/mcp/reload', ['POST'], async () => {
    try {
      const hmr = hmrOf(ctx)
      if (hmr === null || typeof hmr.runExclusive !== 'function' || typeof hmr.reconcileProfile !== 'function') {
        return json({ ok: true, applied: false, warnings: [], note: 'hmr 服务不可用，需要重启 DSH 生效' })
      }
      const result = await hmr.runExclusive(() => hmr.reconcileProfile([MCP_CLIENT_MODULE]))
      return json({
        ok: true,
        applied: true,
        warnings: Array.isArray(result?.warnings) ? result.warnings : [],
        pending: Array.isArray(result?.pending) ? result.pending : [],
        restartReason: typeof result?.restartReason === 'string' ? result.restartReason : null,
      })
    } catch (cause) {
      return json({ ok: false, code: 'mcp/reload-failed', message: messageOf(cause) }, 500)
    }
  })
}
