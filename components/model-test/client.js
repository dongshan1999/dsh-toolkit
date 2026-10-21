window.__ModuleLoader__.load({
  id: "@local/model-test",
  factory(require) {
    const React = require("react")
const CSS = '.mt-root{position:relative;inset:auto;display:flex;flex-direction:column;gap:14px;padding:18px 20px 12px;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;min-height:0;width:auto;background:var(--dsw-alias-bg-layer-0)}.mt-scroll{display:flex;flex-direction:column;gap:10px;padding-bottom:8px;flex:none}.mt-head,.mt-actions,.mt-stats,.mt-path,.mt-card{flex-shrink:0}.mt-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}.mt-title{margin:0;font-size:18px;font-weight:650;color:var(--dsw-alias-label-primary)}.mt-sub{margin-top:6px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);max-width:640px}.mt-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.mt-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;font-size:12px;line-height:1.6;border-radius:6px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.mt-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.mt-btn:disabled{opacity:.5;cursor:default}.mt-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600}.mt-btn-primary:hover:not(:disabled){opacity:.9;background:var(--dsw-alias-brand-primary)}.mt-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:12px 14px}.mt-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.mt-stat-label{font-size:11px;color:var(--dsw-alias-label-secondary)}.mt-stat-value{font-size:19px;font-weight:650;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;margin-top:3px}.mt-opt{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}.mt-select{padding:3px 6px;font-size:12px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.mt-group{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;overflow:hidden}.mt-group-head{display:flex;align-items:center;gap:10px;padding:10px 12px}.mt-caret{width:20px;height:20px;padding:0;font-size:11px;line-height:1;border-radius:5px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary)}.mt-group-name{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}.mt-group-id{font-size:11px;color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-family-mono,monospace)}.mt-count{margin-left:auto;font-size:12px;color:var(--dsw-alias-label-secondary)}.mt-models{border-top:1px solid var(--dsw-alias-border-l1)}.mt-model{display:flex;align-items:center;gap:10px;padding:8px 12px;min-width:0}.mt-model+.mt-model{border-top:1px solid var(--dsw-alias-border-l2)}.mt-model-main{display:flex;align-items:baseline;gap:8px;min-width:0;flex:1}.mt-model-name{font-size:13px;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mt-model-id{font-size:11px;color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-family-mono,monospace);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mt-state{font-size:12px;font-variant-numeric:tabular-nums;text-align:right;color:var(--dsw-alias-label-secondary);flex:0 1 52%;max-width:52%;white-space:normal;overflow-wrap:anywhere;line-height:1.45}.mt-ok{color:var(--dsw-alias-state-success-primary)}.mt-bad{color:var(--dsw-alias-state-error-primary)}.mt-empty{padding:14px;font-size:12px;color:var(--dsw-alias-label-secondary)}.mt-msg{margin-top:2px;font-size:12px;line-height:1.5;word-break:break-all}.mt-msg-ok{color:var(--dsw-alias-state-success-primary)}.mt-msg-err{color:var(--dsw-alias-state-error-primary)}.mt-path{font-size:11px;color:var(--dsw-alias-label-tertiary)}.mt-entry-dot{display:inline-flex;align-items:center;justify-content:center;border-radius:5px;font-size:10px;font-weight:700;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}.mt-dot{width:7px;height:7px;border-radius:50%;display:inline-block;background:var(--dsw-alias-label-tertiary)}.mt-dot-ok{background:var(--dsw-alias-state-success-primary)}.mt-dot-bad{background:var(--dsw-alias-state-error-primary)}.mt-row{display:flex;flex-direction:column;min-width:0}.mt-model-extra{display:flex;align-items:center;gap:6px;flex:0 0 auto}.mt-badge{display:inline-flex;align-items:center;gap:4px;padding:1px 6px;font-size:10px;line-height:1.7;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis}.mt-badge-synced{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}.mt-badge-mine{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}.mt-badge-muted{opacity:.7}.mt-params{display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px;border-top:1px dashed var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);font-size:12px;line-height:1.6}.mt-params-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}.mt-field{display:inline-flex;align-items:center;gap:4px;color:var(--dsw-alias-label-secondary);white-space:nowrap}.mt-input{width:76px;padding:3px 6px;font-size:12px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-sizing:border-box}.mt-meta{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.55;overflow-wrap:anywhere}.mt-code{margin:0;padding:8px 10px;font-size:11px;line-height:1.55;border-radius:6px;background:var(--dsw-alias-bg-layer-0);color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-family-mono,monospace);white-space:pre-wrap;word-break:break-all;max-height:200px;overflow:auto}.mt-loading{opacity:.65}.mt-dsh{display:flex;flex-direction:column;gap:6px;margin:6px 0 8px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}.mt-dsh-head{display:flex;align-items:center;flex-wrap:wrap;gap:6px}.mt-dsh-title{font-size:11px;font-weight:600;color:var(--dsw-alias-label-primary)}.mt-dsh-tag{display:inline-flex;align-items:center;padding:0 6px;font-size:10px;line-height:1.7;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap}.mt-dsh-tag-miss{color:var(--dsw-alias-state-warning-primary);border-color:var(--dsw-alias-state-warning-primary)}.mt-dsh-tag-same{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}.mt-dsh-tag-warn{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}.mt-dsh-row{display:grid;grid-template-columns:72px 1fr auto;align-items:baseline;gap:8px;font-size:11px;line-height:1.6}.mt-dsh-field{color:var(--dsw-alias-label-secondary);white-space:nowrap}.mt-dsh-val{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;font-family:var(--dsw-font-family-mono,monospace)}.mt-dsh-val-same{color:var(--dsw-alias-label-tertiary)}.mt-dsh-note{font-size:11px;line-height:1.55;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}.mt-dsh-warn{font-size:11px;line-height:1.55;color:var(--dsw-alias-state-warning-primary);overflow-wrap:anywhere}.mt-probe{display:flex;flex-direction:column;gap:6px;margin:6px 0 8px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}.mt-probe-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.mt-probe-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}.mt-probe-row{display:grid;grid-template-columns:88px 56px 1fr;gap:8px;font-size:11px;line-height:1.6}.mt-probe-label{color:var(--dsw-alias-label-secondary);white-space:nowrap}.mt-probe-tag{justify-self:start;padding:0 6px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);font-size:10px}.mt-probe-ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}.mt-probe-no{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}.mt-probe-unk{color:var(--dsw-alias-label-tertiary)}.mt-probe-ev{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}'
const PANEL_KEY = 'model-test'
const PENDING_LABEL = '测试中…'
const UNTESTED_LABEL = '未测试'
const STATUS_LABEL = { ok: '连接正常', error: '失败', timeout: '超时', aborted: '已中断' }
const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']
const LEVEL_LABEL = { off: '关闭', minimal: '最低', low: '低', medium: '中', high: '高', xhigh: '极高', max: '最高' }
const PRESET_FROM_LABEL = { builtin: '内置精选', 'models-dev': 'models.dev' }
return {
  inject: ['slots'],
  apply(ctx) {
    ctx.effect(() => {
      const el = document.createElement("style")
      el.textContent = CSS
      document.head.appendChild(el)
      return () => el.remove()
    }, "model-test: styles")
    const slots = ctx.slots
    const fetchJson = (url, init) => fetch(url, {
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      ...init,
    }).then((response) => response.json().catch(() => null).then((body) => {
      const failure = body !== null && typeof body === 'object' && typeof body.message === 'string' && body.message !== ''
        ? body.message
        : 'HTTP ' + response.status
      if (!response.ok || body === null || typeof body !== 'object' || body.ok !== true) throw new Error(failure)
      return body
    }))
    const postJson = (url, body) => fetchJson(url, { method: 'POST', body: JSON.stringify(body) })
    const keyOf = (provider, model) => provider + '\u0000' + model
    const fmtMs = (value) => {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0) return '-'
      return n < 1000 ? Math.round(n) + ' ms' : (n / 1000).toFixed(2) + ' s'
    }
    const fmtSpeed = (value) => {
      const n = Number(value)
      if (!Number.isFinite(n) || n <= 0) return '-'
      return (n >= 100 ? n.toFixed(0) : n.toFixed(1)) + ' tok/s'
    }
    const statusLabel = (status) => STATUS_LABEL[status] !== undefined ? STATUS_LABEL[status] : String(status)
    /** 只有一个模型时给完整读数；批量结果压缩成「成功 x/y」交给汇总卡片。 */
    const resultText = (result) => {
      if (result === null || result === undefined) return UNTESTED_LABEL
      if (result.ok !== true) return statusLabel(result.status) + '：' + (result.message || '无详细信息')
      const speed = typeof result.tokensPerSecond === 'number' && result.tokensPerSecond > 0
        ? '输出 ' + fmtSpeed(result.tokensPerSecond)
        : result.outputTokens > 0 ? '输出 —' : null
      const parts = ['连接正常', '首字 ' + fmtMs(result.ttftMs), '总 ' + fmtMs(result.totalMs)]
      if (speed !== null) parts.push(speed)
      if (result.outputTokens > 0) parts.push(result.outputTokens + ' tokens 输出')
      if (typeof result.speedNote === 'string' && result.speedNote !== '') parts.push(result.speedNote)
      return parts.join(' · ')
    }
    const resultClass = (result) => result === null || result === undefined ? 'mt-state' : result.ok === true ? 'mt-state mt-ok' : 'mt-state mt-bad'
    // ── 参数覆盖 ────────────────────────────────────────────────
    // 覆盖按 provider + '\u0000' + (model|'*') 存盘，所以整组默认和单模型设置能同时存在。
    const overrideOf = (overrides, provider, model) => {
      if (overrides === null || typeof overrides !== 'object') return null
      const key = provider + '\u0000' + (model || '*')
      return overrides[key] !== undefined ? overrides[key] : null
    }
    const paramsText = (params) => {
      if (params === null || params === undefined) return '自动'
      const parts = []
      if (params.temperature !== null && params.temperature !== undefined) parts.push('t=' + params.temperature)
      if (params.maxTokens !== null && params.maxTokens !== undefined) parts.push('max=' + params.maxTokens)
      if (params.reasoningEffort !== null && params.reasoningEffort !== undefined) parts.push(LEVEL_LABEL[params.reasoningEffort] || params.reasoningEffort)
      return parts.length === 0 ? '自动' : parts.join(' · ')
    }
    const presetText = (preset) => {
      if (preset === null || preset === undefined) return null
      const label = typeof preset.label === 'string' && preset.label !== '' ? preset.label : preset.id
      return (PRESET_FROM_LABEL[preset.from] || preset.from) + ' · ' + label
    }
    const presetTitle = (preset) => {
      if (preset === null || preset === undefined) return ''
      const lines = []
      if (preset.label) lines.push(preset.label)
      if (preset.note) lines.push(preset.note)
      const limit = []
      if (preset.contextWindow) limit.push('上下文 ' + preset.contextWindow)
      if (preset.maxTokens) limit.push('输出上限 ' + preset.maxTokens)
      if (limit.length > 0) lines.push(limit.join(' / '))
      if (preset.supportsTemperature === false) lines.push('不接受 temperature')
      if (preset.reasoning && Array.isArray(preset.reasoning.levels) && preset.reasoning.levels.length > 0) {
        lines.push('思考档位：' + preset.reasoning.levels.map((item) => LEVEL_LABEL[item] || item).join(' / '))
      }
      return lines.join('\n')
    }
    // 输入框文本就是「空 = 自动」，提交时再归一，避免在输入过程中打断用户。
    const textOf = (value) => value === null || value === undefined ? '' : String(value)
    const numberText = (value) => Number.isFinite(Number(value)) ? Number(value) : null
    const draftOf = (params) => ({
      temperature: textOf(params && params.temperature),
      maxTokens: textOf(params && params.maxTokens),
      reasoningEffort: params && params.reasoningEffort ? params.reasoningEffort : '',
    })
    const draftToParams = (draft) => ({
      temperature: draft.temperature === '' ? null : Number(draft.temperature),
      maxTokens: draft.maxTokens === '' ? null : Math.round(Number(draft.maxTokens)),
      reasoningEffort: draft.reasoningEffort === '' ? null : draft.reasoningEffort,
    })

    const average = (list) => list.length === 0 ? null : list.reduce((sum, value) => sum + value, 0) / list.length
    const summaryOf = (list) => {
      const ok = list.filter((item) => item.ok === true).length
      const ttfts = list.map((item) => item.ttftMs).filter((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
      const speeds = list.map((item) => item.tokensPerSecond).filter((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)
      return {
        total: list.length,
        ok,
        failed: list.length - ok,
        averageTtftMs: average(ttfts),
        averageTokensPerSecond: average(speeds),
        fastest: speeds.length === 0 ? null : Math.max(...speeds),
        slowest: speeds.length === 0 ? null : Math.min(...speeds),
      }
    }
    function panelGlyph(size) { const edge = typeof size === 'number' && size > 0 ? size : 16; return React.createElement('span', { className: 'mt-entry-dot', style: { width: edge + 'px', height: edge + 'px' } }, 'M') }

    function Panel() {
      const [catalog, setCatalog] = React.useState({ loading: true, data: null, error: null })
      const [results, setResults] = React.useState({})
      const [running, setRunning] = React.useState(false)
      const [pending, setPending] = React.useState([])
      const [collapsed, setCollapsed] = React.useState([])
      const [notice, setNotice] = React.useState(null)
      const [options, setOptions] = React.useState({ timeoutMs: 120000, maxTokens: 256, concurrency: 3 })
      const [prompt, setPrompt] = React.useState('请连续输出 80 个「测速」，词与词之间只用空格，不要解释。')
      // 手工参数覆盖：{ 'provider\0model' -> {temperature,maxTokens,reasoningEffort} }，'provider\0*' 是整组默认。
      const [overrides, setOverrides] = React.useState({})
      // 正在编辑的目标键（null = 没打开任何参数面板）
      const [editing, setEditing] = React.useState(null)
      // 编辑中的草稿（字符串，空 = 自动）
      const [draft, setDraft] = React.useState({ temperature: '', maxTokens: '', reasoningEffort: '' })
      const [saving, setSaving] = React.useState(false)
      // 全局默认：优先级最低的一层，测试时对所有没被覆盖的模型生效
      const [defaults, setDefaults] = React.useState({ temperature: '', reasoningEffort: '' })
      // 按需拉取的 YAML 片段：{ key, loading, text, error }
      const [snippet, setSnippet] = React.useState(null)
      // DSH 真实配置：{ 'provider\0model' -> {loading, data, error} }，按目标缓存
      const [dshState, setDshState] = React.useState({})
      // 正在写 DSH 配置的目标键（null = 没有写入进行中）
      const [dshWriting, setDshWriting] = React.useState(null)
      // 按模型缓存按需网关探针结果：{ 'provider\0model' -> {loading, data, error} }
      const [probeState, setProbeState] = React.useState({})
      const seq = React.useRef(0)
      const rootRef = React.useRef(null)

      const loadCatalog = () => {
        setCatalog({ loading: true, data: null, error: null })
        fetchJson('/api/model-test/catalog')
          .then((data) => {
            setCatalog({ loading: false, data, error: null })
            if (data !== null && typeof data === 'object' && data.overrides !== null && typeof data.overrides === 'object') setOverrides(data.overrides)
          })
          .catch((error) => setCatalog({ loading: false, data: null, error: String(error && error.message ? error.message : error) }))
      }
      React.useEffect(() => { loadCatalog() }, [])
      React.useEffect(() => {
        const el = rootRef.current
        if (el === null || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return undefined
        const fit = () => {
          const top = el.getBoundingClientRect().top
          let limit = window.innerHeight - top - 4
          let node = el.parentElement
          while (node !== null && node !== document.documentElement) {
            const style = window.getComputedStyle(node)
            if (style.display === 'contents') {
              node = node.parentElement
              continue
            }
            const oy = style.overflowY
            if ((oy === 'hidden' || oy === 'auto' || oy === 'scroll' || oy === 'clip') && node.clientHeight > 0) {
              const available = node.clientHeight - (top - node.getBoundingClientRect().top) - 4
              if (available > 80 && available < limit) limit = available
            }
            node = node.parentElement
          }
          const height = Math.max(160, Math.floor(limit))
          el.style.position = 'relative'
          el.style.inset = 'auto'
          el.style.left = 'auto'
          el.style.right = 'auto'
          el.style.top = 'auto'
          el.style.bottom = 'auto'
          el.style.width = 'auto'
          el.style.height = height + 'px'
          el.style.maxHeight = height + 'px'
          el.style.flex = '0 0 auto'
          el.style.overflowY = 'auto'
          el.style.overflowX = 'hidden'
        }
        fit()
        const frame = window.requestAnimationFrame(() => fit())
        window.addEventListener('resize', fit)
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
        if (observer !== null) {
          observer.observe(document.documentElement)
        }
        return () => {
          window.cancelAnimationFrame(frame)
          window.removeEventListener('resize', fit)
          if (observer !== null) observer.disconnect()
        }
      }, [])

      const data = catalog.data
      const groups = data !== null && typeof data === 'object' && Array.isArray(data.groups) ? data.groups : []
      // 组折叠是面板的主收纳手段（组多时一屏放不下）。这里给一个「一键全收」，因为逐组点太累。
      const allCollapsed = groups.length > 0 && groups.every((group) => collapsed.includes(group.id))
      const failures = data !== null && typeof data === 'object' && Array.isArray(data.failures) ? data.failures : []
      const resultList = groups.flatMap((group) => group.models.map((item) => results[keyOf(group.id, item.id)]).filter((item) => item !== undefined && item !== null))
      const summary = summaryOf(resultList)
      const allKeys = groups.flatMap((group) => group.models.map((item) => keyOf(group.id, item.id)))

      const run = (body, keys) => {
        const mine = seq.current + 1
        seq.current = mine
        setRunning(true)
        setPending(keys)
        setNotice(null)
        const params = {}
        if (defaults.temperature !== '') params.temperature = Number(defaults.temperature)
        if (defaults.reasoningEffort !== '') params.reasoningEffort = defaults.reasoningEffort
        postJson('/api/model-test/run', { ...options, prompt, params, ...body })
          .then((payload) => {
            if (seq.current !== mine) return
            const next = {}
            const list = Array.isArray(payload.results) ? payload.results : []
            for (const item of list) next[keyOf(item.provider, item.model)] = item
            // 合并而非替换：单测某个模型时，其它模型上一次的读数仍留在表里。
            setResults((previous) => ({ ...previous, ...next }))
            setPending([])
            const done = payload.summary !== null && typeof payload.summary === 'object' ? payload.summary : summaryOf(list)
            setNotice({
              kind: done.failed === 0 ? 'ok' : 'error',
              text: '测完 ' + done.total + ' 个模型：成功 ' + done.ok + ' 个' + (done.failed > 0 ? '，失败 ' + done.failed + ' 个' : '')
                + (done.averageTtftMs !== null && done.averageTtftMs !== undefined ? '，平均首字 ' + fmtMs(done.averageTtftMs) : '')
                + (done.averageTokensPerSecond !== null && done.averageTokensPerSecond !== undefined ? '，平均 ' + fmtSpeed(done.averageTokensPerSecond) : ''),
            })
          })
          .catch((error) => {
            if (seq.current !== mine) return
            setPending([])
            setNotice({ kind: 'error', text: String(error && error.message ? error.message : error) })
          })
          .finally(() => { if (seq.current === mine) setRunning(false) })
      }

      const toggleGroup = (id) => setCollapsed(collapsed.includes(id) ? collapsed.filter((item) => item !== id) : collapsed.concat([id]))
      const setOption = (patch) => setOptions({ ...options, ...patch })

      // ── 参数覆盖的读写 ────────────────────────────────────────
      // 所有操作都走 POST /api/model-test/config（整表落盘），因此面板状态与磁盘始终一致：
      // 提交成功后用服务端回的 overrides 覆盖本地，不做乐观更新，避免写失败后界面说谎。
      const saveOverride = (provider, model, params) => {
        const key = provider + '\u0000' + (model || '*')
        const next = { ...overrides }
        const empty = params.temperature === null && params.maxTokens === null && params.reasoningEffort === null
        if (empty) delete next[key]
        else next[key] = params
        const entries = [{ provider, model: model || '*', params: empty ? null : params }]
        setSaving(true)
        postJson('/api/model-test/config', { entries })
          .then((payload) => {
            setOverrides(payload.overrides !== null && typeof payload.overrides === 'object' ? payload.overrides : next)
            setEditing(null)
            setNotice({ kind: 'ok', text: (empty ? '已清除 ' : '已保存 ') + provider + ' / ' + (model || '整组默认') + ' 的参数' })
            loadCatalog()
          })
          .catch((error) => setNotice({ kind: 'error', text: '保存失败：' + String(error && error.message ? error.message : error) }))
          .finally(() => setSaving(false))
      }
      const openEditor = (provider, model) => {
        const key = provider + '\u0000' + (model || '*')
        if (editing === key) { setEditing(null); return }
        setEditing(key)
        setDraft(draftOf(overrideOf(overrides, provider, model)))
        // 展开就顺手把 DSH 里的真实配置读回来：用户点「参数」是想看「现在是什么、差在哪」，
        // 不该再让他多点一次。整组编辑没有 DSH 区块，不读。
        if (model !== null && model !== undefined) {
          const dshKey = provider + '\u0000' + model
          const seen = dshState[dshKey]
          if (seen === undefined || (seen.data === null && seen.error === null && seen.loading !== true)) readDsh(provider, model)
        }
      }
      const setDraftField = (patch) => setDraft({ ...draft, ...patch })

      // 同步 models.dev：按当前目录里的模型拉参数预设，回来后刷新目录让徽标立即更新。
      const syncPresets = () => {
        setNotice(null)
        postJson('/api/model-test/presets/sync', {})
          .then((payload) => {
            setNotice({ kind: 'ok', text: payload.message !== undefined ? String(payload.message) : '同步完成' })
            loadCatalog()
          })
          .catch((error) => setNotice({ kind: 'error', text: '同步失败：' + String(error && error.message ? error.message : error) }))
      }

      // ── DSH 真实配置的读写 ──────────────────────────────────────
      // 与上面的 params.json 是两回事：那边只影响「测试」，这边写进 cordis.patch.yml，
      // 写完真实对话就生效（temperature 除外，它不是模型级配置）。
      const dshKeyOf = (provider, model) => provider + '\u0000' + model
      const readDsh = (provider, model) => {
        const key = dshKeyOf(provider, model)
        // 函数式更新：连着读两个模型时，直接展开闭包里的 dshState 会把前一个覆盖掉。
        setDshState((prev) => ({ ...prev, [key]: { loading: true, data: null, error: null } }))
        fetchJson('/api/model-test/dsh?provider=' + encodeURIComponent(provider) + '&model=' + encodeURIComponent(model))
          .then((data) => setDshState((prev) => ({ ...prev, [key]: { loading: false, data, error: null } })))
          .catch((error) => setDshState((prev) => ({
            ...prev,
            [key]: { loading: false, data: null, error: String(error && error.message ? error.message : error) },
          })))
      }
      const writeDsh = (provider, model, mode) => {
        const key = dshKeyOf(provider, model)
        const state = dshState[key]
        const revision = state !== null && state !== undefined && state.data !== null && state.data !== undefined && typeof state.data.revision === 'number'
          ? state.data.revision
          : undefined
        setDshWriting(key)
        // 带上读取时的 revision：DSH 侧是 CAS，别人在这期间改过配置就会拒绝而不是覆盖。
        postJson('/api/model-test/dsh', revision === undefined ? { provider, model, mode } : { provider, model, mode, revision })
          .then((payload) => {
            setNotice({ kind: 'ok', text: payload.message !== undefined ? String(payload.message) : '已写入 DSH 配置' })
            readDsh(provider, model)
            loadCatalog()
          })
          .catch((error) => setNotice({ kind: 'error', text: '写入 DSH 配置失败：' + String(error && error.message ? error.message : error) }))
          .finally(() => setDshWriting(null))
      }

      // ── 网关能力探针（按需触发，真实计费）──────────────────────────
      // 只报三态：supported / unsupported / unknown。单次成功不证明参数生效；
      // 只有网关明确拒绝才判 unsupported。effort / temperature 恒为 unknown ——
      // 实测它们在这类聚合网关上是静默忽略或跨后端漂移，少量调用判不出来。
      const runProbe = (provider, model) => {
        const key = keyOf(provider, model)
        setProbeState((prev) => ({ ...prev, [key]: { loading: true, data: null, error: null } }))
        postJson('/api/model-test/probe', { provider, model })
          .then((data) => setProbeState((prev) => ({ ...prev, [key]: { loading: false, data, error: null } })))
          .catch((error) => setProbeState((prev) => ({
            ...prev,
            [key]: { loading: false, data: null, error: String(error && error.message ? error.message : error) },
          })))
      }
      const PROBE_LABEL = { supported: '支持', unsupported: '不支持', unknown: '无法判定' }
      const PROBE_CLASS = { supported: 'mt-probe-ok', unsupported: 'mt-probe-no', unknown: 'mt-probe-unk' }

      const probeNode = (provider, model) => {
        const key = keyOf(provider, model)
        const state = probeState[key] !== undefined ? probeState[key] : null
        if (state === null) return null
        const head = React.createElement('div', { className: 'mt-probe-head' },
          React.createElement('span', { className: 'mt-probe-title' }, '网关能力探针'),
          state.data !== null && typeof state.data.calls === 'number'
            ? React.createElement('span', { className: 'mt-dsh-tag' }, state.data.calls + ' 次真实调用')
            : null,
          React.createElement('button', {
            className: 'mt-btn',
            disabled: state.loading === true,
            title: '重新探测这个模型的网关能力',
            onClick: () => runProbe(provider, model),
          }, state.loading === true ? '探测中…' : '重新探测'))
        if (state.loading === true) {
          return React.createElement('div', { className: 'mt-probe' }, head,
            React.createElement('div', { className: 'mt-dsh-note' }, '正在发真实请求探测（会产生上游调用费用）…'))
        }
        if (state.error !== null) {
          return React.createElement('div', { className: 'mt-probe' }, head,
            React.createElement('div', { className: 'mt-msg mt-msg-err' }, '探测失败：' + state.error))
        }
        const checks = state.data !== null && Array.isArray(state.data.checks) ? state.data.checks : []
        return React.createElement('div', { className: 'mt-probe' }, head,
          checks.map((check) => React.createElement('div', { className: 'mt-probe-row', key: check.id },
            React.createElement('span', { className: 'mt-probe-label' }, check.label),
            React.createElement('span', { className: 'mt-probe-tag ' + (PROBE_CLASS[check.verdict] || 'mt-probe-unk') },
              PROBE_LABEL[check.verdict] || check.verdict),
            React.createElement('span', { className: 'mt-probe-ev' },
              check.evidence + (check.detail !== '' && check.detail !== null ? '（' + check.detail + '）' : '')))),
          React.createElement('div', { className: 'mt-dsh-note' },
            state.data !== null && state.data.note !== undefined ? String(state.data.note) : ''))
      }

      const optionNode = (label, node) => React.createElement('label', { className: 'mt-opt' }, label, node)
      const statNode = (label, value) => React.createElement('div', { className: 'mt-card' },
        React.createElement('div', { className: 'mt-stat-label' }, label),
        React.createElement('div', { className: 'mt-stat-value' }, value))

      // 参数徽标：命中预设显示来源+族名，有手工覆盖再补一个「已配置」。
      const badgesOf = (preset, override) => {
        const nodes = []
        if (preset !== null && preset !== undefined) {
          nodes.push(React.createElement('span', {
            className: 'mt-badge' + (preset.from === 'models-dev' ? ' mt-badge-synced' : ' mt-badge-muted'),
            key: 'preset',
            title: presetTitle(preset),
          }, presetText(preset)))
        }
        if (override !== null && override !== undefined) {
          nodes.push(React.createElement('span', { className: 'mt-badge mt-badge-mine', key: 'mine', title: '手工配置的参数优先于预设' }, '已配置'))
        }
        return nodes
      }

      // 生效参数摘要：优先用上一次测试真实发出的参数，没有再退回「覆盖或预设」的推断值。
      const effectiveOf = (model, override) => {
        if (model.result !== undefined && model.result !== null && model.result.params !== undefined && model.result.params !== null) {
          return { text: paramsText(model.result.params), title: '上次测试实际发送：' + (model.result.params.sourceLabel || '') + (model.result.params.note ? '\n' + model.result.params.note : '') }
        }
        if (override !== null && override !== undefined) return { text: paramsText(override) + '（待测试）', title: '手工配置，下次测试生效' }
        if (model.preset !== null && model.preset !== undefined) return { text: paramsText(model.preset.suggest) + '（预设）', title: '预设建议，下次测试生效' }
        return { text: '', title: '' }
      }

      // 参数编辑区：temperature / 思考档位 / 输出上限 + 生成 YAML 片段。
      const paramsEditor = (provider, model) => {
        const key = provider + '\u0000' + (model === null ? '*' : model)
        const isGroup = model === null
        const current = overrideOf(overrides, provider, model)
        const preset = model !== null && model.preset !== undefined ? model.preset : null
        const levels = preset !== null && preset.reasoning !== null && Array.isArray(preset.reasoning.levels) && preset.reasoning.levels.length > 0
          ? preset.reasoning.levels
          : THINKING_LEVELS
        const locked = preset !== null && preset.supportsTemperature === false
        const helpParts = []
        if (preset !== null) {
          if (preset.contextWindow) helpParts.push('上下文 ' + preset.contextWindow)
          if (preset.maxTokens) helpParts.push('输出上限 ' + preset.maxTokens)
          if (locked) helpParts.push('该模型不接受 temperature')
          if (preset.reasoning !== null && preset.reasoning.mode !== 'none') helpParts.push('思考模式：' + preset.reasoning.mode)
        }
        if (current !== null && current !== undefined) helpParts.push('当前覆盖：' + paramsText(current))
        const fieldNode = (label, node) => React.createElement('label', { className: 'mt-field' }, label, node)
        return React.createElement('div', { className: 'mt-params' },
          React.createElement('div', { className: 'mt-params-row' },
            fieldNode('temperature', React.createElement('input', {
              className: 'mt-input',
              value: draft.temperature,
              placeholder: locked ? '不支持' : '自动',
              title: locked ? '预设标记该模型不接受 temperature' : '留空 = 按预设/全局默认；0~2',
              onChange: (event) => setDraftField({ temperature: event.target.value }),
            })),
            fieldNode('思考档位', React.createElement('select', {
              className: 'mt-select',
              value: draft.reasoningEffort,
              onChange: (event) => setDraftField({ reasoningEffort: event.target.value }),
            }, [React.createElement('option', { key: '', value: '' }, '自动')].concat(levels.map((level) =>
              React.createElement('option', { key: level, value: level }, LEVEL_LABEL[level] || level))))),
            fieldNode('输出上限', React.createElement('input', {
              className: 'mt-input',
              value: draft.maxTokens,
              placeholder: '自动',
              title: '留空 = 按全局「输出上限」；测试时会被它收顶',
              onChange: (event) => setDraftField({ maxTokens: event.target.value }),
            })),
            React.createElement('button', {
              className: 'mt-btn mt-btn-primary',
              disabled: saving || running,
              onClick: () => saveOverride(provider, isGroup ? null : model.id, draftToParams(draft)),
            }, saving ? '保存中…' : '保存'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: saving || running || current === null || current === undefined,
              title: '清除这个目标的手工参数，恢复按预设推断',
              onClick: () => saveOverride(provider, isGroup ? null : model.id, { temperature: null, maxTokens: null, reasoningEffort: null }),
            }, '清除'),
            model !== null ? React.createElement('button', {
              className: 'mt-btn',
              disabled: (snippet !== null && snippet.loading === true) || false,
              title: '从适配器读真实能力，生成可直接粘进 cordis.patch.yml 的 models 条目',
              onClick: () => {
                const mine = key
                setSnippet({ key: mine, loading: true, text: '', error: null })
                postJson('/api/model-test/inspect', { provider, model: model.id, params: current })
                  .then((payload) => setSnippet({ key: mine, loading: false, text: typeof payload.snippet === 'string' ? payload.snippet : '', error: null }))
                  .catch((error) => setSnippet({ key: mine, loading: false, text: '', error: String(error && error.message ? error.message : error) }))
              },
            }, snippet !== null && snippet.key === key && snippet.loading === true ? '读取中…' : '生成 YAML 片段') : null),
          React.createElement('div', { className: 'mt-meta' },
            (isGroup ? '整组默认：对该组所有模型生效，优先级低于单模型配置。' : '留空即自动：按「预设 → 全局默认」推断，绝不强发模型不接受的参数。')
            + (helpParts.length > 0 ? ' ' + helpParts.join(' · ') : '')),
          snippet !== null && snippet.key === key && snippet.error !== null
            ? React.createElement('div', { className: 'mt-msg mt-msg-err' }, '读取失败：' + snippet.error) : null,
          snippet !== null && snippet.key === key && snippet.text !== ''
            ? React.createElement('pre', { className: 'mt-code' }, snippet.text) : null,
          model !== null ? dshNode(provider, model) : null)
      }

      // DSH 真实配置区块：读当前值 → 与预设建议逐字段比对 → 一键补缺 / 覆盖差异。
      // 和上面的 params.json 编辑区并排，是因为它们解决的是两件事：
      //   上面 = 只影响这台面板点「测试」时发什么参数；
      //   这里 = 写进 cordis.patch.yml，真实对话也生效（temperature 不在其中）。
      const dshNode = (provider, model) => {
        const key = dshKeyOf(provider, model.id)
        const state = dshState[key] !== undefined ? dshState[key] : null
        const data = state !== null && state.data !== null ? state.data : null
        const busy = dshWriting === key
        const head = React.createElement('div', { className: 'mt-dsh-head' },
          React.createElement('span', { className: 'mt-dsh-title' }, 'DSH 配置'),
          React.createElement('span', { className: 'mt-dsh-tag', title: '写入位置：profile 的 cordis.patch.yml，llm-pi-ai 的 models 条目' },
            data !== null && typeof data.ns === 'string' ? data.ns : 'llm-pi-ai'),
          data !== null && data.declaredInModels === false
            ? React.createElement('span', { className: 'mt-dsh-tag mt-dsh-tag-warn' }, '该模型不在 models 列表里') : null,
          data !== null && data.available === false
            ? React.createElement('span', { className: 'mt-dsh-tag mt-dsh-tag-warn' }, '不可写') : null,
          React.createElement('button', {
            className: 'mt-btn',
            disabled: busy || (state !== null && state.loading === true),
            title: '读取 DSH 里这个模型的真实参数，并与预设建议比较',
            onClick: () => readDsh(provider, model.id),
          }, state === null ? '读取 DSH 配置' : state.loading === true ? '读取中…' : '重新读取'))

        if (state === null) {
          return React.createElement('div', { className: 'mt-dsh' }, head,
            React.createElement('div', { className: 'mt-dsh-note' }, '读一下 DSH 里这个模型现在配了什么，再决定要不要补。'))
        }
        if (state.error !== null) {
          return React.createElement('div', { className: 'mt-dsh' }, head,
            React.createElement('div', { className: 'mt-msg mt-msg-err' }, '读取失败：' + state.error))
        }
        if (data === null) {
          return React.createElement('div', { className: 'mt-dsh' }, head,
            React.createElement('div', { className: 'mt-dsh-note' }, '读取中…'))
        }
        if (data.available !== true) {
          return React.createElement('div', { className: 'mt-dsh' }, head,
            React.createElement('div', { className: 'mt-dsh-warn' }, data.reason !== null && data.reason !== undefined ? String(data.reason) : '这个模型不可写'))
        }

        const rows = Array.isArray(data.diff) ? data.diff : []
        const node = (row) => {
          const same = row.changed !== true
          const tag = row.missing === true ? '缺' : same ? '一致' : '不同'
          return React.createElement('div', { className: 'mt-dsh-row', key: row.field },
            React.createElement('span', { className: 'mt-dsh-field' }, row.label),
            React.createElement('span', { className: 'mt-dsh-val' + (same ? ' mt-dsh-val-same' : ''), title: row.field },
              same
                ? row.afterText
                : row.beforeText + '  →  ' + row.afterText),
            React.createElement('span', {
              className: 'mt-dsh-tag' + (row.missing === true ? ' mt-dsh-tag-miss' : same ? ' mt-dsh-tag-same' : ' mt-dsh-tag-warn'),
            }, tag))
        }
        const willFill = Array.isArray(data.plan?.applied) ? data.plan.applied.length : 0
        const changedCount = rows.filter((row) => row.changed === true).length

        return React.createElement('div', { className: 'mt-dsh' },
          head,
          React.createElement('div', { className: 'mt-dsh-note' },
            'DSH 现在：' + (typeof data.summary === 'string' && data.summary !== '' ? data.summary : '（这条没有任何可写字段）')),
          rows.length > 0 ? React.createElement('div', null, rows.map(node)) : null,
          React.createElement('div', { className: 'mt-dsh-head' },
            React.createElement('button', {
              className: 'mt-btn mt-btn-primary',
              disabled: busy || willFill === 0,
              title: '只补 DSH 里还没有的字段，已有的值一概不动',
              onClick: () => writeDsh(provider, model.id, 'fill'),
            }, busy ? '写入中…' : willFill === 0 ? '没有要补的' : '补全缺失（' + willFill + '）'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: busy || changedCount === 0,
              title: '用预设建议覆盖所有有差异的字段',
              onClick: () => writeDsh(provider, model.id, 'replace'),
            }, '覆盖差异（' + changedCount + '）'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: busy,
              title: '重新读一遍，确认磁盘上真实的配置',
              onClick: () => readDsh(provider, model.id),
            }, '刷新')),
          React.createElement('div', { className: 'mt-dsh-note' },
            data.note !== undefined && data.note !== null ? String(data.note) : ''))
      }

      const modelRow = (group, model) => {
        const key = keyOf(group.id, model.id)
        const result = results[key] !== undefined ? results[key] : null
        const override = overrideOf(overrides, group.id, model.id)
        const isPending = pending.includes(key)
        const stateText = isPending ? PENDING_LABEL : resultText(result)
        const effective = effectiveOf({ ...model, result }, override)
        const isEditing = editing === key
        return React.createElement('div', { className: 'mt-row', key },
          React.createElement('div', { className: 'mt-model' },
            React.createElement('span', { className: 'mt-dot' + (result === null ? '' : result.ok === true ? ' mt-dot-ok' : ' mt-dot-bad') }),
            React.createElement('div', { className: 'mt-model-main' },
              React.createElement('span', { className: 'mt-model-name' }, model.name),
              model.name === model.id ? null : React.createElement('span', { className: 'mt-model-id' }, model.id),
              effective.text !== '' ? React.createElement('span', { className: 'mt-badge mt-badge-muted', title: effective.title }, effective.text) : null),
            React.createElement('div', { className: 'mt-model-extra' }, badgesOf(model.preset, override)),
            React.createElement('span', { className: resultClass(result), title: stateText }, stateText),
            React.createElement('button', {
              className: 'mt-btn',
              title: '单独编辑这个模型的参数',
              disabled: running,
              onClick: () => openEditor(group.id, model.id),
            }, isEditing ? '收起' : '参数'),
            React.createElement('button', {
              className: 'mt-btn',
              title: '探测这个模型的网关能力（真实调用，约 3 次）',
              disabled: running,
              onClick: () => runProbe(group.id, model.id),
            }, probeState[key] !== undefined && probeState[key].loading === true ? '探测中…' : '探针'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: running,
              onClick: () => run({ provider: group.id, model: model.id }, [key]),
            }, isPending ? PENDING_LABEL : '测试')),
          isEditing ? paramsEditor(group.id, model) : null,
          probeNode(group.id, model.id))
      }

      const groupNode = (group) => {
        const isCollapsed = collapsed.includes(group.id)
        const groupKeys = group.models.map((item) => keyOf(group.id, item.id))
        const groupOverride = overrideOf(overrides, group.id, null)
        const groupKey = group.id + '\u0000*'
        const editingGroup = editing === groupKey
        return React.createElement('div', { className: 'mt-group', key: group.id },
          React.createElement('div', { className: 'mt-group-head' },
            React.createElement('button', { className: 'mt-caret', title: isCollapsed ? '展开' : '收起', onClick: () => toggleGroup(group.id) }, isCollapsed ? '▸' : '▾'),
            React.createElement('span', { className: 'mt-group-name' }, group.name),
            group.name === group.id ? null : React.createElement('span', { className: 'mt-group-id' }, group.id),
            React.createElement('span', { className: 'mt-count' }, group.models.length + ' 个模型'),
            groupOverride !== null && groupOverride !== undefined
              ? React.createElement('span', { className: 'mt-badge mt-badge-mine', title: '整组默认：' + paramsText(groupOverride) }, '整组默认')
              : null,
            React.createElement('button', {
              className: 'mt-btn',
              disabled: running,
              title: '给这一组设置默认参数（单模型配置会覆盖它）',
              onClick: () => openEditor(group.id, null),
            }, editingGroup ? '收起' : '整组参数'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: running || group.models.length === 0,
              onClick: () => run({ provider: group.id }, groupKeys),
            }, '测试本组')),
          editingGroup ? React.createElement('div', { className: 'mt-models' }, paramsEditor(group.id, null)) : null,
          isCollapsed ? null : React.createElement('div', { className: 'mt-models' },
            group.models.length === 0
              ? React.createElement('div', { className: 'mt-empty' }, '该组没有可用模型')
              : group.models.map((model) => modelRow(group, model))))
      }

      return React.createElement('div', { className: 'mt-root', ref: rootRef },
        React.createElement('div', { className: 'mt-head' },
          React.createElement('div', null,
            React.createElement('h2', { className: 'mt-title' }, '模型测试'),
            React.createElement('div', { className: 'mt-sub' }, '与对话走同一条 DSH 适配器链路。输出速度 = 输出 tokens ÷ 总耗时，和网关「输出 TPS」同一口径。首字和总耗时从本机发起调用算起，含适配器准备，会比网关入站计时略高。会真实调用并计费，单次输出上限 ' + options.maxTokens + ' tokens。参数按「手工配置 > 整组默认 > 预设 > 全局默认」推断，并用适配器真实能力做安全阀（不支持的档位自动降级）。')),
          React.createElement('div', { className: 'mt-actions' },
            React.createElement('button', {
              className: 'mt-btn mt-btn-primary',
              disabled: running || groups.length === 0,
              onClick: () => run({}, allKeys),
            }, running ? PENDING_LABEL : '测试全部'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: running,
              title: '按当前目录里的模型，从 models.dev 拉一份参数预设（写进本地 presets.json）',
              onClick: syncPresets,
            }, '同步参数预设'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: groups.length === 0,
              title: allCollapsed ? '展开所有模型组' : '把每个模型组收起来，只留组名和按钮',
              onClick: () => setCollapsed(allCollapsed ? [] : groups.map((group) => group.id)),
            }, allCollapsed ? '展开全部' : '收起全部'),
            React.createElement('button', { className: 'mt-btn', disabled: running, onClick: loadCatalog }, '刷新目录'))),
        React.createElement('div', { className: 'mt-actions' },
          optionNode('超时', React.createElement('select', {
            className: 'mt-select',
            value: String(options.timeoutMs),
            disabled: running,
            onChange: (event) => setOption({ timeoutMs: Number(event.target.value) }),
          }, [15000, 30000, 60000, 120000, 180000].map((value) => React.createElement('option', { key: value, value: String(value) }, value / 1000 + ' 秒')))),
          optionNode('输出上限', React.createElement('select', {
            className: 'mt-select',
            value: String(options.maxTokens),
            disabled: running,
            onChange: (event) => setOption({ maxTokens: Number(event.target.value) }),
          }, [16, 64, 256, 512].map((value) => React.createElement('option', { key: value, value: String(value) }, value + ' tokens')))),
          optionNode('并发', React.createElement('select', {
            className: 'mt-select',
            value: String(options.concurrency),
            disabled: running,
            onChange: (event) => setOption({ concurrency: Number(event.target.value) }),
          }, [1, 2, 3, 5, 8].map((value) => React.createElement('option', { key: value, value: String(value) }, String(value))))),
          optionNode('默认 temperature', React.createElement('input', {
            className: 'mt-input',
            value: defaults.temperature,
            placeholder: '自动',
            disabled: running,
            title: '全局默认：只对既没手工配置、也没命中预设 temperature 的模型生效',
            onChange: (event) => setDefaults({ ...defaults, temperature: event.target.value }),
          })),
          optionNode('默认档位', React.createElement('select', {
            className: 'mt-select',
            value: defaults.reasoningEffort,
            disabled: running,
            title: '全局默认：只对既没手工配置、也没命中预设的模型生效',
            onChange: (event) => setDefaults({ ...defaults, reasoningEffort: event.target.value }),
          }, [React.createElement('option', { key: '', value: '' }, '自动')].concat(THINKING_LEVELS.map((level) =>
            React.createElement('option', { key: level, value: level }, LEVEL_LABEL[level] || level))))),
          optionNode('提示词', React.createElement('input', {
            className: 'mt-select',
            style: { width: '280px' },
            value: prompt,
            disabled: running,
            onChange: (event) => setPrompt(event.target.value),
          }))),
        catalog.loading ? React.createElement('div', { className: 'mt-card mt-empty' }, '正在读取模型目录…') : null,
        catalog.error !== null ? React.createElement('div', { className: 'mt-card mt-msg mt-msg-err' }, '目录读取失败：' + catalog.error) : null,
        failures.length > 0 ? React.createElement('div', { className: 'mt-card' },
          failures.map((item) => React.createElement('div', { className: 'mt-msg mt-msg-err', key: (item.id || '') + item.message }, (item.name || item.id) + '：' + item.message))) : null,
        resultList.length > 0 ? React.createElement('div', { className: 'mt-stats' },
          statNode('成功', summary.ok + ' / ' + summary.total),
          statNode('平均首字', fmtMs(summary.averageTtftMs)),
          statNode('平均输出', fmtSpeed(summary.averageTokensPerSecond)),
          statNode('最快 / 最慢', (summary.fastest === null ? '-' : fmtSpeed(summary.fastest)) + ' / ' + (summary.slowest === null ? '-' : fmtSpeed(summary.slowest)))) : null,
        React.createElement('div', { className: 'mt-scroll' },
          groups.length === 0 && catalog.loading === false && catalog.error === null
            ? React.createElement('div', { className: 'mt-card mt-empty' }, '当前没有可路由的模型组：DSH 里还没有激活的模型配置，或适配器未注册任何 route。')
            : groups.map((group) => groupNode(group)),
          notice !== null ? React.createElement('div', { className: 'mt-msg ' + (notice.kind === 'ok' ? 'mt-msg-ok' : 'mt-msg-err') }, notice.text) : null),
        React.createElement('div', { className: 'mt-path' }, '调用链：ctx.llm.stream() → 该组配置的 baseURL。参数覆盖存在 $DSH_HOME/dsh-toolkit/model-test/params.json，预设同步结果存在同目录的 presets.json。「生成 YAML 片段」会读取适配器真实能力，可直接粘进 cordis.patch.yml 的 llm-pi-ai providers.models 条目。'))
    }

    if (slots === undefined) return
    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, Panel))
    // 侧边栏入口：和 dsh-toolkit 其它组件一起加载时统一交给 toolkit 组件管理
    // （在共享注册表里登记一份）；单独加载本文件时注册表不存在，退回自己注册。
    const registry = typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null
    if (registry !== null) {
      registry.register({ id: PANEL_KEY, Panel, label: '模型测试', order: 51, glyphText: 'M' })
    } else {
      slots.inject('sidebar.panellist', () => slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, label: '模型测试', order: 51 }, (props) => panelGlyph(props !== null && typeof props === 'object' ? props.size : 16)))
    }
  },
}
  },
})
