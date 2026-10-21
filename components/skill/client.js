window.__ModuleLoader__.load({
  id: "@local/skill",
  factory(require) {
    const React = require("react")
const CSS = '.sk-root{position:relative;display:flex;flex-direction:column;gap:12px;padding:16px 18px 14px;box-sizing:border-box;min-height:0;height:100%;overflow:hidden;background:var(--dsw-alias-bg-layer-0);color:var(--dsw-alias-label-primary)}.sk-meta{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);font-size:12px}.sk-kv{display:flex;align-items:baseline;gap:6px;min-width:0}.sk-k{color:var(--dsw-alias-label-tertiary);flex:none}.sk-v{color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-family-mono,monospace);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:340px}.sk-meta-spacer{flex:1 1 auto}.sk-body{flex:1 1 auto;display:flex;gap:12px;min-height:0}.sk-col-list{flex:0 0 300px;display:flex;flex-direction:column;gap:8px;min-height:0}.sk-col-detail{flex:1 1 auto;display:flex;flex-direction:column;gap:10px;min-height:0;min-width:0}.sk-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:8px;padding-right:2px}.sk-group{display:flex;flex-direction:column;gap:4px}.sk-group-head{display:flex;align-items:center;gap:6px;padding:4px 2px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-tertiary)}.sk-group-id{font-family:var(--dsw-font-family-mono,monospace);color:var(--dsw-alias-label-secondary)}.sk-group-count{margin-left:auto;font-family:var(--dsw-font-family-mono,monospace)}.sk-item{display:flex;flex-direction:column;gap:3px;padding:7px 9px;border:1px solid transparent;border-radius:8px;cursor:pointer;background:transparent;text-align:left;width:100%;box-sizing:border-box;font:inherit;color:inherit}.sk-item:hover{background:var(--dsw-alias-interactive-bg-hover)}.sk-item-on{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}.sk-item-name{font-size:12.5px;font-weight:600;word-break:break-all}.sk-item-meta{display:flex;flex-wrap:wrap;gap:4px;align-items:center}.sk-badge{display:inline-flex;align-items:center;gap:3px;padding:0 5px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}.sk-badge-ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}.sk-badge-bad{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}.sk-badge-warn{color:var(--dsw-alias-state-warning-primary);border-color:var(--dsw-alias-state-warning-primary)}.sk-detail-head{flex:none;display:flex;flex-direction:column;gap:4px;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}.sk-detail-title{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13.5px;font-weight:600}.sk-path{font-family:var(--dsw-font-family-mono,monospace);font-size:10.5px;color:var(--dsw-alias-label-tertiary);word-break:break-all}.sk-tabs{display:flex;gap:4px;flex:none}.sk-tab{appearance:none;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:7px;padding:4px 11px;font-size:12px;cursor:pointer}.sk-tab-on{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary);font-weight:600}.sk-field{display:flex;flex-direction:column;gap:4px}.sk-label{font-size:11px;color:var(--dsw-alias-label-tertiary)}.sk-input,.sk-textarea{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:6px 8px;font-size:12px;font-family:inherit;outline:none}.sk-input:focus,.sk-textarea:focus{border-color:var(--dsw-alias-brand-primary)}.sk-textarea{resize:vertical;line-height:1.5}.sk-mono{font-family:var(--dsw-font-family-mono,monospace);font-size:11.5px}.sk-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.sk-btn{appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:5px 12px;font-size:12px;cursor:pointer;white-space:nowrap}.sk-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.sk-btn:disabled{opacity:.45;cursor:not-allowed}.sk-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600}.sk-btn-danger{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);background:transparent}.sk-btn-sm{padding:2px 8px;font-size:11px}.sk-switch{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:4px 9px;font-size:11.5px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);cursor:pointer}.sk-switch-on{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}.sk-switch:disabled{opacity:.5;cursor:not-allowed}.sk-notice{flex:none;padding:7px 10px;border-radius:8px;font-size:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}.sk-notice-ok{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}.sk-notice-bad{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}.sk-notice-warn{border-color:var(--dsw-alias-state-warning-primary);color:var(--dsw-alias-state-warning-primary)}.sk-issues{margin:0;padding:0 0 0 16px;font-size:11.5px;color:var(--dsw-alias-state-error-primary)}.sk-issue{margin:1px 0}.sk-empty{padding:18px 12px;font-size:12px;color:var(--dsw-alias-label-tertiary);text-align:center;border:1px dashed var(--dsw-alias-border-l1);border-radius:9px}.sk-create{flex:none;display:flex;flex-direction:column;gap:6px;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}.sk-create-head{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}.sk-dirty{color:var(--dsw-alias-state-warning-primary);font-size:11px}.sk-glyph{display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:13px;font-weight:700;color:inherit}.sk-hint{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.5}'
const PANEL_KEY = 'skill'
const LABEL = 'Skill'
const MODE_RAW = 'raw'
const MODE_FORM = 'structured'
const KIND_DIR = 'directory'
const KIND_FILE = 'file'

/** 面板状态里的空壳：初始渲染必须能画出来（自检的渲染冒烟不会触发网络）。 */
const EMPTY_META = { loading: true, data: null, error: null }
const EMPTY_LIST = { loading: true, data: null, error: null }
const EMPTY_DETAIL = { loading: false, data: null, error: null }
const EMPTY_FIELDS = { name: '', description: '', whenToUse: '', metadataText: '', body: '', modelInvocable: true, userInvocable: true }
const EMPTY_CREATE = { open: false, root: 'user-dsh', name: '', description: '', whenToUse: '', kind: KIND_DIR }

/** 错误信息取人话（host 返回的 message 已经在 Error 里了）。 */
function errText(cause) {
  if (cause === null || cause === undefined) return '未知错误'
  if (typeof cause === 'string') return cause
  if (typeof cause.message === 'string' && cause.message !== '') return cause.message
  return String(cause)
}

/** 切换/关闭前的未保存确认。非浏览器环境没有 confirm 时按「允许」处理，避免卡死。 */
function confirmLose() {
  if (typeof globalThis.confirm !== 'function') return true
  return globalThis.confirm('当前 skill 有未保存的改动，继续操作会丢失，确定吗？')
}

function badgeText(item) {
  if (item.valid === true) return '有效'
  return '未生效'
}

function badgeClass(item) {
  return item.valid === true ? 'sk-badge sk-badge-ok' : 'sk-badge sk-badge-bad'
}

/** 从 host 的 one 响应里取出表单初值；metadata 用 JSON 文本编辑（保存前再解析）。 */
function fieldsFrom(data) {
  if (data === null || data === undefined) return EMPTY_FIELDS
  const parsed = data.parsed !== null && typeof data.parsed === 'object' ? data.parsed : {}
  let metadataText = ''
  if (parsed.metadata !== null && parsed.metadata !== undefined) {
    try {
      metadataText = JSON.stringify(parsed.metadata, null, 2)
    } catch {
      metadataText = ''
    }
  }
  return {
    name: typeof parsed.name === 'string' ? parsed.name : '',
    description: typeof parsed.description === 'string' ? parsed.description : '',
    whenToUse: typeof parsed.whenToUse === 'string' ? parsed.whenToUse : '',
    metadataText,
    body: typeof data.body === 'string' ? data.body.replace(/^\s*\n/, '') : '',
    modelInvocable: parsed.modelInvocable !== false,
    userInvocable: parsed.userInvocable !== false,
  }
}

/** metadata 文本框 → 对象：空文本给 null，非对象/非法 JSON 抛错（保存前拦住，别写坏文件）。 */
function parseMetadata(text) {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (trimmed === '') return null
  let value
  try {
    value = JSON.parse(trimmed)
  } catch (cause) {
    throw new Error('metadata 不是合法 JSON：' + errText(cause))
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('metadata 必须是 JSON 对象')
  return value
}

return {
  inject: ['slots'],
  apply(ctx) {
    ctx.effect(() => {
      const el = document.createElement("style")
      el.textContent = CSS
      document.head.appendChild(el)
      return () => el.remove()
    }, "skill: styles")

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

    /** 删除要区分 409（目录里有资源文件），所以单独拿状态码；不动上面的 fetchJson 语义。 */
    const deleteJson = (rootId, name, force) => fetch(
      '/api/skill/one?root=' + encodeURIComponent(rootId) + '&name=' + encodeURIComponent(name) + (force ? '&force=1' : ''),
      { method: 'DELETE', headers: { accept: 'application/json', 'content-type': 'application/json' } },
    ).then((response) => response.json().catch(() => null).then((body) => ({ status: response.status, body })))

    function Panel() {
      const [meta, setMeta] = React.useState(EMPTY_META)
      const [list, setList] = React.useState(EMPTY_LIST)
      const [selected, setSelected] = React.useState(null)
      const [detail, setDetail] = React.useState(EMPTY_DETAIL)
      const [mode, setMode] = React.useState(MODE_RAW)
      const [rawDraft, setRawDraft] = React.useState('')
      const [fields, setFields] = React.useState(EMPTY_FIELDS)
      const [dirty, setDirty] = React.useState(false)
      const [busy, setBusy] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [createDraft, setCreateDraft] = React.useState(EMPTY_CREATE)

      const loadAll = () => {
        setMeta(EMPTY_META)
        setList(EMPTY_LIST)
        return Promise.all([
          fetchJson('/api/skill/meta').catch((cause) => ({ __error: errText(cause) })),
          fetchJson('/api/skill/list').catch((cause) => ({ __error: errText(cause) })),
        ]).then(([metaResult, listResult]) => {
          setMeta(metaResult.__error === undefined ? { loading: false, data: metaResult, error: null } : { loading: false, data: null, error: metaResult.__error })
          setList(listResult.__error === undefined ? { loading: false, data: listResult, error: null } : { loading: false, data: null, error: listResult.__error })
        })
      }

      React.useEffect(() => { loadAll() }, [])

      /**
       * 打开一个 skill：有未保存改动先确认；成功后同时重置两个草稿。
       * 保存/切换开关后自己重读时传 skipConfirm=true——那一帧的 dirty 还是旧值，
       * 不能让它把刚保存完的流程拦在 confirm 上。
       */
      const openSkill = (rootId, name, skipConfirm) => {
        if (skipConfirm !== true && dirty && !confirmLose()) return
        setSelected({ rootId, name })
        setDetail({ loading: true, data: null, error: null })
        setMode(MODE_RAW)
        setBusy('read')
        fetchJson('/api/skill/one?root=' + encodeURIComponent(rootId) + '&name=' + encodeURIComponent(name))
          .then((data) => {
            setDetail({ loading: false, data, error: null })
            setRawDraft(typeof data.raw === 'string' ? data.raw : '')
            setFields(fieldsFrom(data))
            setDirty(false)
          })
          .catch((cause) => setDetail({ loading: false, data: null, error: errText(cause) }))
          .then(() => setBusy(null))
      }

      const reloadList = () => fetchJson('/api/skill/list')
        .then((data) => setList({ loading: false, data, error: null }))
        .catch((cause) => setNotice({ kind: 'bad', text: '刷新列表失败：' + errText(cause) }))

      const save = () => {
        if (selected === null) return
        setBusy('save')
        setNotice(null)
        let payload
        if (mode === MODE_RAW) {
          payload = { root: selected.rootId, name: selected.name, mode: MODE_RAW, raw: rawDraft }
        } else {
          let metadata
          try {
            metadata = parseMetadata(fields.metadataText)
          } catch (cause) {
            setNotice({ kind: 'bad', text: errText(cause) })
            setBusy(null)
            return
          }
          payload = {
            root: selected.rootId,
            name: selected.name,
            mode: MODE_FORM,
            fields: {
              name: fields.name,
              description: fields.description,
              whenToUse: fields.whenToUse,
              metadata,
              modelInvocable: fields.modelInvocable,
              userInvocable: fields.userInvocable,
            },
            body: fields.body,
          }
        }
        postJson('/api/skill/save', payload)
          .then((data) => {
            setNotice({ kind: 'ok', text: '已保存：' + data.path })
            setDirty(false)
            return reloadList().then(() => openSkill(selected.rootId, selected.name, true))
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '保存失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const toggle = (key, next) => {
        if (selected === null || detail.data === null) return
        setBusy('toggle')
        setNotice(null)
        const payload = { root: selected.rootId, name: selected.name }
        if (key === 'modelInvocable') payload.modelInvocable = next
        else payload.userInvocable = next
        postJson('/api/skill/toggle', payload)
          .then(() => reloadList().then(() => openSkill(selected.rootId, selected.name, true)))
          .catch((cause) => setNotice({ kind: 'bad', text: '切换失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      /** 删除：目录里有资源文件时 host 先给 409 + 清单，用户确认后才带 force 重删。 */
      const remove = () => {
        if (selected === null) return
        const accept = typeof globalThis.confirm !== 'function'
          ? true
          : globalThis.confirm('删除 skill「' + selected.name + '」？目录里的资源文件也会一起删除，无法撤销。')
        if (!accept) return
        setBusy('delete')
        setNotice(null)
        deleteJson(selected.rootId, selected.name, false).then(({ status, body }) => {
          if (status === 409) {
            const resources = body !== null && typeof body === 'object' && Array.isArray(body.resources) ? body.resources : []
            const listed = resources.length > 0 ? '\n\n' + resources.slice(0, 20).join('\n') + (resources.length > 20 ? '\n…共 ' + resources.length + ' 个' : '') : ''
            const again = typeof globalThis.confirm !== 'function' ? true : globalThis.confirm('这个目录里还有资源文件' + listed + '\n\n确认一起删除？')
            if (!again) {
              setNotice({ kind: 'warn', text: '已取消删除：目录里还有 ' + resources.length + ' 个资源文件' })
              setBusy(null)
              return
            }
            return deleteJson(selected.rootId, selected.name, true)
          }
          if (status < 200 || status >= 300 || body === null || body.ok !== true) {
            throw new Error(body !== null && typeof body.message === 'string' ? body.message : 'HTTP ' + status)
          }
          return { status, body }
        }).then((result) => {
          if (result === undefined) return
          if (result.status < 200 || result.status >= 300) {
            throw new Error(result.body !== null && typeof result.body.message === 'string' ? result.body.message : 'HTTP ' + result.status)
          }
          setNotice({ kind: 'ok', text: '已删除：' + selected.name })
          setSelected(null)
          setDetail(EMPTY_DETAIL)
          setRawDraft('')
          setFields(EMPTY_FIELDS)
          setDirty(false)
          return reloadList()
        }).catch((cause) => {
          setNotice({ kind: 'bad', text: '删除失败：' + errText(cause) })
          setBusy(null)
        }).then(() => setBusy(null))
      }

      const create = () => {
        setBusy('create')
        setNotice(null)
        postJson('/api/skill/create', {
          root: createDraft.root,
          name: createDraft.name,
          description: createDraft.description,
          whenToUse: createDraft.whenToUse,
          kind: createDraft.kind,
        })
          .then((data) => {
            setNotice({ kind: 'ok', text: '已创建：' + data.path })
            setCreateDraft({ ...EMPTY_CREATE, open: false, root: createDraft.root, kind: createDraft.kind })
            return reloadList().then(() => openSkill(data.rootId, data.name, true))
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '创建失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const syncOfficial = () => {
        setBusy('sync')
        postJson('/api/skill/sync', {})
          .then((data) => {
            const official = data.official !== null && typeof data.official === 'object' ? data.official : { available: false, count: 0, names: [] }
            setNotice({
              kind: official.available ? 'ok' : 'warn',
              text: official.available
                ? '官方服务当前识别到 ' + official.count + ' 个 skill'
                : '官方 skills 服务不可用（未安装或未启用），面板只显示磁盘扫描结果',
            })
            return reloadList()
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '同步失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const metaData = meta.data
      const listData = list.data
      const roots = listData !== null && Array.isArray(listData.roots) ? listData.roots : metaData !== null && Array.isArray(metaData.roots) ? metaData.roots : []
      const skills = listData !== null && Array.isArray(listData.skills) ? listData.skills : []
      const writableRoots = roots.filter((root) => root.writable === true)
      const official = listData !== null && listData.official !== null && typeof listData.official === 'object' ? listData.official : null
      const current = detail.data
      const readonly = current !== null && current.writable !== true
      const working = busy !== null

      const markDirty = () => { if (dirty !== true) setDirty(true) }

      /* ------------------------------------------------------------ 顶部 meta 条 */
      const metaBar = React.createElement('div', { className: 'sk-meta' },
        React.createElement('div', { className: 'sk-kv' },
          React.createElement('span', { className: 'sk-k' }, 'dshHome'),
          React.createElement('span', { className: 'sk-v', title: metaData === null ? '' : metaData.dshHome }, metaData === null ? '—' : metaData.dshHome)),
        React.createElement('div', { className: 'sk-kv' },
          React.createElement('span', { className: 'sk-k' }, 'projectRoot'),
          React.createElement('span', { className: 'sk-v', title: metaData === null ? '' : metaData.projectRoot }, metaData === null ? '—' : metaData.projectRoot)),
        React.createElement('div', { className: 'sk-kv' },
          React.createElement('span', { className: 'sk-k' }, '官方识别'),
          React.createElement('span', { className: 'sk-v' },
            official === null ? '—' : official.available === true ? official.count + ' 个' : '服务不可用')),
        React.createElement('div', { className: 'sk-kv' },
          React.createElement('span', { className: 'sk-k' }, '磁盘扫描'),
          React.createElement('span', { className: 'sk-v' },
            listData === null ? '—' : listData.counts.total + ' 个（有效 ' + listData.counts.valid + ' / 未生效 ' + listData.counts.invalid + '）')),
        React.createElement('div', { className: 'sk-meta-spacer' }),
        React.createElement('button', { className: 'sk-btn sk-btn-sm', disabled: working, onClick: loadAll }, '刷新'),
        React.createElement('button', { className: 'sk-btn sk-btn-sm', disabled: working, onClick: syncOfficial }, '同步官方服务'))

      /* --------------------------------------------------------------- 左列：列表 */
      const listNodes = []
      if (list.loading === true) {
        listNodes.push(React.createElement('div', { className: 'sk-empty' }, '正在扫描 skill 目录…'))
      } else if (list.error !== null) {
        listNodes.push(React.createElement('div', { className: 'sk-notice sk-notice-bad' }, '列表加载失败：' + list.error))
      } else if (skills.length === 0) {
        listNodes.push(React.createElement('div', { className: 'sk-empty' }, '没有找到任何 skill。三个可写根都是空的，可以用下面的「新建」开始。'))
      } else {
        const grouped = new Map()
        for (const root of roots) grouped.set(root.id, [])
        for (const item of skills) {
          if (!grouped.has(item.rootId)) grouped.set(item.rootId, [])
          grouped.get(item.rootId).push(item)
        }
        for (const root of roots) {
          const items = grouped.get(root.id) ?? []
          if (items.length === 0 && root.exists !== true) continue
          const head = React.createElement('div', { className: 'sk-group-head' },
            React.createElement('span', {}, root.label ?? root.source),
            React.createElement('span', { className: 'sk-group-id' }, root.id),
            root.writable === true ? null : React.createElement('span', { className: 'sk-badge' }, '只读'),
            React.createElement('span', { className: 'sk-group-count' }, items.length + ' / ' + (root.exists === true ? '目录存在' : '目录不存在')))
          const rows = items.map((item) => {
            const active = selected !== null && selected.rootId === item.rootId && selected.name === item.name
            const nameBadges = []
            nameBadges.push(React.createElement('span', { key: 'v', className: badgeClass(item) }, badgeText(item)))
            if (item.modelInvocable === false) nameBadges.push(React.createElement('span', { key: 'm', className: 'sk-badge sk-badge-warn' }, '模型不可调用'))
            if (item.userInvocable === false) nameBadges.push(React.createElement('span', { key: 'u', className: 'sk-badge sk-badge-warn' }, '用户不可调用'))
            if (item.kind === 'file') nameBadges.push(React.createElement('span', { key: 'k', className: 'sk-badge' }, '单文件'))
            if (item.shadowedBy !== null && item.shadowedBy !== undefined) nameBadges.push(React.createElement('span', { key: 's', className: 'sk-badge sk-badge-warn' }, '被 ' + item.shadowedBy.rootId + ' 覆盖'))
            return React.createElement('button', {
              key: item.rootId + '/' + item.name,
              type: 'button',
              className: active ? 'sk-item sk-item-on' : 'sk-item',
              onClick: () => openSkill(item.rootId, item.name),
            },
            React.createElement('span', { className: 'sk-item-name' }, item.name),
            React.createElement('span', { className: 'sk-item-meta' }, nameBadges),
            item.valid === true ? null : React.createElement('span', { className: 'sk-hint' }, item.error))
          })
          listNodes.push(React.createElement('div', { key: root.id, className: 'sk-group' }, head, rows))
        }
      }

      /* ------------------------------------------------------ 左下：新建表单 */
      const createSection = createDraft.open === true
        ? React.createElement('div', { className: 'sk-create' },
          React.createElement('div', { className: 'sk-create-head' },
            React.createElement('span', {}, '新建 skill'),
            React.createElement('span', { className: 'sk-meta-spacer' }),
            React.createElement('button', { className: 'sk-btn sk-btn-sm', disabled: working, onClick: () => setCreateDraft({ ...createDraft, open: false }) }, '收起')),
          React.createElement('div', { className: 'sk-field' },
            React.createElement('span', { className: 'sk-label' }, '写入哪个根'),
            React.createElement('select', {
              className: 'sk-input',
              value: createDraft.root,
              onChange: (event) => setCreateDraft({ ...createDraft, root: event.target.value }),
            }, writableRoots.map((root) => React.createElement('option', { key: root.id, value: root.id }, root.id + ' · ' + root.path)))),
          React.createElement('div', { className: 'sk-field' },
            React.createElement('span', { className: 'sk-label' }, 'name（kebab-case）'),
            React.createElement('input', {
              className: 'sk-input sk-mono',
              value: createDraft.name,
              placeholder: 'my-new-skill',
              onChange: (event) => setCreateDraft({ ...createDraft, name: event.target.value }),
            })),
          React.createElement('div', { className: 'sk-field' },
            React.createElement('span', { className: 'sk-label' }, 'description（必填）'),
            React.createElement('textarea', {
              className: 'sk-textarea',
              rows: 2,
              value: createDraft.description,
              onChange: (event) => setCreateDraft({ ...createDraft, description: event.target.value }),
            })),
          React.createElement('div', { className: 'sk-field' },
            React.createElement('span', { className: 'sk-label' }, 'whenToUse（可选）'),
            React.createElement('input', {
              className: 'sk-input',
              value: createDraft.whenToUse,
              onChange: (event) => setCreateDraft({ ...createDraft, whenToUse: event.target.value }),
            })),
          React.createElement('div', { className: 'sk-row' },
            React.createElement('select', {
              className: 'sk-input',
              style: { width: 'auto' },
              value: createDraft.kind,
              onChange: (event) => setCreateDraft({ ...createDraft, kind: event.target.value }),
            },
            React.createElement('option', { value: KIND_DIR }, '目录型 <name>/SKILL.md'),
            React.createElement('option', { value: KIND_FILE }, '单文件 <name>.md')),
            React.createElement('span', { className: 'sk-meta-spacer' }),
            React.createElement('button', {
              className: 'sk-btn sk-btn-primary',
              disabled: working || createDraft.name === '' || createDraft.description === '',
              onClick: create,
            }, busy === 'create' ? '创建中…' : '创建')))
        : React.createElement('button', {
          className: 'sk-btn',
          disabled: working || writableRoots.length === 0,
          onClick: () => setCreateDraft({ ...EMPTY_CREATE, open: true, root: writableRoots.length > 0 ? writableRoots[0].id : 'user-dsh' }),
        }, writableRoots.length === 0 ? '没有可写根，无法新建' : '＋ 新建 skill')

      const leftColumn = React.createElement('div', { className: 'sk-col-list' },
        React.createElement('div', { className: 'sk-scroll' }, listNodes),
        createSection)

      /* ------------------------------------------------------------ 右列：详情 */
      const detailNodes = []
      if (selected === null) {
        detailNodes.push(React.createElement('div', { className: 'sk-empty' }, '从左侧选一个 skill。未生效的文件也会列出来，并给出具体原因。'))
      } else if (detail.loading === true) {
        detailNodes.push(React.createElement('div', { className: 'sk-empty' }, '正在读取 ' + selected.name + ' …'))
      } else if (detail.error !== null) {
        detailNodes.push(React.createElement('div', { className: 'sk-notice sk-notice-bad' }, '读取失败：' + detail.error))
      } else if (current !== null) {
        detailNodes.push(React.createElement('div', { className: 'sk-detail-head' },
          React.createElement('div', { className: 'sk-detail-title' },
            React.createElement('span', {}, current.name),
            React.createElement('span', { className: badgeClass(current) }, badgeText(current)),
            current.writable === true ? null : React.createElement('span', { className: 'sk-badge' }, '只读根 · ' + current.source),
            current.shadowedBy !== null && current.shadowedBy !== undefined
              ? React.createElement('span', { className: 'sk-badge sk-badge-warn' }, '被 ' + current.shadowedBy.rootId + ' 覆盖')
              : null,
            dirty === true ? React.createElement('span', { className: 'sk-dirty' }, '有未保存改动') : null),
          React.createElement('div', { className: 'sk-path' }, current.path),
          readonly === true
            ? React.createElement('div', { className: 'sk-hint' }, '这个根（' + current.source + '）是只读的：只能查看与对照，编辑、删除、开关都已禁用。要改请复制到可写根。')
            : null))

        if (Array.isArray(current.issues) && current.issues.length > 0) {
          detailNodes.push(React.createElement('div', { className: 'sk-notice ' + (current.valid === true ? 'sk-notice-warn' : 'sk-notice-bad') },
            React.createElement('div', {}, current.valid === true ? '这条 skill 有效，但有几处值得注意：' : '这条 skill 现在不会生效（官方扫描器会丢弃它）：'),
            React.createElement('ul', { className: 'sk-issues' }, current.issues.map((issue, index) => React.createElement('li', { key: index, className: 'sk-issue' }, issue)))))
        }

        const switches = React.createElement('div', { className: 'sk-row' },
          React.createElement('button', {
            type: 'button',
            className: current.parsed !== null && current.parsed.modelInvocable !== false ? 'sk-switch sk-switch-on' : 'sk-switch',
            disabled: readonly || working,
            onClick: () => toggle('modelInvocable', !(current.parsed !== null && current.parsed.modelInvocable !== false)),
          }, (current.parsed !== null && current.parsed.modelInvocable !== false ? '✓ ' : '✕ ') + '模型可调用'),
          React.createElement('button', {
            type: 'button',
            className: current.parsed !== null && current.parsed.userInvocable !== false ? 'sk-switch sk-switch-on' : 'sk-switch',
            disabled: readonly || working,
            onClick: () => toggle('userInvocable', !(current.parsed !== null && current.parsed.userInvocable !== false)),
          }, (current.parsed !== null && current.parsed.userInvocable !== false ? '✓ ' : '✕ ') + '用户可调用'),
          React.createElement('span', { className: 'sk-hint' }, '开关立即写回文件，由官方 watcher 热更。'))

        const tabs = React.createElement('div', { className: 'sk-tabs' },
          React.createElement('button', {
            type: 'button',
            className: mode === MODE_RAW ? 'sk-tab sk-tab-on' : 'sk-tab',
            onClick: () => setMode(MODE_RAW),
          }, '原文'),
          React.createElement('button', {
            type: 'button',
            className: mode === MODE_FORM ? 'sk-tab sk-tab-on' : 'sk-tab',
            onClick: () => {
              if (mode !== MODE_FORM && dirty !== true) setFields(fieldsFrom(current))
              setMode(MODE_FORM)
            },
          }, '表单'))

        const editor = mode === MODE_RAW
          ? React.createElement('textarea', {
            className: 'sk-textarea sk-mono',
            rows: 20,
            spellCheck: false,
            readOnly: readonly === true,
            value: rawDraft,
            onChange: (event) => { setRawDraft(event.target.value); markDirty() },
          })
          : React.createElement('div', { className: 'sk-scroll' },
            React.createElement('div', { className: 'sk-field' },
              React.createElement('span', { className: 'sk-label' }, 'name（kebab-case，必须是文件/目录名）'),
              React.createElement('input', {
                className: 'sk-input sk-mono',
                readOnly: readonly === true,
                value: fields.name,
                onChange: (event) => { setFields({ ...fields, name: event.target.value }); markDirty() },
              })),
            React.createElement('div', { className: 'sk-field' },
              React.createElement('span', { className: 'sk-label' }, 'description（必填，写清「做什么」，模型靠它决定要不要加载）'),
              React.createElement('textarea', {
                className: 'sk-textarea',
                rows: 3,
                readOnly: readonly === true,
                value: fields.description,
                onChange: (event) => { setFields({ ...fields, description: event.target.value }); markDirty() },
              })),
            React.createElement('div', { className: 'sk-field' },
              React.createElement('span', { className: 'sk-label' }, 'whenToUse（可选）'),
              React.createElement('textarea', {
                className: 'sk-textarea',
                rows: 2,
                readOnly: readonly === true,
                value: fields.whenToUse,
                onChange: (event) => { setFields({ ...fields, whenToUse: event.target.value }); markDirty() },
              })),
            React.createElement('div', { className: 'sk-field' },
              React.createElement('span', { className: 'sk-label' }, 'metadata（可选，JSON 对象）'),
              React.createElement('textarea', {
                className: 'sk-textarea sk-mono',
                rows: 4,
                spellCheck: false,
                readOnly: readonly === true,
                value: fields.metadataText,
                onChange: (event) => { setFields({ ...fields, metadataText: event.target.value }); markDirty() },
              })),
            React.createElement('div', { className: 'sk-field' },
              React.createElement('span', { className: 'sk-label' }, '正文（frontmatter 之后的 Markdown）'),
              React.createElement('textarea', {
                className: 'sk-textarea sk-mono',
                rows: 14,
                readOnly: readonly === true,
                value: fields.body,
                onChange: (event) => { setFields({ ...fields, body: event.target.value }); markDirty() },
              })))

        const actions = React.createElement('div', { className: 'sk-row' },
          React.createElement('button', {
            className: 'sk-btn sk-btn-primary',
            disabled: readonly || working || dirty !== true,
            onClick: save,
          }, busy === 'save' ? '保存中…' : '保存'),
          React.createElement('button', {
            className: 'sk-btn',
            disabled: readonly || working || dirty !== true,
            onClick: () => {
              if (!confirmLose()) return
              setDirty(false)
              openSkill(selected.rootId, selected.name, true)
            },
          }, '放弃改动'),
          React.createElement('span', { className: 'sk-meta-spacer' }),
          React.createElement('button', {
            className: 'sk-btn sk-btn-danger',
            disabled: readonly || working,
            onClick: remove,
          }, busy === 'delete' ? '删除中…' : '删除'),
          React.createElement('span', { className: 'sk-hint' },
            current.kind === 'file' ? '单文件型 skill' : '目录型 skill' + (Array.isArray(current.resources) && current.resources.length > 0 ? ' · 另有 ' + current.resources.length + ' 个资源文件' : '')))

        const resourceNote = Array.isArray(current.resources) && current.resources.length > 0
          ? React.createElement('div', { className: 'sk-hint' }, '资源文件：' + current.resources.slice(0, 12).join('、') + (current.resources.length > 12 ? ' …共 ' + current.resources.length + ' 个' : ''))
          : null

        detailNodes.push(React.createElement('div', { className: 'sk-tabs-row sk-row' }, tabs,
          React.createElement('span', { className: 'sk-meta-spacer' }),
          React.createElement('span', { className: 'sk-hint' },
            mode === MODE_RAW ? '原文模式：保存前会校验 frontmatter，不合法就不落盘。' : '表单模式：按固定键顺序重写 frontmatter，布尔只写 true/false。')))
        detailNodes.push(editor)
        detailNodes.push(switches)
        resourceNote === null ? null : detailNodes.push(resourceNote)
        detailNodes.push(actions)
      }

      const rightColumn = React.createElement('div', { className: 'sk-col-detail' }, detailNodes)

      return React.createElement('div', { className: 'sk-root' },
        metaBar,
        notice === null ? null : React.createElement('div', { className: 'sk-notice sk-notice-' + notice.kind }, notice.text),
        React.createElement('div', { className: 'sk-body' },
          leftColumn,
          React.createElement('div', { className: 'sk-col-detail' },
            React.createElement('div', { className: 'sk-scroll' }, rightColumn))))
    }

    if (slots === undefined) return
    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, Panel))
    // 侧边栏入口：和 dsh-toolkit 其它组件一起加载时统一交给 toolkit 组件管理
    // （在共享注册表里登记一份）；单独加载本文件时注册表不存在，退回自己注册。
    const registry = typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null
    if (registry !== null) {
      registry.register({ id: PANEL_KEY, Panel, label: LABEL, order: 54, glyphText: 'S' })
    } else {
      slots.inject('sidebar.panellist', () => slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, label: LABEL, order: 54 }, function Glyph() { return React.createElement('span', { className: 'sk-glyph' }, 'S') }))
    }
  },
}
  },
})
