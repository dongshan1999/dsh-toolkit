window.__ModuleLoader__.load({
  id: "@local/toolkit",
  factory(require) {
    const React = require("react")
// toolkit：把 dsh-toolkit 的各个面板收进同一个界面。
//
// 侧边栏只留一条 entry：`toolkit`（图标 `T` + 标签「工具集」）。点开后是一条
// 分页栏 + 当前分页内容，分页切换全在面板内部完成 —— 侧边栏不再为每个分页
// 各占一行。
//
// 面板本身从 __dshToolkitRegistry 读：组件之间没有 require 通道，但 build.mjs
// 把各组件工厂函数放在同一模块作用域，这个注册表就是共享面。单独加载
// components/toolkit/client.js（不经 build.mjs）时注册表不存在 -> 本组件不注册
// 任何 UI，免得露出一个点不开的空壳。
//
// 末尾的「设置」分页是壳自己内置的（不经过注册表）：它只读展示各组件的数据落点，
// 数据来自 host.js 的 GET /api/toolkit/settings。
const CSS = '.tks-root{position:relative;display:flex;flex-direction:column;min-height:0;height:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-0)}.tks-tabs{display:flex;align-items:center;gap:2px;padding:6px 12px 0;flex:none;border-bottom:1px solid var(--dsw-alias-border-l1);overflow-x:auto;overflow-y:hidden}.tks-tab{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font:inherit;font-size:13px;line-height:1.5;white-space:nowrap;border:none;border-bottom:2px solid transparent;border-radius:6px 6px 0 0;cursor:pointer;background:transparent;color:var(--dsw-alias-label-secondary)}.tks-tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.tks-tab-on{color:var(--dsw-alias-brand-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600}.tks-body{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden}.tks-empty{display:flex;align-items:center;justify-content:center;padding:32px 20px;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary);text-align:center}.tks-glyph{border-radius:5px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600;display:flex;align-items:center;justify-content:center}'
const CSS_SETTINGS = '.tks-set{display:flex;flex-direction:column;gap:12px;padding:14px 16px 20px;overflow:auto;min-height:0;box-sizing:border-box}.tks-set-head{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap}.tks-set-title{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary)}.tks-set-sub{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary)}.tks-set-actions{display:flex;gap:8px;margin-left:auto}.tks-btn{font:inherit;font-size:12px;line-height:1.5;padding:4px 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap}.tks-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.tks-card{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}.tks-card-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.tks-card-name{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}.tks-card-dir{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);word-break:break-all;font-family:var(--dsw-font-mono,ui-monospace,monospace)}.tks-row{display:flex;align-items:flex-start;gap:8px;padding:4px 0;border-top:1px dashed var(--dsw-alias-border-l1)}.tks-row:first-of-type{border-top:none}.tks-row-main{min-width:0;flex:1 1 auto;display:flex;flex-direction:column;gap:2px}.tks-row-label{font-size:12px;color:var(--dsw-alias-label-primary)}.tks-row-path{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);word-break:break-all;font-family:var(--dsw-font-mono,ui-monospace,monospace)}.tks-row-meta{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none}.tks-miss{color:var(--dsw-alias-label-secondary);opacity:.75}.tks-note{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary)}.tks-badge{font-size:11px;padding:1px 6px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}'
const CSS_ALL = CSS + CSS_SETTINGS
const PANEL_KEY = 'toolkit'
const TITLE = '工具集'
const EMPTY_HINT = '这个 bundle 里没有可显示的面板：dsh-toolkit 的其它组件没有把面板登记到共享注册表（多半是 client.js 没重新构建，或组件被单独加载了）。'
const SETTINGS_ID = '__toolkit-settings'
const SETTINGS_LABEL = '设置'

/** 注册表安全取用：单独加载本文件时它不存在。 */
function toolkitRegistry() {
  return typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null
}

/** 字节数 → 人类可读（设置页只做展示，不参与任何计算）。 */
function formatBytes(value) {
  const bytes = Number(value) || 0
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

/** mtime → 本地时间短串。 */
function formatTime(ms) {
  const stamp = Number(ms) || 0
  if (stamp <= 0) return ''
  try {
    return new Date(stamp).toLocaleString()
  } catch {
    return ''
  }
}

/** 同源 fetch + JSON：失败时把网关回的错误码/消息带出来。 */
async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  const text = await res.text()
  let data = null
  try {
    data = text === '' ? null : JSON.parse(text)
  } catch {
    data = null
  }
  if (!res.ok) {
    const message = data !== null && typeof data === 'object' && (data.message || data.code)
    throw new Error(message || ('HTTP ' + res.status))
  }
  return data
}

return {
  inject: ['slots', 'layout'],
  apply(ctx) {
    ctx.effect(() => {
      const el = document.createElement("style")
      el.textContent = CSS_ALL
      document.head.appendChild(el)
      return () => el.remove()
    }, "toolkit: styles")

    const slots = ctx.slots
    const registry = toolkitRegistry()
    // 面板必须登记 main，否则 layout.selectPanel('toolkit') 会抛错；这里先返回，
    // 让「单独加载」退化成「没有 UI」而不是「一条点不开的入口」。
    if (slots === undefined || registry === null) return

    // 共享的当前分页挂在注册表上：所有工厂函数同处一个模块作用域，这样壳与
    // 将来其它组件都能读到同一份状态。
    if (registry.shell === undefined || registry.shell === null) registry.shell = { active: '', listeners: new Set() }
    const state = registry.shell

    const emit = () => {
      for (const listener of Array.from(state.listeners)) {
        try { listener() } catch (error) { /* 单个订阅者出错不影响其它人 */ }
      }
    }

    /** 设置页：只读展示各组件的数据落点（文件是否存在、多大、什么时候改的）。 */
    function SettingsPanel() {
      const [state, setState] = React.useState({ loading: true, data: null, error: null })
      const [copied, setCopied] = React.useState('')

      const load = () => {
        setState((prev) => ({ ...prev, loading: true, error: null }))
        fetchJson('/api/toolkit/settings')
          .then((data) => setState({ loading: false, data, error: null }))
          .catch((error) => setState({ loading: false, data: null, error: String(error && error.message ? error.message : error) }))
      }
      React.useEffect(() => { load() }, [])

      const copy = (text) => {
        const done = () => {
          setCopied(text)
          window.setTimeout(() => setCopied(''), 1500)
        }
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(text).then(done).catch(() => {})
        }
      }

      const data = state.data
      const components = data !== null && Array.isArray(data.components) ? data.components : []
      const overridden = data !== null && Array.isArray(data.overriddenNames) ? data.overriddenNames : []

      const head = React.createElement('div', { className: 'tks-set-head' },
        React.createElement('div', null,
          React.createElement('div', { className: 'tks-set-title' }, '数据目录'),
          React.createElement('div', { className: 'tks-set-sub' },
            '各组件的数据分开存放，不做老位置兼容；这里显示的就是它实际读写的位置。')),
        React.createElement('div', { className: 'tks-set-actions' },
          data !== null && data.version ? React.createElement('span', { className: 'tks-badge' }, 'v' + data.version) : null,
          React.createElement('button', { className: 'tks-btn', type: 'button', onClick: load, disabled: state.loading },
            state.loading ? '读取中…' : '刷新')))

      const root = data === null
        ? null
        : React.createElement('div', { className: 'tks-card' },
            React.createElement('div', { className: 'tks-card-head' },
              React.createElement('span', { className: 'tks-card-name' }, '根目录'),
              React.createElement('button', {
                className: 'tks-btn',
                type: 'button',
                onClick: () => copy(String(data.dataDir || '')),
              }, copied === String(data.dataDir || '') ? '已复制' : '复制路径')),
            React.createElement('div', { className: 'tks-card-dir' }, String(data.dataDir || '')),
            overridden.length === 0
              ? null
              : React.createElement('div', { className: 'tks-note' }, '这些位置被环境变量接管：' + overridden.join('、')))

      const cards = components.map((component) => React.createElement('div', { className: 'tks-card', key: component.id },
        React.createElement('div', { className: 'tks-card-head' },
          React.createElement('span', { className: 'tks-card-name' }, component.label),
          component.dir === null || component.dir === undefined
            ? null
            : React.createElement('button', {
                className: 'tks-btn',
                type: 'button',
                onClick: () => copy(String(component.dir)),
              }, copied === String(component.dir) ? '已复制' : '复制目录')),
        component.dir === null || component.dir === undefined
          ? null
          : React.createElement('div', { className: 'tks-card-dir' }, String(component.dir)),
        component.note !== undefined && component.note !== null && String(component.note) !== ''
          ? React.createElement('div', { className: 'tks-note' }, String(component.note))
          : null,
        (Array.isArray(component.files) ? component.files : []).map((file) => React.createElement('div', { className: 'tks-row', key: file.path },
          React.createElement('div', { className: 'tks-row-main' },
            React.createElement('div', { className: 'tks-row-label' }, String(file.label)),
            React.createElement('div', { className: 'tks-row-path' }, String(file.path))),
          React.createElement('div', { className: file.exists ? 'tks-row-meta' : 'tks-row-meta tks-miss' },
            file.exists === true
              ? (file.kind === 'dir' ? '目录' : formatBytes(file.bytes)) + (file.mtime > 0 ? ' · ' + formatTime(file.mtime) : '')
              : '未创建')))))

      return React.createElement('div', { className: 'tks-set' },
        head,
        state.error !== null
          ? React.createElement('div', { className: 'tks-empty' }, '读取数据目录失败：' + state.error)
          : null,
        data === null && state.loading === true
          ? React.createElement('div', { className: 'tks-empty' }, '正在读取数据目录…')
          : null,
        root,
        cards)
    }

    /** 全部分页 = 注册表里的组件面板 + 壳内置的设置页（永远排最后）。 */
    const entriesOf = () => registry.entries().concat([{ id: SETTINGS_ID, label: SETTINGS_LABEL, order: 9999, Panel: SettingsPanel }])

    const keysOf = () => entriesOf().map((entry) => entry.id)
    const labelOf = (entry) => entry.label !== undefined && entry.label !== null ? String(entry.label) : entry.id

    /** 选一个分页：写共享状态并通知面板重渲染。选不到就退到第一个可用分页。 */
    function selectTab(key) {
      const available = keysOf()
      if (available.length === 0) return
      state.active = typeof key === 'string' && available.includes(key) ? key : available[0]
      emit()
    }

    function currentTab() {
      const available = keysOf()
      if (available.length === 0) return ''
      return available.includes(state.active) ? state.active : available[0]
    }

    function mainGlyph() {
      return React.createElement('span', {
        className: 'tks-glyph',
        style: { width: '18px', height: '18px', fontSize: '11px' },
      }, 'T')
    }

    /** toolkit 界面本体：分页栏 + 当前分页（非活动页整个卸载，避免后台轮询常驻）。 */
    function ToolkitPanel() {
      const entries = entriesOf()
      const [, setTick] = React.useState(0)
      React.useEffect(() => {
        const listener = () => setTick((value) => value + 1)
        state.listeners.add(listener)
        return () => { state.listeners.delete(listener) }
      }, [])
      const active = currentTab()
      const activeEntry = entries.find((entry) => entry.id === active)
      return React.createElement('div', { className: 'tks-root' },
        React.createElement('div', { className: 'tks-tabs', role: 'tablist' }, entries.map((entry) => React.createElement('button', {
          key: entry.id,
          type: 'button',
          role: 'tab',
          className: 'tks-tab' + (entry.id === active ? ' tks-tab-on' : ''),
          'aria-selected': entry.id === active,
          onClick: () => selectTab(entry.id),
        }, labelOf(entry)))),
        React.createElement('div', { className: 'tks-body' },
          activeEntry !== undefined
            ? React.createElement(activeEntry.Panel)
            : React.createElement('div', { className: 'tks-empty' }, EMPTY_HINT)))
    }

    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, ToolkitPanel))
    slots.inject('sidebar.panellist', () => slots.register(
      { name: 'sidebar.panellist', id: PANEL_KEY, label: TITLE, order: 48 },
      () => mainGlyph()))
  },
}
  },
})
