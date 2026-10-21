window.__ModuleLoader__.load({
  id: "@local/mcp",
  factory(require) {
    const React = require("react")
const CSS = '.mc-root{position:relative;display:flex;flex-direction:column;gap:12px;padding:16px 18px 14px;box-sizing:border-box;min-height:0;height:100%;overflow:hidden;background:var(--dsw-alias-bg-layer-0);color:var(--dsw-alias-label-primary)}.mc-meta{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);font-size:12px}.mc-kv{display:flex;align-items:baseline;gap:6px;min-width:0}.mc-k{color:var(--dsw-alias-label-tertiary);flex:none}.mc-v{color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-family-mono,monospace);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:360px}.mc-spacer{flex:1 1 auto}.mc-body{flex:1 1 auto;display:flex;gap:12px;min-height:0}.mc-col-list{flex:0 0 300px;display:flex;flex-direction:column;gap:8px;min-height:0}.mc-col-detail{flex:1 1 auto;display:flex;flex-direction:column;gap:10px;min-height:0;min-width:0}.mc-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:10px;padding-right:2px}.mc-item{display:flex;flex-direction:column;gap:3px;padding:7px 9px;border:1px solid transparent;border-radius:8px;cursor:pointer;background:transparent;text-align:left;width:100%;box-sizing:border-box;font:inherit;color:inherit}.mc-item:hover{background:var(--dsw-alias-interactive-bg-hover)}.mc-item-on{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}.mc-item-name{font-size:12.5px;font-weight:600;word-break:break-all}.mc-item-meta{display:flex;flex-wrap:wrap;gap:4px;align-items:center}.mc-badge{display:inline-flex;align-items:center;gap:3px;padding:0 5px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}.mc-badge-ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}.mc-badge-bad{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}.mc-badge-warn{color:var(--dsw-alias-state-warning-primary);border-color:var(--dsw-alias-state-warning-primary)}.mc-detail-head{flex:none;display:flex;flex-direction:column;gap:4px;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}.mc-detail-title{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13.5px;font-weight:600}.mc-path{font-family:var(--dsw-font-family-mono,monospace);font-size:10.5px;color:var(--dsw-alias-label-tertiary);word-break:break-all}.mc-field{display:flex;flex-direction:column;gap:4px}.mc-label{font-size:11px;color:var(--dsw-alias-label-tertiary)}.mc-input,.mc-textarea,.mc-select{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:6px 8px;font-size:12px;font-family:inherit;outline:none}.mc-input:focus,.mc-textarea:focus,.mc-select:focus{border-color:var(--dsw-alias-brand-primary)}.mc-textarea{resize:vertical;line-height:1.5}.mc-mono{font-family:var(--dsw-font-family-mono,monospace);font-size:11.5px}.mc-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.mc-btn{appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:5px 12px;font-size:12px;cursor:pointer;white-space:nowrap}.mc-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.mc-btn:disabled{opacity:.45;cursor:not-allowed}.mc-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600}.mc-btn-danger{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);background:transparent}.mc-btn-sm{padding:2px 8px;font-size:11px}.mc-switch{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:4px 9px;font-size:11.5px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);cursor:pointer}.mc-switch-on{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}.mc-switch:disabled{opacity:.5;cursor:not-allowed}.mc-notice{flex:none;padding:7px 10px;border-radius:8px;font-size:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}.mc-notice-ok{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}.mc-notice-bad{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}.mc-notice-warn{border-color:var(--dsw-alias-state-warning-primary);color:var(--dsw-alias-state-warning-primary)}.mc-empty{padding:18px 12px;font-size:12px;color:var(--dsw-alias-label-tertiary);text-align:center;border:1px dashed var(--dsw-alias-border-l1);border-radius:9px}.mc-dirty{color:var(--dsw-alias-state-warning-primary);font-size:11px}.mc-glyph{display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:13px;font-weight:700;color:inherit}.mc-hint{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.5}.mc-tools{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}.mc-tool{display:flex;flex-direction:column;gap:2px}.mc-tool-name{font-family:var(--dsw-font-family-mono,monospace);font-size:11.5px;color:var(--dsw-alias-label-primary);word-break:break-all}.mc-tool-desc{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.45}'
const PANEL_KEY = 'mcp'
const LABEL = 'MCP'
const TRANSPORT_STDIO = 'stdio'
const TRANSPORT_HTTP = 'streamable-http'

const EMPTY_META = { loading: true, data: null, error: null }
const EMPTY_LIST = { loading: true, data: null, error: null }
const EMPTY_PROBE = { running: false, data: null, error: null }

/** 新建表单初值：字段名与 host 的 normalizeConfig 一一对应。 */
const EMPTY_DRAFT = {
  entryId: null,
  created: true,
  serverName: '',
  transport: TRANSPORT_STDIO,
  command: '',
  argsText: '',
  cwd: '',
  url: '',
  toolCallTimeoutMs: '',
  maxInstructionBytes: '',
  failOnStartupError: false,
  reconnectEnabled: true,
  reconnectInitial: '',
  reconnectMax: '',
  reconnectAttempts: '',
}

function errText(cause) {
  if (cause === null || cause === undefined) return '未知错误'
  if (typeof cause === 'string') return cause
  if (typeof cause.message === 'string' && cause.message !== '') return cause.message
  return String(cause)
}

function confirmLose() {
  if (typeof globalThis.confirm !== 'function') return true
  return globalThis.confirm('当前 MCP 条目有未保存的改动，继续操作会丢失，确定吗？')
}

/** dict ↔ 文本：每行 `KEY=VALUE`，空行与 # 开头忽略。env 与 headers 共用。 */
function dictToText(dict) {
  if (dict === null || dict === undefined || typeof dict !== 'object') return ''
  return Object.entries(dict).map(([key, value]) => key + '=' + String(value)).join('\n')
}

function textToDict(text) {
  const out = {}
  const lines = typeof text === 'string' ? text.split('\n') : []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const at = trimmed.indexOf('=')
    if (at <= 0) continue
    out[trimmed.slice(0, at).trim()] = trimmed.slice(at + 1)
  }
  return out
}

/** 数字输入框 → 数字 | undefined：留空表示「用官方默认值」。 */
function numberOrUndefined(text) {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (trimmed === '') return undefined
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : undefined
}

/** 从列表项（含 config）生成编辑草稿。 */
function draftFrom(server, revealSecretText) {
  const config = server !== null && server !== undefined && server.config !== null && typeof server.config === 'object' ? server.config : {}
  const reconnect = config.reconnect !== null && typeof config.reconnect === 'object' ? config.reconnect : {}
  return {
    entryId: server === null || server === undefined ? null : server.entryId,
    created: false,
    serverName: typeof config.serverName === 'string' ? config.serverName : '',
    transport: config.transport === TRANSPORT_HTTP ? TRANSPORT_HTTP : TRANSPORT_STDIO,
    command: typeof config.command === 'string' ? config.command : '',
    argsText: Array.isArray(config.args) ? config.args.join('\n') : '',
    cwd: typeof config.cwd === 'string' ? config.cwd : '',
    url: typeof config.url === 'string' ? config.url : '',
    secretText: revealSecretText === true ? dictToText(config.transport === TRANSPORT_HTTP ? config.headers : config.env) : '',
    toolCallTimeoutMs: typeof config.toolCallTimeoutMs === 'number' ? String(config.toolCallTimeoutMs) : '',
    maxInstructionBytes: typeof config.maxInstructionBytes === 'number' ? String(config.maxInstructionBytes) : '',
    failOnStartupError: config.failOnStartupError === true,
    reconnectEnabled: reconnect.enabled !== false,
    reconnectInitial: typeof reconnect.initialDelayMs === 'number' ? String(reconnect.initialDelayMs) : '',
    reconnectMax: typeof reconnect.maxDelayMs === 'number' ? String(reconnect.maxDelayMs) : '',
    reconnectAttempts: typeof reconnect.maxAttempts === 'number' ? String(reconnect.maxAttempts) : '',
  }
}

/** 草稿 → host 的 config。留空的数值字段不发送，交给 host 用官方默认值补齐。 */
function configFromDraft(draft) {
  const config = {
    transport: draft.transport,
    serverName: draft.serverName.trim(),
    failOnStartupError: draft.failOnStartupError === true,
  }
  if (draft.transport === TRANSPORT_STDIO) {
    config.command = draft.command.trim()
    config.args = draft.argsText.split('\n').map((line) => line.trim()).filter((line) => line !== '')
    config.cwd = draft.cwd.trim()
    config.env = textToDict(draft.secretText)
  } else {
    config.url = draft.url.trim()
    config.headers = textToDict(draft.secretText)
  }
  const timeout = numberOrUndefined(draft.toolCallTimeoutMs)
  if (timeout !== undefined) config.toolCallTimeoutMs = timeout
  const instructions = numberOrUndefined(draft.maxInstructionBytes)
  if (instructions !== undefined) config.maxInstructionBytes = instructions
  const reconnect = { enabled: draft.reconnectEnabled !== false }
  const initial = numberOrUndefined(draft.reconnectInitial)
  if (initial !== undefined) reconnect.initialDelayMs = initial
  const max = numberOrUndefined(draft.reconnectMax)
  if (max !== undefined) reconnect.maxDelayMs = max
  const attempts = numberOrUndefined(draft.reconnectAttempts)
  if (attempts !== undefined) reconnect.maxAttempts = attempts
  config.reconnect = reconnect
  return config
}

return {
  inject: ['slots'],
  apply(ctx) {
    ctx.effect(() => {
      const el = document.createElement("style")
      el.textContent = CSS
      document.head.appendChild(el)
      return () => el.remove()
    }, "mcp: styles")

    const slots = ctx.slots

    const fetchJson = (url, init) => fetch(url, {
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      ...init,
    }).then((response) => response.json().catch(() => null).then((body) => {
      const failure = body !== null && typeof body === 'object' && typeof body.message === 'string' && body.message !== '' ? body.message : 'HTTP ' + response.status
      if (!response.ok || body === null || typeof body !== 'object' || body.ok !== true) throw new Error(failure)
      return body
    }))
    const postJson = (url, body) => fetchJson(url, { method: 'POST', body: JSON.stringify(body) })

    /** 删除单独拿状态码，便于区分「不存在」和「写失败」。 */
    const deleteEntry = (entryId) => fetch('/api/mcp/server?id=' + encodeURIComponent(entryId), {
      method: 'DELETE',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
    }).then((response) => response.json().catch(() => null).then((body) => ({ status: response.status, body })))

    function Panel() {
      const [meta, setMeta] = React.useState(EMPTY_META)
      const [list, setList] = React.useState(EMPTY_LIST)
      const [selected, setSelected] = React.useState(null)
      const [draft, setDraft] = React.useState(null)
      const [secretRevealed, setSecretRevealed] = React.useState(false)
      const [dirty, setDirty] = React.useState(false)
      const [busy, setBusy] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [probe, setProbe] = React.useState(EMPTY_PROBE)

      const loadAll = () => {
        setMeta(EMPTY_META)
        setList(EMPTY_LIST)
        return Promise.all([
          fetchJson('/api/mcp/meta').catch((cause) => ({ __error: errText(cause) })),
          fetchJson('/api/mcp/servers').catch((cause) => ({ __error: errText(cause) })),
        ]).then(([metaResult, listResult]) => {
          setMeta(metaResult.__error === undefined ? { loading: false, data: metaResult, error: null } : { loading: false, data: null, error: metaResult.__error })
          setList(listResult.__error === undefined ? { loading: false, data: listResult, error: null } : { loading: false, data: null, error: listResult.__error })
        })
      }

      React.useEffect(() => { loadAll() }, [])

      /** 打开条目：有未保存改动先确认；reveal 决定密钥是否取原文。 */
      const openEntry = (entryId, reveal, skipConfirm) => {
        if (skipConfirm !== true && dirty === true && !confirmLose()) return
        setSelected(entryId)
        setBusy('read')
        setNotice(null)
        setProbe(EMPTY_PROBE)
        fetchJson('/api/mcp/server?id=' + encodeURIComponent(entryId) + (reveal === true ? '&reveal=1' : ''))
          .then((data) => {
            const server = data.server !== null && typeof data.server === 'object' ? data.server : null
            setDraft(server === null ? null : draftFrom(server, reveal === true))
            setSecretRevealed(reveal === true)
            setDirty(false)
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '读取失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const openCreate = () => {
        if (dirty === true && !confirmLose()) return
        setSelected(null)
        setDraft({ ...EMPTY_DRAFT })
        setSecretRevealed(true)
        setDirty(false)
        setNotice(null)
        setProbe(EMPTY_PROBE)
      }

      const reloadList = () => fetchJson('/api/mcp/servers')
        .then((data) => setList({ loading: false, data, error: null }))
        .catch((cause) => setNotice({ kind: 'bad', text: '刷新列表失败：' + errText(cause) }))

      const patch = (changes) => {
        setDraft((current) => current === null ? current : { ...current, ...changes })
        setDirty(true)
      }

      const save = () => {
        if (draft === null) return
        setBusy('save')
        setNotice(null)
        const body = { config: configFromDraft(draft) }
        if (draft.entryId !== null) body.entryId = draft.entryId
        // 密钥区没显示原文时，提交里的空 dict 不能覆盖磁盘上的真实密钥：
        // 让 host 从旧 config 搬运（见 host.js 的 preserveSecrets 分支）。
        if (draft.entryId !== null && secretRevealed !== true) body.preserveSecrets = true
        postJson('/api/mcp/server', body)
          .then((data) => {
            setNotice({
              kind: data.applied === true ? 'ok' : 'warn',
              text: (data.created === true ? '已新增：' : '已保存：') + data.entryId + (data.applied === true ? '' : '（' + String(data.note ?? '') + '）'),
            })
            setDirty(false)
            const entryId = data.entryId
            return reloadList().then(() => openEntry(entryId, secretRevealed === true, true))
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '保存失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const toggleEnabled = () => {
        if (draft === null || draft.entryId === null) return
        const server = servers.find((item) => item.entryId === draft.entryId)
        const next = server === undefined ? true : server.enabled !== true
        setBusy('toggle')
        setNotice(null)
        postJson('/api/mcp/server/enabled', { id: draft.entryId, enabled: next })
          .then((data) => {
            setNotice({
              kind: data.applied === true ? 'ok' : 'warn',
              text: (next ? '已启用：' : '已停用：') + draft.entryId + (data.applied === true ? '' : '（' + String(data.note ?? '') + '）'),
            })
            return reloadList()
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '切换失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const remove = () => {
        if (draft === null || draft.entryId === null) return
        if (typeof globalThis.confirm === 'function' && !globalThis.confirm('删除后这个 MCP server 的工具会立刻下线，确定吗？')) return
        setBusy('delete')
        setNotice(null)
        deleteEntry(draft.entryId)
          .then((result) => {
            if (result.status === 200 && result.body !== null && result.body.ok === true) {
              setNotice({ kind: 'ok', text: '已删除：' + draft.entryId })
              setDraft(null)
              setSelected(null)
              return reloadList()
            }
            const message = result.body !== null && typeof result.body.message === 'string' ? result.body.message : 'HTTP ' + result.status
            setNotice({ kind: 'bad', text: '删除失败：' + message })
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '删除失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const runProbe = () => {
        if (draft === null) return
        setBusy('probe')
        setProbe({ running: true, data: null, error: null })
        const body = draft.entryId !== null && dirty !== true
          ? { id: draft.entryId }
          : { config: configFromDraft(draft) }
        postJson('/api/mcp/test', body)
          .then((data) => {
            const result = data.probe !== null && typeof data.probe === 'object' ? data.probe : null
            setProbe({ running: false, data: result, error: null })
          })
          .catch((cause) => setProbe({ running: false, data: null, error: errText(cause) }))
          .then(() => setBusy(null))
      }

      const reloadProfile = () => {
        setBusy('reload')
        setNotice(null)
        postJson('/api/mcp/reload', {})
          .then((data) => {
            const warnings = Array.isArray(data.warnings) ? data.warnings : []
            setNotice({
              kind: data.applied === true ? 'ok' : 'warn',
              text: data.applied === true
                ? '已触发热更' + (warnings.length === 0 ? '' : '（' + warnings.length + ' 条警告）')
                : String(data.note ?? '需要重启 DSH 生效'),
            })
            return reloadList()
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '热更失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const revealSecrets = () => {
        if (draft === null || draft.entryId === null) {
          setSecretRevealed(true)
          return
        }
        // 重新读一遍带 reveal=1 的条目，同时保留用户尚未保存的其它字段。
        fetchJson('/api/mcp/server?id=' + encodeURIComponent(draft.entryId) + '&reveal=1')
          .then((data) => {
            const server = data.server !== null && typeof data.server === 'object' ? data.server : null
            const config = server === null ? {} : server.config
            setDraft((current) => current === null ? current : {
              ...current,
              secretText: dictToText(config.transport === TRANSPORT_HTTP ? config.headers : config.env),
            })
            setSecretRevealed(true)
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '读取密钥失败：' + errText(cause) }))
      }

      const metaData = meta.data
      const listData = list.data
      const servers = listData !== null && Array.isArray(listData.servers) ? listData.servers : []
      const working = busy !== null
      const isNew = draft !== null && draft.entryId === null
      const current = draft !== null && draft.entryId !== null ? servers.find((item) => item.entryId === draft.entryId) : undefined

      const metaBar = React.createElement('div', { className: 'mc-meta' },
        React.createElement('span', { className: 'mc-kv' },
          React.createElement('span', { className: 'mc-k' }, '配置'),
          React.createElement('span', { className: 'mc-v', title: metaData === null ? '' : String(metaData.patchPath ?? '') }, metaData === null ? '读取中…' : String(metaData.patchPath ?? '—'))),
        React.createElement('span', { className: 'mc-kv' },
          React.createElement('span', { className: 'mc-k' }, '条目'),
          React.createElement('span', { className: 'mc-v' }, metaData === null ? '—' : String(metaData.mcpEntryCount ?? 0))),
        React.createElement('span', { className: 'mc-kv' },
          React.createElement('span', { className: 'mc-k' }, '能力'),
          React.createElement('span', { className: 'mc-v' },
            metaData === null ? '—' : ['yaml', 'atomic', 'mcpClient', 'hmr'].map((key) => {
              const flag = key === 'yaml' ? metaData.yamlAvailable : key === 'atomic' ? metaData.atomicAvailable : key === 'mcpClient' ? metaData.mcpClientAvailable : metaData.hmrAvailable
              return (flag === true ? '✓' : '✕') + ' ' + key
            }).join('  '))),
        React.createElement('span', { className: 'mc-spacer' }),
        React.createElement('button', { className: 'mc-btn mc-btn-sm', disabled: working, onClick: () => { loadAll() } }, '刷新'),
        React.createElement('button', { className: 'mc-btn mc-btn-sm', disabled: working, onClick: reloadProfile }, busy === 'reload' ? '热更中…' : '重新加载插件'))

      // 列表区单独拼，避免一层套一层的三元把括号数数错（这里最容易漏一个 `)`）。
      const rowOf = (item) => React.createElement('button', {
        key: item.entryId,
        className: item.entryId === selected ? 'mc-item mc-item-on' : 'mc-item',
        onClick: () => { openEntry(item.entryId, secretRevealed) },
      },
      React.createElement('span', { className: 'mc-item-name' }, item.serverName === '' ? item.entryId : item.serverName),
      React.createElement('span', { className: 'mc-item-meta' },
        React.createElement('span', { className: item.enabled === true ? 'mc-badge mc-badge-ok' : 'mc-badge mc-badge-bad' }, item.enabled === true ? '已启用' : '已停用'),
        React.createElement('span', { className: 'mc-badge' }, item.transport),
        React.createElement('span', { className: 'mc-badge' }, item.entryId)),
      React.createElement('span', { className: 'mc-hint' },
        String(item.config !== null && typeof item.config === 'object' && item.config.toolPrefix !== undefined ? item.config.toolPrefix : '') + '*'))

      let listBody = null
      if (list.loading === true) {
        listBody = React.createElement('div', { className: 'mc-empty' }, '读取中…')
      } else if (list.error !== null) {
        listBody = React.createElement('div', { className: 'mc-notice mc-notice-bad' }, '列表读取失败：' + list.error)
      } else if (servers.length === 0) {
        listBody = React.createElement('div', { className: 'mc-empty' }, '还没有 MCP server。点「新增 server」填一条，写进 profile 的 cordis.patch.yml 后由官方 mcp-client 接管。')
      } else {
        listBody = servers.map(rowOf)
      }

      const leftColumn = React.createElement('div', { className: 'mc-col-list' },
        React.createElement('div', { className: 'mc-row' },
          React.createElement('button', { className: 'mc-btn mc-btn-primary mc-btn-sm', disabled: working, onClick: openCreate }, '+ 新增 server'),
          React.createElement('span', { className: 'mc-spacer' }),
          React.createElement('span', { className: 'mc-hint' }, servers.length + ' 条')),
        React.createElement('div', { className: 'mc-scroll' }, listBody))

      const detailNodes = []
      if (metaData !== null && metaData.dependencyError !== null && metaData.dependencyError !== undefined) {
        detailNodes.push(React.createElement('div', { className: 'mc-notice mc-notice-warn' }, '依赖不完整：' + String(metaData.dependencyError)))
      }

      if (draft === null) {
        detailNodes.push(React.createElement('div', { className: 'mc-empty' },
          '左侧选一条 server 查看与编辑，或点「新增 server」。',
          React.createElement('div', { className: 'mc-hint' },
            '这里改的是 profile 的 cordis.patch.yml：每条 MCP server 是一个 @deepseek-ai/dsh-mcp-client 实例。')))
      } else {
        detailNodes.push(React.createElement('div', { className: 'mc-detail-head' },
          React.createElement('div', { className: 'mc-detail-title' },
            React.createElement('span', {}, draft.serverName === '' ? (isNew ? '新增 MCP server' : String(draft.entryId)) : draft.serverName),
            isNew
              ? React.createElement('span', { className: 'mc-badge mc-badge-warn' }, '未保存')
              : React.createElement('span', { className: current !== undefined && current.enabled === true ? 'mc-badge mc-badge-ok' : 'mc-badge mc-badge-bad' }, current !== undefined && current.enabled === true ? '已启用' : '已停用'),
            React.createElement('span', { className: 'mc-badge' }, draft.transport),
            dirty === true ? React.createElement('span', { className: 'mc-dirty' }, '有未保存改动') : null),
          React.createElement('div', { className: 'mc-path' },
            isNew ? '保存后写入 ' + String(metaData === null ? 'profile' : metaData.patchPath ?? 'profile') + '（id 默认为 mcp-<serverName>）' : String(draft.entryId))))

        detailNodes.push(React.createElement('div', { className: 'mc-field' },
          React.createElement('span', { className: 'mc-label' }, 'serverName（字母/数字/-/_，1–32 字符；决定工具名前缀 mcp__<serverName>__）'),
          React.createElement('input', {
            className: 'mc-input mc-mono',
            value: draft.serverName,
            onChange: (event) => patch({ serverName: event.target.value }),
          })))
        detailNodes.push(React.createElement('div', { className: 'mc-field' },
          React.createElement('span', { className: 'mc-label' }, 'transport'),
          React.createElement('select', {
            className: 'mc-select',
            value: draft.transport,
            onChange: (event) => { patch({ transport: event.target.value }); setSecretRevealed(draft.entryId === null || secretRevealed === true) },
          },
          React.createElement('option', { value: TRANSPORT_STDIO }, 'stdio（本地子进程）'),
          React.createElement('option', { value: TRANSPORT_HTTP }, 'streamable-http（远程 URL）'))))

        if (draft.transport === TRANSPORT_STDIO) {
          detailNodes.push(React.createElement('div', { className: 'mc-field' },
            React.createElement('span', { className: 'mc-label' }, 'command（必填，可执行文件绝对路径或 PATH 上的名字）'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.command, onChange: (event) => patch({ command: event.target.value }) })))
          detailNodes.push(React.createElement('div', { className: 'mc-field' },
            React.createElement('span', { className: 'mc-label' }, 'args（一行一个）'),
            React.createElement('textarea', { className: 'mc-textarea mc-mono', rows: 4, value: draft.argsText, spellCheck: false, onChange: (event) => patch({ argsText: event.target.value }) })))
          detailNodes.push(React.createElement('div', { className: 'mc-field' },
            React.createElement('span', { className: 'mc-label' }, 'cwd（可选，子进程工作目录）'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.cwd, onChange: (event) => patch({ cwd: event.target.value }) })))
        } else {
          detailNodes.push(React.createElement('div', { className: 'mc-field' },
            React.createElement('span', { className: 'mc-label' }, 'url（必填，MCP 端点）'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.url, onChange: (event) => patch({ url: event.target.value }) })))
        }

        const secretLabel = draft.transport === TRANSPORT_STDIO ? 'env（一行一个 KEY=VALUE，子进程环境变量）' : 'headers（一行一个 KEY=VALUE）'
        detailNodes.push(React.createElement('div', { className: 'mc-field' },
          React.createElement('div', { className: 'mc-row' },
            React.createElement('span', { className: 'mc-label' }, secretLabel),
            React.createElement('span', { className: 'mc-spacer' }),
            draft.entryId !== null && secretRevealed !== true
              ? React.createElement('button', { className: 'mc-btn mc-btn-sm', onClick: revealSecrets }, '显示密钥')
              : React.createElement('span', { className: 'mc-hint' }, secretRevealed === true ? '内容会原样写入配置' : '新增条目直接编辑')),
          secretRevealed === true
            ? React.createElement('textarea', { className: 'mc-textarea mc-mono', rows: 4, value: draft.secretText, spellCheck: false, onChange: (event) => patch({ secretText: event.target.value }) })
            : React.createElement('div', { className: 'mc-notice' }, '密钥已隐藏（只显示前 4 位）。保存时保留磁盘上的原值；要改先点「显示密钥」。')))

        detailNodes.push(React.createElement('div', { className: 'mc-row' },
          React.createElement('span', { className: 'mc-label', style: { flex: '0 0 auto' } }, '高级'),
          React.createElement('span', { className: 'mc-hint' }, '留空 = 用官方默认值（toolCallTimeoutMs 60000 / maxInstructionBytes 32768 / 重连 500ms→30s × 10）')))
        detailNodes.push(React.createElement('div', { className: 'mc-row' },
          React.createElement('label', { className: 'mc-field', style: { flex: '1 1 150px' } },
            React.createElement('span', { className: 'mc-label' }, 'toolCallTimeoutMs'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.toolCallTimeoutMs, onChange: (event) => patch({ toolCallTimeoutMs: event.target.value }) })),
          React.createElement('label', { className: 'mc-field', style: { flex: '1 1 150px' } },
            React.createElement('span', { className: 'mc-label' }, 'maxInstructionBytes'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.maxInstructionBytes, onChange: (event) => patch({ maxInstructionBytes: event.target.value }) })),
          React.createElement('label', { className: 'mc-field', style: { flex: '1 1 120px' } },
            React.createElement('span', { className: 'mc-label' }, 'reconnect.initialDelayMs'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.reconnectInitial, onChange: (event) => patch({ reconnectInitial: event.target.value }) })),
          React.createElement('label', { className: 'mc-field', style: { flex: '1 1 120px' } },
            React.createElement('span', { className: 'mc-label' }, 'reconnect.maxDelayMs'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.reconnectMax, onChange: (event) => patch({ reconnectMax: event.target.value }) })),
          React.createElement('label', { className: 'mc-field', style: { flex: '1 1 120px' } },
            React.createElement('span', { className: 'mc-label' }, 'reconnect.maxAttempts'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.reconnectAttempts, onChange: (event) => patch({ reconnectAttempts: event.target.value }) }))))
        detailNodes.push(React.createElement('div', { className: 'mc-row' },
          React.createElement('button', {
            className: 'mc-switch' + (draft.reconnectEnabled === true ? ' mc-switch-on' : ''),
            onClick: () => patch({ reconnectEnabled: draft.reconnectEnabled !== true }),
          }, (draft.reconnectEnabled === true ? '✓ ' : '✕ ') + '断线自动重连'),
          React.createElement('button', {
            className: 'mc-switch' + (draft.failOnStartupError === true ? ' mc-switch-on' : ''),
            onClick: () => patch({ failOnStartupError: draft.failOnStartupError !== true }),
          }, (draft.failOnStartupError === true ? '✓ ' : '✕ ') + '启动失败即报错'),
          React.createElement('span', { className: 'mc-hint' }, '关掉 failOnStartupError 时，server 连不上只是工具缺席，不影响 DSH 启动。')))

        const probeView = probe.running === true
          ? React.createElement('div', { className: 'mc-notice' }, '正在连接…（最多 20 秒）')
          : probe.error !== null
            ? React.createElement('div', { className: 'mc-notice mc-notice-bad' }, '测试失败：' + probe.error)
            : probe.data === null
              ? null
              : probe.data.ok === true
                ? React.createElement('div', { className: 'mc-tools' },
                  React.createElement('div', { className: 'mc-row' },
                    React.createElement('span', { className: 'mc-badge mc-badge-ok' }, '连接成功'),
                    React.createElement('span', { className: 'mc-badge' }, probe.data.transport),
                    React.createElement('span', { className: 'mc-badge' }, probe.data.toolCount + ' 个工具'),
                    React.createElement('span', { className: 'mc-badge' }, Number(probe.data.durationMs ?? 0) + ' ms')),
                  probe.data.serverInfo !== null && typeof probe.data.serverInfo === 'object'
                    ? React.createElement('div', { className: 'mc-hint' }, 'server：' + String(probe.data.serverInfo.name ?? '?') + ' ' + String(probe.data.serverInfo.version ?? ''))
                    : null,
                  probe.data.tools.length === 0
                    ? React.createElement('div', { className: 'mc-hint' }, '这条 server 没有提供任何工具。')
                    : probe.data.tools.map((tool, index) => React.createElement('div', { className: 'mc-tool', key: index },
                      React.createElement('span', { className: 'mc-tool-name' }, String(tool.publicName ?? tool.name ?? '')),
                      tool.description === '' ? null : React.createElement('span', { className: 'mc-tool-desc' }, String(tool.description)))))
                : React.createElement('div', { className: 'mc-notice mc-notice-bad' }, '连接失败：' + String(probe.data.error ?? '未知错误'))

        detailNodes.push(React.createElement('div', { className: 'mc-row' },
          React.createElement('button', { className: 'mc-btn mc-btn-primary', disabled: working || dirty !== true, onClick: save }, busy === 'save' ? '保存中…' : (isNew ? '新增' : '保存')),
          React.createElement('button', { className: 'mc-btn', disabled: working, onClick: runProbe }, busy === 'probe' ? '连接中…' : '测试连接'),
          isNew
            ? null
            : React.createElement('button', { className: 'mc-btn', disabled: working, onClick: toggleEnabled }, busy === 'toggle' ? '切换中…' : (current !== undefined && current.enabled === true ? '停用' : '启用')),
          React.createElement('span', { className: 'mc-spacer' }),
          isNew
            ? null
            : React.createElement('button', { className: 'mc-btn mc-btn-danger', disabled: working, onClick: remove }, busy === 'delete' ? '删除中…' : '删除')))
        detailNodes.push(React.createElement('div', { className: 'mc-hint' },
          '测试连接是另起一条一次性连接（连上即断开），不影响正在运行的实例，也不会改写配置。'))
        if (probeView !== null) detailNodes.push(probeView)
      }

      return React.createElement('div', { className: 'mc-root' },
        metaBar,
        notice === null ? null : React.createElement('div', { className: 'mc-notice mc-notice-' + notice.kind }, notice.text),
        React.createElement('div', { className: 'mc-body' },
          leftColumn,
          React.createElement('div', { className: 'mc-col-detail' }, React.createElement('div', { className: 'mc-scroll' }, detailNodes))))
    }

    if (slots === undefined) return
    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, Panel))
    const registry = typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null
    if (registry !== null) {
      registry.register({ id: PANEL_KEY, Panel, label: LABEL, order: 53, glyphText: 'C' })
    } else {
      slots.inject('sidebar.panellist', () => slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, label: LABEL, order: 53 }, function Glyph() { return React.createElement('span', { className: 'mc-glyph' }, 'C') }))
    }
  },
}
  },
})
