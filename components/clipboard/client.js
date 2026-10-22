window.__ModuleLoader__.load({
  id: "@local/clipboard",
  factory(require) {
    const React = require("react")
// clipboard：把「太长、会把输入框占满」的粘贴内容落成文件，输入框里只留一行 @ 引用。
//
// 浏览器侧没有 composer Service，也没有「读剪贴板」的权限入口，所以自动路径只能
// 靠 document 上 capture 阶段的 paste 事件：命中阈值才 preventDefault()，落盘成功后
// 把 `@"绝对路径"` 插回焦点编辑区；任何一步失败都把原文插回去，绝不吞内容。
//
// 扩展名规则（与 docs/功能案-剪贴板.md 4.2 一致）：
//   剪贴板只带一种 text/* 格式 → 按它取扩展名（plain→.txt / html→.html / csv→.csv / md→.md）
//   带两种及以上 → 统一 .txt，内容取 plain → csv → html 的第一份
//   一份文本都没有（只有图片/文件）→ 完全不介入
const CSS = [
  '.cb-root{display:flex;flex-direction:column;gap:0;height:100%;min-height:0;box-sizing:border-box;background:var(--dsw-alias-bg-layer-0)}',
  '.cb-top{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;padding:12px 14px 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
  '.cb-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)}',
  '.cb-sub{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary)}',
  '.cb-dir{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);word-break:break-all;font-family:var(--dsw-font-mono,ui-monospace,monospace)}',
  '.cb-actions{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap}',
  '.cb-btn{font:inherit;font-size:12px;line-height:1.5;padding:4px 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap}',
  '.cb-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
  '.cb-btn:disabled{opacity:.5;cursor:default}',
  '.cb-btn-danger:hover{color:var(--dsw-alias-label-error,#e5484d);border-color:var(--dsw-alias-label-error,#e5484d)}',
  '.cb-badge{font-size:11px;padding:1px 6px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap}',
  '.cb-badge-warn{color:var(--dsw-alias-label-warning,#c76a00);border-color:currentColor}',
  '.cb-notice{margin:0 14px;padding:8px 10px;border-radius:8px;font-size:12px;line-height:1.6;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1)}',
  '.cb-notice-warn{border-color:var(--dsw-alias-border-warning, var(--dsw-alias-border-l1));color:var(--dsw-alias-label-warning, var(--dsw-alias-label-primary))}',
  '.cb-config{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 14px;border-bottom:1px dashed var(--dsw-alias-border-l1);font-size:12px;color:var(--dsw-alias-label-secondary)}',
  '.cb-sep{width:1px;height:14px;background:var(--dsw-alias-border-l1);margin:0 2px}',
  '.cb-config label{display:inline-flex;align-items:center;gap:6px}',
  '.cb-input{font:inherit;font-size:12px;width:84px;padding:3px 6px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary)}',
  '.cb-list{flex:1 1 auto;min-height:0;overflow:auto;padding:6px 14px 18px;display:flex;flex-direction:column;gap:4px}',
  '.cb-row{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;border:1px solid transparent}',
  '.cb-row:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l1)}',
  '.cb-row-main{min-width:0;flex:1 1 auto;display:flex;flex-direction:column;gap:2px}',
  '.cb-name{font-size:12px;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-mono,ui-monospace,monospace);word-break:break-all}',
  '.cb-meta{font-size:11px;color:var(--dsw-alias-label-secondary);display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
  '.cb-row-ops{display:flex;gap:6px;flex:none;flex-wrap:wrap;justify-content:flex-end}',
  '.cb-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:36px 20px;font-size:13px;line-height:1.7;color:var(--dsw-alias-label-secondary);text-align:center}',
  '.cb-preview{position:absolute;inset:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-0);border-left:1px solid var(--dsw-alias-border-l1);z-index:2}',
  '.cb-preview-head{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
  '.cb-pre{flex:1 1 auto;min-height:0;overflow:auto;margin:0;padding:12px 14px;font-family:var(--dsw-font-mono,ui-monospace,monospace);font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary)}',
].join('')

const PANEL_KEY = 'clipboard'
const LABEL = '剪贴板'
const MIME_ORDER = ['text/plain', 'text/csv', 'text/html']
const EXT_BY_MIME = { 'text/plain': '.txt', 'text/html': '.html', 'text/csv': '.csv', 'text/markdown': '.md' }

function extensionFor(mime) {
  const key = typeof mime === 'string' ? mime.trim().toLowerCase() : ''
  return EXT_BY_MIME[key] ?? '.txt'
}

function mimeRank(type) {
  const index = MIME_ORDER.indexOf(type)
  return index < 0 ? MIME_ORDER.length : index
}

/**
 * 从 paste 事件里取文本：只带一种 text/* 格式就按它取扩展名，
 * 带多种统一 .txt（内容优先纯文本）。
 */
function pickClipboard(event) {
  const data = event !== null && event !== undefined ? event.clipboardData : null
  if (data === null || data === undefined || typeof data.getData !== 'function') return null
  const types = Array.from(data.types || []).map((type) => String(type))
  const texts = types.filter((type) => /^text\//i.test(type))
  if (texts.length === 0) return null
  const unique = Array.from(new Set(texts))
  const sorted = unique.slice().sort((left, right) => mimeRank(left.toLowerCase()) - mimeRank(right.toLowerCase()) || left.localeCompare(right))
  const mime = sorted[0]
  let text = ''
  try {
    text = String(data.getData(mime) || '')
  } catch {
    return null
  }
  if (text === '') return null
  return { text, mime: mime.toLowerCase(), ext: unique.length === 1 ? extensionFor(mime) : '.txt' }
}

function countLines(text) {
  if (typeof text !== 'string' || text === '') return 0
  return text.replace(/\n$/, '').split('\n').length
}

function formatBytes(value) {
  const bytes = Number(value) || 0
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function formatTime(ms) {
  const stamp = Number(ms) || 0
  if (stamp <= 0) return ''
  try {
    return new Date(stamp).toLocaleString()
  } catch {
    return ''
  }
}

/** `@` 引用文本：路径含空白或引号时用 `@"…"`（DSH 的 user-text-rules 只认这两种）。 */
function referenceText(path) {
  const value = String(path || '')
  return /[\s"]/u.test(value) ? '@"' + value + '"' : '@' + value
}

/** 从事件目标找出可插入文本的编辑区（textarea 或 contenteditable）。 */
function editableTarget(node) {
  let current = node
  if (current !== null && current !== undefined && current.nodeType === 3) current = current.parentElement
  while (current !== null && current !== undefined && current.nodeType === 1) {
    if (current.tagName === 'TEXTAREA') return current
    if (current.isContentEditable === true) return current
    current = current.parentElement
  }
  return null
}

/** 把文本写进编辑区：textarea 走 setRangeText，contenteditable 先试 execCommand。 */
function insertInto(target, text) {
  if (target === null || target === undefined) return false
  try {
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
      const start = typeof target.selectionStart === 'number' ? target.selectionStart : target.value.length
      const end = typeof target.selectionEnd === 'number' ? target.selectionEnd : start
      target.setRangeText(text, start, end, 'end')
      target.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    }
    if (document.execCommand && document.execCommand('insertText', false, text)) return true
    const selection = window.getSelection()
    if (selection !== null && selection.rangeCount > 0) {
      selection.deleteFromDocument()
      const node = document.createTextNode(text)
      const range = selection.getRangeAt(0)
      range.insertNode(node)
      range.setStartAfter(node)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      target.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    }
  } catch { /* 插入失败由调用方退回原文 */ }
  return false
}

async function fetchJson(url, init) {
  const res = await fetch(url, Object.assign({ headers: { accept: 'application/json' } }, init || {}))
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

function postJson(url, body) {
  return fetchJson(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body || {}),
  })
}

return {
  inject: ['slots'],
  apply(ctx) {
    // 面板与粘贴拦截共用一份「最近一次提示 + 生效阈值」，避免两处各拉一次配置。
    const shared = { notice: '', dir: '', limits: null, listeners: new Set() }
    const announce = (text) => {
      shared.notice = String(text || '')
      for (const listener of Array.from(shared.listeners)) {
        try { listener() } catch { /* 单个订阅者出错不影响其它人 */ }
      }
    }

    // 先取一次阈值：首次粘贴不该因为「配置还没到」而用错默认值。
    const refreshLimits = () => {
      fetchJson('/api/clipboard/config')
        .then((data) => {
          if (data === null) return
          if (data.limits !== undefined) shared.limits = data.limits
          if (data.paths !== undefined && typeof data.paths.dir === 'string') shared.dir = data.paths.dir
        })
        .catch(() => {})
    }
    refreshLimits()

    ctx.effect(() => {
      const el = document.createElement('style')
      el.textContent = CSS
      document.head.appendChild(el)
      return () => el.remove()
    }, 'clipboard: styles')

    // ── 粘贴拦截（capture 阶段，命中阈值才介入）──
    const onPaste = (event) => {
      if (event.defaultPrevented === true || event.shiftKey === true) return
      if (shared.limits !== null && shared.limits.enabled === false) return
      const target = editableTarget(event.target)
      if (target === null) return
      const picked = pickClipboard(event)
      if (picked === null) return
      const limits = shared.limits || { thresholdChars: 2000, thresholdLines: 30 }
      const longEnough = picked.text.length >= limits.thresholdChars || countLines(picked.text) >= limits.thresholdLines
      if (!longEnough) return
      // 到这里才接管：先挡住原生粘贴，落盘成功再插入引用。
      event.preventDefault()
      event.stopPropagation()
      postJson('/api/clipboard/paste', { text: picked.text, mime: picked.mime })
        .then((data) => {
          if (data === null || data.ok !== true || typeof data.path !== 'string') throw new Error('落盘失败')
          const inserted = insertInto(target, referenceText(data.path) + '\n')
          if (!inserted) window.navigator.clipboard?.writeText?.(referenceText(data.path)).catch(() => {})
          announce('已保存为 ' + data.name + '（' + data.lines + ' 行 / ' + formatBytes(data.bytes) + '）' +
            (data.reused === true ? ' · 复用了已有文件' : ''))
        })
        .catch((error) => {
          insertInto(target, picked.text)
          announce('保存失败，已按原文粘贴：' + String(error && error.message ? error.message : error))
        })
    }
    ctx.effect(() => {
      if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return () => {}
      document.addEventListener('paste', onPaste, true)
      return () => {
        if (typeof document.removeEventListener === 'function') document.removeEventListener('paste', onPaste, true)
      }
    }, 'clipboard: paste listener')

    const slots = ctx.slots
    const registry = typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null

    function Panel() {
      const [state, setState] = React.useState({ loading: true, data: null, error: null })
      const [limits, setLimits] = React.useState(shared.limits)
      const [preview, setPreview] = React.useState(null)
      const [notice, setNotice] = React.useState(shared.notice)
      const [busy, setBusy] = React.useState('')
      const [draft, setDraft] = React.useState(null)
      // 宿主没重启时仍是旧后端：config 里没有 cleanup* 字段，保存会被静默丢弃。
      const [stale, setStale] = React.useState(false)

      const load = () => {
        setState((prev) => ({ ...prev, loading: true, error: null }))
        fetchJson('/api/clipboard/list?limit=300')
          .then((data) => setState({ loading: false, data, error: null }))
          .catch((error) => setState({ loading: false, data: null, error: String(error && error.message ? error.message : error) }))
        fetchJson('/api/clipboard/config')
          .then((data) => {
            if (data !== null && data.limits !== undefined) {
              shared.limits = data.limits
              if (data.paths !== undefined && typeof data.paths.dir === 'string') shared.dir = data.paths.dir
              setLimits(data.limits)
              setStale(!(typeof data.limits.cleanupEnabled === 'boolean'
                && typeof data.limits.cleanupMaxAgeDays === 'number'
                && typeof data.limits.cleanupMaxTotalBytes === 'number'))
              setDraft({
                enabled: data.limits.enabled,
                thresholdChars: data.limits.thresholdChars,
                thresholdLines: data.limits.thresholdLines,
                cleanupEnabled: data.limits.cleanupEnabled === true,
                cleanupMaxAgeDays: Number(data.limits.cleanupMaxAgeDays) || 0,
                cleanupMaxTotalBytes: Number(data.limits.cleanupMaxTotalBytes) || 0,
              })
            }
          })
          .catch(() => {})
      }

      React.useEffect(() => {
        load()
        const listener = () => setNotice(shared.notice)
        shared.listeners.add(listener)
        return () => { shared.listeners.delete(listener) }
      }, [])

      const copy = (text) => {
        if (window.navigator.clipboard && typeof window.navigator.clipboard.writeText === 'function') {
          window.navigator.clipboard.writeText(String(text || '')).then(() => announce('已复制：' + text)).catch(() => {})
        }
      }

      const saveConfig = () => {
        if (draft === null) return
        setBusy('config')
        postJson('/api/clipboard/config', draft)
          .then((data) => {
            if (data !== null && data.limits !== undefined) {
              shared.limits = data.limits
              setLimits(data.limits)
              announce('设置已保存')
            }
          })
          .catch((error) => announce('保存设置失败：' + String(error && error.message ? error.message : error)))
          .finally(() => setBusy(''))
      }

      const manual = () => {
        const clip = window.navigator.clipboard
        if (clip === undefined || typeof clip.readText !== 'function') {
          announce('这个环境不允许读剪贴板，请直接在输入框里粘贴')
          return
        }
        setBusy('manual')
        clip.readText()
          .then((text) => postJson('/api/clipboard/paste', { text, mime: 'text/plain' }))
          .then((data) => {
            if (data === null || data.ok !== true) throw new Error('落盘失败')
            copy(referenceText(data.path))
            announce('已保存为 ' + data.name + '，引用已复制，粘到输入框即可')
            load()
          })
          .catch((error) => announce('转换失败：' + String(error && error.message ? error.message : error)))
          .finally(() => setBusy(''))
      }

      const openPreview = (item) => {
        setBusy(item.name)
        fetchJson('/api/clipboard/file?name=' + encodeURIComponent(item.name) + '&head=200')
          .then((data) => {
            if (data === null || data.ok !== true) throw new Error('读取失败')
            setPreview({ name: data.name, text: data.text, trimmed: data.trimmed === true, lines: data.lines })
          })
          .catch((error) => announce('预览失败：' + String(error && error.message ? error.message : error)))
          .finally(() => setBusy(''))
      }

      const remove = (item) => {
        if (window.confirm === undefined || window.confirm('删除 ' + item.name + '？（文件会真删，不能恢复）') !== true) return
        setBusy(item.name)
        postJson('/api/clipboard/delete', { name: item.name })
          .then((data) => {
            if (data === null || data.ok !== true) throw new Error('删除失败')
            announce('已删除 ' + item.name)
            setPreview(null)
            load()
          })
          .catch((error) => announce('删除失败：' + String(error && error.message ? error.message : error)))
          .finally(() => setBusy(''))
      }

      const cleanup = () => {
        setBusy('cleanup')
        postJson('/api/clipboard/cleanup', {})
          .then((data) => {
            if (data === null || data.ok !== true) throw new Error('清理失败')
            const removed = Number(data.removed) || 0
            announce(removed === 0
              ? '没有需要清理的文件'
              : '已清理 ' + removed + ' 个文件，释放 ' + formatBytes(Number(data.freedBytes) || 0))
            load()
          })
          .catch((error) => announce('清理失败：' + String(error && error.message ? error.message : error)))
          .finally(() => setBusy(''))
      }

      const items = state.data !== null && Array.isArray(state.data.items) ? state.data.items : []
      const total = state.data !== null ? Number(state.data.total) || 0 : 0
      const totalBytes = state.data !== null ? Number(state.data.totalBytes) || 0 : 0
      const rootDir = shared.dir

      const head = React.createElement('div', { className: 'cb-top' },
        React.createElement('div', null,
          React.createElement('div', { className: 'cb-title' }, LABEL),
          React.createElement('div', { className: 'cb-sub' },
            '长文本粘贴自动落成文件，输入框只留一行 @ 引用；图片与文件粘贴不介入。'),
          rootDir !== '' ? React.createElement('div', { className: 'cb-dir' }, rootDir) : null),
        React.createElement('div', { className: 'cb-actions' },
          React.createElement('span', { className: 'cb-badge' }, total + ' 个文件 · ' + formatBytes(totalBytes)),
          limits !== null && limits.enabled === false ? React.createElement('span', { className: 'cb-badge cb-badge-warn' }, '自动转换已关') : null,
          React.createElement('button', { className: 'cb-btn', type: 'button', onClick: manual, disabled: busy !== '' },
            busy === 'manual' ? '转换中…' : '把当前剪贴板转成文件'),
          React.createElement('button', { className: 'cb-btn', type: 'button', onClick: cleanup, disabled: busy !== '' },
            busy === 'cleanup' ? '清理中…' : '立即清理'),
          React.createElement('button', { className: 'cb-btn', type: 'button', onClick: load, disabled: state.loading },
            state.loading ? '刷新中…' : '刷新')))

      const noticeEl = notice === ''
        ? null
        : React.createElement('div', { className: 'cb-notice' }, notice,
            React.createElement('button', {
              className: 'cb-btn',
              type: 'button',
              style: { marginLeft: '8px', padding: '0 6px' },
              onClick: () => announce(''),
            }, '知道了'))

      const staleEl = stale
        ? React.createElement('div', { className: 'cb-notice cb-notice-warn' },
            '清理设置现在存不进去：宿主跑的仍是旧版本（DSH App 没重启）。重启后这几项才生效。')
        : null

      const configEl = draft === null
        ? null
        : React.createElement('div', { className: 'cb-config' },
            React.createElement('label', null,
              React.createElement('input', {
                type: 'checkbox',
                checked: draft.enabled === true,
                onChange: (event) => setDraft({ ...draft, enabled: event.target.checked === true }),
              }),
              '自动转换'),
            React.createElement('label', null,
              '字符阈值 ',
              React.createElement('input', {
                className: 'cb-input',
                type: 'number',
                min: 1,
                value: draft.thresholdChars,
                onChange: (event) => setDraft({ ...draft, thresholdChars: Number(event.target.value) || 1 }),
              })),
            React.createElement('label', null,
              '行数阈值 ',
              React.createElement('input', {
                className: 'cb-input',
                type: 'number',
                min: 1,
                value: draft.thresholdLines,
                onChange: (event) => setDraft({ ...draft, thresholdLines: Number(event.target.value) || 1 }),
              })),
            React.createElement('span', { className: 'cb-sep' }),
            React.createElement('label', null,
              React.createElement('input', {
                type: 'checkbox',
                checked: draft.cleanupEnabled === true,
                disabled: stale,
                onChange: (event) => setDraft({ ...draft, cleanupEnabled: event.target.checked === true }),
              }),
              '自动清理'),
            React.createElement('label', null,
              '保留天数 ',
              React.createElement('input', {
                className: 'cb-input',
                type: 'number',
                min: 0,
                title: '0 表示不按天数清理',
                value: draft.cleanupMaxAgeDays,
                disabled: stale,
                onChange: (event) => setDraft({ ...draft, cleanupMaxAgeDays: Math.max(0, Number(event.target.value) || 0) }),
              })),
            React.createElement('label', null,
              '总量上限(MB) ',
              React.createElement('input', {
                className: 'cb-input',
                type: 'number',
                min: 0,
                title: '0 表示不按总量清理',
                value: Math.max(0, Math.round((Number(draft.cleanupMaxTotalBytes) || 0) / 1048576)),
                disabled: stale,
                onChange: (event) => setDraft({ ...draft, cleanupMaxTotalBytes: Math.max(0, Number(event.target.value) || 0) * 1048576 }),
              })),
            React.createElement('button', { className: 'cb-btn', type: 'button', onClick: saveConfig, disabled: busy === 'config' },
              busy === 'config' ? '保存中…' : '保存设置'))

      const rows = items.map((item) => React.createElement('div', { className: 'cb-row', key: item.dir + '/' + item.name },
        React.createElement('div', { className: 'cb-row-main' },
          React.createElement('div', { className: 'cb-name' }, String(item.name)),
          React.createElement('div', { className: 'cb-meta' },
            React.createElement('span', null, formatTime(item.at)),
            React.createElement('span', null, String(item.mime || '')),
            React.createElement('span', null, Number(item.lines) + ' 行'),
            React.createElement('span', null, formatBytes(item.bytes)),
            Number(item.hits) > 1 ? React.createElement('span', { className: 'cb-badge' }, '复用 ' + Number(item.hits) + ' 次') : null,
            null)),
        React.createElement('div', { className: 'cb-row-ops' },
          React.createElement('button', { className: 'cb-btn', type: 'button', onClick: () => copy(referenceText(item.path)) }, '复制 @ 引用'),
          React.createElement('button', { className: 'cb-btn', type: 'button', onClick: () => copy(item.displayPath || item.path) }, '复制路径'),
          React.createElement('button', { className: 'cb-btn', type: 'button', onClick: () => openPreview(item), disabled: busy === item.name },
            busy === item.name ? '读取中…' : '预览'),
          React.createElement('button', { className: 'cb-btn cb-btn-danger', type: 'button', onClick: () => remove(item), disabled: busy === item.name }, '删除'))))

      const empty = React.createElement('div', { className: 'cb-empty' },
        React.createElement('div', null, '还没有转换过的内容。'),
        React.createElement('div', null,
          '在输入框里粘贴超过 ' + (limits !== null ? limits.thresholdChars : 2000) + ' 字符或 ' +
          (limits !== null ? limits.thresholdLines : 30) + ' 行的文本时会自动落成文件；'),
        React.createElement('div', null, '图片、文件等二进制内容不介入，照旧走 DSH 原生粘贴。'))

      const body = state.error !== null
        ? React.createElement('div', { className: 'cb-empty' }, '读取失败：' + state.error)
        : state.loading && state.data === null
          ? React.createElement('div', { className: 'cb-empty' }, '正在读取…')
          : items.length === 0 ? empty : rows

      const previewEl = preview === null
        ? null
        : React.createElement('div', { className: 'cb-preview' },
            React.createElement('div', { className: 'cb-preview-head' },
              React.createElement('span', { className: 'cb-name' }, preview.name),
              React.createElement('span', { className: 'cb-badge' }, preview.lines + ' 行'),
              preview.trimmed ? React.createElement('span', { className: 'cb-badge cb-badge-warn' }, '仅显示前 200 行 / 64 KiB') : null,
              React.createElement('div', { className: 'cb-actions' },
                React.createElement('button', { className: 'cb-btn', type: 'button', onClick: () => setPreview(null) }, '关闭'))),
            React.createElement('pre', { className: 'cb-pre' }, preview.text))

      return React.createElement('div', { className: 'cb-root', style: { position: 'relative' } },
        head,
        staleEl,
        noticeEl,
        configEl,
        React.createElement('div', { className: 'cb-list' }, body),
        previewEl)
    }

    if (slots === undefined) return
    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, Panel))
    // 与其它组件一致：一起加载时只登记到 toolkit 的共享注册表（侧边栏只留「工具集」），
    // 单独加载本文件时退回自己注册一条侧边栏入口。
    if (registry !== null) {
      registry.register({ id: PANEL_KEY, Panel, label: LABEL, order: 50, glyphText: 'P' })
    } else {
      slots.inject('sidebar.panellist', () => slots.register(
        { name: 'sidebar.panellist', id: PANEL_KEY, label: LABEL, order: 50 },
        () => React.createElement('span', { className: 'cb-badge' }, 'P')))
    }
  },
}
  },
})
