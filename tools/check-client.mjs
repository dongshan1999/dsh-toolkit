// 客户端 + Host 自检：静态自引用扫描 + 真实渲染冒烟 + 生图工具/路由冒烟。
//
// 用法：node tools/check-client.mjs   （先 node build.mjs）
//
// 起因：一次批量文本替换把
//   props.label : (range === 'today' ? ... )
// 误改成自引用 `props.label : (headerLabel)`，Trend 一渲染就抛
// ReferenceError（TDZ），整个面板打不开。当时的"验证"只跑到加载中分支，
// Trend 从未被渲染，所以没抓到。本脚本因此强制断言关键组件确实渲染过。
//
// 2026-09 补：image-gen 组件回归后，bundle 里有两个都叫 Panel 的组件，
// 原来 `plugins.find(name === 'main')` 会挑中排序在前的 image-gen，
// 让 token-usage 的断言变成假失败。现在按面板 key 分组，两组各断言一次；
// 另外补了 Host 侧冒烟（generate_image 工具形状 + 8 条路由 + 防目录穿越），
// patch 掉错文件、路由表撞车、参数改名这些问题都能在本地先暴露。

import { promises as fs } from 'node:fs'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import vm from 'node:vm'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// 自检全程把默认数据目录重定向到沙箱：默认落点是 $DSH_HOME/dsh-toolkit/（真实用户数据），
// 自检绝不能写进去。逐项环境变量（IMAGE_GEN_CONFIG 等）仍然按需覆盖。
const SANDBOX_DATA = path.join(ROOT, '.selfcheck-data')
await fs.rm(SANDBOX_DATA, { recursive: true, force: true })
process.env.DSH_TOOLKIT_DATA = SANDBOX_DATA
let failed = 0
const fail = (msg) => { failed += 1; console.log('  ✗ ' + msg) }
const pass = (msg) => console.log('  ✓ ' + msg)
const check = (ok, msg) => { if (ok) pass(msg); else fail(msg) }

// ───────────────────────── 1) 静态：单行自引用 ─────────────────────────
const STR = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g
function scanSelfReference(file) {
  const bad = []
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, index) => {
    const m = /^\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*(.+)$/.exec(line)
    if (m === null) return
    const name = m[1]
    const rest = m[2].replace(STR, '')
    if (new RegExp('(?<![.\\w$])' + name + '(?![\\w$])').test(rest)) {
      bad.push(`${path.relative(ROOT, file)}:${index + 1} ${name} → ${line.trim().slice(0, 90)}`)
    }
  })
  return bad
}

console.log('[1] 静态检查：const 自引用')
let componentIds = []
{
  const dir = path.join(ROOT, 'components')
  const files = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const candidate = path.join(dir, entry.name, 'client.js')
    try { await fs.access(candidate); files.push(candidate); componentIds.push(entry.name) } catch { /* 无浏览器半 */ }
  }
  const hits = files.flatMap(scanSelfReference)
  if (hits.length === 0) pass(`扫描 ${files.length} 个 client.js（${componentIds.sort().join(', ')}），无自引用`)
  else { hits.forEach(fail); console.log('    自引用会在运行时抛 ReferenceError（TDZ），必须修掉') }
}

// ───────────────────── 1b) 静态：主题色陷阱（暗色下白底白字） ─────────────────────
// --dsw-alias-brand-primary 在亮色主题是 #0f1115（近黑）、暗色主题是 #f9fafb（近白），
// 它会随主题反转，所以不能跟写死的 #fff 搭配——那在暗色下就是白底白字，整个看不见。
// 正确配对是 --dsw-alias-bg-base（亮 #fff / 暗 #151517），它也随主题反转。
function scanThemeContrast(file) {
  const bad = []
  const src = readFileSync(file, 'utf8')
  for (const rule of src.matchAll(/([.\w][\w\-.,:#> ]*)\{([^{}]*)\}/g)) {
    const body = rule[2]
    if (!/background[^;}]*var\(--dsw-alias-brand-primary\)/.test(body)) continue
    if (!/color:\s*#fff(?:fff)?\b/.test(body)) continue
    bad.push(`${path.relative(ROOT, file)} ${rule[1].trim()} → 用 var(--dsw-alias-brand-primary) 做底色却写死 color:#fff`)
  }
  return bad
}

console.log('[1b] 静态检查：主题色对比（brand-primary 底色不能配写死的白字）')
{
  const dir = path.join(ROOT, 'components')
  const files = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const candidate = path.join(dir, entry.name, 'client.js')
    try { await fs.access(candidate); files.push(candidate) } catch { /* 无浏览器半 */ }
  }
  const hits = files.flatMap(scanThemeContrast)
  if (hits.length === 0) pass(`扫描 ${files.length} 个 client.js，无 brand-primary + 写死白字的组合`)
  else { hits.forEach(fail); console.log('    brand-primary 随主题反转（亮#0f1115 / 暗#f9fafb），白字会在暗色下消失；改用 --dsw-alias-bg-base') }
}

console.log('[1c] 静态检查：灯箱不能盖住 DSH 左侧边栏')
{
  // 回归来源：灯箱原先是 position:fixed; inset:0，会盖住整个视口（含左侧会话栏），
  // 用户要求「显示范围在对应图片生成界面大小」。改成 ag-shell 内的 absolute 后，
  // 若有人再写回 fixed 就会重新盖住侧边栏，这里挡住。
  const file = path.join(ROOT, 'components/image-gen/client.js')
  const src = readFileSync(file, 'utf8')
  const lbRule = /'\.ag-lb\{([^}]*)\}'/.exec(src)
  check(lbRule !== null, 'image-gen 里能找到 .ag-lb 样式规则')
  if (lbRule !== null) {
    const body = lbRule[1]
    check(/position:absolute/.test(body), '.ag-lb 用 position:absolute（相对面板外壳，不盖侧边栏）')
    check(!/position:fixed/.test(body), '.ag-lb 不能用 position:fixed（会盖住整个视口）')
    check(/inset:0/.test(body), '.ag-lb 仍铺满面板外壳（inset:0）')
  }
  check(/'\.ag-shell\{([^}]*)position:relative/.test(src), '.ag-shell 提供定位参考（position:relative）')
  check(/'\.ag-shell\{[^}]*overflow:hidden/.test(src), '.ag-shell 裁剪超出面板的内容（overflow:hidden）')
  // 灯箱必须是 ag-shell 的直接子元素：放进 ag-root 会被它的 overflow:auto 裁掉。
  const shellChild = /className: 'ag-shell' \},[\s\S]{0,200}?className: 'ag-root'/.test(src)
  check(shellChild, "ag-shell 直接包住 ag-root")
  const lbSibling = /className: 'ag-root', onScroll \},[\s\S]*?\),\n            openIndex !== null/.test(src)
  check(lbSibling, '灯箱与 ag-root 平级（不是塞在滚动容器里）')
}

// ───────────────────── 1d) 普通脚本重载（与 DSH 的 script 加载方式一致） ─────────────────────
console.log('[1d] 客户端脚本重载：旧页面上连续加载新版本')
{
  const registrations = []
  const context = vm.createContext({
    window: { __ModuleLoader__: { load(registration) { registrations.push(registration) } } },
  })
  try {
    // 模拟修复前已加载的页面：旧全局 lexical binding 无法靠移除 script 元素清掉。
    new vm.Script('const __dshToolkitRegistry = { legacy: true }').runInContext(context)
    const source = readFileSync(path.join(ROOT, 'client.js'), 'utf8')
    const script = new vm.Script(source, { filename: 'dsh-toolkit/client.js' })
    script.runInContext(context)
    script.runInContext(context)
    check(registrations.length === 2 && registrations.every((entry) => entry.id === 'dsh-toolkit' && typeof entry.factory === 'function'),
      '旧页面存在注册表时，新 bundle 连续加载两次仍能登记 factory')
    check(registrations[0]?.factory !== registrations[1]?.factory,
      '每次加载创建独立的模块 factory')
    check(new vm.Script('__dshToolkitRegistry.legacy === true').runInContext(context)
      && !Object.hasOwn(context, 'imageGenClientFactory'),
      '新 bundle 保留旧代状态且不向全局暴露组件工厂')
  } catch (error) {
    fail('客户端普通脚本重复加载失败 → ' + error.message)
  }
}

// ───────────────────────── 2) 运行时：渲染冒烟 ─────────────────────────
const OVERRIDES = new Map()
let cursor = 0
let current = []

const React = {
  createElement(type, props, ...children) { return { __el: true, type, props: props || {}, children } },
  // setter 写回本组件渲染时的槽位数组：用例可以点击按钮后断言状态槽变化（例如提示词有没有被覆盖）。
  useState(init) {
    const i = cursor++
    const store = current
    const v = i < store.length && store[i] !== undefined
      ? store[i]
      : (typeof init === 'function' ? init() : init)
    if (i >= store.length) store[i] = v
    const set = (next) => { store[i] = typeof next === 'function' ? next(store[i]) : next }
    return [v, set]
  },
  useEffect() {},
  useRef(i) { return { current: i } },
  useCallback(f) { return f },
  useMemo(f) { return f() },
  Fragment: 'Fragment',
}

let captured = null
const NATIVE_FETCH = globalThis.fetch
globalThis.window = { __ModuleLoader__: { load(m) { captured = m } } }
globalThis.fetch = () => new Promise(() => {})   // 不触网
const DOM_LISTENERS = new Map()
globalThis.document = {
  createElement: () => ({ textContent: '', remove() {} }),
  addEventListener(type, handler) {
    const list = DOM_LISTENERS.get(type) || []
    list.push(handler)
    DOM_LISTENERS.set(type, list)
  },
  removeEventListener(type, handler) {
    DOM_LISTENERS.set(type, (DOM_LISTENERS.get(type) || []).filter((entry) => entry !== handler))
  },
  head: { appendChild() {} },
  // createPortal 的目标容器；缺了它会退化成原地渲染（也能过，但那样就没测到 portal 分支）。
  body: { appendChild() {} },
}

console.log()
console.log('[2] 运行时：渲染冒烟')
const bundlePath = path.join(ROOT, 'client.js')
try {
  await fs.access(bundlePath)
} catch {
  fail('client.js 不存在，先运行 node build.mjs')
  process.exit(1)
}
await import(pathToFileURL(bundlePath).href)

const plugins = []
const mod = captured.factory((name) => {
  if (name === 'react') return React
  // 通知的 toast 用 createPortal 挂到 body（绕开 shell.overlay 的 z-index:20），
  // 这里给一个恒等实现：断言只关心渲染出来的节点，不关心挂在哪个容器下。
  if (name === 'react-dom') return { createPortal: (el) => el }
  throw new Error('未知依赖 ' + name)
})
mod.apply({
  effect(f) { f() },
  interval() { return () => {} },
  timeout() { return () => {} },
  layout: { selectPanel() {} },
  slots: {
    inject(key, cb) { cb() },
    register(meta, component) { plugins.push({ meta, component }) },
  },
})

const rendered = new Set()
const texts = new Set()
let collector = null
/** 取一个节点的可见文本（递归拼接字符串子节点），用于按文案找按钮。 */
function textOf(el) {
  if (typeof el === 'string' || typeof el === 'number') return String(el)
  if (Array.isArray(el)) return el.map(textOf).join('')
  if (el === null || el === undefined || typeof el !== 'object' || !el.__el) return ''
  return el.children.map(textOf).join('')
}
function render(el) {
  if (typeof el === 'string' || typeof el === 'number') { texts.add(String(el)); return }
  if (el === null || el === undefined || typeof el !== 'object') return
  if (Array.isArray(el)) { el.forEach(render); return }
  if (!el.__el) return
  if (collector !== null) collector.push(el)
  if (typeof el.type === 'function') {
    const name = el.type.name || '(匿名)'
    rendered.add(name)
    const saveCursor = cursor
    const saveCurrent = current
    cursor = 0
    current = OVERRIDES.get(name) || []
    let out
    try { out = el.type(el.props) } finally { cursor = saveCursor; current = saveCurrent }
    render(out)
    return
  }
  el.children.forEach(render)
}

// 两个组件都注册 main / sidebar.panellist，必须按 key（面板 id）挑，不能再取第一个。
const panelOf = (key) => plugins.find((p) => p.meta.name === 'main' && p.meta.key === key)
const glyphOf = (key) => plugins.find((p) => p.meta.name === 'sidebar.panellist' && p.meta.id === key)
const elOf = (component, props = {}) => ({ __el: true, type: component, props, children: [] })

const now = Date.now()
const runGroup = (label, required, cases) => {
  console.log(`  ── ${label} ──`)
  rendered.clear()
  OVERRIDES.clear()
  for (const [name, build, expectText] of cases) {
    try {
      texts.clear()
      render(build())
      if (Array.isArray(expectText) && expectText.length > 0) {
        // 组装预览这类长文本是整条渲染的，断言按“某段已渲染文本包含它”判断。
        const absent = expectText.filter((text) => ![...texts].some((collected) => collected.includes(text)))
        if (absent.length > 0) fail(`${name} → 未渲染出预期文本：${absent.join(' / ')}`)
        else pass(`${name}（文本断言 ${expectText.length} 项）`)
      } else pass(name)
    } catch (e) { failed += 1; fail(name + ' → ' + e.constructor.name + ': ' + e.message) }
  }
  const missing = required.filter((name) => !rendered.has(name))
  if (missing.length > 0) {
    fail(`${label}：关键组件未被渲染，用例无效：${missing.join(', ')}（已渲染：${[...rendered].join(', ') || '无'}）`)
  } else {
    pass(`${label}：关键组件均已真实渲染：${required.join(', ')}`)
  }
}

// ── token-usage ──
const tkPanel = panelOf('token-usage')
const tkGlyph = glyphOf('token-usage')
if (tkPanel === undefined) fail('token-usage 面板未注册（main）')
if (tkGlyph !== undefined) fail('token-usage 侧边栏入口应隐藏')

if (tkPanel !== undefined) {
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0)
  const usage = {
    range: 'today', start: midnight.getTime(), end: now, generatedAt: now, pricingSource: 'self-check',
    totals: { input: 1000, output: 500, cacheRead: 200, cacheWrite: 100, reasoning: 0, cost: 0.5, requests: 3, unpriced: 0, loop: 1800 },
    models: [{ model: 'm', displayName: 'M', requests: 3, input: 1000, output: 500, cacheRead: 200, cacheWrite: 100, cost: 0.5, loop: 1700 }],
    sessions: [{
      id: 's1', title: 't', cwd: '/x', origin: 'session', updatedAt: now, requests: 3,
      input: 1000, output: 500, cacheRead: 200, cacheWrite: 100, cost: 0.5, loop: 1800,
      calls: [{ time: now - 60000, model: 'm', provider: 'p', input: 100, output: 50, cacheRead: 20, cacheWrite: 10, cost: 0.01, priced: true }],
    }],
  }
  const loaded = { loading: false, data: usage, error: null }
  const days = []
  for (let i = 0; i < 371; i += 1) {
    days.push({ date: i > 360 ? '2026-09-' + String(i - 360).padStart(2, '0') : '', requests: i > 360 ? 3 : 0, tokens: i > 360 ? 900 : 0 })
  }
  const activity = { start: 0, end: now, activeDays: 11, days }
  const setPanel = (state, range, rest = []) => OVERRIDES.set('Panel', [state, range, ...rest])

  OVERRIDES.set('ActivityHeatmap', [activity])
  const priceData = {
    available: true, source: 'builtin+user', sourceLabel: '/selfcheck/pricing.json', builtin: 79, overrides: 2,
    sync: { lastSyncAt: now - 3600000, lastSyncError: null, lastCount: 120 }, error: null, exchangeRate: 7.2,
    entries: [{ modelId: 'm', displayName: 'M', input: 1, output: 2, cacheRead: 0.1, cacheWrite: 0.2 }],
  }
  const tkCases = [
    ['加载中', () => { setPanel({ loading: true, data: null, error: null }, 'today'); return elOf(tkPanel.component) }],
    ['已加载 · today', () => { setPanel(loaded, 'today'); return elOf(tkPanel.component) }, ['1,700']],
    ['已加载 · 自定义有效', () => { setPanel(loaded, 'custom', ['', 'all', null, false, '2026-09-21T00:00', '2026-09-22T13:51', false]); return elOf(tkPanel.component) }],
    ['已加载 · 自定义 end<start', () => { setPanel(loaded, 'custom', ['', 'all', null, false, '2026-09-22T10:00', '2026-09-22T09:00', false]); return elOf(tkPanel.component) }],
    ['已加载 · 自定义 + 弹层展开', () => { setPanel(loaded, 'custom', ['', 'all', null, false, '2026-09-21T00:00', '2026-09-22T13:51', true]); return elOf(tkPanel.component) }],
    ['已加载 · 7d', () => { setPanel(loaded, '7d'); return elOf(tkPanel.component) }],
    ['已加载 · all', () => { setPanel(loaded, 'all'); return elOf(tkPanel.component) }],
    ['读取失败', () => { setPanel({ loading: false, data: null, error: 'HTTP 500' }, 'today'); return elOf(tkPanel.component) }],
    ['展开会话详情 + 计价明细', () => { setPanel(loaded, 'today', ['', 'all', 's1', false, '2026-09-21T00:00', '2026-09-22T13:51', false]); return elOf(tkPanel.component) }],
    ['搜索过滤命中', () => { setPanel(loaded, 'today', ['abc', 'all', null, false, false]); return elOf(tkPanel.component) }],
    ['热力图空数据', () => { OVERRIDES.set('ActivityHeatmap', [{ days: [], activeDays: 0 }]); return elOf(tkPanel.component) }],
    ['热力图加载中', () => { OVERRIDES.set('ActivityHeatmap', [null]); return elOf(tkPanel.component) }],
    ['计价面板展开（工具行）', () => { OVERRIDES.set('PriceTable', [priceData, true, null, false, null, '']); return elOf(tkPanel.component) }, ['同步 models.dev', '添加 / 覆盖价格', '来源：内置 79 条 + 自定义/同步 2 条', 'models.dev 上次同步', '汇率 $→¥', '存汇率']],
    ['计价编辑表单', () => { OVERRIDES.set('PriceTable', [priceData, true, { modelId: 'm', displayName: 'M', input: '1', output: '2', cacheRead: '0', cacheWrite: '0' }, false, null, '']); return elOf(tkPanel.component) }, ['模型 ID', '保存', '取消']],
    ['计价同步失败提示', () => { OVERRIDES.set('PriceTable', [priceData, true, null, false, { ok: false, message: '同步失败：HTTP 503' }, '']); return elOf(tkPanel.component) }, ['同步失败：HTTP 503']],
  ]
  runGroup('token-usage', ['Panel', 'ActivityHeatmap', 'Trend'], tkCases)
}

// ── image-gen ──
const agPanel = panelOf('image-gen')
if (agPanel === undefined) fail('image-gen 面板未注册（main）')

if (agPanel !== undefined) {
  const agFile = (name, prompt = null, promptSource = null) => ({ name, bytes: 1024, mtime: now, prompt, promptSource, promptTitle: '' })
  const agPage = (over = {}) => ({
    loading: false,
    data: {
      generatedAt: now, tool: 'generate_image', model: 'flux-pro-1.1',
      baseURL: 'https://images.example.com/v1', hasKey: true,
      sizes: ['1024x1024', '1536x1024'],
      files: [agFile('image-gen-20260921T060109-2.png')], total: 2,
    },
    files: [agFile('image-gen-20260921T060109-2.png'), agFile('image-gen-20260921T060054-1.png')],
    total: 2, hasMore: true, names: ['image-gen-20260921T060109-2.png'], error: null,
    ...over,
  })
  // Panel hook 顺序（25 slots）：sideTab / recent.state / recent.pending / fav.state / fav.pending / open / busy / mode / form / refs / gen / settings / flow / test / models / urlInput / libs / libForm / libBusy / activePrompt / expanded / saveTarget / settingsError / entryTest / flowDraft
  const agSlots = (tab, recent, fav, open = null, overrides = {}) => {
    const d = (key, fb) => overrides[key] !== undefined ? overrides[key] : fb
    return [
      tab, recent, false, fav, false,
      open, false,
      d('mode', 'txt'),
      d('form', { prompt: '', size: '1024x1024', count: 1 }),
      d('refs', []),
      d('gen', { busy: false, error: null, result: null }),
      d('settings', null),
      d('flow', { kind: null, providerId: '', modelId: '', picks: {} }),
      d('test', { busy: false, ok: null, message: null }),
      d('models', { busy: false, items: null, message: null, error: null, added: [] }),
      d('urlInput', ''),
      d('libs', null),
      d('libForm', { open: false, kind: 'prompt', title: '', text: '' }),
      d('libBusy', false),
      d('activePrompt', null),
      d('expanded', {}),
      d('saveTarget', ''),
      d('settingsError', null),
      d('openGroups', {}),
      d('flowDraft', { name: '', apiKey: '', baseURL: '', model: '', displayName: '', pricePerImage: '' }),
    ]
  }
  const agSet = (tab, recent, fav, open = null) => OVERRIDES.set('Panel', agSlots(tab, recent, fav, open))
  const empty = { loading: false, data: { model: 'flux-pro-1.1', hasKey: true }, files: [], total: 0, hasMore: false, names: [], error: null }
  const loading = { loading: true, data: null, files: [], total: 0, hasMore: false, names: [], error: null }
  const errored = { loading: false, data: null, files: [], total: 0, hasMore: false, names: [], error: 'HTTP 500' }

  // 模型目录 fixture：两个组（DL 网关 2 个模型 + 1 个空组，密钥状态一有一无）。
  const agProviders = {
    providerCount: 2,
    modelCount: 2,
    providers: [
      {
        id: 'p1', name: 'DL 网关', baseURL: 'https://images.example.com/v1', keyEnv: 'IMAGE_GEN_KEY_P1',
        hasKey: true, keySource: 'credentials',
        models: [
          { id: 'p1:flux-pro-1.1', name: 'FLUX Pro 1.1', model: 'flux-pro-1.1', pricePerImage: 0.04, isDefault: true },
          { id: 'p1:dall-e-3', name: 'DALL·E 3', model: 'dall-e-3', isDefault: false },
        ],
      },
      {
        id: 'p2', name: 'OpenAI', baseURL: 'https://api.openai.com/v1', keyEnv: 'IMAGE_GEN_KEY_P2',
        hasKey: false, keySource: 'none', models: [],
      },
    ],
    catalog: {
      defaultId: 'p1:flux-pro-1.1',
      entries: [
        { id: 'p1:flux-pro-1.1', providerId: 'p1', group: 'p1', groupLabel: 'DL 网关', name: 'FLUX Pro 1.1', model: 'flux-pro-1.1', baseURL: 'https://images.example.com/v1', keyEnv: 'IMAGE_GEN_KEY_P1', pricePerImage: 0.04, isDefault: true, hasKey: true },
        { id: 'p1:dall-e-3', providerId: 'p1', group: 'p1', groupLabel: 'DL 网关', name: 'DALL·E 3', model: 'dall-e-3', baseURL: 'https://images.example.com/v1', keyEnv: 'IMAGE_GEN_KEY_P1', isDefault: false, hasKey: true },
      ],
    },
  }
  const agSettings = (over = {}) => ({
    baseURL: 'https://images.example.com/v1', model: 'flux-pro-1.1', name: 'FLUX Pro 1.1',
    hasKey: true, keySource: 'credentials', keyEnv: 'IMAGE_GEN_KEY_P1',
    path: '/fake/.dsh/dsh-toolkit/config.json',
    ...agProviders,
    ...over,
  })

  const agCases = [
    ['加载中（正在读取）', () => { agSet('recent', loading, loading); return elOf(agPanel.component) }],
    ['已加载 · 最近生成', () => { agSet('recent', agPage(), agPage()); return elOf(agPanel.component) }],
    ['灯箱放大（含收藏/下载/删除）', () => { agSet('recent', agPage(), agPage(), 0); return elOf(agPanel.component) }],
    ['收藏库为空', () => { agSet('fav', agPage(), empty); return elOf(agPanel.component) }],
    ['画廊无图', () => { agSet('recent', empty, empty); return elOf(agPanel.component) }],
    ['读取失败（Key/接口异常）', () => { agSet('recent', errored, agPage()); return elOf(agPanel.component) }],
    ['提示词库 · 有条目（含看图）', () => {
      OVERRIDES.set('Panel', agSlots('prompt', agPage(), agPage(), null, {
        libs: { prompts: [{ id: 'p1', title: '赛博朋克猫', text: 'cyberpunk cat neon', size: '1024x1024', images: ['image-gen-x.png'] }] },
        expanded: { p1: true },
      }));
      return elOf(agPanel.component)
    }, ['提示词库（1 条）', '赛博朋克猫']],
    ['已加载 · 设置模式', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'set',
        settings: { baseURL: 'https://images.example.com/v1', model: 'flux-pro-1.1', hasKey: true, keySource: 'env', baseURLSource: 'default', modelSource: 'default', path: '/fake/.dsh/image-gen.json', defaults: { baseURL: 'https://images.example.com/v1', model: 'flux-pro-1.1' }, presets: { models: ['flux-pro-1.1'], sizes: ['1024x1024', '1536x1024'] } },
      }));
      return elOf(agPanel.component)
    }],
    ['设置模式 · 模型组目录（多组默认收起）', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, { mode: 'set', settings: agSettings() }))
      return elOf(agPanel.component)
    }, ['DL 网关', 'OpenAI', '2 组 · 2 模型', '+ 添加模型组', '编辑', '删除']],
    ['设置模式 · 展开某个组', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'set',
        settings: agSettings(),
        openGroups: { p1: true },
      }))
      return elOf(agPanel.component)
    }, ['FLUX Pro 1.1', 'dall-e-3', '$0.04/张', '默认', '+ 添加模型']],
    ['设置模式 · 组表单（新建 / 加模型同一个）', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'set',
        settings: agSettings(),
        flow: { kind: 'group', providerId: '', modelId: '', picks: {} },
      }))
      return elOf(agPanel.component)
    }, ['添加模型组', '组名', 'API Key', '链接', '获取模型', '加入', '保存', '取消']],
    ['设置模式 · 改组链接 + 补模型', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'set',
        settings: agSettings(),
        flow: { kind: 'group', providerId: 'p1', modelId: '', picks: { 'img-new-1': true } },
        flowDraft: { name: 'DL 网关', apiKey: '', baseURL: 'https://images.example.com/v1', model: '', displayName: '', pricePerImage: '' },
        models: { busy: false, items: ['flux-pro-1.1', 'img-new-1'], message: '接口可达，共 2 个模型，其中 2 个生图模型已列出。', error: null, added: ['flux-pro-1.1'] },
      }))
      return elOf(agPanel.component)
    }, ['编辑模型组 · DL 网关', '重新获取', '全选', '清空', 'img-new-1', '删除组', '保存（1 个）']],
    ['设置模式 · 编辑模型', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'set',
        settings: agSettings(),
        flow: { kind: 'editModel', providerId: 'p1', modelId: 'p1:dall-e-3', picks: {} },
        flowDraft: { name: '', apiKey: '', baseURL: '', model: 'dall-e-3', displayName: 'DALL·E 3', pricePerImage: '' },
      }))
      return elOf(agPanel.component)
    }, ['编辑模型 · DALL·E 3', '显示名', '模型 id', '每张单价', '保存', '取消']],
    ['文生图 · 默认可切换', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'txt',
        settings: {
          catalog: {
            defaultId: 'custom:dall-e-3',
            entries: [
              { id: 'custom:flux-pro-1.1', group: 'custom', groupLabel: '自定义', name: 'FLUX Pro 1.1', model: 'flux-pro-1.1', baseURL: 'https://images.example.com/v1' },
              { id: 'custom:dall-e-3', group: 'custom', groupLabel: '自定义', name: 'DALL·E 3', model: 'dall-e-3', baseURL: 'https://images.example.com/v1' },
            ],
          },
        },
      }))
      return elOf(agPanel.component)
    }],
    ['设置模式 · 目录为空', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'set',
        settings: agSettings({ providerCount: 0, modelCount: 0, providers: [], catalog: { defaultId: '', entries: [] }, hasKey: false, keySource: 'none' }),
      }))
      return elOf(agPanel.component)
    }, ['+ 添加模型组']],
    ['设置模式 · 读取失败有提示', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'set',
        settings: null,
        settingsError: 'HTTP 500',
      }));
      return elOf(agPanel.component)
    }],
    ['图生图模式 · 参考图置顶 + 拖拽接收', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'img',
        refs: [{ key: 'saved:a.png', kind: 'saved', value: 'a.png', label: 'a.png' }],
        form: { prompt: '改背景', size: '2K', ratio: '1:1', count: 1 },
      }));
      return elOf(agPanel.component)
    }],
    ['生成中 · 显示已用时', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        gen: { busy: true, error: null, result: null, startedAt: now - 12000, requestedCount: 2, model: 'dall-e-3' },
      }));
      return elOf(agPanel.component)
    }],
    ['图片旁注 · 最近生成列出提示词', () => {
      const files = [agFile('image-gen-a.png', '泳池里的女孩，黄昏侧逆光', 'index'), agFile('agnes-b.png', '早期归档提示词', 'library'), agFile('image-gen-c.png')]
      agSet('recent', agPage({ files, total: 3 }), agPage())
      return elOf(agPanel.component)
    }, ['泳池里的女孩，黄昏侧逆光', '早期归档提示词', '提示词（按提示词库反查）', 'image-gen-c.png']],
    ['图片旁注 · 生成结果卡片标提示词', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        gen: {
          busy: false, error: null, startedAt: now - 5000, completedAt: now, requestedCount: 1, model: 'flux-pro-1.1',
          result: { ok: true, model: 'flux-pro-1.1', size: '1024x1024', count: 1, prompt: '一只戴墨镜的柴犬，霓虹灯背景', files: ['image-gen-d.png'], images: [{ name: 'image-gen-d.png' }] },
        },
      }))
      return elOf(agPanel.component)
    }, ['一只戴墨镜的柴犬，霓虹灯背景']],
    ['图片旁注 · 灯箱显示完整提示词', () => {
      const files = [agFile('image-gen-a.png', '灯箱里的整段提示词：主体 + 构图 + 光线', 'index')]
      agSet('recent', agPage({ files, total: 1 }), agPage(), 0)
      return elOf(agPanel.component)
    }, ['灯箱里的整段提示词：主体 + 构图 + 光线']],
    ['五段式 · 主体+风格+构图+光线+负面与最终预览', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        form: {
          prompt: '生成游泳的女孩',
          styles: [{ id: 'p1', title: '阴森Q版志怪·风格锁', text: 'Character design concept sheet, two chibi characters floating side by side' }],
          composition: '正面平视、居中构图',
          lighting: '黄昏侧逆光',
          negative: '不要写实、不要 3D',
          size: '2K', ratio: '1:1', count: 1,
        },
      }));
      return elOf(agPanel.component)
    }, ['主体（描述要生成的画面）', '构图与视角（可选）', '光线与氛围（可选）', '负面（可选，会拼成「不要：…」追加到末尾）', '阴森Q版志怪·风格锁', '生成游泳的女孩', 'Character design concept sheet, two chibi characters floating side by side', '构图与视角：正面平视、居中构图', '光线与氛围：黄昏侧逆光', '不要写实、不要 3D']],
  ]
  runGroup('image-gen', ['Panel', 'Lightbox', 'GenerateForm', 'GenerationClock', 'SettingsForm', 'LibraryPanel'], agCases)

  // ── 交互回归：提示词库条目按钮的语义 ──
  // 起因：Skill 库已下线（2026-09-28）；曾出现早期「使用」把 SKILL.md 全文当提示词
  // 填进输入框，既覆盖用户已写的需求，又让生图模型收到一份文档，产出与需求无关。
  const panelButton = (slots, label) => {
    OVERRIDES.set('Panel', slots)
    collector = []
    render(elOf(agPanel.component))
    const nodes = collector
    collector = null
    return nodes.find((node) => node.type === 'button' && textOf(node) === label)
  }
  {
    const entry = { id: 'p1', title: '赛博朋克猫', text: 'cyberpunk cat neon', size: '2K', ratio: '1:1', images: [] }
    const slots = agSlots('prompt', agPage(), agPage(), null, {
      libs: { prompts: [entry], skills: [] },
      form: { prompt: '生成游泳的女孩', size: '2K', ratio: '1:1', count: 1 },
    })
    const add = panelButton(slots, '加为风格')
    if (add === undefined) fail('提示词库条目缺少「加为风格」按钮')
    else {
      add.props.onClick()
      check(Array.isArray(slots[8].styles) && slots[8].styles.length === 1 && slots[8].styles[0].id === 'p1', '「加为风格」把条目叠加进风格区')
      check(slots[8].prompt === '生成游泳的女孩', '「加为风格」不改写主体')
      const undo = panelButton(slots, '已加为风格')
      if (undo === undefined) fail('已叠加条目缺少「已加为风格」切换按钮')
      else {
        undo.props.onClick()
        check(Array.isArray(slots[8].styles) && slots[8].styles.length === 0, '再点一次「已加为风格」移除该风格')
      }
    }
    const replace = panelButton(slots, '替换主体')
    if (replace === undefined) fail('提示词库条目缺少「替换主体」按钮')
    else {
      replace.props.onClick()
      check(slots[8].prompt === 'cyberpunk cat neon', '「替换主体」用条目内容覆盖主体框')
    }
  }

// ── 交互回归：设置页「+ 添加模型组」→ 组折叠 → 组表单勾选 ──
  // 起因：模型接入 = 一个网关一组 + 组内模型勾选，组卡片可折叠（2026-10-12）。
  // 槽位：12 = flow，14 = models，23 = openGroups。
  const panelNodes = (slots) => {
    OVERRIDES.set('Panel', slots)
    collector = []
    render(elOf(agPanel.component))
    const nodes = collector
    collector = null
    return nodes
  }
  {
    const slots = agSlots('recent', agPage(), agPage(), null, { mode: 'set', settings: agSettings() })
    const open = panelButton(slots, '+ 添加模型组')
    if (open === undefined) fail('设置页缺少「+ 添加模型组」按钮')
    else {
      open.props.onClick()
      check(slots[12].kind === 'group' && slots[12].providerId === '',
        '点「+ 添加模型组」展开组表单（组名 / API Key / 链接 / 获取模型）')
    }

    const slots2 = agSlots('recent', agPage(), agPage(), null, { mode: 'set', settings: agSettings() })
    const toggle = panelNodes(slots2).find((node) => node.type === 'button' && node.props.className === 'agx-group-toggle')
    if (toggle === undefined) fail('组卡片没有折叠开关')
    else {
      toggle.props.onClick()
      check(slots2[23].p1 === true, '点组头把该组展开（多组默认收起）')
    }

    const slots3 = agSlots('recent', agPage(), agPage(), null, {
      mode: 'set',
      settings: agSettings(),
      flow: { kind: 'group', providerId: 'p1', modelId: '', picks: {} },
      flowDraft: { name: 'DL 网关', apiKey: '', baseURL: 'https://images.example.com/v1', model: '', displayName: '', pricePerImage: '' },
      models: { busy: false, items: ['flux-pro-1.1', 'img-new-1'], message: '接口可达', error: null, added: ['flux-pro-1.1'] },
    })
    const chip = panelButton(slots3, 'img-new-1')
    if (chip === undefined) fail('组表单没有可点击的勾选列表')
    else {
      chip.props.onClick()
      check(slots3[12].picks['img-new-1'] === true, '点一下模型即勾选')
      const again = panelButton(slots3, 'img-new-1')
      if (again === undefined) fail('勾选后按钮丢失')
      else {
        again.props.onClick()
        check(slots3[12].picks['img-new-1'] !== true, '再点一下取消勾选')
      }
    }
    const addedChip = panelNodes(slots3).find((node) => node.type === 'button' && textOf(node) === 'flux-pro-1.1')
    check(addedChip !== undefined && addedChip.props.disabled === true, '已在该组里的模型置灰、不参与勾选')

    const expandedRows = panelNodes(agSlots('recent', agPage(), agPage(), null, {
      mode: 'set', settings: agSettings(), openGroups: { p1: true },
    }))
    const testButtons = expandedRows.filter((node) => node.type === 'button' && textOf(node) === '测试')
    check(testButtons.length === 1, '只剩顶部一个「测试」按钮（模型行上的已去掉）')
    check(expandedRows.find((node) => node.type === 'button' && textOf(node) === '更新模型') === undefined,
      '组头上已去掉「更新模型」按钮')

    // 编辑组时一个模型都没勾选也能保存（只改名字 / 链接 / 密钥）。
    const editFormSlots = agSlots('recent', agPage(), agPage(), null, {
      mode: 'set',
      settings: agSettings(),
      flow: { kind: 'group', providerId: 'p1', modelId: '', picks: {} },
      flowDraft: { name: 'DL 网关', apiKey: '', baseURL: 'https://images.example.com/v1', model: '', displayName: '', pricePerImage: '' },
    })
    const saveBtn = panelNodes(editFormSlots).find((node) => node.type === 'button' && textOf(node) === '保存')
    check(saveBtn !== undefined && saveBtn.props.disabled !== true, '编辑组时没勾选模型也能保存（只改名字 / 链接 / 密钥）')
  }
}

// ── model-test ──
// 面板必读：目录按「组（provider）→ 模型」渲染，每行一个「测试」，组头一个「测试本组」，顶部一个「测试全部」。
const mtPanel = panelOf('model-test')
if (mtPanel === undefined) fail('model-test 面板未注册（main）')

if (mtPanel !== undefined) {
  const mtCatalog = (over = {}) => ({
    loading: false,
    error: null,
    data: {
      ok: true, generatedAt: now, providerCount: 2, modelCount: 3, declared: 2,
      failures: [],
      groups: [
        {
          id: 'dl', name: 'DL 网关',
          models: [
            { id: 'gpt-6-sol', name: 'GPT-6 Sol', inputModalities: ['text'] },
            { id: 'deepseek-flash', name: 'deepseek-flash', inputModalities: ['text'] },
          ],
        },
        { id: 'xiaomi', name: 'Xiaomi', models: [{ id: 'mimo-v2.6-pro', name: 'MiMo v2.6 Pro', inputModalities: ['text', 'image'] }] },
      ],
      ...over,
    },
  })
  const mtKey = (provider, model) => provider + '\u0000' + model
  const mtResult = (provider, model, over = {}) => ({
    provider, model, providerName: provider, modelName: model,
    ok: true, status: 'ok', finishKind: 'stop', message: '',
    ttftMs: 420, totalMs: 1800, streamMs: 1380, outputTokens: 64,
    usage: { inputTokens: 12, outputTokens: 64, totalTokens: 76, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0 },
    tokensPerSecond: 46.4, at: now, ...over,
  })
  // 槽位：0 catalog / 1 results / 2 running / 3 pending / 4 expanded / 5 notice / 6 options / 7 prompt
  //       8 overrides / 9 editing / 10 draft / 11 saving / 12 defaults / 13 snippet
  //       14 dshState / 15 dshWriting
  // （useRef 不消耗 slot，所以 seq / rootRef 不占位。）
  const mtSlots = (catalog, over = {}) => [
    catalog,
    over.results || {},
    over.running === true,
    over.pending || [],
    // 收纳状态存「展开过的组」：面板默认全收，渲染类用例需要看到模型行，所以默认两组合都展开。
    over.expanded !== undefined ? over.expanded : ['dl', 'xiaomi'],
    over.notice || null,
    over.options || { timeoutMs: 30000, maxTokens: 64, concurrency: 3 },
    over.prompt || 'ping',
    over.overrides || {},
    over.editing || null,
    over.draft || { temperature: '', maxTokens: '', reasoningEffort: '' },
    over.saving === true,
    over.defaults || { temperature: '', reasoningEffort: '' },
    over.snippet || null,
    over.dshState || {},
    over.dshWriting || null,
  ]
  const mtNodes = (slots) => {
    OVERRIDES.set('Panel', slots)
    collector = []
    render(elOf(mtPanel.component))
    const nodes = collector
    collector = null
    return nodes
  }
  const mtButton = (nodes, label) => nodes.find((node) => node.type === 'button' && textOf(node) === label)

  const mtCases = [
    ['加载中', () => { OVERRIDES.set('Panel', mtSlots({ loading: true, data: null, error: null })); return elOf(mtPanel.component) }, ['正在读取模型目录']],
    ['未测试（目录已加载）', () => {
      OVERRIDES.set('Panel', mtSlots(mtCatalog()))
      return elOf(mtPanel.component)
    }, ['模型测试', '测试全部', '测试本组', 'DL 网关', 'Xiaomi', 'GPT-6 Sol', '未测试']],
    ['含结果（1 成功 + 1 失败）', () => {
      const results = {}
      results[mtKey('dl', 'gpt-6-sol')] = mtResult('dl', 'gpt-6-sol')
      results[mtKey('xiaomi', 'mimo-v2.6-pro')] = mtResult('xiaomi', 'mimo-v2.6-pro', {
        ok: false, status: 'error', finishKind: 'error', message: 'HTTP 401 unauthorized',
        ttftMs: null, streamMs: null, outputTokens: 0, tokensPerSecond: null,
      })
      OVERRIDES.set('Panel', mtSlots(mtCatalog(), { results }))
      return elOf(mtPanel.component)
    }, ['连接正常', '首字 420 ms', '输出 46.4 tok/s', '失败：HTTP 401 unauthorized', '平均首字', '平均输出', '最快 / 最慢']],
    ['测试中（按钮禁用）', () => {
      OVERRIDES.set('Panel', mtSlots(mtCatalog(), { running: true, pending: [mtKey('dl', 'gpt-6-sol')] }))
      return elOf(mtPanel.component)
    }, ['测试中…']],
    ['目录读取失败', () => {
      OVERRIDES.set('Panel', mtSlots({ loading: false, data: null, error: 'HTTP 500' }))
      return elOf(mtPanel.component)
    }, ['目录读取失败：HTTP 500']],
    ['没有可路由的组', () => {
      OVERRIDES.set('Panel', mtSlots({
        loading: false, error: null,
        data: { ok: true, groups: [], failures: [], providerCount: 0, modelCount: 0, declared: 0 },
      }))
      return elOf(mtPanel.component)
    }, ['当前没有可路由的模型组']],
    ['某组列模型失败', () => {
      OVERRIDES.set('Panel', mtSlots({
        loading: false, error: null,
        data: { ok: true, groups: [], failures: [{ id: 'broken', name: 'Broken', message: 'adapter exploded' }], providerCount: 0, modelCount: 0, declared: 1 },
      }))
      return elOf(mtPanel.component)
    }, ['Broken：adapter exploded']],
    ['汇总提示（测完）', () => {
      OVERRIDES.set('Panel', mtSlots(mtCatalog(), {
        results: { [mtKey('dl', 'gpt-6-sol')]: mtResult('dl', 'gpt-6-sol') },
        notice: { kind: 'ok', text: '测完 1 个模型：成功 1 个，平均首字 420 ms' },
      }))
      return elOf(mtPanel.component)
    }, ['测完 1 个模型：成功 1 个']],
    // DSH 配置区只在「参数」编辑区展开时渲染，所以这里要同时注入 editing + draft + dshState。
    ['参数编辑区（未读 DSH）', () => {
      const dshKey = mtKey('dl', 'gpt-6-sol')
      OVERRIDES.set('Panel', mtSlots(mtCatalog(), { editing: dshKey }))
      return elOf(mtPanel.component)
    }, ['temperature', '思考档位', '输出上限', '保存', '生成 YAML 片段', 'DSH 配置', '读取 DSH 配置']],
    ['DSH 配置（有差异可写）', () => {
      const dshKey = mtKey('dl', 'gpt-6-sol')
      OVERRIDES.set('Panel', mtSlots(mtCatalog(), {
        editing: dshKey,
        dshState: {
          [dshKey]: {
            loading: false, error: null,
            data: {
              ok: true, provider: 'dl', model: 'gpt-6-sol', ns: 'llm-pi-ai', revision: 5,
              available: true, reason: null, declaredInModels: true, declaredCount: 2,
              current: { contextWindow: 1050000, maxTokens: 8192 },
              proposed: { contextWindow: 1050000, maxTokens: 128000, input: ['text'], compat: { supportsTemperature: false } },
              diff: [
                { field: 'contextWindow', label: '上下文窗口', before: 1050000, after: 1050000, missing: false, changed: false, beforeText: '1050000', afterText: '1050000' },
                { field: 'maxTokens', label: '输出上限', before: 8192, after: 128000, missing: false, changed: true, beforeText: '8192', afterText: '128000' },
                { field: 'compat', label: '兼容性', before: null, after: { supportsTemperature: false }, missing: true, changed: true, beforeText: '（未配置）', afterText: 'supportsTemperature: false' },
              ],
              plan: { mode: 'fill', applied: ['compat'] },
              summary: '上下文窗口 1050000 · 输出上限 8192',
              note: 'temperature 不是 DSH 的模型级配置',
            },
          },
        },
      }))
      return elOf(mtPanel.component)
    }, ['DSH 现在：上下文窗口 1050000', '8192  →  128000', '补全缺失（1）', '覆盖差异（2）', 'llm-pi-ai']],
    ['DSH 配置（不可写时说明原因）', () => {
      const dshKey = mtKey('dl', 'gpt-6-sol')
      OVERRIDES.set('Panel', mtSlots(mtCatalog(), {
        editing: dshKey,
        dshState: {
          [dshKey]: {
            loading: false, error: null,
            data: { ok: true, provider: 'dl', model: 'gpt-6-sol', ns: 'llm-pi-ai', revision: 5, available: false, reason: '该 provider 没有声明 models 数组', declaredInModels: null },
          },
        },
      }))
      return elOf(mtPanel.component)
    }, ['不可写', '该 provider 没有声明 models 数组']],
    ['DSH 配置（读取失败）', () => {
      const dshKey = mtKey('dl', 'gpt-6-sol')
      OVERRIDES.set('Panel', mtSlots(mtCatalog(), {
        editing: dshKey,
        dshState: { [dshKey]: { loading: false, error: 'HTTP 503', data: null } },
      }))
      return elOf(mtPanel.component)
    }, ['读取失败：HTTP 503']],
  ]
  runGroup('model-test', ['Panel'], mtCases)

  // ── 交互回归：单组单模型 / 整组 / 全部，以及组折叠 ──
  {
    const expanded = mtNodes(mtSlots(mtCatalog()))
    check(mtButton(expanded, '测试全部') !== undefined && mtButton(expanded, '测试全部').props.disabled !== true,
      '顶部有可用的「测试全部」')
    const groupButtons = expanded.filter((node) => node.type === 'button' && textOf(node) === '测试本组')
    check(groupButtons.length === 2, `每个组一个「测试本组」（当前 ${groupButtons.length} 个）`)
    check(expanded.filter((node) => node.type === 'button' && textOf(node) === '整组参数').length === 0,
      '组头不再有「整组参数」按钮')
    const perModel = expanded.filter((node) => node.type === 'button' && textOf(node) === '测试')
    check(perModel.length === 3, `展开后每个模型各一个「测试」（当前 ${perModel.length} 个）`)

    // 默认全收：内容多时先只看组名和计数，展开才显示组内模型行。
    const defaultSlots = mtSlots(mtCatalog(), { expanded: [] })
    const defaultNodes = mtNodes(defaultSlots)
    check(defaultNodes.filter((node) => node.props.className === 'mt-group-head').length === 2, '默认收起时两组组头都在')
    check(!defaultNodes.some((node) => node.type === 'button' && textOf(node) === '测试'), '默认收起时不渲染模型行')
    check(mtButton(defaultNodes, '收起全部') === undefined && mtButton(defaultNodes, '展开全部') === undefined, '顶部不再有「收起全部 / 展开全部」按钮')

    const collapsedSlots = mtSlots(mtCatalog(), { expanded: ['xiaomi'] })
    const collapsed = mtNodes(collapsedSlots)
    check(!collapsed.some((node) => textOf(node) === 'GPT-6 Sol'), '收起的组不渲染组内模型行')
    check(collapsed.some((node) => textOf(node) === 'MiMo v2.6 Pro'), '展开的组照常渲染模型行')
    const carets = collapsed.filter((node) => node.props.className === 'mt-caret')
    check(carets.length === 2 && textOf(carets[0]) === '▸' && textOf(carets[1]) === '▾', '组头箭头反映展开状态（▸ 收起 / ▾ 展开）')
    const heads = collapsed.filter((node) => node.props.className === 'mt-group-head')
    if (heads.length !== 2) fail('模型测试组头缺少折叠热区')
    else {
      // 点组头（空白/组名/箭头都算）展开这一组；点在按钮上不切换。
      heads[0].props.onClick({ target: null })
      check(Array.isArray(collapsedSlots[4]) && collapsedSlots[4].includes('dl'), '点组头展开这一组')
      const headButton = heads[1].children.find((child) => child !== null && child !== undefined && child.type === 'button')
      if (headButton !== undefined) {
        headButton.props.onClick({ target: headButton })
        check(collapsedSlots[4].length === 2, '点组头里的按钮不会误触收起/展开')
      }
    }

    // 收起状态下点「测试本组」：先展开这一组，结果才看得见。
    const runGroupSlots = mtSlots(mtCatalog(), { expanded: [] })
    const runGroupNodes = mtNodes(runGroupSlots)
    const runGroupBtn = runGroupNodes.filter((node) => node.type === 'button' && textOf(node) === '测试本组')[1]
    if (runGroupBtn === undefined) fail('收起状态下找不到「测试本组」按钮')
    else {
      runGroupBtn.props.onClick()
      check(Array.isArray(runGroupSlots[4]) && runGroupSlots[4].includes('xiaomi'), '点「测试本组」先展开该组')
    }

    // 两种批量入口的按钮必须真的禁用不同范围：running 时全部禁用。
    const busy = mtNodes(mtSlots(mtCatalog(), { running: true }))
    const busyButtons = busy.filter((node) => node.type === 'button' && (textOf(node) === '测试' || textOf(node) === '测试本组' || textOf(node) === '测试全部'))
    check(busyButtons.length > 0 && busyButtons.every((node) => node.props.disabled === true), '测试进行中所有测试按钮都禁用')
  }
}

// ── notifications ──
// 面板必读：未读/总数/已启用场景三张卡 + 一条通知列表。
// 提醒一律走系统通知中心，所以这里必须断言「没有注册任何站内浮层」——
// 一旦有人又把 toast 加回 shell.overlay，用户就会同时收到两条提醒。
const nfPanel = panelOf('notifications')
if (nfPanel === undefined) fail('notifications 面板未注册（main）')
{
  const strayOverlays = plugins.filter((p) => p.meta.name === 'shell.overlay')
  check(strayOverlays.length === 0,
    `notifications 不注册站内浮层（提醒只走系统通知），shell.overlay 注册数为 ${strayOverlays.length}`)
}

if (nfPanel !== undefined) {
  // 场景目录必须与 host.js 的 KINDS 一一对应：漏一个场景，用户就在面板里关不掉它。
  const nfKindRows = [
    ['approval-required', '需要权限确认', 'action', true],
    ['question-required', '需要你回答', 'action', true],
    ['plan-review', '计划待审批', 'action', true],
    ['turn-completed', '会话完成', 'info', true],
    ['turn-error', '会话出错', 'error', true],
    ['turn-max-tokens', '输出被截断', 'warning', true],
    ['turn-blocked', '回合被阻断', 'warning', false],
    ['turn-aborted', '会话被中断', 'warning', false],
    ['model-error', '模型请求失败', 'error', true],
    ['agent-error', '步骤异常', 'error', false],
    ['subagent-completed', '子智能体完成', 'info', true],
    ['subagent-failed', '子智能体失败', 'error', true],
    ['subagent-stopped', '子智能体中断', 'warning', false],
    ['compaction-error', '压缩失败', 'error', true],
    ['config-error', '会话启动失败', 'error', true],
    ['account-expired', '账号凭据失效', 'error', true],
  ]
  const nfKinds = nfKindRows.map(([id, label, level, enabled]) => ({ id, label, level, hint: label + '：内部说明', enabled }))
  // title = 谁（工作区 / 会话），status = 为什么（场景 label），body = 明细。
  // 这是用户指定的信息顺序，用例必须按这个顺序断言，否则排版被改回去也没人发现。
  const nfItem = (over = {}) => ({
    id: 'n1', kind: 'turn-completed', level: 'info', title: 'demo / 测试会话',
    status: '会话完成', workspace: 'demo',
    body: '第 1 轮已回复完成', detail: '', sessionId: 's1',
    sessionTitle: '测试会话', dedupeKey: 'turn-completed:s1:1', count: 1, createdAt: now, read: false,
    ...over,
  })
  const nfPage = (over = {}) => ({
    loading: false,
    error: null,
    data: {
      ok: true, now, unread: 1, total: 1, items: [nfItem()],
      kinds: nfKinds,
      config: { version: 1, enabled: true, maxItems: 300, maxAgeMs: 604800000, dedupeMs: 45000, kinds: {} },
      files: { config: '/selfcheck/notifications/config.json', queue: '/selfcheck/notifications/queue.json' },
      ...over,
    },
  })
  // 槽位：0 page / 1 filter / 2 notice / 3 sysPerm / 4 showKinds
  const nfSlots = (page, over = {}) => [
    page,
    over.filter || 'all',
    over.notice || null,
    over.sysPerm || 'unsupported',
    over.showKinds === true,
  ]
  const nfNodes = (page, over) => {
    OVERRIDES.set('NotificationsPanel', nfSlots(page, over))
    collector = []
    render(elOf(nfPanel.component))
    const nodes = collector
    collector = null
    return nodes
  }
  const nfButton = (nodes, label) => nodes.find((node) => node.type === 'button' && textOf(node) === label)

  const nfCases = [
    ['加载中', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots({ loading: true, data: null, error: null }))
      return elOf(nfPanel.component)
    }, ['通知', '正在读取通知…']],
    ['已加载 · 一条未读完成', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage()))
      return elOf(nfPanel.component)
    }, ['demo / 测试会话', '会话完成', '第 1 轮已回复完成', '全部通知', '未读', '记录总数', '已启用场景']],
    ['已加载 · 待处理权限请求', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage({
        unread: 1,
        items: [nfItem({ id: 'n2', kind: 'approval-required', level: 'action', status: '需要权限确认', body: '工具 bash 在等你批准' })],
      })))
      return elOf(nfPanel.component)
    }, ['需要权限确认', '工具 bash 在等你批准', '待处理', '跳到会话']],
    ['已加载 · 去重计数', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage({ items: [nfItem({ count: 3 })] })))
      return elOf(nfPanel.component)
    }, ['×3']],
    ['已加载 · 仅未读过滤', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage({ unread: 1, total: 2, items: [nfItem({ id: 'n3', read: true, title: '已读的旧通知' })] }), { filter: 'unread' }))
      return elOf(nfPanel.component)
    }, ['未读通知']],
    ['空列表', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage({ unread: 0, total: 0, items: [] })))
      return elOf(nfPanel.component)
    }, ['还没有通知']],
    ['读取失败', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots({ loading: false, data: null, error: 'HTTP 500' }))
      return elOf(nfPanel.component)
    }, ['读取失败：HTTP 500']],
    ['操作提示', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage(), { notice: { kind: 'ok', text: '已把 1 条标记为已读' } }))
      return elOf(nfPanel.component)
    }, ['已把 1 条标记为已读']],
    ['场景设置展开', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage(), { showKinds: true }))
      return elOf(nfPanel.component)
    }, ['场景设置', '需要权限确认', '子智能体失败', '账号凭据失效', '会话完成：内部说明']],
    ['系统通知不支持', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage(), { sysPerm: 'unsupported' }))
      return elOf(nfPanel.component)
    }, ['此环境不支持系统通知']],
    ['兜底通道打开', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage({ native: { supported: true, platform: 'darwin', channel: 'osascript', reason: '', enabled: true, sound: true, sent: 5 } })))
      return elOf(nfPanel.component)
    }, ['兜底通道：开', '提示音：开', 'macOS 通知中心，已投递 5 条']],
    ['兜底通道默认关闭 / 平台不可用', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage({ native: { supported: false, platform: 'win32', channel: 'none', reason: 'unsupported-platform', enabled: false, sound: true, sent: 0 } })))
      return elOf(nfPanel.component)
    }, ['兜底通道：关', '不可用（unsupported-platform）']],
    ['权限被拒时的引导横幅', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage(), { sysPerm: 'denied' }))
      return elOf(nfPanel.component)
    }, ['系统通知被拒绝了', '重新申请通知权限', '打开系统设置']],
    ['系统设置入口始终可用', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage(), { sysPerm: 'granted' }))
      return elOf(nfPanel.component)
    }, ['系统通知设置', '没收到通知？']],
    ['没有会话 id 时不画跳转按钮', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage({
        items: [nfItem({ id: 'n9', kind: 'account-expired', level: 'error', status: '账号凭据失效', sessionId: '', title: 'DSH' })],
      })))
      return elOf(nfPanel.component)
    }, ['账号凭据失效']],
    ['落盘路径提示', () => {
      OVERRIDES.set('NotificationsPanel', nfSlots(nfPage()))
      return elOf(nfPanel.component)
    }, ['/selfcheck/notifications/config.json', 'NOTIFICATIONS_CONFIG']],
  ]
  runGroup('notifications', ['NotificationsPanel'], nfCases)

  // ── 交互回归：数字卡片取值 + 筛选与开关真的接到动作 ──
  {
    const nodes = nfNodes(nfPage({ unread: 2, total: 5 }))
    check(nodes.some((node) => textOf(node) === '2'), '未读卡片取 unread 字段（2）')
    check(nodes.some((node) => textOf(node) === '5'), '总数卡片取 total 字段（5）')
    check(nodes.some((node) => textOf(node) === '12 / 16'), '已启用场景按 kinds[].enabled 统计（16 个里 12 个开）')

    const noUnread = nfNodes(nfPage({ unread: 0, total: 3 }))
    const allRead = nfButton(noUnread, '全部已读')
    check(allRead !== undefined && allRead.props.disabled === true, '未读为 0 时「全部已读」禁用')

    const on = nfNodes(nfPage())
    check(nfButton(on, '通知总开关：开') !== undefined, '总开关开启时按钮文案为「通知总开关：开」')
    const off = nfNodes(nfPage({ config: { version: 1, enabled: false, maxItems: 300, maxAgeMs: 604800000, dedupeMs: 45000, kinds: {} } }))
    check(nfButton(off, '通知总开关：关') !== undefined, '总开关关闭时按钮文案为「通知总开关：关」')

    const collapsed = nfNodes(nfPage())
    check(!collapsed.some((node) => textOf(node) === '会话完成：内部说明'), '场景设置默认收起，不渲染场景行')
    const expanded = nfNodes(nfPage(), { showKinds: true })
    const switches = expanded.filter((node) => typeof node.props.className === 'string' && node.props.className.startsWith('nf-switch'))
    check(switches.length === 16, `展开后每个场景一个开关（当前 ${switches.length} 个）`)
    check(switches.filter((node) => node.props.className.includes('nf-switch-on')).length === 12,
      '开关状态与 enabled 一致（12 个开着的显示为高亮态）')

    // 点「仅未读」应把筛选槽改成 unread；点场景开关应触发一次配置写入（提示槽被赋值）。
    // showKinds 打开，否则场景开关根本没渲染出来，后面对开关的断言会假失败。
    const slots = nfSlots(nfPage(), { showKinds: true })
    OVERRIDES.set('NotificationsPanel', slots)
    collector = []
    render(elOf(nfPanel.component))
    const liveNodes = collector
    collector = null
    const onlyUnread = liveNodes.find((node) => node.type === 'button' && textOf(node) === '仅未读')
    if (onlyUnread === undefined) fail('面板缺少「仅未读」筛选按钮')
    else {
      onlyUnread.props.onClick()
      check(slots[1] === 'unread', '点「仅未读」把筛选状态切到 unread')
    }
    // 面板上只该剩一个「测试系统通知」。以前有三个测试按钮（发条测试 / 测试系统通知 /
    // 测试兜底通道），用户要求精简，这里反向盯住别再长回来。
    const testButtons = liveNodes.filter((node) => node.type === 'button' && textOf(node).indexOf('测试') !== -1)
    check(testButtons.length === 1 && textOf(testButtons[0]) === '测试系统通知',
      `面板只剩一个测试按钮（当前 ${testButtons.map((node) => textOf(node)).join(' / ') || '无'}）`)
    check(liveNodes.some((node) => node.type === 'button' && textOf(node) === '系统通知设置'), '面板有「系统通知设置」入口')

    const kindToggle = liveNodes.find((node) => typeof node.props.className === 'string' && node.props.className.startsWith('nf-switch'))
    if (kindToggle === undefined) fail('面板缺少场景开关')
    else {
      // 点击后的提示要等 fetch 回来才写进 notice 槽，而这里的 fetch 永久 pending，
      // 所以只能断言「点下去不炸」——真正的写入由下面的 Host 用例覆盖。
      let threw = null
      try { kindToggle.props.onClick() } catch (e) { threw = e }
      check(threw === null, '点场景开关不抛异常（写入走 Host 用例验证）')
    }
  }
}

// ── mcp（MCP server 管理：直接改 profile 的 cordis.patch.yml）──
// 这个面板的写入路径会动真实 profile，所以这里**只测渲染**：加载中、空列表、
// 列表读失败、选中条目后的表单与密钥隐藏提示、新增态、探活结果表。
// Host 侧的 YAML 读写另起一组（[3b]），用临时 patch 文件跑，绝不碰 ~/.dsh。
{
  const mcPanel = panelOf('mcp')
  if (mcPanel === undefined) fail('mcp 面板未注册（main / mcp）')
  check(glyphOf('mcp') === undefined, 'mcp 不自己注册侧边栏入口（已收进 toolkit）')

  if (mcPanel !== undefined) {
    // Panel 的 useState 槽位顺序（改组件就要同步改这里）：meta、list、selected、draft、
    // secretRevealed、dirty、busy、notice、probe
    const mcMeta = {
      patchPath: '/home/x/.dsh/profiles/desktop/cordis.patch.yml',
      profileDir: '/home/x/.dsh/profiles/desktop',
      yamlAvailable: true, atomicAvailable: true, mcpClientAvailable: true, hmrAvailable: true,
      mcpEntryCount: 2, patchExists: true,
    }
    const mcServerOf = (over) => ({
      entryId: 'mcp-demo', serverName: 'demo', transport: 'stdio', enabled: true, hasOverride: true,
      config: {
        transport: 'stdio', serverName: 'demo', command: 'node', args: ['-v'], cwd: '',
        env: { TOKEN: 'abcd…' }, toolPrefix: 'mcp__demo__', secretKeys: ['env', 'TOKEN'],
      },
      ...over,
    })
    const mcServer = mcServerOf({})
    const mcListData = { ok: true, servers: [mcServer] }
    const mcLoaded = { loading: false, data: mcMeta, error: null }
    // 9 个槽：meta、list、selected、draft、secretRevealed、dirty、busy、notice、probe。
    // rest 是 probe 之后的槽位（目前没有），探活状态单独传，别让数组长度串位。
    const mcSlots = (metaState, listState, selected = null, draft = null, probeState = null, rest = []) =>
      OVERRIDES.set('Panel', [metaState, listState, selected, draft, false, false, null, null, probeState, ...rest])

    const mcCases = [
      ['加载中', () => { mcSlots({ loading: true, data: null, error: null }, { loading: true, data: null, error: null }); return elOf(mcPanel.component) }, ['读取中…']],
      ['元信息栏', () => {
        mcSlots(mcLoaded, { loading: true, data: null, error: null })
        return elOf(mcPanel.component)
      }, ['cordis.patch.yml', 'yaml', 'atomic', 'mcpClient', 'hmr', '重新加载插件']],
      ['能力缺失时打叉', () => {
        mcSlots({ loading: false, data: { ...mcMeta, yamlAvailable: false, hmrAvailable: false }, error: null }, { loading: true, data: null, error: null })
        return elOf(mcPanel.component)
      }, ['✕ yaml', '✕ hmr']],
      ['空列表', () => {
        mcSlots(mcLoaded, { loading: false, data: { ok: true, servers: [] }, error: null })
        return elOf(mcPanel.component)
      }, ['还没有 MCP server', '+ 新增 server', '左侧选一条 server']],
      ['列表读失败', () => {
        mcSlots(mcLoaded, { loading: false, data: null, error: 'HTTP 500' })
        return elOf(mcPanel.component)
      }, ['列表读取失败：HTTP 500']],
      ['列表有两条（启用/停用并存）', () => {
        mcSlots(mcLoaded, {
          loading: false,
          data: { ok: true, servers: [mcServer, mcServerOf({ entryId: 'mcp-off', serverName: 'off', enabled: false, transport: 'streamable-http' })] },
          error: null,
        })
        return elOf(mcPanel.component)
      }, ['demo', '已启用', 'off', '已停用', 'stdio', 'streamable-http', 'mcp__demo__*', '2 条']],
      ['选中条目 → 详情表单（stdio）', () => {
        const draft = {
          entryId: 'mcp-demo', created: false, serverName: 'demo', transport: 'stdio', command: 'node',
          argsText: '-v', cwd: '', url: '', toolCallTimeoutMs: '60000', maxInstructionBytes: '32768',
          failOnStartupError: false, reconnectEnabled: true, reconnectInitial: '', reconnectMax: '', reconnectAttempts: '',
          secretText: 'TOKEN=abcd…',
        }
        mcSlots(mcLoaded, { loading: false, data: mcListData, error: null }, 'mcp-demo', draft, { running: false, data: null, error: null })
        return elOf(mcPanel.component)
      }, ['serverName', 'transport', 'command', 'args（一行一个）', 'cwd', 'env（一行一个 KEY=VALUE', '保存', '删除']],
      ['选中条目 → 密钥隐藏提示', () => {
        const draft = {
          entryId: 'mcp-demo', created: false, serverName: 'demo', transport: 'stdio', command: 'node',
          argsText: '-v', cwd: '', url: '', toolCallTimeoutMs: '', maxInstructionBytes: '',
          failOnStartupError: false, reconnectEnabled: true, reconnectInitial: '', reconnectMax: '', reconnectAttempts: '',
          secretText: 'TOKEN=abcd…',
        }
        mcSlots(mcLoaded, { loading: false, data: mcListData, error: null }, 'mcp-demo', draft, { running: false, data: null, error: null })
        return elOf(mcPanel.component)
      }, ['密钥已隐藏', '显示密钥']],
      ['选中条目 → streamable-http 表单', () => {
        const draft = {
          entryId: 'mcp-off', created: false, serverName: 'off', transport: 'streamable-http', command: '',
          argsText: '', cwd: '', url: 'https://mcp.example.com/sse', toolCallTimeoutMs: '', maxInstructionBytes: '',
          failOnStartupError: false, reconnectEnabled: false, reconnectInitial: '', reconnectMax: '', reconnectAttempts: '',
          secretText: '',
        }
        mcSlots(mcLoaded, {
          loading: false,
          data: { ok: true, servers: [mcServer, mcServerOf({ entryId: 'mcp-off', serverName: 'off', enabled: false, transport: 'streamable-http' })] },
          error: null,
        }, 'mcp-off', draft, { running: false, data: null, error: null })
        return elOf(mcPanel.component)
      }, ['url（必填', 'headers（一行一个 KEY=VALUE）']],
      ['新增态', () => {
        const draft = {
          entryId: null, created: true, serverName: '', transport: 'stdio', command: '',
          argsText: '', cwd: '', url: '', toolCallTimeoutMs: '', maxInstructionBytes: '',
          failOnStartupError: false, reconnectEnabled: true, reconnectInitial: '', reconnectMax: '', reconnectAttempts: '',
          secretText: '',
        }
        mcSlots(mcLoaded, { loading: false, data: mcListData, error: null }, null, draft, { running: false, data: null, error: null })
        return elOf(mcPanel.component)
      }, ['新增 MCP server', '未保存', 'id 默认为 mcp-&lt;serverName&gt;'.replace('&lt;', '<').replace('&gt;', '>')]],
      ['探活结果表', () => {
        const draft = {
          entryId: 'mcp-demo', created: false, serverName: 'demo', transport: 'stdio', command: 'node',
          argsText: '-v', cwd: '', url: '', toolCallTimeoutMs: '', maxInstructionBytes: '',
          failOnStartupError: false, reconnectEnabled: true, reconnectInitial: '', reconnectMax: '', reconnectAttempts: '',
          secretText: 'TOKEN=abcd…',
        }
        mcSlots(mcLoaded, { loading: false, data: mcListData, error: null }, 'mcp-demo', draft,
          { running: false, data: { ok: true, tools: [{ name: 'ping', description: '探活用工具' }], serverInfo: { name: 'demo', version: '1.0.0' }, elapsedMs: 120 }, error: null })
        return elOf(mcPanel.component)
      }, ['ping', '探活用工具', 'demo', '1.0.0']],
    ]
    runGroup('mcp', ['Panel'], mcCases)

    // 交互：列表行与主按钮可点且不抛（真请求由 fetch 永不 resolve 挡掉）。
    const renderedMc = []
    collector = renderedMc
    try {
      mcSlots(mcLoaded, { loading: false, data: mcListData, error: null })
      render(elOf(mcPanel.component))
      const row = renderedMc.find((node) => node.props !== null && String(node.props.className ?? '') === 'mc-item')
      check(row !== undefined, '列表渲染出 mc-item 行')
      if (row !== undefined) {
        let threw = null
        try { row.props.onClick() } catch (e) { threw = e }
        check(threw === null, '点 mc-item 行不抛异常')
      }
      const createBtn = renderedMc.find((node) => node.props !== null && String(node.props.className ?? '').includes('mc-btn-primary'))
      check(createBtn !== undefined, '有「+ 新增 server」主按钮')
      if (createBtn !== undefined) {
        let threw = null
        try { createBtn.props.onClick() } catch (e) { threw = e }
        check(threw === null, '点「+ 新增 server」不抛异常')
      }
    } finally { collector = null }
  }
}

// ── skill（Skill 目录管理：读写 .dsh/skills 等六个根）──
{
  const skPanel = panelOf('skill')
  if (skPanel === undefined) fail('skill 面板未注册（main / skill）')
  check(glyphOf('skill') === undefined, 'skill 不自己注册侧边栏入口（已收进 toolkit）')

  if (skPanel !== undefined) {
    // Panel 的 useState 槽位顺序：meta、list、selected、detail、mode、rawDraft、fields、
    // dirty、busy、notice、createDraft
    const skRoots = [
      { id: 'user-dsh', path: '/home/x/.dsh/skills', source: 'user-dsh', rank: 400, writable: true, exists: true, label: '用户（DSH）' },
      { id: 'bundled', path: '/opt/bundled/skills', source: 'bundled', rank: 600, writable: false, exists: true, label: '内置（只读）' },
    ]
    const skMeta = { dshHome: '/home/x/.dsh', cwd: '/work', projectRoot: '/work', roots: skRoots, atomicAvailable: true, dependencyError: null }
    const skItemOf = (over) => ({
      name: 'demo-skill', path: '/home/x/.dsh/skills/demo-skill/SKILL.md', rootId: 'user-dsh', source: 'user-dsh',
      rank: 400, relativePath: 'demo-skill/SKILL.md', kind: 'directory', writable: true, valid: true,
      description: '演示用 skill', whenToUse: '', modelInvocable: true, userInvocable: true, disabled: false,
      shadowedBy: null, error: null, issues: [], size: 120, mtimeMs: 1, resources: [],
      ...over,
    })
    const skListOf = (skills, over) => ({
      ok: true, dshHome: '/home/x/.dsh', cwd: '/work', projectRoot: '/work', roots: skRoots,
      skills,
      counts: {
        total: skills.length,
        valid: skills.filter((item) => item.valid === true).length,
        invalid: skills.filter((item) => item.valid !== true).length,
        shadowed: skills.filter((item) => item.shadowedBy !== null).length,
      },
      official: { available: true, count: 2, names: ['a', 'b'] },
      discrepancies: { missingOnDisk: [] },
      ...over,
    })
    const skMetaState = { loading: false, data: skMeta, error: null }
    // 11 个槽：meta、list、selected、detail、mode、rawDraft、fields、dirty、busy、notice、createDraft
    const skFields = { name: '', description: '', whenToUse: '', metadataText: '', body: '', modelInvocable: true, userInvocable: true }
    const skCreate = { open: false, root: 'user-dsh', name: '', description: '', whenToUse: '', kind: 'directory' }
    const skSlots = (listState, selected = null, detail = { loading: false, data: null, error: null }, rest = []) =>
      OVERRIDES.set('Panel', [skMetaState, listState, selected, detail, 'raw', '', skFields, false, null, null, skCreate, ...rest])

    const skCases = [
      ['加载中', () => { skSlots({ loading: true, data: null, error: null }); return elOf(skPanel.component) }, ['正在扫描 skill 目录…']],
      ['空列表', () => {
        skSlots({ loading: false, data: skListOf([]), error: null })
        return elOf(skPanel.component)
      }, ['没有找到任何 skill', '＋ 新建 skill', '从左侧选一个 skill']],
      ['列表读失败', () => {
        skSlots({ loading: false, data: null, error: 'HTTP 500' })
        return elOf(skPanel.component)
      }, ['列表加载失败：HTTP 500']],
      ['一条有效 skill', () => {
        skSlots({ loading: false, data: skListOf([skItemOf({})]), error: null })
        return elOf(skPanel.component)
      }, ['demo-skill', '有效', 'user-dsh', '只读']],
      ['坏文件可见并给原因', () => {
        skSlots({ loading: false, data: skListOf([skItemOf({}), skItemOf({ name: 'bad-skill', valid: false, error: '缺少必填字段 description' })]), error: null })
        return elOf(skPanel.component)
      }, ['bad-skill', '未生效', '缺少必填字段 description', '有效 1 / 未生效 1']],
      ['被覆盖 + 调用策略徽标', () => {
        skSlots({
          loading: false,
          data: skListOf([skItemOf({ modelInvocable: false, userInvocable: false, shadowedBy: { rootId: 'bundled', name: 'demo-skill' } })]),
          error: null,
        })
        return elOf(skPanel.component)
      }, ['模型不可调用', '用户不可调用', '被 bundled 覆盖']],
      ['官方服务不可用时的提示', () => {
        skSlots({ loading: false, data: skListOf([skItemOf({})], { official: { available: false, count: 0, names: [] } }), error: null })
        return elOf(skPanel.component)
      }, ['官方识别', '服务不可用']],
      ['官方识别数量', () => {
        skSlots({ loading: false, data: skListOf([skItemOf({})]), error: null })
        return elOf(skPanel.component)
      }, ['2 个', '同步官方服务']],
      ['选中 skill → 编辑区', () => {
        skSlots({ loading: false, data: skListOf([skItemOf({})]), error: null }, { rootId: 'user-dsh', name: 'demo-skill' }, {
          loading: false,
          // 详情对象形状对齐 host 的 /api/skill/one：parsed / body / content / resources / frontmatterText 都在
          data: {
            ...skItemOf({}),
            content: '---\nname: demo-skill\ndescription: 演示用 skill\n---\n\n正文',
            frontmatterText: 'name: demo-skill\ndescription: 演示用 skill',
            body: '正文',
            parsed: { name: 'demo-skill', description: '演示用 skill', whenToUse: null, metadata: null, modelInvocable: true, userInvocable: true },
            legacy: [],
          },
          error: null,
        })
        return elOf(skPanel.component)
      }, ['demo-skill', '保存', '删除', '原文', '表单', '模型可调用', '用户可调用']],
    ]
    runGroup('skill', ['Panel'], skCases)
  }
}

// ── toolkit（外壳：把五个面板收进同一套分页）──
// 侧边栏只允许一条 entry：`toolkit`（图标 + 标签「工具集」）。分页切换全部在
// 面板内部完成 —— 曾经还有一条无标签的 `toolkit-quick` 行（并排 A/M/N 三个
// 小图标），用户嫌丑，已撤掉，这里反向锁死「不要再回来」。
// 五个业务组件的 sidebar.panellist 入口在这个 bundle 里必须消失，否则侧边栏
// 会变回 6 行。
{
  const tkShellPanel = panelOf('toolkit')
  const tkShellGlyph = glyphOf('toolkit')
  if (tkShellPanel === undefined) fail('toolkit 主面板未注册（main / toolkit）')
  if (tkShellGlyph === undefined) fail('toolkit 侧边栏入口未注册（sidebar.panellist / toolkit）')

  if (tkShellGlyph !== undefined) {
    check(tkShellGlyph.meta.label === '工具集' && tkShellGlyph.meta.order === 48,
      `toolkit 侧边栏入口：label=工具集，order=48（实际 ${tkShellGlyph.meta.label} / ${tkShellGlyph.meta.order}）`)
  }
  check(glyphOf('toolkit-quick') === undefined, 'toolkit 不再注册并排小图标行（toolkit-quick 已撤掉）')

  // 反向断言：五个业务组件不能再自己注册侧边栏入口。
  for (const id of ['image-gen', 'model-test', 'notifications', 'mcp', 'skill']) {
    check(glyphOf(id) === undefined, `${id} 不再自己注册侧边栏入口（已收进 toolkit）`)
  }
  // 侧边栏总共一条：toolkit（token-usage 早已隐藏）。
  const panellistEntries = plugins.filter((p) => p.meta.name === 'sidebar.panellist')
  check(panellistEntries.length === 1,
    `侧边栏只留一条入口（实际 ${panellistEntries.length}：${panellistEntries.map((p) => p.meta.id).join(' / ') || '无'}）`)

  if (tkShellPanel !== undefined && tkShellGlyph !== undefined) {
    const tkCases = [
      ['分页栏与默认分页', () => elOf(tkShellPanel.component),
        ['图片生成', '剪贴板', '模型测试', '通知', 'MCP', 'Skill', '设置', '左栏收纳']],
      ['侧边栏主图标', () => elOf(tkShellGlyph.component, { size: 18 }), ['T']],
    ]
    runGroup('toolkit', ['ToolkitPanel', 'Panel'], tkCases)
  }
}

// ───────────────────── 3) Host 侧：工具 + 路由冒烟 ─────────────────────
console.log()
console.log('[3] Host 侧：generate_image 工具 + 画廊路由')

const IMAGE_GEN_DIR = path.join(ROOT, 'components', 'image-gen')
const importHost = (file) => import(pathToFileURL(path.join(IMAGE_GEN_DIR, file)).href)

// 「获取可用模型」只列生图模型：过滤规则直接回归（保住过的、滤掉非生图）。
{
  const sr = await importHost('settings-routes.js')
  const kept = sr.filterImageModels(['flux-pro-1.1', 'dall-e-3', 'nano-banana', 'sd3-medium', 'gpt-4o', 'whisper-1', 'sora-video', 'text-embedding-3-large'])
  const expect = ['flux-pro-1.1', 'dall-e-3', 'nano-banana', 'sd3-medium']
  check(kept.length === expect.length && expect.every((id) => kept.includes(id)),
    '生图模型过滤：只保留生图模型（留 ' + kept.join(',') + '；滤掉 gpt-4o / whisper / video / embedding）')
}

function makeHostCtx() {
  const tools = []
  const routes = new Map()
  return {
    tools,
    routes,
    ctx: {
      effect(run) { run(); return () => {} },
      timeout() { return () => {} },
      get(name) {
        if (name === 'credentials') return { resolve: async () => undefined }
        if (name === 'sessions') return { list: () => [] }
        return undefined
      },
      settings: { get: () => undefined },
      tools: { register(tool) { tools.push(tool); return () => {} } },
      connection: {
        fetch: {
          register(route) {
            if (routes.has(route.path)) throw new Error('duplicate route ' + route.path)
            routes.set(route.path, route)
            return () => routes.delete(route.path)
          },
        },
      },
    },
  }
}

const host = makeHostCtx()
const HOST_FILES = ['host.js', 'gallery-page.js', 'gallery-actions.js', 'gallery-favorites.js', 'settings-routes.js', 'generate-route.js', 'library-routes.js']
try {
  const modules = await Promise.all(HOST_FILES.map(importHost))
  const shapesOk = modules.every((m, i) => Array.isArray(m.inject) && typeof m.apply === 'function')
  check(shapesOk, `${HOST_FILES.join(' / ')} 导出 inject[] + apply()`)
  modules.forEach((m) => m.apply(host.ctx))
} catch (e) {
  fail('Host 模块加载/apply 失败 → ' + e.message)
}

// 纯 helper 模块：不参与 apply()，只验证语法仍可解析
try {
  await Promise.all(['config.js', 'generate.js', 'library.js', 'prompts.js'].map(importHost))
  pass('helper 模块 config.js / generate.js / library.js / prompts.js 仍可解析')
} catch (e) {
  fail('helper 文件解析失败 → ' + e.message)
}

const tool = host.tools.find((t) => t.name === 'generate_image')
check(tool !== undefined, '注册了 generate_image 工具')
if (tool !== undefined) {
  const props = tool.parameters?.properties ?? {}
  check(
    ['prompt', 'size', 'count', 'image'].every((k) => props[k] !== undefined) && (tool.parameters?.required ?? []).includes('prompt'),
    'generate_image 参数形状：prompt(required)/size/count/image',
  )
  const outSchema = tool.output?.schema?.properties ?? {}
  check(
    ['ok', 'imageUrls', 'files', 'error'].every((k) => outSchema[k] !== undefined) && typeof tool.output?.render === 'function',
    'generate_image 输出 schema 与 render 齐全',
  )
  // 用自检临时配置隔离，绝不碰真实用户配置（~/.dsh/image-gen.json）。
  const TOOL_CFG = path.join(ROOT, '.selfcheck-image-gen-config.json')
  process.env.IMAGE_GEN_CONFIG = TOOL_CFG
  await fs.rm(TOOL_CFG, { force: true }).catch(() => {})
  const KEY_ENVS = ['CUSTOM_API_KEY']
  const savedKeys = KEY_ENVS.map((name) => [name, process.env[name]])
  try {
    for (const name of KEY_ENVS) delete process.env[name]
    // 开放版不内置模型：空目录要给出「先添加模型」的可操作提示，且不得触网。
    const empty = await tool.execute({ prompt: '自检：空目录不得触网' }, {})
    check(empty?.ok === false && typeof empty.error === 'string' && empty.error.includes('模型目录为空'),
      '目录为空时快速失败并提示先添加模型')

    // 再放一条没有密钥的模型，断言缺口被点名为具体的密钥变量。
    await fs.writeFile(TOOL_CFG, JSON.stringify({
      models: [{ id: 'custom:nokey', group: 'custom', name: 'NoKey', model: 'nokey', baseURL: 'https://images.example.com/v1', keyEnv: 'CUSTOM_API_KEY' }],
      defaultId: 'custom:nokey',
    }))
    const out = await tool.execute({ prompt: '自检：无凭据时不得触网' }, {})
    check(out?.ok === false && typeof out.error === 'string' && /_API_KEY/.test(out.error),
      '无凭据时快速失败并给出可操作提示')
  } catch (e) {
    fail('无凭据分支抛异常 → ' + e.message)
  } finally {
    for (const [name, value] of savedKeys) { if (value !== undefined) process.env[name] = value }
    await fs.rm(TOOL_CFG, { force: true }).catch(() => {})
  }
}

const EXPECTED = [
  ['/api/image-gen', 'GET'],
  ['/api/image-gen/config', 'GET'],
  ['/api/image-gen/config', 'POST'],
  ['/api/image-gen/config/test', 'POST'],
  ['/api/image-gen/config/models', 'POST'],
  ['/api/image-gen/delete', 'POST'],
  ['/api/image-gen/favorites', 'GET'],
  ['/api/image-gen/favorites/file', 'GET'],
  ['/api/image-gen/file', 'GET'],
  ['/api/image-gen/favorite', 'POST'],
  ['/api/image-gen/generate', 'POST'],
  ['/api/image-gen/library', 'GET'],
  ['/api/image-gen/library', 'POST'],
  ['/api/image-gen/unfavorite', 'POST'],
]
const expectedPaths = [...new Set(EXPECTED.map(([p]) => p))].sort()
check(
  JSON.stringify([...host.routes.keys()].sort()) === JSON.stringify(expectedPaths),
  `路由表与预期一致（${expectedPaths.join(', ')}）`,
)
for (const [p, method] of EXPECTED) {
  const route = host.routes.get(p)
  if (route === undefined) continue
  check(route.methods.includes(method), `${p} 方法为 ${method}`)
}

const base = 'http://127.0.0.1:3080'
const callRoute = (p, search, init) => host.routes.get(p).fetch(new Request(base + p + search, init))
const reqJson = (p, body) => callRoute(p, '', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

if (host.routes.has('/api/image-gen') && host.routes.has('/api/image-gen/favorites')) {
  try {
    const page = await (await callRoute('/api/image-gen', '?offset=0&limit=24')).json()
    check(Array.isArray(page.files) && typeof page.hasKey === 'boolean' && typeof page.total === 'number', 'GET /api/image-gen 返回 files/total/hasKey')
    const fav = await (await callRoute('/api/image-gen/favorites', '?offset=0&limit=24')).json()
    check(Array.isArray(fav.files) && Array.isArray(fav.names), 'GET /api/image-gen/favorites 返回 files/names')
    const traversal = await callRoute('/api/image-gen/file', '?name=' + encodeURIComponent('../../etc/passwd'))
    check(traversal.status === 400, 'GET /api/image-gen/file 拒绝目录穿越（../）')
    const delIllegal = await reqJson('/api/image-gen/delete', { name: 'passwd' })
    check(delIllegal.status === 400, 'POST /api/image-gen/delete 拒绝非图片文件名（400）')
    // 真正的越界验证：handler 在扫描目录里按名找文件。若 basename 归一化失效，
    // join(dir, '../x') 会命中上级目录（即这里放在 ROOT 下的诱饵）并删除它。
    const decoy = path.join(ROOT, 'image-gen-check-decoy.png')
    try {
      await fs.writeFile(decoy, 'decoy')
      const delTraversal = await reqJson('/api/image-gen/delete', { name: '../image-gen-check-decoy.png' })
      const survived = await fs.readFile(decoy, 'utf8').then((text) => text === 'decoy', () => false)
      check(delTraversal.status === 404 && survived, 'POST /api/image-gen/delete 目录穿越无效（外层诱饵文件仍在，返回 404）')
      const favTraversal = await reqJson('/api/image-gen/favorite', { name: '../image-gen-check-decoy.png' })
      check(favTraversal.status === 404, 'POST /api/image-gen/favorite 目录穿越无效（返回 404）')
    } finally {
      await fs.rm(decoy, { force: true })
    }

    // 收藏 = 索引标记：图片始终只有 images/ 一份，不再复制到 favorites/。
    const IMG_DIR = path.join(SANDBOX_DATA, 'image-gen', 'images')
    const SELFCHECK_IMG = 'image-gen-selfcheck.png'
    await fs.mkdir(IMG_DIR, { recursive: true })
    await fs.writeFile(path.join(IMG_DIR, SELFCHECK_IMG), 'PNG-BYTES')
    const marked = await reqJson('/api/image-gen/favorite', { name: SELFCHECK_IMG })
    check(marked.status === 200, 'POST /api/image-gen/favorite 收藏成功（200）')
    const listed = await (await callRoute('/api/image-gen/favorites', '?offset=0&limit=24')).json()
    const hit = (listed.files ?? []).find((file) => file.name === SELFCHECK_IMG)
    check(hit !== undefined && typeof hit.favoritedAt === 'number' && (listed.names ?? []).includes(SELFCHECK_IMG),
      '收藏后出现在 /favorites 列表里（带 favoritedAt）')
    check(!(await fs.access(path.join(SANDBOX_DATA, 'image-gen', 'favorites')).then(() => true, () => false)),
      '收藏不会创建 favorites/ 目录（图片只有一份）')
    const favBytes = await (await callRoute('/api/image-gen/favorites/file', '?name=' + SELFCHECK_IMG)).text()
    check(favBytes === 'PNG-BYTES', 'GET /api/image-gen/favorites/file 直接从 images/ 读原图')
    const unmarked = await reqJson('/api/image-gen/unfavorite', { name: SELFCHECK_IMG })
    check(unmarked.status === 200, 'POST /api/image-gen/unfavorite 取消收藏成功')
    check(await fs.access(path.join(IMG_DIR, SELFCHECK_IMG)).then(() => true, () => false),
      '取消收藏后图片文件仍在（不删图）')
    const againUnfav = await reqJson('/api/image-gen/unfavorite', { name: SELFCHECK_IMG })
    check(againUnfav.status === 404, '重复取消收藏返回 404（收藏中没有这张图）')
  } catch (e) {
    fail('路由响应冒烟异常 → ' + e.message)
  }
}
// ── 配置与生图路由 ──
if (host.routes.has('/api/image-gen/config') || host.routes.has('/api/image-gen/generate') || host.routes.has('/api/image-gen/config/test')) {
  const SELFCHECK_CFG = path.join(ROOT, '.selfcheck-image-gen-config.json')
  process.env.IMAGE_GEN_CONFIG = SELFCHECK_CFG
  try { await fs.rm(SELFCHECK_CFG, { force: true }) } catch {}
  try {
if (host.routes.has('/api/image-gen/config')) {
      const getCfg = await (await callRoute('/api/image-gen/config')).json()
      check(getCfg.ok === true && getCfg.config !== undefined && typeof getCfg.config.baseURL === 'string',
        'GET /api/image-gen/config 返回 { ok: true, config: { baseURL, model, hasKey, ... } }')
      check(typeof getCfg.config.hasKey === 'boolean' && Array.isArray(getCfg.config.providers),
        'GET config 返回 hasKey 布尔值与 providers[]（组目录）')
      check(getCfg.config.catalog.entries.length === 0 && getCfg.config.providerCount === 0,
        '不内置厂商模型：初始目录为空')

      // 无密钥时不得触网（此刻目录也还空着）。
      const testNoKey = await reqJson('/api/image-gen/config/test', {})
      check(testNoKey.status === 400, 'POST /api/image-gen/config/test 无 Key 返回 400（不触网）')
      const testBadId = await reqJson('/api/image-gen/config/test', { id: 'p9:not-exist' })
      check(testBadId.status === 404, 'POST config/test 按 id 测试：目录无此模型返回 404（不触网）')
      const modelsNoKey = await reqJson('/api/image-gen/config/models', {})
      check(modelsNoKey.status === 400, 'POST /api/image-gen/config/models 无 Key 返回 400（不触网）')

      // 建组：组名 / 链接 / API Key / 勾选的模型一把写入。
      const addGroup = await reqJson('/api/image-gen/config', {
        action: 'addProvider', name: 'DL 网关', baseURL: 'https://images.example.com/v1',
        apiKey: 'sk-selfcheck-a', models: [{ model: 'test-image-a' }, { model: 'test-image-b' }],
      })
      const afterGroup = await addGroup.json()
      const provider = afterGroup.config.providers[0]
      check(addGroup.status === 200 && afterGroup.config.providers.length === 1 && provider.name === 'DL 网关',
        'addProvider 建组成功（名字 / 链接 / 密钥 / 勾选模型）')
      check(provider.models.length === 2 && provider.hasKey === true && provider.keyEnv !== 'CUSTOM_API_KEY',
        '组内模型就位，且该组有自己的密钥变量（两个网关不再互相覆盖）')
      check(afterGroup.config.defaultId === provider.models[0].id && afterGroup.config.model === 'test-image-a',
        '目录为空时第一条模型自动成为默认')

      const addMore = await reqJson('/api/image-gen/config', {
        action: 'addModels', providerId: provider.id,
        models: [{ model: 'test-image-a' }, { model: 'test-image-c', name: 'Test C' }],
      })
      const afterMore = await addMore.json()
      check(addMore.status === 200 && afterMore.added === 1 && afterMore.config.providers[0].models.length === 3,
        'addModels 只补新的（已在组里的跳过）')

      const addSecond = await reqJson('/api/image-gen/config', {
        action: 'addProvider', name: '备用网关', baseURL: 'https://images2.example.com/v1',
        models: [{ model: 'test-image-a' }],
      })
      const afterSecond = await addSecond.json()
      const allIds = afterSecond.config.providers.flatMap((item) => item.models.map((model) => model.id))
      check(afterSecond.config.providers.length === 2 && new Set(allIds).size === allIds.length,
        '不同组里的同名模型各自独立（模型 id 不撞车）')

      const targetModel = afterSecond.config.providers[0].models[0]
      const editModel = await reqJson('/api/image-gen/config', {
        action: 'updateModel', id: targetModel.id, name: 'Test A（改名）', model: 'test-image-a', pricePerImage: 0.05,
      })
      const afterEdit = await editModel.json()
      const edited = afterEdit.config.providers[0].models[0]
      check(editModel.status === 200 && edited.name === 'Test A（改名）' && edited.pricePerImage === 0.05,
        'updateModel 改显示名与每张单价')

      const switched = await reqJson('/api/image-gen/config', { action: 'setDefault', id: edited.id })
      const switchedBody = await switched.json()
      check(switched.status === 200 && switchedBody.config.defaultId === edited.id,
        'setDefault 切换默认模型，生成将使用该模型')

      const rmModel = await reqJson('/api/image-gen/config', { action: 'removeModel', id: edited.id })
      const afterRmModel = await rmModel.json()
      check(rmModel.status === 200 && afterRmModel.config.modelCount === 3, 'removeModel 删掉组内一条模型')

      const rmGroup = await reqJson('/api/image-gen/config', { action: 'removeProvider', id: provider.id })
      const afterRmGroup = await rmGroup.json()
      check(rmGroup.status === 200 && afterRmGroup.config.providers.length === 1 && afterRmGroup.config.modelCount === 1,
        'removeProvider 连组带模型一起删')
      check(afterRmGroup.config.defaultId === afterRmGroup.config.providers[0].models[0].id,
        '默认模型自动落到剩下的那条')

      // 全删空：GET 不抛错、empty=true；生成接口明确报「目录为空」而不是 500。
      for (const item of afterRmGroup.config.providers) {
        await reqJson('/api/image-gen/config', { action: 'removeProvider', id: item.id })
      }
      const emptyView = await (await callRoute('/api/image-gen/config')).json()
      check(emptyView.ok === true && emptyView.config.empty === true && emptyView.config.modelCount === 0,
        '目录删空后 config 仍可读且标记 empty（不崩）')
      const genEmptyDir = await reqJson('/api/image-gen/generate', { prompt: '测试空目录' })
      check(genEmptyDir.status === 400, '目录为空时生成接口返回 400 明确报错（不 500）')
      // 收尾：留一个能用的组，别给自检留下空目录。
      await reqJson('/api/image-gen/config', {
        action: 'addProvider', name: '自检组', baseURL: 'https://images.example.com/v1',
        models: [{ model: 'test-image-a' }],
      })
    }

    // ── config.js 纯函数：v1（平铺模型）→ v2（组 + 组内模型）迁移 ──
    try {
      const cfg = await import(pathToFileURL(path.join(IMAGE_GEN_DIR, 'config.js')).href)
      const legacy = {
        models: [
          { id: 'custom:flux-pro-1.1', group: 'custom', name: 'FLUX', model: 'flux-pro-1.1', baseURL: 'https://a.example.com/v1', keyEnv: 'CUSTOM_API_KEY' },
          { id: 'custom:dall-e-3', group: 'custom', name: 'DALL·E', model: 'dall-e-3', baseURL: 'https://a.example.com/v1', keyEnv: 'CUSTOM_API_KEY' },
          { id: 'custom:gpt-image-1', group: 'custom', name: 'GPT', model: 'gpt-image-1', baseURL: 'https://b.example.com/v1', keyEnv: 'CUSTOM_API_KEY' },
        ],
        defaultId: 'custom:dall-e-3',
        keys: { CUSTOM_API_KEY: 'sk-legacy' },
      }
      const migrated = cfg.normalizeFile(legacy)
      check(migrated.version === 2 && migrated.providers.length === 2 && migrated.models.length === 3,
        `v1 平铺目录按 baseURL 归成 2 个组（当前 ${migrated.providers.length} 组 / ${migrated.models.length} 模型）`)
      check(migrated.providers[0].keyEnv === 'CUSTOM_API_KEY' && migrated.keys.CUSTOM_API_KEY === 'sk-legacy',
        '迁移沿用原 keyEnv 与已存密钥（老用户的 Key 不丢）')
      const flat = cfg.materializeCatalog(migrated)
      check(flat.entries.length === 3 && flat.defaultId === migrated.providers[0].id + ':dall-e-3',
        '迁移后 defaultId 指向新 id（旧 group 前缀换成组 id）')
      check(cfg.normalizeFile(migrated).providers[0].id === migrated.providers[0].id
        && cfg.normalizeFile(migrated).providers[1].id === migrated.providers[1].id,
        '重复读取迁移结果 id 稳定（确定性，不会每次换 id）')
    } catch (e) {
      fail('config.js 迁移用例异常 → ' + e.message)
    }

    if (host.routes.has('/api/image-gen/generate')) {
      const genEmpty = await reqJson('/api/image-gen/generate', { prompt: '' })
      check(genEmpty.status === 400, 'POST /api/image-gen/generate 空 prompt 返回 400')
    }
  } catch (e) {
    fail('配置/生图路由冒烟异常 → ' + e.message)
  }
}
// ── 库路由（提示词）──
if (host.routes.has('/api/image-gen/library')) {
  const SELFCHECK_LIB = path.join(ROOT, '.selfcheck-image-gen-library.json')
  process.env.IMAGE_GEN_LIBRARY = SELFCHECK_LIB
  try { await fs.rm(SELFCHECK_LIB, { force: true }) } catch {}
  try {
    const getLib = await (await callRoute('/api/image-gen/library')).json()
    check(getLib.ok === true && Array.isArray(getLib.library.prompts),
      'GET /api/image-gen/library 返回 { ok, library: { prompts: [] } }')

    const save = await (await reqJson('/api/image-gen/library', { action: 'upsert', kind: 'prompt', title: '自检提示词', text: 'a red fox', size: '2K', ratio: '1:1' })).json()
    check(save.ok === true && typeof save.id === 'string', 'POST library upsert 成功返回 id')

    const again = await (await callRoute('/api/image-gen/library')).json()
    check(again.ok === true && again.library.prompts.length === 1 && again.library.prompts[0].text === 'a red fox',
      'upsert 后 GET 读到最新提示词')

    const tag = await (await reqJson('/api/image-gen/library', { action: 'tag', kind: 'prompt', id: save.id, names: ['a.png'] })).json()
    check(tag.ok === true && tag.library.prompts[0].images.length === 1,
      'POST library tag 给提示词关联生成图片名')

    const del = await (await reqJson('/api/image-gen/library', { action: 'delete', kind: 'prompt', id: save.id })).json()
    check(del.ok === true && del.library.prompts.length === 0,
      'POST library delete 删除成功')
  } catch (e) {
    fail('库路由冒烟异常 → ' + e.message)
  }
}

// ── 图片提示词索引（prompts.js）：生成时记录 + 老图按库反查 + 删除清理 ──
if (host.routes.has('/api/image-gen')) {
  const PROMPTS_TMP = path.join(ROOT, '.selfcheck-image-prompts.json')
  const LIB_TMP = path.join(ROOT, '.selfcheck-image-gen-library.json')
  const IMG_TMP = path.join(ROOT, '.selfcheck-image-prompts-images')
  const savedPromptsEnv = [['IMAGE_GEN_PROMPTS', process.env.IMAGE_GEN_PROMPTS], ['IMAGE_GEN_LIBRARY', process.env.IMAGE_GEN_LIBRARY], ['IMAGE_GEN_DIR', process.env.IMAGE_GEN_DIR]]
  process.env.IMAGE_GEN_PROMPTS = PROMPTS_TMP
  process.env.IMAGE_GEN_LIBRARY = LIB_TMP
  process.env.IMAGE_GEN_DIR = IMG_TMP
  try {
    await fs.rm(PROMPTS_TMP, { force: true })
    await fs.rm(LIB_TMP, { force: true })
    await fs.rm(IMG_TMP, { recursive: true, force: true })
    await fs.mkdir(IMG_TMP, { recursive: true })
    const prompts = await importHost('prompts.js')

    // 1) 索引缺失 → 空表，不抛
    const blank = await prompts.readPromptIndex()
    check(blank.images !== null && Object.keys(blank.images).length === 0, '索引文件缺失时降级为空表（不抛）')

    // 2) 记录 + 读回；一次多张只写一遍
    await prompts.recordImagePrompts([
      { name: 'image-gen-a.png', prompt: '泳池里的女孩，黄昏侧逆光', model: 'flux-pro-1.1', size: '1024x1024', mode: 'text' },
      { name: 'image-gen-b.png', prompt: '一只戴墨镜的柴犬', model: 'flux-pro-1.1', size: '1024x1024', mode: 'image' },
      { name: 'image-gen-c.png', prompt: '   ', model: 'flux-pro-1.1' },   // 空提示词跳过
    ])
    const idx = await prompts.readPromptIndex()
    check(Object.keys(idx.images).length === 2 && idx.images['image-gen-a.png'].prompt === '泳池里的女孩，黄昏侧逆光',
      '生成时记下每张图的提示词（空提示词不入索引）')
    check(idx.images['image-gen-b.png'].mode === 'image', '记录区分文生图 / 图生图（mode）')

    // 3) 查表：索引命中带 source=index
    const hit = await prompts.lookupImagePrompts(['image-gen-a.png', 'not-recorded.png'])
    check(hit['image-gen-a.png']?.source === 'index' && hit['not-recorded.png'] === undefined,
      'lookupImagePrompts 只回有记录的名字，source 标 index')

    // 4) 老图（索引里没有）按提示词库 prompts[].images 反查
    await fs.writeFile(LIB_TMP, JSON.stringify({
      prompts: [{ id: 'p1', title: '老图提示词', text: '早期归档的一段提示词', size: '1024x1024', images: ['agnes-old.png'], createdAt: 1, updatedAt: 2 }],
    }))
    const legacy = await prompts.lookupImagePrompts(['agnes-old.png', 'image-gen-a.png'])
    check(legacy['agnes-old.png']?.prompt === '早期归档的一段提示词' && legacy['agnes-old.png']?.source === 'library',
      '老图按提示词库反查得到提示词（source 标 library）')
    check(legacy['image-gen-a.png']?.source === 'index', '索引优先于提示词库反查')

    // 5) attachImagePrompts：无记录也要给出 prompt:null，形状稳定
    const attached = await prompts.attachImagePrompts([
      { name: 'image-gen-a.png', bytes: 1, mtime: 1, dir: IMG_TMP },
      { name: 'agnes-old.png', bytes: 1, mtime: 1, dir: IMG_TMP },
      { name: 'unknown.png', bytes: 1, mtime: 1, dir: IMG_TMP },
    ])
    check(attached[0].prompt === '泳池里的女孩，黄昏侧逆光' && attached[0].promptSource === 'index',
      'attachImagePrompts 给列表项补 prompt / promptSource')
    check(attached[1].promptSource === 'library' && attached[2].prompt === null && attached[2].promptSource === null,
      '无记录的图片带 prompt:null，列表形状统一')

    // 6) 生成图列表接口真的把提示词带出来了
    await fs.writeFile(path.join(IMG_TMP, 'image-gen-a.png'), 'x')
    const page = await (await callRoute('/api/image-gen', '?offset=0&limit=24')).json()
    const listed = (page.files || []).find((file) => file.name === 'image-gen-a.png')
    check(listed !== undefined && listed.prompt === '泳池里的女孩，黄昏侧逆光',
      'GET /api/image-gen 的 files 项带 prompt（面板零额外请求即可旁注）')

    // 7) 删除图片 → 索引条目同步清掉
    await prompts.forgetImagePrompts(['image-gen-a.png'])
    const afterForget = await prompts.readPromptIndex()
    check(afterForget.images['image-gen-a.png'] === undefined && afterForget.images['image-gen-b.png'] !== undefined,
      'forgetImagePrompts 只清掉指定条目')
    const afterDelete = await reqJson('/api/image-gen/delete', { name: 'image-gen-a.png' })
    check(afterDelete.status === 200, 'POST /api/image-gen/delete 成功删除图片')

    // 8) 索引文件损坏 → 降级空表（面板少显示提示词，不影响图片本身）
    await fs.writeFile(PROMPTS_TMP, '{不是 JSON')
    const broken = await prompts.readPromptIndex()
    check(Object.keys(broken.images).length === 0, '索引文件损坏时降级为空表（不抛）')
  } catch (e) {
    fail('图片提示词索引用例异常 → ' + (e && e.stack ? e.stack.split('\n')[0] : String(e)))
  } finally {
    for (const [name, value] of savedPromptsEnv) { if (value === undefined) delete process.env[name]; else process.env[name] = value }
    for (const target of [PROMPTS_TMP, LIB_TMP]) await fs.rm(target, { force: true }).catch(() => {})
    await fs.rm(IMG_TMP, { recursive: true, force: true }).catch(() => {})
  }
}

// ── 参考图本地路径校验（generate.js）：只允许真正的图片文件 ──
// 回归来源：本地路径分支读到什么就原样 base64 发给第三方生图接口，
// 不加校验等于「把本机任意文件外发出去」的通路 —— 提示词注入就能利用。
try {
  const gen = await import(pathToFileURL(path.join(ROOT, 'components', 'image-gen', 'generate.js')).href)
  const REF_TMP = await fs.mkdtemp(path.join(os.tmpdir(), 'ag-ref-'))
  const PNG_HEAD = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')

  // 1) 非图片扩展名 → 直接拒绝（不再兜底成 image/png 硬发）
  for (const [label, target] of [['系统文件', '/etc/hosts'], ['配置文件', path.join(ROOT, 'package.json')]]) {
    const denied = await gen.resolveReferenceImage(target)
    check(denied.error !== undefined && denied.value === undefined, `参考图拒绝非图片扩展名（${label}）`)
  }

  // 2) 扩展名像图片、内容不是图片 → 按文件头拒绝
  const fake = path.join(REF_TMP, 'secret.png')
  await fs.writeFile(fake, JSON.stringify({ apiKey: 'sk-fixture-example-not-real' }))
  check((await gen.resolveReferenceImage(fake)).error !== undefined, '参考图按文件头校验内容（伪装成 .png 的文本被拒）')

  // 3) 超过体积上限 → 拒绝（防止把请求体撑爆、拖慢生成链路）
  const big = path.join(REF_TMP, 'big.png')
  await fs.writeFile(big, Buffer.concat([PNG_HEAD, Buffer.alloc(gen.MAX_REFERENCE_BYTES + 1)]))
  const bigResult = await gen.resolveReferenceImage(big)
  check(bigResult.error !== undefined && /上限/.test(bigResult.error), '参考图超过体积上限被拒（10 MB）')

  // 4) 真图片照常通过，MIME 由文件头决定（不看扩展名）
  const realPng = path.join(REF_TMP, 'ok.png')
  await fs.writeFile(realPng, PNG_HEAD)
  const pngOk = await gen.resolveReferenceImage(realPng)
  check(pngOk.value !== undefined && pngOk.value.startsWith('data:image/png;base64,'), '真 PNG 参考图正常转 data URI')
  const webpMisnamed = path.join(REF_TMP, 'misnamed.png')
  await fs.writeFile(webpMisnamed, Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(16)]))
  const webpOk = await gen.resolveReferenceImage(webpMisnamed)
  check(webpOk.value !== undefined && webpOk.value.startsWith('data:image/webp;base64,'),
    'MIME 以文件头为准（.png 里的 webp 按 image/webp 发）')

  // 5) https / data URL 仍原样放行（不受本地路径校验影响）
  const urlRef = 'https://images.example.com/v1/a.png'
  check((await gen.resolveReferenceImage(urlRef)).value === urlRef, 'https URL 参考图原样放行')
  const dataRef = 'data:image/png;base64,AAAA'
  check((await gen.resolveReferenceImage(dataRef)).value === dataRef, 'data URL 参考图原样放行')

  await fs.rm(REF_TMP, { recursive: true, force: true }).catch(() => {})
} catch (e) {
  fail('参考图校验用例异常 → ' + (e && e.stack ? e.stack.split('\n')[0] : String(e)))
}

// ── token-usage host：scan 冒烟（会话标题提取 + 模型总量） ──
try {
  const tkHost = await import(pathToFileURL(path.join(ROOT, 'components', 'token-usage', 'host.js')).href)
  const tkRoutes = new Map()
  const sessions = []
  const nowMs = Date.now()
  const fakeSession = {
    id: 'session-selfcheck',
    header: { id: 'session-selfcheck', cwd: '/tmp/some-project', origin: 'session' },
    inheritedEventCount: 0,
    snapshotEvents: () => [
      { seq: 1, time: nowMs - 60000, type: 'user/message', data: { role: 'user', id: 'u1', content: [{ type: 'text', text: 'hi' }] } },
      {
        seq: 2, time: nowMs - 30000, type: 'assistant/message',
        data: { usage: { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 200, cacheWriteTokens: 100, reasoningTokens: 0 }, message: { source: { model: 'selfcheck-model', provider: 'p' } } },
      },
      { seq: 3, time: nowMs - 20000, type: 'session/title', data: { title: '  真实会话标题  ', messageSeqs: [1], source: 'user' } },
    ],
  }
  sessions.push(fakeSession)
  // host 冒烟要真发请求（models.dev 同步打本地 server），恢复原生 fetch。
  globalThis.fetch = NATIVE_FETCH
  // ── 价目冒烟准备：插件自有文件（env 注入临时路径）+ 本地 server 模拟 models.dev ──
  const PRICING_TMP = path.join(ROOT, '.selfcheck-token-pricing.json')
  process.env.TOKEN_USAGE_PRICING = PRICING_TMP
  await fs.rm(PRICING_TMP, { force: true })   // 上次运行的残留会让"文件缺失"断言假失败
  const MODELS_DEV_FIXTURE = {
    anthropic: { name: 'Anthropic', models: {
      'claude-opus-5': { name: 'Claude Opus 5', cost: { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 }, release_date: '2026-01-01' },
      'selfcheck-sync-model': { name: 'Sync Only', cost: { input: 2, output: 8 }, release_date: '2026-02-01' },
      'old-deprecated': { name: 'Old', status: 'deprecated', cost: { input: 1, output: 2 } },
      'tts-voice': { name: 'Voice', cost: { input: 1, output: 2 } },
      'provider/weird:variant': { name: 'Weird', cost: { input: 3, output: 3 }, release_date: '2026-03-01' },
      'ds/selfcheck-model:v2': { name: 'Selfcheck Model', cost: { input: 0.15, output: 0.6, cache_read: 0.003 }, release_date: '2026-05-01' },
    } },
    dup: { name: 'Dup', models: {
      'dup/claude-opus-5': { name: 'Dup Opus', cost: { input: 7.7, output: 7.7 }, release_date: '2026-04-01' },
    } },
  }
  const cleanupSelfcheckPricing = async () => {
    await new Promise((resolve) => modelsDevServer.close(resolve))
    try { await fs.rm(PRICING_TMP, { force: true }) } catch {}
  }
  const modelsDevServer = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify(MODELS_DEV_FIXTURE))
  })
  await new Promise((resolve) => modelsDevServer.listen(0, '127.0.0.1', resolve))
  const modelsDevUrl = 'http://127.0.0.1:' + modelsDevServer.address().port + '/api.json'
  process.env.MODELS_DEV_API_URL = modelsDevUrl
  tkHost.apply({
    effect(run) { run(); return () => {} },
    timeout() { return () => {} },
    on() { return () => {} },
    get(name) {
      if (name === 'sessions') return { list: () => sessions }
      return undefined
    },
    connection: {
      fetch: {
        register(route) {
          if (tkRoutes.has(route.path)) throw new Error('duplicate route ' + route.path)
          tkRoutes.set(route.path, route)
          return () => tkRoutes.delete(route.path)
        },
      },
    },
  })
  const tkFetch = tkRoutes.get('/api/token-usage')
  check(tkFetch !== undefined, 'token-usage host 注册了 /api/token-usage')
  const tkPricing = tkRoutes.get('/api/token-usage/pricing')
  check(tkPricing !== undefined, 'token-usage host 注册了 /api/token-usage/pricing')
  check(tkPricing !== undefined && tkPricing.methods.includes('GET') && tkPricing.methods.includes('POST'),
    'pricing 路由支持 GET + POST')
  if (tkFetch !== undefined) {
    const usage = await (await tkFetch.fetch(new Request('http://127.0.0.1:3080/api/token-usage?range=today'))).json()
    check(Array.isArray(usage.sessions) && usage.sessions.length === 1, 'token-usage scan 统计到 stub 会话')
    check(usage.sessions?.[0]?.title === '真实会话标题',
      `scan 取事件流 session/title 作为会话标题（当前：${JSON.stringify(usage.sessions?.[0]?.title)}）`)
    const m = usage.models?.[0]
    check(m !== undefined && m.loop === 1800,
      `模型分布含总量 loop = input+output+cacheRead+cacheWrite（当前：${JSON.stringify(m?.loop)}）`)
  }
  if (tkPricing !== undefined) {
    const call = async (body) => {
      const response = await tkPricing.fetch(new Request('http://127.0.0.1:3080/api/token-usage/pricing', body === undefined ? {} : {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      }))
      return response.json()
    }
    // 1) 文件不存在 → 纯内置
    const plain = await call()
    check(plain.available === true && plain.source === 'builtin' && plain.overrides === 0 && plain.entries.length >= 79,
      `价目文件缺失时走内置表兜底（entries=${plain.entries.length}）`)
    check(plain.exchangeRate === 7.2, `汇率字段默认 7.2（当前：${plain.exchangeRate}）`)
    // 1.5) 汇率设置
    const badRate = await call({ action: 'rate', usdToCny: -1 })
    check(badRate.ok === false, '无效汇率被拒绝（负数）')
    await call({ action: 'rate', usdToCny: 7.5 })
    const withRate = await call()
    check(withRate.exchangeRate === 7.5, `汇率写入插件自有文件并可读回（当前：${withRate.exchangeRate}）`)
    // 2) 用户 upsert：覆盖内置 + 新增自定义
    await call({ action: 'upsert', entries: [
      { modelId: 'claude-opus-5', displayName: 'Claude Opus 5（手工价）', input: 9, output: 90, cacheRead: 0.9, cacheWrite: 9 },
      { modelId: 'selfcheck-user-model', displayName: '手工自定义', input: 7, output: 7, cacheRead: 0.7, cacheWrite: 0.7 },
    ] })
    const custom = await call()
    const opus = custom.entries.find((item) => item.modelId === 'claude-opus-5')
    check(custom.source === 'builtin+user' && custom.overrides === 2,
      `自定义价目写入插件自有文件并合并（overrides=${custom.overrides}）`)
    check(opus !== undefined && opus.input === 9, `自定义价覆盖内置价（opus input=${opus?.input}）`)
    check(custom.entries.some((item) => item.modelId === 'selfcheck-user-model'), '新增自定义模型进入价目表')
    // 3) 删除（墓碑）：删掉一个稍后 sync 会带回来的模型
    await call({ action: 'delete', modelId: 'selfcheck-sync-model' })
    // 4) models.dev 同步（本地 server fixture）——只同步在用模型（stub 会话用 selfcheck-model）
    const syncResult = await call({ action: 'sync' })
    check(syncResult.ok === true && /1 个在用模型/.test(String(syncResult.message)),
      `models.dev 同步只挑在用模型（${syncResult.message}）`)
    const afterSync = await call()
    check(afterSync.entries.some((item) => item.modelId === 'selfcheck-model'),
      '同步条目经 ID 归一化进入价目表（provider/ 前缀与 :变体 剥离）')
    check(!afterSync.entries.some((item) => item.modelId === 'weird' || item.modelId === 'claude-opus-5' && afterSync.entries.find((x) => x.modelId === 'claude-opus-5')?.displayName === 'Dup Opus'),
      '范围过滤生效：未使用的模型（weird 等）不被同步')
    check(!afterSync.entries.some((item) => item.modelId === 'selfcheck-sync-model'), '删除墓碑生效：同步不复活已删除条目')
    const opusAfter = afterSync.entries.find((item) => item.modelId === 'claude-opus-5')
    check(opusAfter !== undefined && opusAfter.input === 9 && opusAfter.displayName === 'Claude Opus 5（手工价）',
      '同步不覆盖用户手工价（user 优先于 models-dev）')
    check(afterSync.entries.some((item) => item.modelId === 'selfcheck-user-model'), '同步保留用户自定义模型')
    check(afterSync.sync !== undefined && afterSync.sync.lastSyncAt > 0 && afterSync.sync.lastSyncError === null && afterSync.sync.lastCount === 1,
      '同步时间与状态写回（lastSyncAt/lastSyncError/lastCount）')
    check(!afterSync.entries.some((item) => item.modelId === 'old-deprecated' || item.modelId === 'tts-voice'),
      '同步过滤 deprecated 与非文本模型')
    // 5) 价目文件损坏 → 降级内置 + 错误提示
    await fs.writeFile(PRICING_TMP, '{不是 JSON')
    const broken = await call()
    check(broken.source === 'builtin' && broken.error !== null && broken.entries.length >= 79,
      '价目文件损坏时降级内置并标错误，价目不丢')
  }
  // 6) flattenModelsDev 纯函数：过滤 + 归一化 + 同 ID 去重取最新发布
  const flattened = tkHost.flattenModelsDev(MODELS_DEV_FIXTURE)
  const dupOpus = flattened.find((item) => item.modelId === 'claude-opus-5')
  check(flattened.length === 4 && dupOpus !== undefined && dupOpus.displayName === 'Dup Opus' && dupOpus.input === 7.7,
    `flattenModelsDev 过滤/归一化/去重取最新（n=${flattened.length}, opus=${dupOpus?.displayName}）`)
  await cleanupSelfcheckPricing()
} catch (e) {
  fail('token-usage host 冒烟异常 → ' + (e && e.stack ? e.stack.split('\n')[0] : String(e)))
}

// ── model-test host：目录 + 单组单模型 / 整组 / 全部三种入口 ──
try {
  const mtHost = await import(pathToFileURL(path.join(ROOT, 'components', 'model-test', 'host.js')).href)
  const mtRoutes = new Map()
  const calls = []
  const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

  const MODELS = {
    dl: [
      { id: 'gpt-6-sol', name: 'GPT-6 Sol', inputModalities: ['text'] },
      { id: 'deepseek-flash', name: 'deepseek-flash', inputModalities: ['text'] },
    ],
    xiaomi: [{ id: 'mimo-v2.6-pro', name: 'MiMo v2.6 Pro', inputModalities: ['text', 'image'] }],
  }
  const fakeLlm = {
    listProviders: () => [{ id: 'dl', name: 'DL 网关' }, { id: 'xiaomi', name: 'Xiaomi' }, { id: 'broken', name: 'Broken' }],
    listConfigurableProviders: () => [{ provider: 'dl', displayName: 'DL 网关' }, { provider: 'xiaomi', displayName: 'Xiaomi' }],
    listModels: async (provider) => {
      if (provider === 'broken') throw new Error('adapter exploded')
      return MODELS[provider] ?? []
    },
    resolveModelInfo: async (provider, model) => {
      // 能力快照：gpt-6-sol 只给 low/medium/high 三档，用来验证「不支持的档位自动降级」。
      if (provider === 'dl' && model === 'gpt-6-sol') {
        return {
          provider, id: model, name: 'GPT-6 Sol',
          reasoning: { efforts: [{ id: 'low', name: 'Low' }, { id: 'medium', name: 'Medium' }, { id: 'high', name: 'High' }], defaultEffort: 'medium' },
          context: { contextWindow: 400000 }, defaultMaxTokens: 8192,
          inputModalities: ['text', 'image'],
        }
      }
      // anthropic 侧：用来验证 compat.supportsTemperature 只在这条协议上才建议写入。
      if (provider === 'claude' && model === 'claude-opus-5') {
        return {
          provider, id: model, name: 'Claude Opus 5',
          reasoning: { efforts: [{ id: 'off', name: 'Off' }, { id: 'low', name: 'Low' }, { id: 'high', name: 'High' }], defaultEffort: 'high' },
          context: { contextWindow: 200000 }, defaultMaxTokens: 64000,
          inputModalities: ['text'],
        }
      }
      if (provider === 'xiaomi' && model === 'mimo-v2.6-pro') {
        return {
          provider, id: model, name: 'MiMo v2.6 Pro',
          reasoning: { efforts: [{ id: 'off', name: 'Off' }, { id: 'low', name: 'Low' }], defaultEffort: 'low' },
        }
      }
      throw new Error('no capability for ' + provider + '/' + model)
    },
    stream: (options) => {
      calls.push({
        provider: options.provider, model: options.model, maxTokens: options.maxTokens,
        temperature: options.temperature, reasoningEffort: options.reasoningEffort,
        text: options.messages?.[0]?.content?.[0]?.text, hasSignal: options.signal !== undefined,
        tools: Array.isArray(options.tools) ? options.tools.map((tool) => tool.name) : null,
        contentTypes: Array.isArray(options.messages?.[0]?.content)
          ? options.messages[0].content.map((part) => part.type)
          : null,
      })
      const signal = options.signal
      const key = options.provider + '/' + options.model
      return (async function* () {
        if (key === 'dl/gpt-6-sol') {
          await sleep(5)
          yield { type: 'text-delta', index: 0, text: 'po' }
          const promptText = options.messages?.[0]?.content?.[0]?.text
          if (promptText !== 'burst') await sleep(250)
          yield { type: 'usage', usage: { inputTokens: 3, outputTokens: 20, totalTokens: 23, cacheReadTokens: 1, cacheWriteTokens: 0, reasoningTokens: 0 } }
          yield { type: 'finish', reason: { kind: 'stop' } }
          return
        }
        if (key === 'dl/deepseek-flash') {
          await sleep(2)
          yield { type: 'finish', reason: { kind: 'error', failure: { message: 'HTTP 401 unauthorized', code: 'UNAUTHORIZED', status: 401 } } }
          return
        }
        // xiaomi：一个分片都不发，只等 signal 中止 —— 用来验证超时归因。
        await new Promise((resolve) => {
          if (signal === undefined || signal.aborted === true) { resolve(); return }
          signal.addEventListener('abort', () => resolve(), { once: true })
        })
        yield { type: 'finish', reason: { kind: 'aborted', failure: { message: 'aborted', code: 'ABORTED' } } }
      })()
    },
  }

  // 假的 DSH 配置服务：一个声明了 models 的 provider（可写）+ 一个没声明的（不可写）。
  // 用途是验证「读现有值 → 与预设建议比 diff → 只补缺 / 覆盖差异」这条路，
  // 以及 temperature 永远不出现在模型级字段里。
  const dshConfig = {
    providers: {
      dl: {
        apiKeyEnv: 'DL_API_KEY',
        // 真实本机就是这个协议：它不接受 compat.supportsTemperature，所以面板不该提这个开关。
        api: 'openai-responses',
        models: [
          {
            id: 'gpt-6-sol', name: 'GPT-6 Sol',
            contextWindow: 1050000, maxTokens: 8192,
            reasoningEfforts: { low: 'low', medium: 'medium', high: 'high' },
          },
          { id: 'deepseek-flash', name: 'deepseek-flash' },
        ],
      },
      // 用来钉住 anthropic 独有的 compat.supportsTemperature：只补这个键，用户自己的开关不能丢。
      claude: {
        apiKeyEnv: 'CLAUDE_API_KEY',
        api: 'anthropic-messages',
        models: [
          {
            id: 'claude-opus-5', name: 'Claude Opus 5',
            contextWindow: 200000, maxTokens: 64000, input: ['text'],
            compat: { forceAdaptiveThinking: true },
          },
        ],
      },
      xiaomi: { apiKeyEnv: 'XIAOMI_API_KEY' },
    },
  }
  const dshWrites = []
  const fakeSettings = {
    describe: () => [{ ns: 'llm-pi-ai', revision: 5, value: { providers: dshConfig.providers } }],
    mutate: async (ns, ops, expected) => {
      dshWrites.push({ ns, ops, expected })
      for (const op of ops) {
        const path = [...op.path]
        const last = path.pop()
        let cursor = dshConfig
        for (const key of path) {
          if (cursor[key] === undefined) cursor[key] = /^\d+$/.test(key) ? [] : {}
          cursor = cursor[key]
        }
        if (/^\d+$/.test(last) && Array.isArray(cursor)) cursor[Number(last)] = op.value
        else cursor[last] = op.value
      }
    },
  }

  mtHost.apply({
    effect(run) { run(); return () => {} },
    timeout() { return () => {} },
    get(name) {
      if (name === 'llm') return fakeLlm
      if (name === 'settings') return fakeSettings
      return undefined
    },
    connection: {
      fetch: {
        register(route) {
          if (mtRoutes.has(route.path)) throw new Error('duplicate route ' + route.path)
          mtRoutes.set(route.path, route)
          return () => mtRoutes.delete(route.path)
        },
      },
    },
  })

  const mtCatalogRoute = mtRoutes.get('/api/model-test/catalog')
  const mtRunRoute = mtRoutes.get('/api/model-test/run')
  check(mtCatalogRoute !== undefined && mtCatalogRoute.methods.includes('GET'), 'model-test 注册了 GET /api/model-test/catalog')
  check(mtRunRoute !== undefined && mtRunRoute.methods.includes('POST'), 'model-test 注册了 POST /api/model-test/run')

  const mtCall = async (path, body, method = body === undefined ? 'GET' : 'POST') => {
    const route = mtRoutes.get(path.split('?')[0])
    if (route === undefined) throw new Error('route not registered: ' + path)
    if (!route.methods.includes(method)) throw new Error('route ' + path + ' does not allow ' + method)
    const init = method === 'GET' ? { method } : {
      method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}),
    }
    const response = await route.fetch(new Request('http://127.0.0.1:3080' + path, init))
    return { status: response.status, body: await response.json() }
  }

  if (mtCatalogRoute !== undefined && mtRunRoute !== undefined) {
    const cat = await mtCall('/api/model-test/catalog')
    check(cat.body.ok === true && cat.body.providerCount === 2 && cat.body.modelCount === 3,
      `目录按「已注册 route」列出组与模型（providerCount=${cat.body.providerCount}, modelCount=${cat.body.modelCount}）`)
    check(cat.body.groups.map((g) => g.id).join(',') === 'dl,xiaomi',
      `目录组按名称排序（当前：${cat.body.groups.map((g) => g.id).join(',')}）`)
    check(cat.body.failures.length === 1 && cat.body.failures[0].id === 'broken' && cat.body.failures[0].message === 'adapter exploded',
      '某组 listModels 抛错时进 failures，不影响其它组')

    // ① 全部：一次请求覆盖 成功 / 失败 / 超时 三种结论（timeoutMs 压到下限，用例只花 1 秒）。
    calls.length = 0
    const all = await mtCall('/api/model-test/run', { timeoutMs: 1000 })
    const byKey = new Map(all.body.results.map((item) => [item.provider + '/' + item.model, item]))
    check(all.status === 200 && all.body.results.length === 3 && calls.length === 3, '不传范围内参数 → 测全部模型')
    const good = byKey.get('dl/gpt-6-sol')
    check(good?.ok === true && good.status === 'ok' && good.finishKind === 'stop',
      '成功用例：finish stop → ok')
    check(good?.outputTokens === 20 && typeof good.ttftMs === 'number' && good.ttftMs >= 0 && good.ttftMs < 500,
      `成功用例给出首字延迟（ttftMs=${good?.ttftMs}）`)
    check(typeof good?.tokensPerSecond === 'number' && good.tokensPerSecond > 0,
      `成功用例由 usage 算出输出速度（${good?.tokensPerSecond?.toFixed?.(1)} tok/s）`)
    check(good?.usage?.cacheReadTokens === 1, '结果里带回完整 usage（缓存计数不被丢掉）')
    const bad = byKey.get('dl/deepseek-flash')
    check(bad?.ok === false && bad.status === 'error' && bad.finishKind === 'error' && /401/.test(bad.message),
      `失败用例：finish error → 报错信息透传（${bad?.message}）`)
    const slow = byKey.get('xiaomi/mimo-v2.6-pro')
    check(slow?.ok === false && slow.status === 'timeout' && /1000ms/.test(slow.message),
      `超时用例：不响应 abort 的适配器也被 timeoutMs 掐断（${slow?.message}）`)
    check(all.body.summary.total === 3 && all.body.summary.ok === 1 && all.body.summary.failed === 2,
      `汇总成功/失败数（${all.body.summary.ok}/${all.body.summary.total}）`)
    check(all.body.summary.averageTtftMs === good.ttftMs && all.body.summary.averageTokensPerSecond === good.tokensPerSecond,
      '平均首字/平均速度只统计有效读数（失败与超时不参与拉低均值）')
    check(calls.every((item) => item.text === '请连续输出 80 个「测速」，词与词之间只用空格，不要解释。' && item.hasSignal === true),
      '每次测试都带默认测速 prompt 与 AbortSignal')
    const expectedSpeed = good.outputTokens / (good.totalMs / 1000)
    check(Math.abs(good.tokensPerSecond - expectedSpeed) < 0.001,
      `输出速度 = 输出 tokens / 总耗时（${good.tokensPerSecond} vs ${expectedSpeed}）`)
    const burst = await mtCall('/api/model-test/run', { provider: 'dl', model: 'gpt-6-sol', prompt: 'burst' })
    const burstResult = burst.body.results[0]
    const burstExpected = burstResult.outputTokens / (burstResult.totalMs / 1000)
    check(typeof burstResult.tokensPerSecond === 'number' && Math.abs(burstResult.tokensPerSecond - burstExpected) < 0.001,
      '短窗口也按总耗时给速度，不再显示 —')

    // ② 单个组：provider 一挡 → 只测该组。
    calls.length = 0
    const oneGroup = await mtCall('/api/model-test/run', { provider: 'dl', timeoutMs: 1000 })
    check(oneGroup.body.results.length === 2 && calls.length === 2 && calls.every((item) => item.provider === 'dl'),
      '只传 provider → 只测该组的模型')

    // ③ 单个组下单个模型：最小粒度。
    calls.length = 0
    const oneModel = await mtCall('/api/model-test/run', { provider: 'dl', model: 'gpt-6-sol' })
    check(oneModel.body.results.length === 1 && oneModel.body.results[0].modelName === 'GPT-6 Sol'
      && calls.length === 1 && calls[0].model === 'gpt-6-sol',
      '传 provider + model → 只测组内单个模型（并在结果里带回显示名）')

    // ④ 参数越界：clamp 到安全区间，且真的作用到 stream 上。
    calls.length = 0
    const clamped = await mtCall('/api/model-test/run', {
      provider: 'dl', model: 'gpt-6-sol', maxTokens: 99999, concurrency: 99, timeoutMs: 10, prompt: '  hi  ',
    })
    check(clamped.body.options.maxTokens === 1024 && clamped.body.options.concurrency === 8
      && clamped.body.options.timeoutMs === 1000 && clamped.body.options.prompt === 'hi',
      '越界参数被 clamp 到安全区间（maxTokens/timeoutMs/concurrency/prompt）')
    check(calls.length === 1 && calls[0].maxTokens === 1024 && calls[0].text === 'hi',
      'clamp 后的参数真的传给了 ctx.llm.stream')

    // ⑤ 匹配不到目标 / llm 不可用：明确报错而不是空跑。
    const noTarget = await mtCall('/api/model-test/run', { provider: 'nope' })
    check(noTarget.status === 400 && noTarget.body.code === 'model-test/no-target',
      '匹配不到任何目标时返回 400 + model-test/no-target（不空跑）')

    // ⑥ 预设：目录里每个模型都带上命中的预设与推断参数。
    const presetOf = new Map(cat.body.groups.flatMap((g) => g.models.map((m) => [g.id + '/' + m.id, m])))
    check(presetOf.get('dl/gpt-6-sol')?.preset?.id === 'openai-gpt-6'
      && presetOf.get('dl/gpt-6-sol').preset.supportsTemperature === false,
      `按模型名命中内置预设（gpt-6-sol → ${presetOf.get('dl/gpt-6-sol')?.preset?.id}）`)
    check(presetOf.get('xiaomi/mimo-v2.6-pro')?.preset?.id === 'mimo-v2-6',
      `按模型名命中内置预设（mimo-v2.6-pro → ${presetOf.get('xiaomi/mimo-v2.6-pro')?.preset?.id}）`)
    check(presetOf.get('dl/deepseek-flash')?.preset !== undefined && presetOf.get('dl/deepseek-flash').preset !== null,
      'deepseek-flash 也有可命中的预设族（不靠人工记参数）')
    check(cat.body.presets?.familyCount > 50 && cat.body.presets?.builtinAt !== undefined,
      `目录带回预设元信息（${cat.body.presets?.familyCount} 族，内置表 ${cat.body.presets?.builtinAt}）`)
    check(typeof cat.body.files?.params === 'string' && /params\.json$/.test(cat.body.files.params),
      '目录标明参数覆盖文件的落点')

    // ⑦ 无手工配置时：测试参数完全由预设推断（temperature 被 supportsTemperature:false 略过）。
    calls.length = 0
    const presetOnly = await mtCall('/api/model-test/run', { provider: 'dl', model: 'gpt-6-sol', maxTokens: 32 })
    const presetCall = calls[0]
    check(presetOnly.body.results[0].params?.source === 'preset'
      && presetOnly.body.results[0].params.reasoningEffort === 'medium'
      && presetCall.reasoningEffort === 'medium',
      `没有手工配置时按预设推断档位（${presetOnly.body.results[0].params?.source} → ${presetCall.reasoningEffort}）`)
    check(presetCall.temperature === undefined && presetOnly.body.results[0].params.temperature === null,
      '预设标记不支持 temperature 的模型，绝不硬发该字段')
    check(presetOnly.body.results[0].params.maxTokens === 32 && presetCall.maxTokens === 32,
      '预设建议的输出上限（8192/16384）不参与测速，仍按测试上限发')

    // ⑧ 手工配置：逐字段覆盖预设，并按 provider+model 隔离。
    const saved = await mtCall('/api/model-test/config', {
      entries: [{ provider: 'dl', model: 'gpt-6-sol', params: { temperature: 1.1, maxTokens: 48, reasoningEffort: 'high' } }],
    }, 'POST')
    check(saved.status === 200 && saved.body.ok === true && Object.keys(saved.body.overrides).length === 1,
      'POST /config 写入逐模型参数覆盖')
    const savedCat = await mtCall('/api/model-test/catalog')
    const savedModel = savedCat.body.groups.find((g) => g.id === 'dl').models.find((m) => m.id === 'gpt-6-sol')
    check(savedModel.paramsOverride?.reasoningEffort === 'high' && savedModel.paramsOverride.temperature === 1.1,
      '目录回读覆盖值（面板可直接展示）')
    calls.length = 0
    const overridden = await mtCall('/api/model-test/run', { provider: 'dl', model: 'gpt-6-sol', maxTokens: 32 })
    check(overridden.body.results[0].params?.source === 'override'
      && overridden.body.results[0].params.reasoningEffort === 'high'
      && calls[0].reasoningEffort === 'high' && calls[0].maxTokens === 32,
      '手工配置优先于预设，并且测试输出上限仍然收顶')
    check(calls[0].temperature === undefined && /不接受 temperature/.test(overridden.body.results[0].params.note),
      '手工配置也不能突破「模型不支持 temperature」的安全阀')

    // ⑨ 安全阀：档位不在模型能力里 → 自动降级并说明，绝不把非法档位发给适配器。
    //    先把手工覆盖清空，好让「本次指定」成为唯一来源。
    await mtCall('/api/model-test/config', {
      entries: [{ provider: 'dl', model: 'gpt-6-sol', params: { temperature: null, maxTokens: null, reasoningEffort: null } }],
    }, 'POST')
    calls.length = 0
    const degraded = await mtCall('/api/model-test/run', {
      provider: 'dl', model: 'gpt-6-sol', params: { reasoningEffort: 'xhigh' },
    })
    check(degraded.body.results[0].params.reasoningEffort === 'medium'
      && calls[0].reasoningEffort === 'medium'
      && /不支持/.test(degraded.body.results[0].params.note),
      `本次指定的档位超出模型能力时降级到默认档（xhigh → ${calls[0].reasoningEffort}）`)
    check(degraded.body.results[0].params.source === 'target'
      && degraded.body.results[0].params.sourceLabel === '本次指定',
      '本次指定的参数标为 target 来源')

    // ⑩ 整组默认：优先级低于单模型配置，高于预设。
    const groupSaved = await mtCall('/api/model-test/config', {
      entries: [{ provider: 'dl', model: '*', params: { temperature: 0.4 } }],
    }, 'POST')
    check(groupSaved.status === 200 && Object.keys(groupSaved.body.overrides).length === 1,
      '整组默认单独成键（p\0*），不与单模型键冲突')
    calls.length = 0
    const groupRun = await mtCall('/api/model-test/run', { provider: 'dl', model: 'deepseek-flash', maxTokens: 16 })
    check(groupRun.body.results[0].params?.source === 'group' && calls[0].maxTokens === 16,
      `没有单模型配置时落到整组默认（${groupRun.body.results[0].params?.source}）`)

    // ⑪ inspect：读取真实能力并生成可粘贴的 YAML 片段。
    const inspected = await mtCall('/api/model-test/inspect', { provider: 'dl', model: 'gpt-6-sol' })
    check(inspected.status === 200 && inspected.body.live?.defaultMaxTokens === 8192
      && inspected.body.live.efforts.length === 3
      && inspected.body.live.contextWindow === 400000,
      'inspect 读到适配器真实能力（efforts / defaultMaxTokens / contextWindow）')
    check(typeof inspected.body.snippet === 'string'
      && inspected.body.snippet.includes('id: gpt-6-sol')
      && inspected.body.snippet.includes('reasoningEfforts')
      && inspected.body.snippet.includes('supportsTemperature: false'),
      'inspect 生成 llm-pi-ai models 条目 YAML 片段')
    const inspectBad = await mtCall('/api/model-test/inspect', { provider: 'dl' })
    check(inspectBad.status === 400 && inspectBad.body.code === 'model-test/inspect-invalid',
      'inspect 缺 model 时 400 + model-test/inspect-invalid')

    // ⑫ 清除覆盖：三字段全 null 即删除。
    const cleared = await mtCall('/api/model-test/config', {
      entries: [
        { provider: 'dl', model: 'gpt-6-sol', params: { temperature: null, maxTokens: null, reasoningEffort: null } },
        { provider: 'dl', model: '*', params: { temperature: null, maxTokens: null, reasoningEffort: null } },
      ],
    }, 'POST')
    check(cleared.status === 200 && Object.keys(cleared.body.overrides).length === 0,
      '三字段全空即删除覆盖，回到预设推断')
    const badEntries = await mtCall('/api/model-test/config', { entries: 'nope' }, 'POST')
    check(badEntries.status === 400 && badEntries.body.code === 'model-test/config-invalid',
      'config 的 entries 不是数组时 400 + model-test/config-invalid')

    // ⑬ presets：能列出内置表与同步状态。
    const presets = await mtCall('/api/model-test/presets')
    check(presets.status === 200 && Array.isArray(presets.body.builtin) && presets.body.builtin.length > 50,
      `GET /presets 列出内置精选表（${presets.body.builtin?.length} 族）`)
    check(Array.isArray(presets.body.thinkingLevels) && presets.body.thinkingLevels.includes('xhigh'),
      'GET /presets 带回思考档位全集（面板据此生成下拉）')
    check(typeof presets.body.files?.presets === 'string' && /presets\.json$/.test(presets.body.files.presets),
      'GET /presets 标明同步结果的落点')
    check(presets.body.meta?.builtinAt !== undefined && presets.body.meta?.familyCount === presets.body.builtin.length,
      `GET /presets 元信息与内置表一致（${presets.body.meta?.familyCount} 族）`)

    // ⑭ DSH 真实配置：读现有值 → 与预设建议逐字段比对。
    const dshRead = await mtCall('/api/model-test/dsh?provider=dl&model=gpt-6-sol')
    check(dshRead.status === 200 && dshRead.body.ok === true && dshRead.body.available === true,
      'GET /dsh 读到 DSH 里的 provider 配置')
    check(dshRead.body.ns === 'llm-pi-ai' && dshRead.body.declaredInModels === true,
      `GET /dsh 指出配置落在哪个 settings 条目（ns=${dshRead.body.ns}）`)
    // revision 冲突：DSH 的 settings 用 CAS，写时 revision 过期必须拒掉并且可辨认（409）。
    {
      const original = fakeSettings.mutate
      fakeSettings.mutate = async () => {
        const error = new Error('settings namespace "llm-pi-ai" changed since it was read (expected revision 4, now 5)')
        error.code = 'SETTINGS_CONFLICT'
        throw error
      }
      const conflict = await mtCall('/api/model-test/dsh', { provider: 'dl', model: 'deepseek-flash', mode: 'fill', revision: 4 })
      fakeSettings.mutate = original
      check(conflict.status === 409 && conflict.body.code === 'model-test/dsh-conflict',
        `revision 过期时拒绝覆盖并返回 409（实际 ${conflict.status} / ${conflict.body.code}）`)
      check(/revision/.test(String(conflict.body.message)), '冲突文案提示重新读取')
    }
    check(dshRead.body.revision === 5, `GET /dsh 带出 settings revision（CAS 版本号，当前 ${dshRead.body.revision}）`)
    // 能力值以适配器（官方 catalog）为准：这里的假适配器报的是 400000 / 8192，
    // 预设表给的是 1050000 / 128000 —— 必须用前者，preset 只兜底。
    check(dshRead.body.proposed?.contextWindow === 400000 && dshRead.body.proposed?.maxTokens === 8192,
      `GET /dsh 的建议以适配器能力为准（ctx=${dshRead.body.proposed?.contextWindow}, max=${dshRead.body.proposed?.maxTokens}）`)
    check(dshRead.body.proposed?.temperature === undefined,
      'GET /dsh 的建议字段里没有 temperature（它不属于模型级配置）')
    check(Array.isArray(dshRead.body.diff) && dshRead.body.diff.length > 0,
      `GET /dsh 逐字段给出差异（${dshRead.body.diff?.length} 个字段）`)
    const dshFields = dshRead.body.diff.map((row) => row.field).join(',')
    check(!dshFields.includes('temperature'), `DSH 配置比对不涉及 temperature（字段：${dshFields}）`)
    // 档位建议也以适配器能力为准：适配器只报 low/medium/high（配置里正是这三档 → 一致、不出差异行），
    // 而预设族给的是六档含 xhigh/max —— 绝不能让它们出现在建议里。
    const effortRow0 = dshRead.body.diff.find((row) => row.field === 'reasoningEfforts')
    check(effortRow0 === undefined && !/xhigh|"max"/.test(JSON.stringify(dshRead.body.proposed.reasoningEfforts)),
      `档位建议以适配器能力为准（${JSON.stringify(dshRead.body.proposed.reasoningEfforts)}）`)
    check(dshRead.body.diff.some((row) => row.field === 'maxTokens' && row.changed === false),
      'GET /dsh 已配且一致的字段标成「一致」')
    check(dshRead.body.diff.some((row) => row.field === 'input' && row.missing === true),
      'GET /dsh 未配的字段标成「缺」')
    // 本机 dl 是 openai-responses：该协议的 compat gate 里没有 supportsTemperature，
    // 所以面板不能建议这个开关（写了会被 pi-ai 判非法，直接把配置写坏）。
    check(dshRead.body.proposed?.compat === undefined && !dshRead.body.diff.some((row) => row.field === 'compat'),
      'openai-responses 的 provider 不建议 compat.supportsTemperature')
    check(/openai-responses/.test(String(dshRead.body.note)) && /不接受/.test(String(dshRead.body.note)),
      '面板说明为什么不给这个协议提 supportsTemperature')

    // ⑮ 写入：fill 只补缺，不动已有值。
    dshWrites.length = 0
    const dshFill = await mtCall('/api/model-test/dsh', { provider: 'dl', model: 'gpt-6-sol', mode: 'fill' }, 'POST')
    check(dshFill.status === 200 && dshFill.body.ok === true && dshFill.body.applied.length > 0,
      `POST /dsh fill 写入缺失字段（${dshFill.body.applied?.join('、')}）`)
    check(dshFill.body.applied.includes('input') && !dshFill.body.applied.includes('reasoningEfforts')
      && !dshFill.body.applied.includes('maxTokens'),
      `fill 只补缺的字段，已配且一致的不重写（${dshFill.body.applied?.join('、')}）`)
    check(dshWrites.length === 1 && dshWrites[0].ns === 'llm-pi-ai',
      'POST /dsh 通过 settings.mutate 写入（ns 取自 describe）')
    const writtenOps = dshWrites[0].ops
    check(writtenOps.every((op) => op.op === 'set' && op.path.slice(0, 3).join('.') === 'providers.dl.models'),
      `POST /dsh 用数组下标精确改单个模型字段（${writtenOps.map((op) => op.path.join('.')).join(' | ')}）`)
    const dshAfter = dshConfig.providers.dl.models[0]
    check(dshAfter.maxTokens === 8192 && Array.isArray(dshAfter.input) && dshAfter.compat === undefined,
      'fill 之后：缺失字段补上，已有 maxTokens 原样保留，没有凭空塞 compat')

    // ⑯ fill 幂等：再写一次什么都不做。
    dshWrites.length = 0
    const dshAgain = await mtCall('/api/model-test/dsh', { provider: 'dl', model: 'gpt-6-sol', mode: 'fill' }, 'POST')
    check(dshAgain.status === 200 && dshAgain.body.applied.length === 0 && dshWrites.length === 0,
      '再 fill 一次没有可补的字段时，完全不调用 settings.mutate')

    // ⑰ replace：用预设建议覆盖有差异的字段。
    const dshReplace = await mtCall('/api/model-test/dsh', { provider: 'dl', model: 'gpt-6-sol', mode: 'replace' }, 'POST')
    check(dshReplace.status === 200 && dshReplace.body.ok === true,
      'POST /dsh replace 接受覆盖模式')
    check(dshConfig.providers.dl.models[0].contextWindow === 400000,
      `replace 用适配器建议覆盖差异字段（contextWindow → ${dshConfig.providers.dl.models[0].contextWindow}）`)

    // ⑰b compat 只在 anthropic-messages 上可写，而且要逐键补、不能整块替换。
    const dshClaude = await mtCall('/api/model-test/dsh?provider=claude&model=claude-opus-5')
    check(dshClaude.status === 200 && dshClaude.body.proposed?.compat?.supportsTemperature === false,
      'anthropic-messages 的 provider 才建议 compat.supportsTemperature')
    const claudeCompatRow = dshClaude.body.diff.find((row) => row.field === 'compat')
    check(claudeCompatRow !== undefined && claudeCompatRow.missing === true
      && Array.isArray(claudeCompatRow.compatKeys) && claudeCompatRow.compatKeys.join(',') === 'supportsTemperature',
      `compat 差异只列出要补的键（${claudeCompatRow?.compatKeys?.join('、')}）`)
    dshWrites.length = 0
    const dshClaudeFill = await mtCall('/api/model-test/dsh', { provider: 'claude', model: 'claude-opus-5', mode: 'fill' }, 'POST')
    check(dshClaudeFill.status === 200 && dshClaudeFill.body.applied.includes('compat'),
      'fill 会补上 compat.supportsTemperature')
    const claudeCompatOps = dshWrites[0].ops.filter((op) => op.path.includes('compat'))
    check(claudeCompatOps.length === 1
      && claudeCompatOps[0].op === 'set'
      && claudeCompatOps[0].path.join('.') === 'providers.claude.models.0.compat.supportsTemperature',
      `compat 逐键写入而不是整块替换（${claudeCompatOps.map((op) => op.path.join('.')).join(' | ')}）`)
    check(dshConfig.providers.claude.models[0].compat?.forceAdaptiveThinking === true
      && dshConfig.providers.claude.models[0].compat?.supportsTemperature === false,
      '写 compat 时用户原有的开关（forceAdaptiveThinking）必须保留')

    // ⑱ 模型不在 models 列表里 → 追加整条（而不是把目录缩成一个）。
    const dshAppend = await mtCall('/api/model-test/dsh', { provider: 'dl', model: 'dl-extra-model', mode: 'fill' }, 'POST')
    check(dshAppend.status === 200 && dshConfig.providers.dl.models.length === 3,
      `模型不在 models 里时追加整条（现在 ${dshConfig.providers.dl.models.length} 条）`)
    check(dshConfig.providers.dl.models[2].id === 'dl-extra-model',
      '追加的条目以模型 id 为定位键')

    // ⑲ 没声明 models 的 provider 不可写，且给出原因。
    const dshBare = await mtCall('/api/model-test/dsh?provider=xiaomi&model=mimo-v2.6-pro')
    check(dshBare.status === 200 && dshBare.body.available === false && /models/.test(String(dshBare.body.reason)),
      `没声明 models 的 provider 拒绝写入并说明原因（${String(dshBare.body.reason).slice(0, 24)}…）`)

    // ⑳ 参数校验：缺 provider / 缺 model。
    const dshNoProvider = await mtCall('/api/model-test/dsh?model=gpt-6-sol')
    check(dshNoProvider.status === 400 && dshNoProvider.body.code === 'model-test/dsh-invalid',
      'GET /dsh 缺 provider 时 400 + model-test/dsh-invalid')
    const dshNoModel = await mtCall('/api/model-test/dsh', { provider: 'dl' }, 'POST')
    check(dshNoModel.status === 400 && dshNoModel.body.code === 'model-test/dsh-invalid',
      'POST /dsh 缺 model 时 400 + model-test/dsh-invalid')

    // ㉑ 预设优先的档位建议：手写 profile 多出的 medium 必须出现在 diff 里。
    // deepseek-flash 命中的预设族只有 low/high/max，live 却是 low/medium/high/max。
    const stale = await mtCall('/api/model-test/dsh?provider=dl&model=deepseek-flash')
    const effortRow = stale.body.diff.find((row) => row.field === 'reasoningEfforts')
    check(effortRow !== undefined && effortRow.changed === true
      && !String(effortRow.afterText).includes('medium'),
      `档位建议以预设为准，多写的 medium 会被标成差异（after=${String(effortRow?.afterText)}）`)

    // 探针已删除：真实参数走「参数 → DSH 配置」（适配器声明），不再有按模型探测的第三条路。
    const mtHostSource = await fs.readFile(path.join(ROOT, 'components', 'model-test', 'host.js'), 'utf8')
    check(!/model-test\/probe/.test(mtHostSource) && !/runCapabilityCall|getRedProbeImage|capabilityCheck/.test(mtHostSource),
      'model-test 不再注册探针路由，探测辅助函数已删除')
    const mtClientSource = await fs.readFile(path.join(ROOT, 'components', 'model-test', 'client.js'), 'utf8')
    check(!/mt-probe|runProbe|探针/.test(mtClientSource), 'model-test 面板不再有「探针」按钮与结果卡片')

    // 行头只留名字/状态/按钮：参数摘要与预设来源收进「参数」抽屉。
    check(!/mt-model-extra|effectiveOf|badgesOf/.test(mtClientSource),
      'model-test 行头不再渲染参数摘要/预设来源徽章')
    check(/预设：/.test(mtClientSource), '参数抽屉里显示「预设：… 建议 …」一行')

    // off 只是「关闭思考」的档位名，配置里多一个 off 不该报成差异。
    const dshConfigModule = await import(pathToFileURL(path.join(ROOT, 'components', 'model-test', 'dsh-config.js')).href)
    const offRow = dshConfigModule.diffFields(
      { reasoningEfforts: { off: 'none', low: 'low' } }, { reasoningEfforts: { low: 'low' } })
      .find((row) => row.field === 'reasoningEfforts')
    check(offRow === undefined, '配置里多一个 off 档位不产生差异行')
    const realDiff = dshConfigModule.diffFields(
      { reasoningEfforts: { off: 'none', low: 'low' } }, { reasoningEfforts: { low: 'low', high: 'high' } })
      .find((row) => row.field === 'reasoningEfforts')
    check(realDiff !== undefined && realDiff.changed === true, '档位真的不同（多了 high）仍然报差异')

    // wire 方言（enabled/disabled 还是同名）不报差异：档位名集合一样就算一致。
    const wireOnly = dshConfigModule.diffFields(
      { reasoningEfforts: { off: 'disabled', low: 'enabled' } },
      { reasoningEfforts: { off: null, low: 'low' } })
    check(wireOnly.length === 0, '档位名相同、wire 写法不同（enabled vs low）不算差异')

    // 支持关思考的模型：建议里带 off；配置缺 off 时给一条「可补 off」，而不是当成配错。
    const offProposal = dshConfigModule.proposeFields({
      preset: { reasoning: { mode: 'toggle', levels: ['off', 'low'], wire: { off: 'disabled', low: 'enabled' } } },
    })
    check(offProposal.reasoningEfforts.off === 'disabled', '支持关闭思考的模型，建议里带 off（用网关写法）')
    const nullOffProposal = dshConfigModule.proposeFields({
      preset: { reasoning: { mode: 'effort', levels: ['off', 'low', 'high'], wire: {} } },
    })
    check(nullOffProposal.reasoningEfforts.off === null, '网关没给 off 写法时建议 off: null（DSH 允许 off 不发参数）')
    const nonReasoning = dshConfigModule.proposeFields({ preset: { reasoning: { mode: 'none', levels: [], wire: {} } } })
    check(nonReasoning.reasoningEfforts === false, '非推理模型仍然建议 reasoningEfforts: false')
    const onlyOffRow = dshConfigModule.diffFields(
      { reasoningEfforts: { low: 'low', high: 'high' } }, nullOffProposal)
      .find((row) => row.field === 'reasoningEfforts')
    check(onlyOffRow !== undefined && onlyOffRow.changed === true && onlyOffRow.onlyOff === true,
      '配置缺 off 时标成「可补 off」，不当成配错')
    const alreadyOff = dshConfigModule.diffFields(
      { reasoningEfforts: { off: 'disabled', low: 'enabled' } }, offProposal)
    check(alreadyOff.length === 0, '配置已经写了 off 就不再提示')

    // 能力值以适配器（DSH 官方 catalog）为准，models.dev 预设只兜底：
    // 适配器说有 200 万上下文、6.4 万输出、只支持 low 一档时，不能被预设的 100 万/131072/多档覆盖。
    const liveWins = dshConfigModule.proposeFields({
      preset: { contextWindow: 1000000, maxTokens: 131072, reasoning: { mode: 'effort', levels: ['off', 'low', 'high'], wire: {} } },
      live: { contextWindow: 2000000, defaultMaxTokens: 64000, efforts: ['low'], inputModalities: ['text'] },
    })
    check(liveWins.contextWindow === 2000000, '上下文窗口以适配器能力为准，预设只兜底')
    check(liveWins.maxTokens === 64000, '输出上限以适配器能力为准，预设只兜底')
    check(JSON.stringify(liveWins.reasoningEfforts) === JSON.stringify({ low: 'low' }),
      '思考档位以适配器能力为准（适配器只报 low 就不建议 off/high）')
    const presetFallback = dshConfigModule.proposeFields({
      preset: { contextWindow: 1000000, maxTokens: 131072, reasoning: { mode: 'effort', levels: ['low'], wire: {} } },
      live: { efforts: [], inputModalities: [] },
    })
    check(presetFallback.contextWindow === 1000000 && presetFallback.maxTokens === 131072,
      '适配器拿不到能力时才退回预设建议')
  }
} catch (e) {
  fail('model-test host 冒烟异常 → ' + (e && e.stack ? e.stack.split('\n')[0] : String(e)))
}

// ── notifications：Host 事件 → 队列 → 路由 ──
// 这是整个通知功能最该被守住的一段：挂的是 DSH 的 waterfall，挂错会真的改变
// 会话行为（吞掉审批请求、抢走模型重试），所以下面逐条钉死。
console.log()
console.log('[3b] Host 侧：通知事件监听 + /api/notifications 路由')
try {
  const NF_DIR = path.join(ROOT, 'components', 'notifications')
  const nfConfigPath = path.join(ROOT, '.selfcheck-notifications-config.json')
  const nfQueuePath = path.join(ROOT, '.selfcheck-notifications-queue.json')
  await fs.rm(nfConfigPath, { force: true }).catch(() => {})
  await fs.rm(nfQueuePath, { force: true }).catch(() => {})
  process.env.NOTIFICATIONS_CONFIG = nfConfigPath
  process.env.NOTIFICATIONS_QUEUE = nfQueuePath
  // 自检绝不能真的往用户屏幕上弹系统通知：这条开关让 native 通道直接报不可用。
  process.env.NOTIFICATIONS_NATIVE = 'off'

  const nfHost = await import(pathToFileURL(path.join(NF_DIR, 'host.js')).href)
  check(nfHost.name === 'notifications' && Array.isArray(nfHost.inject) && typeof nfHost.apply === 'function',
    'notifications host 导出 name/inject[]/apply()')

  // 假 ctx：记下每次 ctx.on 的 (名字, 监听器, 选项)，供下面逐个触发。
  const listeners = new Map()
  const nfRoutes = new Map()
  // live session 注册表：子智能体事件只带 id，host.js 会回头调 sessions.get(id) 补
  // 标题与工作区。这里给一个最小可用的假服务，让那条路径也被真正走到。
  const nfSessions = new Map()
  const nfCtx = {
    effect(run) { run(); return () => {} },
    timeout() { return () => {} },
    get(name) {
      if (name === 'sessions') return { get: (id) => nfSessions.get(id) }
      return undefined
    },
    on(name, listener, options) {
      if (!listeners.has(name)) listeners.set(name, [])
      listeners.get(name).push({ listener, options })
      return () => {}
    },
    connection: {
      fetch: {
        register(route) {
          if (nfRoutes.has(route.path)) throw new Error('duplicate route ' + route.path)
          nfRoutes.set(route.path, route)
          return () => nfRoutes.delete(route.path)
        },
      },
    },
  }
  nfHost.apply(nfCtx)

  for (const name of ['session/event', 'approval/request', 'user-questions/request', 'agent/request-error', 'agent/error',
    'subagent/end', 'compaction/summary-error', 'agent-loop/config-start-failed', 'deepseek-account/session-expired']) {
    const hooks = listeners.get(name) || []
    check(hooks.length === 1, `订阅了 ${name}（${hooks.length} 个监听器）`)
    check(hooks.every((hook) => hook.options?.global === true), `${name} 的监听器带 { global: true }，不会被 scope 过滤掉`)
  }
  // 审批与提问这两个 waterfall 必须 prepend。dsh-api-remotes 把它们转发到浏览器，
  // 浏览器一作答就 resolve、**不再调用 next()**；它排在我们前面时，我们的监听器
  // 一次都不会执行——真机上「审批卡片 / 选项卡片弹了，通知里却一条都没有」正是
  // 这个原因（m03041 / m03076）。prepend 把我们从链表尾部提到最外层。
  for (const name of ['approval/request', 'user-questions/request']) {
    const hooks = listeners.get(name) || []
    check(hooks.every((hook) => hook.options?.prepend === true),
      `${name} 的监听器带 { prepend: true }，抢在 api-remotes 转发桥之前执行`)
  }

  const emit = (name, ...args) => {
    let result
    for (const hook of listeners.get(name) || []) result = hook.listener(...args)
    return result
  }
  /** waterfall 的调用形状是 listener(payload, next)；返回 next 被调用的次数。 */
  const waterfall = (name, payload) => {
    let crossed = 0
    const next = () => { crossed += 1; return 'DEFAULT' }
    emit(name, payload, next)
    return crossed
  }

  const nfRoute = nfRoutes.get('/api/notifications')
  check(nfRoute !== undefined, '注册了 /api/notifications')
  check(nfRoute !== undefined && nfRoute.methods.includes('GET') && nfRoute.methods.includes('POST'),
    '/api/notifications 同时支持 GET 与 POST')
  const nfCall = async (body, method = body === undefined ? 'GET' : 'POST') => {
    const init = method === 'GET' ? { method } : {
      method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}),
    }
    const response = await nfRoute.fetch(new Request('http://127.0.0.1:3080/api/notifications', init))
    return { status: response.status, body: await response.json() }
  }

  const session = (id, extra = {}) => {
    const value = { id, header: { id, cwd: '/work/demo', ...extra } }
    nfSessions.set(id, value)
    return value
  }
  const turnEnd = (id, reason, turn = 1, extra = {}) => emit('session/event', session(id, extra), { type: 'turn/end', data: { turn, reason } })

  // ① 会话完成
  turnEnd('s1', { kind: 'completed' }, 1)
  let page = await nfCall()
  check(page.status === 200 && page.body.ok === true, 'GET /api/notifications 返回 ok:true')
  check(page.body.items.length === 1 && page.body.items[0].kind === 'turn-completed',
    `turn/end(completed) → 会话完成通知（${page.body.items[0]?.kind}）`)
  // 排版顺序：title = 谁（工作区 / 会话），status = 为什么（场景 label），body = 明细。
  // 用户明确要求「先是标题，然后是原因」，所以标题里必须有工作区目录名 demo，
  // 而「会话完成」只能出现在 status 里，不能又回到 title 里。
  check(page.body.items[0].title.includes('demo'), `通知标题带上工作区（${page.body.items[0]?.title}）`)
  check(page.body.items[0].status === '会话完成', `通知 status 是场景文案（${page.body.items[0]?.status}）`)
  check(page.body.items[0].workspace === 'demo', `通知带上 workspace 字段（${page.body.items[0]?.workspace}）`)
  check(page.body.unread === 1, '未读计数随通知增长')

  // ② 同一轮再报一次不能变成两条（去重键 turn-completed:s1:1）
  turnEnd('s1', { kind: 'completed' }, 1)
  page = await nfCall()
  check(page.body.items.length === 1 && page.body.items[0].count === 2, '同一会话同一轮重复完成只累加计数，不新增条目')

  // ③ 其它回合结束原因
  turnEnd('s2', { kind: 'error', error: { message: 'model exploded', code: 'LLM_500', status: 500 } }, 1)
  turnEnd('s3', { kind: 'max-tokens' }, 2)
  turnEnd('s4', { kind: 'blocked' }, 1)
  turnEnd('s5', { kind: 'aborted', reason: { kind: 'user' } }, 1)
  page = await nfCall()
  const kindOf = (id) => page.body.items.find((item) => item.sessionId === id)?.kind
  const itemOf = (id) => page.body.items.find((item) => item.sessionId === id)
  check(kindOf('s2') === 'turn-error' && itemOf('s2').detail.includes('LLM_500'), 'turn/end(error) → 会话出错，detail 带错误码')
  check(kindOf('s3') === 'turn-max-tokens', 'turn/end(max-tokens) → 输出被截断')
  check(page.body.items.every((item) => item.kind !== 'turn-blocked'), 'turn-blocked 默认关闭，不会入库')
  check(page.body.items.every((item) => item.kind !== 'turn-aborted'), 'turn-aborted 默认关闭，不会入库（误报太多）')
  // 打开场景后同样的信号就该入库
  await nfCall({ action: 'config', config: { kinds: { 'turn-aborted': true } } })
  turnEnd('s5', { kind: 'aborted', reason: { kind: 'user' } }, 1)
  page = await nfCall()
  check(kindOf('s5') === 'turn-aborted' && itemOf('s5').body.includes('你取消'), '打开场景后 turn/end(aborted by user) → 会话被中断（点明是谁取消的）')

  // ④ 子会话的 turn/end 不重复通知（由 subagent/end 统一负责）
  const beforeSub = (await nfCall()).body.items.length
  turnEnd('child1', { kind: 'completed' }, 1, { origin: 'subagent' })
  check((await nfCall()).body.items.length === beforeSub, '子会话的 turn/end 被跳过，交给 subagent/end 报一次')

  // ⑤ 需要权限：waterfall 必须把 next() 交回去
  check(waterfall('approval/request', { agent: { id: 's6' }, toolName: 'bash', callId: 'c1', reason: 'rm -rf' }) === 1,
    'approval/request 监听器仍调用 next()（否则等于悄悄替用户拒绝工具调用）')
  page = await nfCall()
  const approval = page.body.items.find((item) => item.kind === 'approval-required')
  check(approval !== undefined && approval.body.includes('bash') && approval.level === 'action',
    'approval/request → 需要权限确认（action 级）')

  // ⑥ 需要作答 / 计划审批
  check(waterfall('user-questions/request', { agent: { id: 's7' }, questions: [{ id: 'q1', question: '选哪个？' }, { id: 'q2', question: '再来一个' }] }) === 1,
    'user-questions/request 监听器仍调用 next()')
  check(waterfall('user-questions/request', { agent: { id: 's8' }, questions: [{ id: 'q1', question: '计划可以吗', header: 'Plan', intent: { kind: 'plan-review', approve: 'ok' } }] }) === 1,
    'plan-review 同样交回 next()')
  page = await nfCall()
  check(page.body.items.find((item) => item.kind === 'question-required')?.body.includes('共 2 项'), '多问题合并成一条，正文点明「共 N 项」')
  check(page.body.items.some((item) => item.kind === 'plan-review'), 'intent.kind=plan-review → 计划待审批')

  // ⑥b 兜底来源：审批 / 提问只靠 waterfall 是不够的。
  // 审批策略是 `never` 时 `ApprovalService.decide()` 直接 return 'rejected'、连
  // waterfall 都不 dispatch；转发桥短路时我们的监听器也不执行。两条兜底路径都必须
  // 独立成立，否则真机上照样一条通知都没有。
  emit('session/event', session('s6b'), {
    type: 'approval/asked',
    data: { id: 'ap-1', toolName: 'bash', callId: 'c9', reason: 'escalate sandbox to danger-full-access: 要写项目外目录' },
  })
  page = await nfCall()
  const askedItem = page.body.items.find((item) => item.kind === 'approval-required' && item.sessionId === 's6b')
  check(askedItem !== undefined, 'approval/asked（持久化事件）也能产出审批通知，不依赖 waterfall')
  check(askedItem?.body.includes('bash') && askedItem?.body.includes('danger-full-access'),
    `兜底审批通知带上工具名与原始原因（${askedItem?.body}）`)
  // 同一条 approval/asked 再来一次只累加计数
  emit('session/event', session('s6b'), {
    type: 'approval/asked',
    data: { id: 'ap-1', toolName: 'bash', callId: 'c9', reason: 'escalate sandbox to danger-full-access: 要写项目外目录' },
  })
  page = await nfCall()
  check(page.body.items.filter((item) => item.kind === 'approval-required' && item.sessionId === 's6b').length === 1
    && page.body.items.find((item) => item.sessionId === 's6b').count === 2,
    '同一次审批的重复事件合并计数，不弹两条')

  // 两条来源看到的是同一次审批 → 只能有一条通知（waterfall 的 displayReason 更漂亮）
  waterfall('approval/request', { agent: { id: 's6c' }, toolName: 'write', reason: 'escalate sandbox' })
  emit('session/event', session('s6c'), { type: 'approval/asked', data: { id: 'ap-2', toolName: 'write', reason: 'escalate sandbox' } })
  page = await nfCall()
  check(page.body.items.filter((item) => item.kind === 'approval-required' && item.sessionId === 's6c').length === 1,
    'waterfall 与 approval/asked 同时命中同一次审批时只有一条通知')

  // 提问没有任何专属持久化事件，只能从 ask_user_question 的 tool/call 里认
  emit('session/event', session('s7b'), {
    type: 'tool/call',
    data: { callId: 'tc1', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'q1', header: '下一步', question: '先做哪个?' }] }) },
  })
  page = await nfCall()
  const callQuestion = page.body.items.find((item) => item.kind === 'question-required' && item.sessionId === 's7b')
  check(callQuestion !== undefined, 'ask_user_question 的 tool/call 也能产出提问通知')
  check(callQuestion?.body.includes('先做哪个') && callQuestion?.detail === '下一步',
    `兜底提问通知带上问题与 header（${callQuestion?.body} / ${callQuestion?.detail}）`)
  // 同一个 callId 的重复事件（重放 / 续传）不再弹
  emit('session/event', session('s7b'), {
    type: 'tool/call',
    data: { callId: 'tc1', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'q1', header: '下一步', question: '先做哪个?' }] }) },
  })
  page = await nfCall()
  check(page.body.items.filter((item) => item.sessionId === 's7b' && item.kind === 'question-required').length === 1,
    '同一 callId 的重复 tool/call 不会重复弹通知')
  // 计划审批走同一个工具，靠 intent.kind 区分
  emit('session/event', session('s7c'), {
    type: 'tool/call',
    data: {
      callId: 'tc2', name: 'exit_plan_mode',
      arguments: JSON.stringify({ questions: [] }),
    },
  })
  emit('session/event', session('s7d'), {
    type: 'tool/call',
    data: {
      callId: 'tc3', name: 'ask_user_question',
      arguments: JSON.stringify({ questions: [{ id: 'plan-review', header: 'Plan review', question: 'Approve this plan?', intent: { kind: 'plan-review', approve: 'Approve' } }] }),
    },
  })
  page = await nfCall()
  check(page.body.items.find((item) => item.sessionId === 's7d')?.kind === 'plan-review',
    'tool/call 里 intent.kind=plan-review → 计划待审批')
  check(page.body.items.every((item) => item.sessionId !== 's7c'),
    '不是 ask_user_question 的 tool/call（如 exit_plan_mode 本身）不产生通知')

  // ⑦ 模型失败
  check(waterfall('agent/request-error', {
    agent: { id: 's9' }, turn: 3, step: 2, provider: 'dl',
    failure: { message: 'rate limited', code: 'RATE_LIMIT', status: 429 }, retryPolicy: { maxRetries: 2 },
  }) === 1, 'agent/request-error 监听器仍调用 next()（绝不返回 { kind: "retry" } 抢恢复）')
  page = await nfCall()
  const modelErr = page.body.items.find((item) => item.kind === 'model-error')
  check(modelErr !== undefined && modelErr.body.includes('dl') && modelErr.body.includes('rate limited'),
    'agent/request-error → 模型请求失败（带 provider 与错误文本）')
  check(modelErr.detail.includes('RATE_LIMIT') && modelErr.detail.includes('429') && modelErr.detail.includes('重试'),
    '模型失败的 detail 汇总错误码 / HTTP 状态 / 重试策略')
  // 同一 turn+step 的重试风暴只能留一条
  const beforeRetry = (await nfCall()).body.items.length
  for (let i = 0; i < 3; i += 1) {
    waterfall('agent/request-error', { agent: { id: 's9' }, turn: 3, step: 2, provider: 'dl', failure: { message: 'rate limited', code: 'RATE_LIMIT', status: 429 } })
  }
  page = await nfCall()
  check(page.body.items.length === beforeRetry && page.body.items.find((item) => item.kind === 'model-error').count === 4,
    '同一 turn+step 的重复失败合并计数，不刷屏')

  // ⑧ 子智能体三种结局
  emit('subagent/end', { runId: 'r1', provider: 'p', id: 'sa1', local: true, stopReason: 'completed', lastAssistantMessage: [{ text: '干完了' }] })
  emit('subagent/end', { runId: 'r2', provider: 'p', id: 'sa2', local: false, stopReason: 'error', lastAssistantMessage: [{ text: '崩了' }] })
  emit('subagent/end', { runId: 'r3', provider: 'p', id: 'sa3', local: false, stopReason: 'aborted' })
  page = await nfCall()
  check(itemOf('sa1')?.kind === 'subagent-completed' && itemOf('sa1').body.includes('干完了'), 'subagent/end(completed) → 子智能体完成（带它最后说的话）')
  check(itemOf('sa2')?.kind === 'subagent-failed', 'subagent/end(error) → 子智能体失败')
  check(page.body.items.every((item) => item.sessionId !== 'sa3'), 'subagent-stopped 默认关闭，不会入库')

  // 子智能体事件只带 id，标题得靠 sessions.get(id) 回查 header.cwd。
  // 拿不到就退化成「会话 <id 前 6 位>」——这条用例同时盯住两条路径。
  const liveChild = session('sa4')
  emit('subagent/end', { runId: 'r4', provider: 'p', id: 'sa4', local: true, stopReason: 'completed', lastAssistantMessage: [{ text: '子任务收尾' }] })
  page = await nfCall()
  check(itemOf('sa4')?.title.includes('demo'), `子智能体通知能回查到工作区（${itemOf('sa4')?.title}）`)
  check(itemOf('sa4')?.workspace === 'demo', '子智能体通知带上 workspace 字段')
  check(itemOf('sa1')?.title.startsWith('会话 '), `回查不到会话时标题退化成会话 id（${itemOf('sa1')?.title}）`)
  void liveChild

  // ⑧b 子会话要挂到父会话名下。真实场景：子智能体的子会话在 subagent/end 时往往
  // 已经落盘退出，sessions.get() 查不到它——标题只能来自 session/event 里记下的身份。
  // 用户就是在这里抱怨「子智能体看不出是哪个工作区哪个会话」（见 m02775）。
  const owner = session('owner-1', { cwd: '/work/demo-app' })
  emit('session/event', owner, { type: 'session/title', data: { title: '修复登录问题' } })
  const childLive = session('child-1', { cwd: '/work/demo-app', parentSession: 'owner-1', origin: 'subagent' })
  emit('session/event', childLive, { type: 'turn/start', data: { turn: 1 } })
  emit('session/event', childLive, { type: 'session/title', data: { title: 'Mnemon idle checkpoint review' } })
  // 子会话退出：从 sessions 里删掉，模拟「subagent/end 时已经查不到它」。
  nfSessions.delete('child-1')
  emit('subagent/end', { runId: 'r5', provider: 'p', id: 'child-1', local: true, stopReason: 'completed', lastAssistantMessage: [{ text: '审查完了' }] })
  // 子智能体请求审批：agent 级事件也只给子会话 id，同样要上提到父会话。
  emit('approval/request', { agent: { id: 'child-1' }, toolName: 'bash', reason: '要跑部署脚本' },
    () => Promise.resolve('unavailable'))
  page = await nfCall()
  const childItem = page.body.items.find((item) => item.kind === 'subagent-completed' && item.sessionId === 'child-1')
  check(childItem?.title === 'demo-app / 修复登录问题',
    `子智能体通知的标题是「父会话的工作区 / 父会话标题」（${childItem?.title}）`)
  check(childItem?.body.includes('Mnemon idle checkpoint review'),
    `子智能体自己的名字降级进正文，仍能看出是哪一个（${childItem?.body}）`)
  const childApproval = page.body.items.find((item) => item.kind === 'approval-required' && item.sessionId === 'child-1')
  check(childApproval?.title === 'demo-app / 修复登录问题',
    `子会话请求审批时标题同样上提到父会话（${childApproval?.title}）`)
  check(childApproval?.workspace === 'demo-app', '子会话的审批通知带上父会话的工作区')

  // ⑨ 压缩失败 / 配置失败 / 账号失效
  check(waterfall('compaction/summary-error', { session: session('s10'), sourceEventSeqs: [1, 2, 3], error: new Error('summary blew up') }) === 1,
    'compaction/summary-error 监听器仍调用 next()')
  emit('agent-loop/config-start-failed', { sessionId: 's11', error: new Error('bad yaml') })
  emit('deepseek-account/session-expired')
  page = await nfCall()
  check(page.body.items.some((item) => item.kind === 'compaction-error' && item.detail.includes('3 条源事件')), 'compaction/summary-error → 压缩失败（带源事件数）')
  check(page.body.items.some((item) => item.kind === 'config-error' && item.body.includes('bad yaml')), 'config-start-failed → 会话启动失败')
  check(page.body.items.some((item) => item.kind === 'account-expired'), 'session-expired → 账号凭据失效')

  // ⑩ 监听器抛错不能冒出去（否则会把会话打挂）
  let blewUp = null
  try {
    emit('session/event', session('s12'), null)
    emit('subagent/end', null)
    emit('agent/error', null)
  } catch (e) { blewUp = e }
  check(blewUp === null, '恶劣入参下监听器不抛异常')

  // ⑪ 场景目录与落盘路径
  page = await nfCall()
  check(page.body.kinds.length === 16, `场景目录 16 种（当前 ${page.body.kinds.length} 种）`)
  check(['approval-required', 'question-required', 'turn-completed', 'model-error', 'subagent-completed', 'subagent-failed'].every((id) => page.body.kinds.some((kind) => kind.id === id)),
    '用户点名的场景都在目录里（权限/作答/完成/模型失败/子智能体）')
  check(page.body.files.config === nfConfigPath && page.body.files.queue === nfQueuePath,
    'GET 回报的落盘路径尊重 NOTIFICATIONS_CONFIG / NOTIFICATIONS_QUEUE')

  // ⑫ 动作：read / readAll / clear / clearAll
  const readOne = await nfCall({ action: 'read', ids: [page.body.items[0].id] })
  check(readOne.status === 200 && readOne.body.changed === 1, 'POST read 按 id 标记已读')
  check((await nfCall({ action: 'readAll' })).body.unread === 0, 'POST readAll 清空未读')
  check((await nfCall({ action: 'clear' })).body.removed > 0, 'POST clear 只删已读条目')
  // 再塞一条未读的：clear 不该动它，clearAll 才连它一起清。
  turnEnd('s14', { kind: 'completed' }, 9)
  check((await nfCall({ action: 'clear' })).body.removed === 0, 'POST clear 不碰未读条目')
  const clearAll = await nfCall({ action: 'clearAll' })
  check(clearAll.body.removed > 0 && (await nfCall()).body.total === 0, 'POST clearAll 清空全部')

  // ⑬ config 写盘 + 越界归一 + test 通道
  const badCfg = await nfCall({ action: 'config', config: { maxItems: 99999, maxAgeMs: 1, dedupeMs: -5 } })
  check(badCfg.body.config.maxItems === 2000 && badCfg.body.config.maxAgeMs === 3600000 && badCfg.body.config.dedupeMs === 0,
    'config 越界值被夹到合理区间（maxItems 2000 / maxAgeMs 1h / dedupeMs 0）')
  check((await nfCall({ action: 'config', config: { enabled: false } })).body.config.enabled === false, 'config 可以关掉总开关')
  const blocked = await nfCall({ action: 'test' })
  check(blocked.status === 409 && blocked.body.code === 'notifications/disabled', '总开关关闭时 test 返回 409 notifications/disabled')
  await nfCall({ action: 'config', config: { enabled: true } })
  const kindOff = await nfCall({ action: 'config', config: { kinds: { 'turn-completed': false } } })
  check(kindOff.body.kinds.find((kind) => kind.id === 'turn-completed').enabled === false, 'config 可以逐个关场景')
  check((await nfCall({ action: 'test' })).status === 409, '「会话完成」关掉后 test 也被拒绝（它借的是这个通道）')
  await nfCall({ action: 'config', config: { kinds: { 'turn-completed': true } } })
  const tested = await nfCall({ action: 'test' })
  check(tested.status === 200 && tested.body.item?.kind === 'turn-completed', '全部打开后 test 能塞进一条测试通知')

  // ⑭ 坏请求
  const badJson = await nfRoute.fetch(new Request('http://127.0.0.1:3080/api/notifications', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json',
  }))
  const badJsonBody = await badJson.json()
  check(badJson.status === 400 && badJsonBody.code === 'notifications/bad-json', '请求体不是 JSON 时 400 notifications/bad-json')
  const unknown = await nfCall({ action: 'nope' })
  check(unknown.status === 400 && unknown.body.code === 'notifications/unknown-action', '未知动作 400 notifications/unknown-action')

  // ⑮ 配置与队列真的落盘，且重启后能读回来
  // 写盘是 800ms 防抖（避免高频通知打爆磁盘），这里等它落地再读。
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const onDisk = JSON.parse(await fs.readFile(nfQueuePath, 'utf8'))
  check(Array.isArray(onDisk.items) && Number.isSafeInteger(onDisk.seq), '队列落盘文件含 seq 与 items')
  const configOnDisk = JSON.parse(await fs.readFile(nfConfigPath, 'utf8'))
  check(configOnDisk.version === 1 && typeof configOnDisk.enabled === 'boolean', '配置落盘文件含 version 与 enabled')
  const restarted = new Map()
  const nfHost2 = await import(pathToFileURL(path.join(NF_DIR, 'host.js')).href + '?v=reload')
  nfHost2.apply({
    effect(run) { run(); return () => {} },
    timeout() { return () => {} },
    get() { return undefined },
    on(name, listener) {
      if (!restarted.has(name)) restarted.set(name, [])
      restarted.get(name).push(listener)
      return () => {}
    },
    connection: { fetch: { register(route) { restarted.set('route', route); return () => {} } } },
  })
  const reloaded = await (await restarted.get('route').fetch(new Request('http://127.0.0.1:3080/api/notifications'))).json()
  check(reloaded.items.length > 0, `重启后从磁盘读回队列（${reloaded.items.length} 条）`)

  // ⑯ 系统（应用级）通知通道：状态回报、开关、焦点上报、不可用时的错误码
  page = await nfCall()
  check(page.body.native !== null && typeof page.body.native === 'object', 'GET 回报系统通知通道状态（native）')
  check(page.body.native.supported === false && page.body.native.reason === 'disabled-by-env',
    'NOTIFICATIONS_NATIVE=off 时通道报不可用，且带上原因')
  check(page.body.native.enabled === false && page.body.native.sound === true, '兜底通道默认关闭、默认带提示音（主通道是渲染进程 Notification）')
  const focusOff = await nfCall({ action: 'focus', focused: false })
  check(focusOff.status === 200 && focusOff.body.focused === false, 'POST focus 能把「窗口在前台」置为 false')
  check((await nfCall()).body.focused === false, 'GET 回报的 focused 与上次上报一致')
  const quiet = await nfCall({ action: 'config', config: { native: { enabled: false, sound: false } } })
  check(quiet.body.config.native.enabled === false && quiet.body.config.native.sound === false, 'config 可以关掉系统通知与提示音')
  await nfCall({ action: 'config', config: { native: { enabled: true, sound: true } } })
  const nativeTest = await nfCall({ action: 'native-test' })
  check(nativeTest.status === 409 && nativeTest.body.code === 'notifications/native-unavailable',
    '通道不可用时 native-test 返回 409 notifications/native-unavailable')
  // open-settings 在自检里必须被 NOTIFICATIONS_NATIVE=off 按住——否则跑一次自检就会
  // 在用户脸上弹出「系统设置」窗口。它同时验证了这个动作的错误分支。
  const openSettings = await nfCall({ action: 'open-settings' })
  check(openSettings.status === 502 && openSettings.body.code === 'notifications/settings-unavailable',
    '自检里 open-settings 被 NOTIFICATIONS_NATIVE=off 挡住（502 notifications/settings-unavailable）')

  delete process.env.NOTIFICATIONS_CONFIG
  delete process.env.NOTIFICATIONS_QUEUE
  delete process.env.NOTIFICATIONS_NATIVE
  await fs.rm(nfConfigPath, { force: true }).catch(() => {})
  await fs.rm(nfQueuePath, { force: true }).catch(() => {})
} catch (e) {
  fail('notifications host 冒烟异常 → ' + (e && e.stack ? e.stack.split('\n')[0] : String(e)))
}

// ───────────── 3b) mcp 管理：真实 patch 文件的增删改启停 + 保真 ─────────────
// 全程指向自检沙箱里的临时 cordis.patch.yml，绝不碰 ~/.dsh。这份假 patch 里塞了
// 官方格式的全部要素：insert 数组、override 行、!!js 标签、注释、块标量。
{
  const mcDir = path.join(ROOT, 'components', 'mcp')
  const mcpHost = await import(pathToFileURL(path.join(mcDir, 'host.js')).href)
  const sandbox = await fs.mkdtemp(path.join(ROOT, '.selfcheck-mcp-'))
  const mcPatchPath = path.join(sandbox, 'cordis.patch.yml')
  // 依赖解析要能找到 yaml / atomic-write：把真实的 profile node_modules 软链进沙箱，
  // 这样 createRequire(沙箱/package.json) 与正式运行时走同一条解析路径，
  // 同时 withFileLock 的锁文件也落在沙箱里，一点不碰真实 profile。
  // createRequire 走的是**真实 profile 的 package.json**：yaml / @modelcontextprotocol/*
  // 在 ~/.dsh/profiles/desktop/node_modules，@deepseek-ai/dsh-atomic-write 则挂在
  // 全局 dsh 安装目录下（pnpm 布局），正式运行时同一个 createRequire 也是一样的结果。
  // 沙箱里只需要 package.json，依赖解析不经过沙箱自身。
  // 沙箱自带一份 node_modules：把真实 profile 的 yaml 与全局 dsh 安装里的
  // atomic-write / mcp client 逐个软链进来。这样 createRequire 与正式运行时同源，
  // 而 withFileLock 的锁文件落在沙箱里，不会去碰真实 profile。
  let depsReady = false
  try {
    const realProfile = path.join(os.homedir(), '.dsh', 'profiles', 'desktop')
    const realRequire = createRequire(path.join(realProfile, 'package.json'))
    await fs.writeFile(path.join(sandbox, 'package.json'), '{}\n')
    const links = []
    // 只软链顶层包名；@modelcontextprotocol/client/stdio 这类子路径由包内 exports
    // 自带解析，软链整包就够了（按子路径建目录会 EPERM）。
    for (const name of ['yaml', '@deepseek-ai/dsh-atomic-write', '@modelcontextprotocol/client', '@modelcontextprotocol/client/stdio']) {
      const target = realRequire.resolve(name)
      if (!name.includes('/') || !name.startsWith('@')) links.push([name, target])
      else if (name.split('/').length === 2) links.push([name, target])
    }
    // 按解析结果反推包根：找到 node_modules/<name> 那一段。
    const packageRootOf = (name, resolved) => {
      const marker = path.sep + 'node_modules' + path.sep
      const at = resolved.lastIndexOf(marker)
      if (at < 0) return null
      return resolved.slice(0, at + marker.length + name.length)
    }
    const done = new Set()
    for (const [name, resolved] of links) {
      const root = packageRootOf(name, resolved)
      if (root === null || done.has(root)) continue
      done.add(root)
      const dest = path.join(sandbox, 'node_modules', name)
      await fs.mkdir(path.dirname(dest), { recursive: true })
      await fs.symlink(root, dest, 'dir').catch(() => {})
    }
    // client 与 client/stdio 都指向同一个包根；子路径是包内 exports，软链整包即可。
    const probe = createRequire(path.join(sandbox, 'package.json'))
    probe('yaml')
    probe('@deepseek-ai/dsh-atomic-write')
    probe('@modelcontextprotocol/client')
    probe('@modelcontextprotocol/client/stdio')
    depsReady = true
  } catch (e) {
    depsReady = false
    console.log('  · 跳过 mcp host 冒烟：' + (e && e.message ? e.message.split('\n')[0] : String(e)))
  }
  if (!depsReady) {
    console.log('  · 跳过 mcp host 冒烟：本机解析不到 yaml / @deepseek-ai/dsh-atomic-write')
  }
  // 关键点：这里必须有一处 `!!js` 与一段块标量。mcp 读写用 yaml 的 parseDocument
  // 保真，跑完前后字节必须一致 —— 这就是本组用例的核心断言。
  const mcFixture = [
    '# 自检专用假 patch',
    '- insert:',
    "  - id: dsh-toolkit",
    "    name: './live-entry-63.js'",
    '  - id: mcp-mastergo',
    "    name: '@deepseek-ai/dsh-mcp-client'",
    '    config:',
    '      transport: stdio',
    '      serverName: mastergo',
    '      command: /opt/homebrew/bin/npx',
    "      args: ['-y', '@mastergo/magic-mcp']",
    '      env:',
    "        MG_MCP_TOKEN: 'mg-secret-token'",
    "        API_BASE_URL: 'https://mastergo.com'",
    "  - id: mcp-godot",
    "    name: '@deepseek-ai/dsh-mcp-client'",
    '    config:',
    '      transport: stdio',
    '      serverName: godot',
    '      command: /usr/local/bin/godot-mcp',
    '      args: []',
    '      env: {}',
    "      cwd: 'tmp'",
    '- id: mcp-mastergo',
    '  disabled: false',
    '- id: mcp-godot',
    '  disabled: false',
    '- id: skill-filesystem',
    "  name: '@deepseek-ai/dsh-skill-filesystem'",
    '  config:',
    '    customSkillDirs:',
    "      - !!js join(process.cwd(), 'more-skills')",
    '      - /tmp/x',
    '  disabled: false',
    '- id: skill-filesystem',
    '  config:',
    '    providerName: filesystem',
    '    watch: true',
    '    bundledSkillDir: |',
    '      /opt/homebrew/lib/node_modules/@deepseek-ai/dsh',
    '      /node_modules/@deepseek-ai/dsh-agent-preset/skills',
    '',
  ].join('\n')
  // 手写的 fixture 缩进/引号风格不是 yaml 库的 canonical 风格，写盘前先规范化一次。
  // 真实的 ~/.dsh/profiles/desktop/cordis.patch.yml 本来就是 canonical 的（实测
  // parseDocument → String 字节一致），这里模拟同样的前提，后面的「原有行不变」
  // 断言才有意义。
  const mcYaml = createRequire(path.join(sandbox, 'package.json'))('yaml')
  const mcCanonical = String(mcYaml.parseDocument(mcFixture, {
    customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value) => value }],
  }))
  await fs.writeFile(mcPatchPath, mcCanonical, { mode: 0o600 })

  const savedDshHome = process.env.DSH_HOME
  const savedCwd = process.cwd()
  let mcRoutes
  const mcCtx = {
    effect(run) { run(); return () => {} },
    timeout() { return () => {} },
    get(name) {
      if (name === 'profileContext') {
        return { name: 'selfcheck', dir: sandbox, patchPath: mcPatchPath, home: sandbox, cwd: savedCwd }
      }
      if (name === 'hmr') return null
      return undefined
    },
    connection: {
      fetch: {
        // 与真实 DSH（dsh-client-connection 的 fetchRoutes）语义一致：以 pathname 为唯一 key，
        // methods 不参与判重，同一 path 第二次注册必然抛 already registered。
        // 这里若按 path+methods 判重就会放过真实的重复注册（/api/mcp/server 曾经就这样被注册了两次）。
        register(route) {
          if (mcRoutes === undefined) throw new Error('未初始化')
          if (mcRoutes.has(route.path)) {
            throw new Error(`connection: exact Fetch route ${JSON.stringify(route.path)} is already registered`)
          }
          mcRoutes.set(route.path, route)
          return () => mcRoutes.delete(route.path)
        },
      },
    },
  }

  if (depsReady) try {
    mcRoutes = new Map()
    mcpHost.apply(mcCtx)
    check(mcRoutes.has('/api/mcp/meta') && mcRoutes.has('/api/mcp/servers')
      && mcRoutes.get('/api/mcp/server')?.methods.join(',') === 'GET,POST,DELETE'
      && mcRoutes.has('/api/mcp/server/enabled') && mcRoutes.has('/api/mcp/test') && mcRoutes.has('/api/mcp/reload')
      && mcRoutes.size === 6,
      'mcp 注册 6 条路由（/api/mcp/server 的 GET/POST/DELETE 合并成一条，不重复注册同一 path）')

    const mcCall = async (p, method, search, body) => {
      // 每个 path 只有一条路由（GET/POST/DELETE 合并），按 path + 是否声明该 method 查。
      let route
      for (const candidate of mcRoutes.values()) {
        if (candidate.path === p && candidate.methods.includes(method)) { route = candidate; break }
      }
      if (route === undefined) throw new Error('路由未注册：' + p + ' ' + method)
      const init = { method }
      if (body !== undefined) {
        init.headers = { 'content-type': 'application/json' }
        init.body = JSON.stringify(body)
      }
      const response = await route.fetch(new Request('http://127.0.0.1:3080' + p + search, init))
      return { status: response.status, body: await response.json() }
    }

    const meta = await mcCall('/api/mcp/meta', 'GET', '')
    check(meta.body.ok === true && meta.body.yamlAvailable === true && meta.body.atomicAvailable === true,
      'meta 汇报依赖可用（yaml + atomic-write 都从 profile 解析到）')
    check(meta.body.mcpEntryCount === 2, 'meta 数出 patch 里 2 条 mcp 条目')

    const list = await mcCall('/api/mcp/servers', 'GET', '')
    const names = list.body.servers.map((item) => item.entryId)
    check(list.body.servers.length === 2 && names[0] === 'mcp-godot' && names[1] === 'mcp-mastergo',
      '列出 2 条 server（按 entryId 排序，skill-filesystem 不算）')
    const mastergo = list.body.servers.find((item) => item.entryId === 'mcp-mastergo')
    check(mastergo.enabled === true && mastergo.transport === 'stdio' && mastergo.config.toolPrefix === 'mcp__mastergo__',
      'enabled / transport / toolPrefix 推导正确')
    // 密钥脱敏：绝不能把真实 token 送回面板。
    check(String(mastergo.config.env.MG_MCP_TOKEN).includes('mg-') && !String(mastergo.config.env.MG_MCP_TOKEN).includes('mg-secret-token'),
      'env 密钥默认脱敏（前 4 位 + …）')
    const revealed = await mcCall('/api/mcp/servers', 'GET', '?reveal=1')
    check(revealed.body.servers.find((item) => item.entryId === 'mcp-mastergo').config.env.MG_MCP_TOKEN === 'mg-secret-token',
      'reveal=1 才给密钥原文')

    // 新增：streamable-http，并顺手验证 id 撞车被拒。
    const created = await mcCall('/api/mcp/server', 'POST', '', {
      config: { transport: 'streamable-http', serverName: 'remote', url: 'https://mcp.example.com/sse', headers: { Authorization: 'Bearer x' } },
      enabled: true,
    })
    check(created.body.created === true && created.body.entryId === 'mcp-remote', '新增 http 条目（id 默认 mcp-<serverName>）')
    check(created.body.applied === false && typeof created.body.note === 'string', 'hmr 缺席时如实回报 note（不假装已热更）')
    const clash = await mcCall('/api/mcp/server', 'POST', '', {
      config: { transport: 'stdio', serverName: 'remote', command: 'x' },
    })
    check(clash.status === 409 && clash.body.code === 'mcp/id-exists', 'id 撞车返回 409 mcp/id-exists')

    const afterCreate = await fs.readFile(mcPatchPath, 'utf8')
    check(afterCreate.includes('serverName: remote') && afterCreate.includes('mcp-remote'), '新增条目已落盘')
    // 保真：原有内容一字不动（含 !!js 与块标量）。
    check(mcCanonical.includes('!!js') && mcCanonical.includes('bundledSkillDir: |'),
      'fixture 里确实带 !!js 与块标量（否则下面的保真断言没意义）')
    const preserved = mcCanonical.split('\n').filter((line) => line.trim() !== '')
    const missing = preserved.filter((line) => !afterCreate.split('\n').includes(line))
    check(missing.length === 0, '原有行全部原样保留（!!js / 块标量 / 注释都不动）' + (missing.length > 0 ? ' 缺：' + missing.join(' | ') : ''))

    // 更新：只改 command；env 走 preserveSecrets 时磁盘上的真值必须留住。
    const updated = await mcCall('/api/mcp/server', 'POST', '', {
      entryId: 'mcp-mastergo',
      config: { transport: 'stdio', serverName: 'mastergo', command: '/opt/homebrew/bin/npx', args: ['-y', 'x'], env: { MG_MCP_TOKEN: 'mg-…' } },
      preserveSecrets: true,
    })
    check(updated.body.ok === true, '更新已存在条目成功')
    const afterUpdate = await fs.readFile(mcPatchPath, 'utf8')
    check(afterUpdate.includes('mg-secret-token'), 'preserveSecrets：脱敏值没把真 token 覆盖掉')
    check(!afterUpdate.includes('args: [\'-y\', \'@mastergo/magic-mcp\']'), 'args 已被新值替换')

    // 启停：写 override 行，且不产生孤儿行。
    const off = await mcCall('/api/mcp/server/enabled', 'POST', '', { id: 'mcp-godot', enabled: false })
    check(off.body.ok === true && off.body.servers.find((item) => item.entryId === 'mcp-godot').enabled === false, '停用 mcp-godot')
    const offText = await fs.readFile(mcPatchPath, 'utf8')
    check(/disabled: true/.test(offText), '停用写进 override 行')
    const on = await mcCall('/api/mcp/server/enabled', 'POST', '', { id: 'mcp-godot', enabled: true })
    check(on.body.servers.find((item) => item.entryId === 'mcp-godot').enabled === true, '重新启用 mcp-godot')

    // 删除：insert 里的元素与 override 行一起消失。
    const deleted = await mcCall('/api/mcp/server', 'DELETE', '?id=mcp-remote')
    check(deleted.body.deleted === 'mcp-remote' && deleted.body.servers.length === 2, '删除 mcp-remote 后回到 2 条')
    const afterDelete = await fs.readFile(mcPatchPath, 'utf8')
    check(!afterDelete.includes('mcp-remote') && !afterDelete.includes('mcp.example.com'), '删除后不留 insert 元素，也没有孤儿 override 行')

    // 增删一通之后，文件必须仍然合法，且未涉及的条目字节不变。
    const reparsed = await mcCall('/api/mcp/servers', 'GET', '?reveal=1')
    check(reparsed.body.ok === true && reparsed.body.servers.length === 2, '增删改后文件仍可解析')
    check(reparsed.body.servers.find((item) => item.entryId === 'mcp-mastergo').config.env.MG_MCP_TOKEN === 'mg-secret-token',
      '未涉及的 mastergo 密钥原样保留')

    // 错误分支：不存在的 id / 非法 serverName / 缺 command。
    const notFound = await mcCall('/api/mcp/server', 'GET', '?id=mcp-nope')
    check(notFound.status === 404 && notFound.body.code === 'mcp/not-found', 'GET 不存在的 id → 404 mcp/not-found')
    const badName = await mcCall('/api/mcp/server', 'POST', '', { config: { transport: 'stdio', serverName: 'Bad Name!', command: 'x' } })
    check(badName.status === 400 && badName.body.code === 'mcp/invalid-config', 'serverName 带空格与感叹号 → 400 mcp/invalid-config')
    const noCommand = await mcCall('/api/mcp/server', 'POST', '', { config: { transport: 'stdio', serverName: 'nocmd' } })
    check(noCommand.status === 400 && noCommand.body.code === 'mcp/invalid-config', 'stdio 缺 command → 400 mcp/invalid-config')
    const noUrl = await mcCall('/api/mcp/server', 'POST', '', { config: { transport: 'streamable-http', serverName: 'nourl' } })
    check(noUrl.status === 400 && noUrl.body.code === 'mcp/invalid-config', 'http 缺 url → 400 mcp/invalid-config')
    const missingId = await mcCall('/api/mcp/server', 'DELETE', '')
    check(missingId.status === 400 && missingId.body.code === 'mcp/missing-id', 'DELETE 缺 id → 400 mcp/missing-id')
    const delGhost = await mcCall('/api/mcp/server', 'DELETE', '?id=mcp-ghost')
    check(delGhost.status === 404 && delGhost.body.code === 'mcp/not-found', '删除不存在的条目 → 404 mcp/not-found')
    const testGhost = await mcCall('/api/mcp/test', 'POST', '', { id: 'mcp-ghost' })
    check(testGhost.status === 404 && testGhost.body.code === 'mcp/not-found', '测试不存在的条目 → 404 mcp/not-found')

    // reload 在 hmr 缺席时不得伪装成功。
    const reload = await mcCall('/api/mcp/reload', 'POST', '', {})
    check(reload.body.ok === true && reload.body.applied === false && typeof reload.body.note === 'string', 'reload 无 hmr 时如实回报需要重启')

    // 跑完把文件还原成 fixture（幂等，方便反复跑）。
    await fs.writeFile(mcPatchPath, mcFixture, { mode: 0o600 })
  } catch (e) {
    fail('mcp host 冒烟异常 → ' + (e && e.stack ? e.stack.split('\n')[0] : String(e)))
  } finally {
    if (savedDshHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = savedDshHome
    await fs.rm(sandbox, { recursive: true, force: true }).catch(() => {})
  }
}

// ───────────── 4) 数据目录：按组件分目录 + 收藏索引 + 无自动迁移 ─────────────
console.log()
console.log('[4] 数据目录：$DSH_HOME/dsh-toolkit/<组件> 路径解析 + 收藏索引')

const pathsModule = await import(pathToFileURL(path.join(ROOT, 'components', 'image-gen', 'paths.js')).href)
const favoritesModule = await import(pathToFileURL(path.join(ROOT, 'components', 'image-gen', 'favorites.js')).href)

const ENV_KEYS = [
  'DSH_HOME', 'DSH_TOOLKIT_DATA',
  'IMAGE_GEN_DIR', 'IMAGE_GEN_CONFIG', 'IMAGE_GEN_LIBRARY', 'IMAGE_GEN_USAGE', 'IMAGE_GEN_PROMPTS', 'IMAGE_GEN_FAVORITES',
  'TOKEN_USAGE_PRICING', 'MODEL_TEST_PARAMS', 'MODEL_TEST_PRESETS',
  'NOTIFICATIONS_CONFIG', 'NOTIFICATIONS_QUEUE',
]
const savedEnv = ENV_KEYS.map((name) => [name, process.env[name]])
const setEnv = (name, value) => { if (value === undefined) delete process.env[name]; else process.env[name] = value }
const clearDataEnv = () => ENV_KEYS.forEach((name) => delete process.env[name])
const writeAt = async (file, text) => {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, text)
}
const exists = (target) => fs.access(target).then(() => true, () => false)

const HOME_DIR = os.homedir()
const DEFAULT_DATA_DIR = path.join(HOME_DIR, '.dsh', 'dsh-toolkit')
const DEFAULT_IMAGE_GEN = path.join(DEFAULT_DATA_DIR, 'image-gen')
const TMP_ROOT = path.join(ROOT, '.selfcheck-section4')

// ── 4.1 路径解析：默认值 + 各级覆盖 ──
{
  clearDataEnv()
  check(pathsModule.dataDir() === DEFAULT_DATA_DIR,
    `DSH_HOME 未设 → 数据目录 ~/.dsh/dsh-toolkit（当前：${pathsModule.dataDir()}）`)
  check(pathsModule.dshHome() === path.join(HOME_DIR, '.dsh'), 'DSH_HOME 未设 → ~/.dsh')
  const defaults = pathsModule.resolvePaths()
  check(defaults.imageGenDir === DEFAULT_IMAGE_GEN
    && defaults.tokenUsageDir === path.join(DEFAULT_DATA_DIR, 'token-usage')
    && defaults.modelTestDir === path.join(DEFAULT_DATA_DIR, 'model-test')
    && defaults.notificationsDir === path.join(DEFAULT_DATA_DIR, 'notifications'),
    '数据按组件分目录：image-gen / token-usage / model-test / notifications')
  check(defaults.imagesDir === path.join(DEFAULT_IMAGE_GEN, 'images')
    && defaults.favoritesFile === path.join(DEFAULT_IMAGE_GEN, 'favorites.json')
    && defaults.configFile === path.join(DEFAULT_IMAGE_GEN, 'config.json')
    && defaults.libraryFile === path.join(DEFAULT_IMAGE_GEN, 'library.json')
    && defaults.promptsFile === path.join(DEFAULT_IMAGE_GEN, 'image-prompts.json')
    && defaults.usageFile === path.join(DEFAULT_IMAGE_GEN, 'usage.jsonl')
    && defaults.pricingFile === path.join(DEFAULT_DATA_DIR, 'token-usage', 'pricing.json'),
    'image-gen 的图片/收藏索引/配置/提示词/记录，token-usage 的价目，各归各的目录')
  check(defaults.favoritesDir === undefined,
    '不再有收藏目录这一概念（favoritesDir 已从 resolvePaths 移除）')

  setEnv('DSH_HOME', '~/selfcheck-dsh-home')
  check(pathsModule.dataDir() === path.join(HOME_DIR, 'selfcheck-dsh-home', 'dsh-toolkit'), 'DSH_HOME 支持 ~ 展开')
  setEnv('DSH_HOME', '   ')
  check(pathsModule.dataDir() === DEFAULT_DATA_DIR, 'DSH_HOME 空白串视为未设')

  setEnv('DSH_HOME', '/tmp/selfcheck-dsh-home')
  setEnv('DSH_TOOLKIT_DATA', '/tmp/selfcheck-data')
  const resolved = pathsModule.resolvePaths()
  check(resolved.dataDir === '/tmp/selfcheck-data', 'DSH_TOOLKIT_DATA 把整个数据目录改道')
  check(resolved.imagesDir === path.join('/tmp/selfcheck-data', 'image-gen', 'images')
    && resolved.pricingFile === path.join('/tmp/selfcheck-data', 'token-usage', 'pricing.json'),
    '改道后组件子目录结构保持不变')
  check(resolved.overridden.data === true && resolved.overridden.images === false
    && resolved.overridden.favorites === false,
    'resolvePaths 标出被环境变量接管的项')

  setEnv('IMAGE_GEN_DIR', '~/pics')
  setEnv('IMAGE_GEN_CONFIG', '/tmp/selfcheck-cfg.json')
  setEnv('IMAGE_GEN_LIBRARY', '/tmp/selfcheck-lib.json')
  setEnv('IMAGE_GEN_USAGE', '/tmp/selfcheck-usage.jsonl')
  setEnv('IMAGE_GEN_PROMPTS', '/tmp/selfcheck-prompts.json')
  setEnv('IMAGE_GEN_FAVORITES', '/tmp/selfcheck-favorites.json')
  setEnv('TOKEN_USAGE_PRICING', '/tmp/selfcheck-pricing.json')
  const perItem = pathsModule.resolvePaths()
  check(perItem.imagesDir === path.join(HOME_DIR, 'pics'),
    'IMAGE_GEN_DIR 覆盖生成图目录（收藏是索引文件，不再跟着搬目录）')
  check(perItem.favoritesFile === '/tmp/selfcheck-favorites.json'
    && perItem.promptsFile === '/tmp/selfcheck-prompts.json',
    'IMAGE_GEN_FAVORITES / IMAGE_GEN_PROMPTS 可单独改道')
  check(perItem.configFile === '/tmp/selfcheck-cfg.json' && perItem.libraryFile === '/tmp/selfcheck-lib.json'
    && perItem.usageFile === '/tmp/selfcheck-usage.jsonl' && perItem.pricingFile === '/tmp/selfcheck-pricing.json',
    '逐项覆盖 IMAGE_GEN_CONFIG / IMAGE_GEN_LIBRARY / IMAGE_GEN_USAGE / TOKEN_USAGE_PRICING 继续有效')
  check(perItem.overridden.favorites === true && perItem.overridden.prompts === true, 'overridden 覆盖到新增项')
  setEnv('IMAGE_GEN_DIR', 'relative/dir')
  check(pathsModule.imagesDir() === path.join('/tmp/selfcheck-data', 'image-gen', 'images'),
    'IMAGE_GEN_DIR 非绝对路径视为未设（回退默认）')
}

// ── 4.2 收藏索引：只写一份 favorites.json，图片原地不动 ──
const FAV_FILE = path.join(TMP_ROOT, 'favorites.json')
try {
  await fs.rm(TMP_ROOT, { recursive: true, force: true })
  clearDataEnv()
  setEnv('IMAGE_GEN_FAVORITES', FAV_FILE)

  check(favoritesModule.favoritesPath() === FAV_FILE, 'favoritesPath() 读 IMAGE_GEN_FAVORITES')
  check((await favoritesModule.favoriteNames()).length === 0, '没有索引文件时返回空列表（不抛）')

  const first = await favoritesModule.markFavorite('image-gen-a.png', 1000)
  const again = await favoritesModule.markFavorite('image-gen-a.png', 1500)
  check(first.changed === true && again.changed === false, 'markFavorite 幂等（第二次 changed=false）')
  await favoritesModule.markFavorite('image-gen-b.png', 2000)
  check(JSON.stringify(await favoritesModule.favoriteNames()) === JSON.stringify(['image-gen-b.png', 'image-gen-a.png']),
    'favoriteNames 按收藏时间倒序')
  const marks = await favoritesModule.favoriteMarks()
  check(marks['image-gen-a.png'] === 1500 && (await favoritesModule.isFavorite('image-gen-b.png')) === true,
    'favoriteMarks 记下时间戳，isFavorite 可查单个文件')

  const index = JSON.parse(await fs.readFile(FAV_FILE, 'utf8'))
  check(index.version === 1 && Object.keys(index.images).length === 2, '索引文件形状：{version:1, images:{名字: {favoritedAt}}}')
  const mode = (await fs.stat(FAV_FILE)).mode & 0o777
  check(mode === 0o600, `收藏索引落地权限 0600（当前：${mode.toString(8)}）`)

  const cleared = await favoritesModule.clearFavorite('image-gen-a.png')
  check(cleared === true && JSON.stringify(await favoritesModule.favoriteNames()) === JSON.stringify(['image-gen-b.png']),
    'clearFavorite 只删标记，不碰图片文件')
  const missing = await favoritesModule.clearFavorite('image-gen-a.png')
  check(missing === false, '重复取消收藏是无操作（不抛）')
  await favoritesModule.forgetFavorites(['image-gen-b.png', '不存在.png'])
  check((await favoritesModule.favoriteNames()).length === 0, 'forgetFavorites 批量清标记（忽略不存在的名字）')

  // 结构性断言：收藏链路里不允许再出现复制/删除文件的代码。
  const favSource = await fs.readFile(path.join(ROOT, 'components', 'image-gen', 'gallery-favorites.js'), 'utf8')
  check(!/copyFile|unlink|favoritesDir/.test(favSource),
    'gallery-favorites.js 不再复制文件、不再删除收藏副本、不再引用 favoritesDir')
} catch (e) {
  fail('收藏索引用例异常 → ' + (e && e.stack ? e.stack.split('\n')[0] : String(e)))
}

// ── 4.3 不再自动迁移：migrate.js 已删除，入口里没有任何迁移调用 ──
{
  check(!(await exists(path.join(ROOT, 'components', 'image-gen', 'migrate.js'))),
    'components/image-gen/migrate.js 已删除')

  // 当前入口从 cordis.patch.yml 解析，不写死文件名：换 live-entry-N 时自检自动跟随。
  const patchText = await fs.readFile(path.join(ROOT, 'cordis.patch.yml'), 'utf8')
  const patchEntry = (/name:\s*'\.\/(live-entry-\d+\.js)'/.exec(patchText) || [])[1]
  check(Boolean(patchEntry), 'cordis.patch.yml 能解析出当前入口（live-entry-N.js）')
  for (const entry of ['index.js', patchEntry].filter(Boolean)) {
    const text = await fs.readFile(path.join(ROOT, entry), 'utf8')
    check(!/migrateLegacyData/.test(text) && !/from '\.[^']*migrate\.js/.test(text),
      `${entry} 不再 import / 调用迁移模块`)
  }

  // 只提交当前入口：.gitignore 放行的 live-entry-* 必须和 patch 指向的那个一致，
  // 否则换入口时忘了改例外，新入口会被静默忽略、仓库里只剩旧入口。
  const allowedEntries = (await fs.readFile(path.join(ROOT, '.gitignore'), 'utf8'))
    .split('\n').map((line) => line.trim()).filter((line) => line.startsWith('!live-entry-'))
  check(Boolean(patchEntry) && allowedEntries.length === 1 && allowedEntries[0] === `!${patchEntry}`,
    `.gitignore 只放行当前入口（!${patchEntry}），历史 live-entry-*.js 不入库`)

  // 磁盘上留着的每个入口都必须能加载：DSH 的组合树可能还钉在旧入口上（HMR 不重读
  // node_modules），旧入口一旦 import 了已删除的模块，整个插件激活失败、所有 /api 变 404。
  const entryFiles = (await fs.readdir(ROOT)).filter((name) => /^live-entry-\d+\.js$/.test(name))
  check(entryFiles.includes(patchEntry), `磁盘上存在 cordis.patch.yml 指向的 ${patchEntry}`)
  for (const entry of entryFiles) {
    try {
      await import(pathToFileURL(path.join(ROOT, entry)).href)
    } catch (e) {
      fail(`${entry} 无法加载（旧入口引用了已删除/已改名的模块，会让整个插件 404）→ ` +
        (e && e.message ? e.message.split('\n')[0] : String(e)))
    }
  }
  check(true, `磁盘上的 ${entryFiles.length} 个入口都能加载（${entryFiles.join(', ')}）`)
}

// ── 4.4 toolkit 设置分页：只读汇总各组件的数据落点 ──
try {
  const SET_DATA = path.join(TMP_ROOT, 'settings-data')
  await fs.rm(SET_DATA, { recursive: true, force: true })
  const toolkitHost = await import(pathToFileURL(path.join(ROOT, 'components', 'toolkit', 'host.js')).href)
  check(Array.isArray(toolkitHost.inject) && toolkitHost.inject.includes('timer'),
    'toolkit host 声明 inject 含 timer（重试分支要用 ctx.timeout）')

  clearDataEnv()
  setEnv('DSH_TOOLKIT_DATA', SET_DATA)
  await writeAt(path.join(SET_DATA, 'image-gen', 'config.json'), '{}')
  const tk = makeHostCtx()
  toolkitHost.apply(tk.ctx)
  const route = tk.routes.get('/api/toolkit/settings')
  check(route !== undefined && route.methods.includes('GET'), '注册了 GET /api/toolkit/settings')
  if (route !== undefined) {
    const res = await route.fetch(new Request('http://127.0.0.1:3080/api/toolkit/settings'))
    const body = await res.json()
    check(res.status === 200 && body.ok === true, '设置接口返回 200 {ok:true}')
    check(body.dataDir === SET_DATA && body.version === '0.2.0', `返回数据根目录与插件版本（v${body.version}）`)
    check(JSON.stringify(body.components.map((c) => c.id)) === JSON.stringify([
      'image-gen', 'token-usage', 'model-test', 'notifications', 'clipboard', 'mcp', 'skill',
    ]), '组件清单固定为 7 块（image-gen / token-usage / model-test / notifications / clipboard / mcp / skill）')
    const clipboard = body.components.find((c) => c.id === 'clipboard')
    check(clipboard !== undefined && clipboard.files.length === 2
      && clipboard.files.some((f) => f.path.endsWith(path.join('clipboard', 'index.json')))
      && clipboard.files.some((f) => f.path.endsWith(path.join('clipboard', 'config.json'))),
      'clipboard 块列出索引与配置两个落点')
    const imageGen = body.components[0]
    check(imageGen.files.length === 6
      && imageGen.files.some((f) => f.path.endsWith(path.join('image-gen', 'favorites.json')))
      && imageGen.files.some((f) => f.kind === 'dir' && f.path.endsWith(path.join('image-gen', 'images'))),
      'image-gen 块列出 6 项（图片目录 + 收藏索引在内）')
    check(imageGen.files.find((f) => f.path.endsWith('config.json'))?.exists === true
      && imageGen.files.find((f) => f.path.endsWith('library.json'))?.exists === false,
      '存在性按实际磁盘状态回报（config 存在 / library 未创建）')
    check(body.components.find((c) => c.id === 'mcp')?.dir === null
      && typeof body.components.find((c) => c.id === 'mcp')?.note === 'string',
      'mcp / skill 不占数据目录：dir=null + 文字说明')
    check(Array.isArray(body.overriddenNames) && body.overriddenNames.includes('data'),
      'overriddenNames 标出被环境变量接管的位置（DSH_TOOLKIT_DATA → data）')
  }
  const clientText = await fs.readFile(path.join(ROOT, 'client.js'), 'utf8')
  check(clientText.includes('__toolkit-settings') && clientText.includes('/api/toolkit/settings'),
    '构建产物 client.js 里带设置分页与设置接口调用')
} catch (e) {
  fail('toolkit 设置页用例异常 → ' + (e && e.stack ? e.stack.split('\n')[0] : String(e)))
} finally {
  for (const [name, value] of savedEnv) setEnv(name, value)
  for (const dir of [SANDBOX_DATA, TMP_ROOT]) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}


// ── 4.5 剪贴板 Host：落盘、去重、扩展名、截断、路径穿越 ──
try {
  const CB_DATA = path.join(TMP_ROOT, 'clipboard-data')
  await fs.rm(CB_DATA, { recursive: true, force: true })
  await fs.mkdir(CB_DATA, { recursive: true })
  clearDataEnv()
  setEnv('CLIPBOARD_DIR', CB_DATA)

  const cbHost = await import(pathToFileURL(path.join(ROOT, 'components', 'clipboard', 'host.js')).href)
  check(Array.isArray(cbHost.inject) && cbHost.inject.includes('connection') && cbHost.inject.includes('timer'),
    'clipboard host 声明 inject 含 connection + timer')
  const cb = makeHostCtx()
  cbHost.apply(cb.ctx)

  const cbPaths = ['/api/clipboard/paste', '/api/clipboard/list', '/api/clipboard/file', '/api/clipboard/delete', '/api/clipboard/config', '/api/clipboard/cleanup']
  check(cbPaths.every((p) => cb.routes.has(p)), '剪贴板注册 6 个路由（paste / list / file / delete / config / cleanup）')
  const cbCall = async (p, body, method) => {
    const route = cb.routes.get(p.split('?')[0])
    const init = { method: method || (body === undefined ? 'GET' : 'POST') }
    if (body !== undefined) init.body = JSON.stringify(body)
    const res = await route.fetch(new Request('http://127.0.0.1:3080' + p, init))
    return { status: res.status, body: await res.json() }
  }

  const sample = 'line1\nline2\nline3\n'
  const first = await cbCall('/api/clipboard/paste', { text: sample, mime: 'text/plain' })
  check(first.status === 200 && first.body.ok === true && /^\d{6}-[0-9a-f]{8}\.txt$/.test(first.body.name),
    'paste 返回 <HHmmss>-<sha1 前 8 位>.txt 形式的文件名')
  check(first.body.lines === 3 && first.body.bytes === Buffer.byteLength(sample),
    'paste 回报行数与字节数（末尾换行不多算一行）')
  check(first.body.mime === 'text/plain' && first.body.reused === false && first.body.truncated === undefined,
    '首次粘贴 reused=false，响应里没有 truncated 字段（不做截断）')
  check(first.body.path.startsWith(path.join(CB_DATA, first.body.dir)) && (await fs.readFile(first.body.path, 'utf8')) === sample,
    '文件落在 <根>/<日期>/ 下，内容与原文逐字节一致')

  const modeOf = async (p) => { try { return (await fs.stat(p)).mode & 0o777 } catch { return -1 } }
  check(await modeOf(first.body.path) === 0o600, '粘贴文件权限 0600')
  check(await modeOf(path.join(CB_DATA, first.body.dir)) === 0o700, '日期目录权限 0700')
  check(await modeOf(path.join(CB_DATA, 'index.json')) === 0o600, '索引文件权限 0600')

  const again = await cbCall('/api/clipboard/paste', { text: sample, mime: 'text/plain' })
  check(again.body.reused === true && again.body.hits === 2, '同一天同内容再粘一次 → 复用文件并 hits+1')
  const dayDir = await fs.readdir(path.join(CB_DATA, first.body.dir))
  check(dayDir.filter((n) => n.endsWith('.txt')).length === 1, '去重后日期目录里只有一个 .txt（没有第二份副本）')

  const html = await cbCall('/api/clipboard/paste', { text: '<b>x</b>', mime: 'text/html' })
  check(html.body.name.endsWith('.html'), '剪贴板只带 text/html → 存成 .html')
  const csv = await cbCall('/api/clipboard/paste', { text: 'a,b\n1,2', mime: 'text/csv' })
  check(csv.body.name.endsWith('.csv'), '剪贴板只带 text/csv → 存成 .csv')

  const list = await cbCall('/api/clipboard/list?limit=10', undefined, 'GET')
  check(list.body.ok === true && list.body.total === 3 && list.body.items.length === 3,
    'list 返回 3 条（txt + html + csv），最新在前')
  check(list.body.items[0].name === csv.body.name && typeof list.body.totalBytes === 'number',
    'list 按时间倒序，并给总字节')

  const head = await cbCall('/api/clipboard/file?name=' + encodeURIComponent(first.body.name) + '&head=2', undefined, 'GET')
  check(head.body.ok === true && head.body.text === 'line1\nline2' && head.body.trimmed === true,
    'file 按 head 截断正文并标 trimmed')

  const traversal = await cbCall('/api/clipboard/file?name=' + encodeURIComponent('../config.json'), undefined, 'GET')
  check(traversal.status === 400 && traversal.body.code === 'clipboard/invalid', 'name 含 ../ → 400 clipboard/invalid')

  const emptyText = await cbCall('/api/clipboard/paste', { text: '' })
  check(emptyText.status === 400 && emptyText.body.code === 'clipboard/invalid', '空 text → 400 clipboard/invalid')

  const cfg = await cbCall('/api/clipboard/config', undefined, 'GET')
  check(cfg.body.ok === true && cfg.body.limits.thresholdChars === 2000 && cfg.body.limits.thresholdLines === 30,
    'config 默认阈值 2000 字符 / 30 行')
  const saved = await cbCall('/api/clipboard/config', { enabled: false, thresholdChars: 50, thresholdLines: 5 })
  check(saved.body.limits.enabled === false && saved.body.limits.thresholdChars === 50,
    'POST config 覆盖开关与阈值（合并写，不清空其它字段）')
  const bigText = 'y'.repeat(5 * 1024 * 1024)
  const big = await cbCall('/api/clipboard/paste', { text: bigText, mime: 'text/plain' })
  check(big.body.bytes === Buffer.byteLength(bigText) && (await fs.readFile(big.body.path, 'utf8')) === bigText,
    '5 MB 文本完整写入、不截断（上限已移除）')

  const removed = await cbCall('/api/clipboard/delete', { name: first.body.name })
  check(removed.body.ok === true && removed.body.removed === true, 'delete 返回 removed=true')
  const removedAgain = await cbCall('/api/clipboard/delete', { name: first.body.name })
  check(removedAgain.status === 404 && removedAgain.body.code === 'clipboard/not-found', '重复删除 → 404 clipboard/not-found')
  check(list.body.items.length === 3 && (await fs.readdir(path.join(CB_DATA, first.body.dir))).every((n) => n !== first.body.name),
    'delete 真删文件')

  // ── 清理：默认关、按天数、按总量、索引里的越界路径不删 ──
  const cfgDefaults = await cbCall('/api/clipboard/config', undefined, 'GET')
  check(cfgDefaults.body.limits.cleanupEnabled === false && cfgDefaults.body.limits.cleanupMaxAgeDays === 30
    && cfgDefaults.body.limits.cleanupMaxTotalBytes === 0,
    '清理默认关闭：保留 30 天、不按总量限制')
  const cfgCleanup = await cbCall('/api/clipboard/config', { cleanupEnabled: true, cleanupMaxAgeDays: 0, cleanupMaxTotalBytes: 100 })
  check(cfgCleanup.body.limits.cleanupEnabled === true && cfgCleanup.body.limits.cleanupMaxTotalBytes === 100
    && cfgCleanup.body.limits.thresholdChars === 50,
    'POST config 也能写清理设置，且不清空已有阈值')
  // 关掉自动清理再继续：否则后面每次 list / paste 都会按新阈值清空沙箱数据。
  await cbCall('/api/clipboard/config', { cleanupEnabled: false, cleanupMaxAgeDays: 30, cleanupMaxTotalBytes: 0 })

  const indexFile = path.join(CB_DATA, 'index.json')
  const index = JSON.parse(await fs.readFile(indexFile, 'utf8'))
  const oldDir = path.join(CB_DATA, '2026-01-01')
  await fs.mkdir(oldDir, { recursive: true, mode: 0o700 })
  const oldFile = path.join(oldDir, '000000-deadbeef.txt')
  await fs.writeFile(oldFile, 'old', { mode: 0o600 })
  const outsideFile = path.join(TMP_ROOT, 'outside-clipboard.txt')
  await fs.writeFile(outsideFile, 'outside')
  const DAY = 24 * 60 * 60 * 1000
  index.items.push({ name: '000000-deadbeef.txt', dir: '2026-01-01', path: oldFile, bytes: 3, lines: 1, mime: 'text/plain', at: Date.now() - 400 * DAY, hits: 1 })
  index.items.push({ name: 'outside-clipboard.txt', dir: '2026-01-01', path: outsideFile, bytes: 7, lines: 1, mime: 'text/plain', at: Date.now() - 400 * DAY, hits: 1 })
  const big1 = path.join(CB_DATA, '2026-06-01')
  await fs.mkdir(big1, { recursive: true, mode: 0o700 })
  const bigA = path.join(big1, '000001-aaaaaaaa.txt')
  const bigB = path.join(big1, '000002-bbbbbbbb.txt')
  await fs.writeFile(bigA, 'A'.repeat(1024 * 1024), { mode: 0o600 })
  await fs.writeFile(bigB, 'B'.repeat(1024 * 1024), { mode: 0o600 })
  index.items.push({ name: '000001-aaaaaaaa.txt', dir: '2026-06-01', path: bigA, bytes: 1024 * 1024, lines: 1, mime: 'text/plain', at: Date.now() - 3 * DAY, hits: 1 })
  index.items.push({ name: '000002-bbbbbbbb.txt', dir: '2026-06-01', path: bigB, bytes: 1024 * 1024, lines: 1, mime: 'text/plain', at: Date.now() - DAY, hits: 1 })
  await fs.writeFile(indexFile, JSON.stringify(index, null, 2))

  const cleaned = await cbCall('/api/clipboard/cleanup', { maxAgeDays: 400, maxTotalBytes: 0 })
  check(cleaned.body.ok === true && cleaned.body.removed === 1 && cleaned.body.names.includes('outside-clipboard.txt') === false
    && cleaned.body.names.includes('000000-deadbeef.txt'),
    '按天数清理：只删过期条目，索引里指向沙箱外的路径被跳过')
  check(cleaned.body.skipped >= 1 && await fs.stat(oldFile).then(() => false).catch(() => true),
    '过期文件真删了；越界条目既没删文件也不算进 removed')
  check(await fs.stat(outsideFile).then(() => true).catch(() => false), '越界文件原封不动')

  const beforeSize = (await cbCall('/api/clipboard/list', undefined, 'GET')).body.totalBytes
  const bySize = await cbCall('/api/clipboard/cleanup', { maxAgeDays: 0, maxTotalBytes: beforeSize - 1024 * 1024 })
  check(bySize.body.ok === true && bySize.body.freedBytes >= 1024 * 1024 && bySize.body.names.length === 1
    && bySize.body.names[0] === '000001-aaaaaaaa.txt',
    '按总量清理：腾出空间即停，只删最旧那一条')
  check(await fs.stat(bigA).then(() => false).catch(() => true) && await fs.stat(bigB).then(() => true).catch(() => false),
    '删除顺序是按时间从旧到新（旧的大文件被删、新的保留）')
  check((await cbCall('/api/clipboard/list', undefined, 'GET')).body.totalBytes <= beforeSize - 1024 * 1024,
    '清理后总量落到上限以内')
  const noop = await cbCall('/api/clipboard/cleanup', { maxAgeDays: 0, maxTotalBytes: 0 })
  check(noop.body.removed === 0, '两个维度都为 0 时不删任何东西（0 = 不限）')
  const cbClientText = await fs.readFile(path.join(ROOT, 'client.js'), 'utf8')
  check(cbClientText.includes('/api/clipboard/cleanup') && cbClientText.includes('自动清理'),
    '构建产物里带「立即清理 / 自动清理」界面与清理路由')
} catch (e) {
  fail('剪贴板 Host 用例异常 → ' + (e && e.stack ? e.stack.split('\n')[0] : String(e)))
}

// ── 4.6 剪贴板 Client：阈值边界、扩展名选择、@ 引用插入 ──
try {
  const handlers = DOM_LISTENERS.get('paste') || []
  check(handlers.length === 1, 'client 注册了 capture 阶段的 paste 监听（一个）')

  const makeTarget = () => ({
    nodeType: 1,
    tagName: 'TEXTAREA',
    value: '',
    selectionStart: 0,
    selectionEnd: 0,
    inserted: '',
    parentElement: null,
    setRangeText(text) { this.inserted += text; this.value += text },
    dispatchEvent() { return true },
  })
  const makePaste = (pairs, target, extra) => ({
    clipboardData: { types: Object.keys(pairs), getData: (type) => (pairs[type] === undefined ? '' : pairs[type]) },
    target,
    defaultPrevented: false,
    shiftKey: false,
    preventDefault() { this.defaultPrevented = true },
    stopPropagation() {},
    ...(extra || {}),
  })

  let answer = { name: 'x.txt', path: '/tmp/clip/x.txt', lines: 30, bytes: 10, reused: false }
  let failNext = false
  const sent = []
  globalThis.fetch = async (url, init) => {
    let body = null
    try { body = init !== undefined && init.body ? JSON.parse(init.body) : null } catch { body = null }
    sent.push({ url: String(url), body })
    if (failNext === true) throw new Error('落盘失败')
    return {
      ok: true,
      status: 200,
      async text() { return JSON.stringify({ ok: true, ...answer }) },
    }
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20))
  const handler = handlers[0]

  let event = makePaste({ 'text/plain': 'a'.repeat(1999) }, makeTarget())
  handler(event)
  await settle()
  check(event.defaultPrevented === false && sent.length === 0, '1999 字符不拦截、不发请求（阈值 2000）')

  const target = makeTarget()
  event = makePaste({ 'text/plain': 'a'.repeat(2000) }, target)
  handler(event)
  await settle()
  check(event.defaultPrevented === true && sent.length === 1, '2000 字符拦截并发起落盘请求')
  check(sent[0].url === '/api/clipboard/paste' && sent[0].body.mime === 'text/plain',
    '只带一种 text/* 时按它的 mime 上报')
  check(target.inserted === '@/tmp/clip/x.txt\n', '插入 @ 引用（无空白路径不加引号）')

  const spaceTarget = makeTarget()
  answer = { name: 'y.txt', path: '/tmp/clip dir/y.txt', lines: 5, bytes: 5, reused: true }
  event = makePaste({ 'text/plain': 'b'.repeat(2000) }, spaceTarget)
  handler(event)
  await settle()
  check(spaceTarget.inserted === '@"/tmp/clip dir/y.txt"\n', '路径含空格时引用写成 @"…"')

  const linesOf = (count) => Array.from({ length: count }, (_, i) => 'l' + i).join('\n')
  event = makePaste({ 'text/plain': linesOf(29) }, makeTarget())
  handler(event)
  await settle()
  check(event.defaultPrevented === false, '29 行不拦截（阈值 30 行）')

  event = makePaste({ 'text/plain': linesOf(30) }, makeTarget())
  handler(event)
  await settle()
  check(event.defaultPrevented === true, '30 行拦截（字符数远低于 2000）')

  sent.length = 0
  event = makePaste({ 'text/html': '<b>' + 'x'.repeat(2000) + '</b>' }, makeTarget())
  handler(event)
  await settle()
  check(sent.length === 1 && sent[0].body.mime === 'text/html', '只有 text/html → 上报 mime text/html')

  sent.length = 0
  event = makePaste({ 'text/plain': 'p'.repeat(2000), 'text/html': '<i>' + 'y'.repeat(2000) + '</i>' }, makeTarget())
  handler(event)
  await settle()
  check(sent.length === 1 && sent[0].body.mime === 'text/plain',
    '多份文本格式 → 取纯文本那一份（扩展名与内容都由它决定）')

  sent.length = 0
  event = makePaste({ 'image/png': 'binary' }, makeTarget())
  handler(event)
  await settle()
  check(event.defaultPrevented === false && sent.length === 0, '只有图片 → 完全不介入，走原生粘贴')

  failNext = true
  const fallbackTarget = makeTarget()
  event = makePaste({ 'text/plain': 'z'.repeat(2000) }, fallbackTarget)
  handler(event)
  await settle()
  check(fallbackTarget.inserted === 'z'.repeat(2000), '落盘失败 → 把原文插回编辑区，内容不丢')

  const shiftTarget = makeTarget()
  event = makePaste({ 'text/plain': 'q'.repeat(2000) }, shiftTarget, { shiftKey: true })
  handler(event)
  await settle()
  check(event.defaultPrevented === false, 'Shift+粘贴 放行原生行为')
} catch (e) {
  fail('剪贴板 Client 用例异常 → ' + (e && e.stack ? e.stack.split('\n')[0] : String(e)))
} finally {
  globalThis.fetch = NATIVE_FETCH
}

await fs.rm(TMP_ROOT, { recursive: true, force: true }).catch(() => {})

console.log(failed === 0 ? '客户端 + Host 自检通过' : `自检失败：${failed} 项`)
process.exit(failed === 0 ? 0 : 1)
