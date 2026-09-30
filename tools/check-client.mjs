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
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
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
globalThis.document = {
  createElement: () => ({ textContent: '', remove() {} }),
  head: { appendChild() {} },
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
if (tkPanel === undefined || tkGlyph === undefined) fail('token-usage 面板未注册（main / sidebar.panellist）')

if (tkPanel !== undefined && tkGlyph !== undefined) {
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
    ['侧边栏图标', () => elOf(tkGlyph.component, { size: 16 })],
  ]
  runGroup('token-usage', ['Panel', 'ActivityHeatmap', 'Trend'], tkCases)
}

// ── image-gen ──
const agPanel = panelOf('image-gen')
const agGlyph = glyphOf('image-gen')
if (agPanel === undefined || agGlyph === undefined) fail('image-gen 面板未注册（main / sidebar.panellist）')

if (agPanel !== undefined && agGlyph !== undefined) {
  const agFile = (name) => ({ name, bytes: 1024, mtime: now })
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
  // Panel hook 顺序（28 slots）：sideTab / recent.state / recent.pending / fav.state / fav.pending / open / busy / mode / form / refs / gen / settings / draft / test / models / urlInput / libs / libForm / libBusy / activePrompt / expanded / saveTarget / settingsError / entryTest / addOpen / addMode / editing / editDraft
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
      d('draft', { baseURL: '', model: '', apiKey: '' }),
      d('test', { busy: false, ok: null, message: null }),
      d('models', { busy: false, items: null, message: null, error: null }),
      d('urlInput', ''),
      d('libs', null),
      d('libForm', { open: false, kind: 'prompt', title: '', text: '' }),
      d('libBusy', false),
      d('activePrompt', null),
      d('expanded', {}),
      d('saveTarget', ''),
      d('settingsError', null),
      d('entryTest', { id: '', busy: false, ok: null, message: null }),
      d('addOpen', false),
      d('addMode', 'group'),
      d('editing', null),
      d('editDraft', null),
    ]
  }
  const agSet = (tab, recent, fav, open = null) => OVERRIDES.set('Panel', agSlots(tab, recent, fav, open))
  const empty = { loading: false, data: { model: 'flux-pro-1.1', hasKey: true }, files: [], total: 0, hasMore: false, names: [], error: null }
  const loading = { loading: true, data: null, files: [], total: 0, hasMore: false, names: [], error: null }
  const errored = { loading: false, data: null, files: [], total: 0, hasMore: false, names: [], error: 'HTTP 500' }

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
    ['设置模式 · 模型目录', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'set',
        settings: {
          baseURL: 'https://images.example.com/v1', model: 'flux-pro-1.1', name: 'FLUX Pro 1.1',
          hasKey: true, keySource: 'credentials', keyEnv: 'CUSTOM_API_KEY', path: '/fake/.dsh/image-gen.json',
          defaults: { baseURL: 'https://images.example.com/v1', model: 'flux-pro-1.1' },
          catalog: {
            defaultId: 'custom:flux-pro-1.1',
            groups: [{ id: 'custom', label: '自定义', keyEnv: 'CUSTOM_API_KEY', hasKey: false, keySource: 'none' }],
            entries: [
              { id: 'custom:flux-pro-1.1', group: 'custom', groupLabel: '自定义', name: 'FLUX Pro 1.1', model: 'flux-pro-1.1', baseURL: 'https://images.example.com/v1', keyEnv: 'CUSTOM_API_KEY', builtin: false, isDefault: true, hasKey: true, keySource: 'credentials' },
              { id: 'custom:dall-e-3', group: 'custom', groupLabel: '自定义', name: 'DALL·E 3', model: 'dall-e-3', baseURL: 'https://images.example.com/v1', keyEnv: 'CUSTOM_API_KEY', builtin: false, isDefault: false, hasKey: false, keySource: 'none' },
            ],
          },
        },
      }))
      return elOf(agPanel.component)
    }, ['测试', '默认', '未配置 CUSTOM_API_KEY', '+ 添加模型']],
    ['设置模式 · 添加模型卡片', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'set',
        addOpen: true,
        settings: {
          baseURL: 'https://images.example.com/v1', model: 'flux-pro-1.1', name: 'FLUX Pro 1.1',
          hasKey: true, keySource: 'credentials', keyEnv: 'CUSTOM_API_KEY', path: '/fake/.dsh/image-gen.json',
          defaults: { baseURL: 'https://images.example.com/v1', model: 'flux-pro-1.1' },
          catalog: {
            defaultId: 'custom:flux-pro-1.1',
            groups: [{ id: 'custom', label: '自定义', keyEnv: 'CUSTOM_API_KEY', hasKey: false, keySource: 'none' }],
            entries: [
              { id: 'custom:flux-pro-1.1', group: 'custom', groupLabel: '自定义', name: 'FLUX Pro 1.1', model: 'flux-pro-1.1', baseURL: 'https://images.example.com/v1', keyEnv: 'CUSTOM_API_KEY', builtin: false, isDefault: true, hasKey: true, keySource: 'credentials' },
            ],
          },
        },
      }))
      return elOf(agPanel.component)
    }, ['获取可用模型', '加入目录', '取消', '自定义设置']],
    ['设置模式 · 模型编辑卡', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'set',
        editing: 'custom:dall-e-3',
        editDraft: { name: 'DALL·E 3', model: 'dall-e-3', baseURL: 'https://images.example.com/v1', key: '' },
        settings: {
          baseURL: 'https://images.example.com/v1', model: 'flux-pro-1.1', name: 'FLUX Pro 1.1',
          hasKey: true, keySource: 'credentials', keyEnv: 'CUSTOM_API_KEY', path: '/fake/.dsh/image-gen.json',
          defaults: { baseURL: 'https://images.example.com/v1', model: 'flux-pro-1.1' },
          catalog: {
            defaultId: 'custom:flux-pro-1.1',
            groups: [{ id: 'dl', label: 'DL', keyEnv: 'CUSTOM_API_KEY', hasKey: true, keySource: 'credentials' }],
            entries: [
              { id: 'custom:dall-e-3', group: 'custom', groupLabel: '自定义', name: 'DALL·E 3', model: 'dall-e-3', baseURL: 'https://images.example.com/v1', keyEnv: 'CUSTOM_API_KEY', builtin: false, isDefault: false, hasKey: true, keySource: 'credentials' },
            ],
          },
        },
      }))
      return elOf(agPanel.component)
    }, ['保存', '取消', '测试连通性', '设为默认', 'API 密钥（留空不修改）', '分组（不可改）']],
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
    ['设置模式 · 模型列表已加载', () => {
      OVERRIDES.set('Panel', agSlots('recent', agPage(), agPage(), null, {
        mode: 'set',
        settings: { baseURL: 'https://images.example.com/v1', model: 'flux-pro-1.1', hasKey: true, keySource: 'env', baseURLSource: 'default', modelSource: 'default', path: '/fake/.dsh/image-gen.json', defaults: { baseURL: 'https://images.example.com/v1', model: 'flux-pro-1.1' }, presets: { models: ['flux-pro-1.1'], sizes: ['1024x1024', '1536x1024'] } },
        models: { busy: false, items: ['flux-pro-1.1', 'image-gen-3.0', 'dall-e-3'], message: '接口可达', error: null },
      }));
      return elOf(agPanel.component)
    }],
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
    ['侧边栏图标', () => elOf(agGlyph.component, { size: 16 })],
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
  await Promise.all(['config.js', 'generate.js', 'library.js'].map(importHost))
  pass('helper 模块 config.js / generate.js / library.js 仍可解析')
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
      check(typeof getCfg.config.hasKey === 'boolean',
        'GET config 返回了 hasKey 布尔值')

      // 通用版不内置任何模型：初始目录为空，完全由用户添加构建。
      const again = await (await callRoute('/api/image-gen/config')).json()
      check(again.ok === true && Array.isArray(again.config.catalog?.entries) && again.config.catalog.entries.length === 0,
        '不内置厂商模型：初始目录为空')

      const addA = await reqJson('/api/image-gen/config', {
        action: 'add', id: 'custom:test-image-a', group: 'custom', name: 'Test Image A',
        model: 'test-image-a', baseURL: 'https://images.example.com/v1', makeDefault: true,
      })
      const afterAddA = await addA.json()
      check(addA.status === 200 && afterAddA.config.catalog.entries.some((e) => e.id === 'custom:test-image-a'),
        '添加模型进入目录')
      check(afterAddA.config.defaultId === 'custom:test-image-a' && afterAddA.config.model === 'test-image-a',
        'makeDefault 让新模型立刻成为默认模型')

      const addB = await reqJson('/api/image-gen/config', {
        action: 'add', id: 'custom:test-image-b', group: 'custom', name: 'Test Image B',
        model: 'test-image-b', baseURL: 'https://images.example.com/v1',
      })
      const afterAddB = await addB.json()
      check(afterAddB.config.catalog.entries.length === 2, '目录可容纳多条模型')
      const switched = await reqJson('/api/image-gen/config', { action: 'setDefault', id: 'custom:test-image-b' })
      const switchedBody = await switched.json()
      check(switched.status === 200 && switchedBody.ok === true && switchedBody.config.model === 'test-image-b' && switchedBody.config.defaultId === 'custom:test-image-b',
        'setDefault 切换默认模型，生成将使用该模型')
    }
    if (host.routes.has('/api/image-gen/config/test')) {
      const testNoKey = await reqJson('/api/image-gen/config/test', {})
      check(testNoKey.status === 400, 'POST /api/image-gen/config/test 无 Key 返回 400（不触网）')
      const testBadId = await reqJson('/api/image-gen/config/test', { id: 'nope:not-exist' })
      check(testBadId.status === 404, 'POST config/test 按 id 测试：目录无此模型返回 404（不触网）')
    }
    if (host.routes.has('/api/image-gen/config/models')) {
      const modelsNoKey = await reqJson('/api/image-gen/config/models', {})
      check(modelsNoKey.status === 400, 'POST /api/image-gen/config/models 无 Key 返回 400（不触网）')
    }
    if (host.routes.has('/api/image-gen/config')) {
      // 删除模型：直接从目录消失（不再有「内置模型只能隐藏」这套）；删空也不能让生成链路崩。
      const removed = await reqJson('/api/image-gen/config', { action: 'remove', id: 'custom:test-image-a' })
      const afterRm = await removed.json()
      check(removed.status === 200 && afterRm.ok === true && !afterRm.config.catalog.entries.some((e) => e.id === 'custom:test-image-a'),
        '删除模型后从目录消失')
      const afterAdd = afterRm
      // 全删空：GET config 不抛错、empty=true；生成接口明确报「目录为空」而不是 500。
      for (const entry of afterAdd.config.catalog.entries) {
        await reqJson('/api/image-gen/config', { action: 'remove', id: entry.id })
      }
      const emptyView = await (await callRoute('/api/image-gen/config')).json()
      check(emptyView.ok === true && emptyView.config.empty === true && emptyView.config.catalog.entries.length === 0,
        '目录删空后 config 仍可读且标记 empty（不崩）')
      const genEmptyDir = await reqJson('/api/image-gen/generate', { prompt: '测试空目录' })
      check(genEmptyDir.status === 400, '目录为空时生成接口返回 400 明确报错（不 500）')
      // 收尾：把模型加回来，别给自检留一个空目录。
      await reqJson('/api/image-gen/config', {
        action: 'add', id: 'custom:test-image-a', group: 'custom', name: 'Test Image A',
        model: 'test-image-a', baseURL: 'https://images.example.com/v1', makeDefault: true,
      })
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

console.log()
console.log(failed === 0 ? '客户端 + Host 自检通过' : `自检失败：${failed} 项`)
process.exit(failed === 0 ? 0 : 1)
