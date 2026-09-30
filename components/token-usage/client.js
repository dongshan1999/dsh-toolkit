window.__ModuleLoader__.load({
  id: "@local/token-usage",
  factory(require) {
    const React = require("react")
const CSS = '.tk-root{display:flex;flex-direction:column;gap:14px;padding:18px 20px;overflow:auto;height:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-0)}.tk-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}.tk-title{font-size:13px;color:var(--dsw-alias-label-secondary);margin:0 0 6px}.tk-total{font-size:34px;font-weight:650;color:var(--dsw-alias-label-primary);line-height:1.05}.tk-sub{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:6px}.tk-actions,.tk-flex,.tk-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.tk-summary{display:flex;align-items:center;gap:12px;min-width:320px}.tk-summary-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#34343a;color:#fff;font-size:21px}.tk-summary-side{display:flex;align-items:stretch;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}.tk-summary-stat{padding:9px 15px;min-width:98px}.tk-summary-stat+.tk-summary-stat{border-left:1px solid var(--dsw-alias-border-l1)}.tk-summary-label{font-size:11px;color:var(--dsw-alias-label-secondary);margin-bottom:3px}.tk-summary-value{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}.tk-summary-cost{color:var(--dsw-alias-state-success-primary)}.tk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tk-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:14px 16px}.tk-metric{display:flex;flex-direction:column;gap:6px;min-height:72px;box-sizing:border-box}.tk-metric-label{font-size:12px;color:var(--dsw-alias-label-secondary)}.tk-metric-value{font-size:20px;font-weight:600;color:var(--dsw-alias-label-primary)}.tk-bar{height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin-top:2px}.tk-bar>div{height:100%;background:var(--dsw-alias-state-success-primary)}.tk-section-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);margin:0 0 10px}.tk-table{width:100%;border-collapse:collapse;font-size:12px}.tk-table th{text-align:right;font-weight:500;color:var(--dsw-alias-label-secondary);padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);white-space:nowrap}.tk-table th:first-child,.tk-table td:first-child{text-align:left}.tk-table td{text-align:right;padding:7px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);white-space:nowrap}.tk-row{cursor:pointer}.tk-row:hover td{background:var(--dsw-alias-bg-layer-2)}.tk-name{font-weight:500}.tk-tag{font-size:11px;padding:1px 6px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);margin-left:6px}.tk-btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:6px 11px;font-size:12px;cursor:pointer}.tk-btn:hover{border-color:#8b8b95}.tk-btn-active{background:#34343a!important;color:#f5f5f5!important;border-color:#686873!important}.tk-input,.tk-select{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:6px 9px;font-size:12px;color:var(--dsw-alias-label-primary)}.tk-input{min-width:150px}.tk-detail{padding:10px 12px;background:var(--dsw-alias-bg-layer-2);border-radius:7px;margin-top:4px;overflow:auto}.tk-price-toggle{width:100%;display:flex;justify-content:space-between;align-items:center;background:transparent;border:0;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;font-weight:600;padding:0;cursor:pointer;text-align:left}.tk-price-toggle span:last-child{color:var(--dsw-alias-label-secondary);font-size:16px}.tk-chart{width:100%;height:clamp(250px,30vw,360px);min-height:250px;max-height:360px}.tk-chart svg{display:block;width:100%;height:100%;overflow:visible}.tk-grid-line{stroke:var(--dsw-alias-border-l1);stroke-width:1}.tk-axis-text{fill:var(--dsw-alias-label-secondary);font-size:11px}.tk-area{fill:url(#tk-cache-fill);opacity:.88}.tk-line{fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.tk-point{stroke:var(--dsw-alias-bg-layer-1);stroke-width:1.5}.tk-hover-line{stroke:rgba(255,255,255,.55);stroke-width:1}.tk-tooltip{fill:#25252a;stroke:#8b8b95;stroke-width:1}.tk-tooltip-text{font-size:11px}.tk-axis{position:relative;height:18px;margin-top:6px;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden}.tk-axis span{position:absolute;top:0;line-height:16px}.tk-legend{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:var(--dsw-alias-label-secondary)}.tk-legend-item{display:flex;align-items:center;gap:5px}.tk-legend-dot{width:18px;height:2px;border-radius:2px}.tk-empty{padding:22px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px}.tk-entry{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);border-radius:7px;padding:6px 8px;font:inherit;font-size:13px;cursor:pointer;text-align:left}.tk-entry-dot{width:20px;height:20px;flex:0 0 20px;border-radius:5px;background:var(--dsw-alias-brand-primary);color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center}.tk-entry-label{flex:1;min-width:0}@media(max-width:720px){.tk-grid{grid-template-columns:1fr}.tk-summary{min-width:0;flex-wrap:wrap}.tk-summary-side{width:100%}.tk-summary-stat{flex:1}.tk-total{font-size:30px}}.tk-switching{position:fixed;top:14px;right:18px;z-index:60;display:inline-flex;align-items:center;gap:7px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:99px;padding:5px 12px;font-size:12px;color:var(--dsw-alias-label-primary);box-shadow:0 4px 16px rgba(0,0,0,.22)}.tk-switching::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:tk-pulse 1s ease-in-out infinite}@keyframes tk-pulse{0%,100%{opacity:.25}50%{opacity:1}}.tk-heat{padding-bottom:4px}.tk-heat-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.tk-heat-legend{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--dsw-alias-label-secondary)}.tk-heat-swatch{width:11px;height:11px;border-radius:2px;display:inline-block}.tk-heat-body{display:flex;gap:8px;align-items:stretch;margin-top:12px}.tk-heat-wd{display:grid;grid-template-rows:repeat(7,1fr);gap:3px;width:26px;margin-top:24px;font-size:10px;color:var(--dsw-alias-label-secondary)}.tk-heat-wd span{display:flex;align-items:center;justify-content:flex-end}.tk-heat-main{flex:1;min-width:0}.tk-heat-months{height:18px;margin-bottom:6px;font-size:10px;color:var(--dsw-alias-label-secondary)}.tk-heat-month{white-space:nowrap;overflow:hidden}.tk-heat-cell{width:100%;aspect-ratio:1/1;border-radius:2px;background:#2f2f35}.tk-heat-l1{background:#14532d}.tk-heat-l2{background:#15803d}.tk-heat-l3{background:#22c55e}.tk-heat-l4{background:#4ade80}.tk-heat-tip{position:fixed;z-index:40;pointer-events:none;background:#25252a;border:1px solid #8b8b95;border-radius:8px;padding:8px 10px;font-size:11px;color:#fff;white-space:nowrap}.tk-range{position:relative}.tk-range-btn{display:inline-flex;align-items:center;gap:6px}.tk-range-caret{font-size:9px;opacity:.7}.tk-pop-backdrop{position:fixed;inset:0;z-index:60}.tk-pop{position:absolute;top:calc(100% + 6px);right:0;z-index:61;min-width:246px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:2px;box-shadow:0 12px 32px #0009}.tk-pop-item{border:0;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;font-size:12px;padding:6px 9px;border-radius:6px;cursor:pointer}.tk-pop-item:hover{background:var(--dsw-alias-bg-layer-1)}.tk-pop-item-on{color:var(--dsw-alias-brand-primary);font-weight:600}.tk-pop-sep{height:1px;background:var(--dsw-alias-border-l1);margin:6px 2px}.tk-pop-title{font-size:11px;color:var(--dsw-alias-label-secondary);padding:0 9px 4px}.tk-pop-row{display:flex;align-items:center;gap:6px;padding:0 9px 4px}.tk-pop-label{font-size:11px;color:var(--dsw-alias-label-secondary);flex:0 0 18px}.tk-range-input{flex:1;min-width:0;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:4px 6px;font-size:11px;color:var(--dsw-alias-label-primary);color-scheme:dark}.tk-pop-apply{margin:4px 9px 2px;text-align:center;justify-content:center}.tk-pop-apply:disabled{opacity:.5;cursor:not-allowed}.tk-price-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 2px}.tk-price-form{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin:8px 0}.tk-price-form label{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--dsw-alias-label-secondary)}.tk-price-form label input{width:96px}.tk-price-form label.tk-price-form-wide input{width:170px}.tk-mini-btn{padding:2px 8px;font-size:11px}.tk-price-notice{font-size:12px;margin:6px 0}.tk-price-notice-bad{color:var(--dsw-alias-state-danger-primary,#f43f5e)}.tk-price-syncmeta{font-size:11px;color:var(--dsw-alias-label-secondary)}.tk-price-rate{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--dsw-alias-label-secondary)}'
const PANEL_KEY = 'token-usage'
return {
  inject: ['slots', 'layout', 'timer'],
  apply(ctx) {
    ctx.effect(() => {
      const el = document.createElement("style")
      el.textContent = CSS
      document.head.appendChild(el)
      return () => el.remove()
    }, "token-usage: styles")
    const slots = ctx.slots
    const layout = ctx.layout
    const fetchJson = (url) => fetch(url, { headers: { accept: "application/json" } }).then((response) => {
      if (!response.ok) throw new Error("HTTP " + response.status)
      return response.json()
    })
    const host = {
      call(method, args) {
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(args && typeof args === "object" ? args : {})) {
          if (value !== undefined && value !== null) params.set(key, String(value))
        }
        const suffix = method === "token-usage-pricing" ? "/pricing" : method === "token-usage-summary" ? "/summary" : ""
        const query = params.toString()
        return fetchJson("/api/token-usage" + suffix + (query ? "?" + query : ""))
      },
    }
    const fmtInt = (value) => Number(value || 0).toLocaleString('en-US')
    // ── 货币显示：数据一律美元存储，这里只做显示层换算（¥ = $ × 汇率）──
    const CURRENCY = { mode: 'USD', rate: 7.2 }
    const currencyListeners = new Set()
    const setCurrency = (next) => {
      let changed = false
      if (next.mode !== undefined && next.mode !== CURRENCY.mode) { CURRENCY.mode = next.mode; changed = true }
      if (next.rate !== undefined && Number.isFinite(next.rate) && next.rate > 0 && next.rate !== CURRENCY.rate) { CURRENCY.rate = next.rate; changed = true }
      if (changed) for (const listener of currencyListeners) listener()
    }
    const fmtCost = (value) => {
      const n = Number(value || 0)
      if (CURRENCY.mode === 'CNY') {
        const cny = n * CURRENCY.rate
        if (cny === 0) return '¥0'
        return '¥' + (cny < 0.01 ? cny.toFixed(6) : cny < 0.1 ? cny.toFixed(4) : cny.toFixed(2))
      }
      return n === 0 ? '$0' : '$' + (n < 0.01 ? n.toFixed(6) : n.toFixed(4))
    }
    // 单价显示（计价明细表格）：跟从当前货币换算；录入仍为美元。
    const fmtUnitPrice = (usd) => {
      const n = Number(usd || 0)
      if (CURRENCY.mode === 'CNY') {
        const cny = n * CURRENCY.rate
        return '¥' + (cny === 0 ? '0' : String(Number(cny.toFixed(6))))
      }
      return '$' + (n === 0 ? '0' : String(Number(n.toFixed(6))))
    }
    const fmtTokens = (value) => { const n = Number(value || 0); return n >= 1e8 ? (n / 1e8).toFixed(2) + ' 亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + ' 万' : fmtInt(n) }
    const toLocalInput = (date) => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') + 'T' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0')
    const fmtTime = (value) => { if (!value) return '-'; const d = new Date(value); const p = (n) => String(n).padStart(2, '0'); return p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) }
    const axisTime = (value, range) => { const d = new Date(value); const p = (n) => String(n).padStart(2, '0'); return range === 'today' ? p(d.getHours()) + ':' + p(d.getMinutes()) : p(d.getMonth() + 1) + '/' + p(d.getDate()) }
    const openPanel = () => { if (layout !== undefined) try { layout.selectPanel(PANEL_KEY) } catch (error) {} }
    function useHostCall(method, args, intervalMs) { const [value, setValue] = React.useState(null); React.useEffect(() => { let alive = true; const load = () => host.call(method, args || {}).then((next) => { if (alive) setValue(next) }).catch(() => {}); load(); const stop = ctx.interval(load, intervalMs); return () => { alive = false; stop() } }, [JSON.stringify(args), intervalMs]); return value }
    function metric(label, value, extra) { return React.createElement('div', { className: 'tk-card tk-metric' }, React.createElement('span', { className: 'tk-metric-label' }, label), React.createElement('span', { className: 'tk-metric-value' }, value), extra || null) }
    function modelTable(models) { const labels = ['模型', '请求', '输入', '输出', '缓存读', '缓存写', '总量', '成本', '占比']; const total = models.reduce((sum, item) => sum + (item.cost || 0), 0); const body = models.map((item) => React.createElement('tr', { key: item.model }, React.createElement('td', null, item.displayName || item.model), React.createElement('td', null, fmtInt(item.requests)), React.createElement('td', null, fmtInt(item.input)), React.createElement('td', null, fmtInt(item.output)), React.createElement('td', null, fmtInt(item.cacheRead)), React.createElement('td', null, fmtInt(item.cacheWrite)), React.createElement('td', null, fmtInt(item.loop)), React.createElement('td', null, fmtCost(item.cost)), React.createElement('td', null, total > 0 ? (item.cost / total * 100).toFixed(1) + '%' : '-'))); return React.createElement('div', { className: 'tk-card' }, React.createElement('h3', { className: 'tk-section-title' }, '模型分布'), models.length === 0 ? React.createElement('div', { className: 'tk-empty' }, '暂无记录') : React.createElement('table', { className: 'tk-table' }, React.createElement('thead', null, React.createElement('tr', null, labels.map((label) => React.createElement('th', { key: label }, label)))), React.createElement('tbody', null, body))) }
    function RequestDetail(session) { const rows = (session.calls || []).map((call, index) => React.createElement('tr', { key: index }, React.createElement('td', null, fmtTime(call.time)), React.createElement('td', null, call.model || '-'), React.createElement('td', null, fmtInt(call.input)), React.createElement('td', null, fmtInt(call.output)), React.createElement('td', null, fmtInt(call.cacheRead)), React.createElement('td', null, fmtInt(call.cacheWrite)), React.createElement('td', null, call.priced ? fmtCost(call.cost) : '未配价'))); const labels = ['时间', '模型', '输入', '输出', '缓存命中', '缓存创建', '成本']; return React.createElement('div', { className: 'tk-detail' }, React.createElement('div', { className: 'tk-sub' }, session.cwd || session.id), React.createElement('table', { className: 'tk-table' }, React.createElement('thead', null, React.createElement('tr', null, labels.map((label) => React.createElement('th', { key: label }, label)))), React.createElement('tbody', null, rows))) }
    function RequestTable(sessions, filter, setFilter, origin, setOrigin, expanded, setExpanded) { const needle = filter.trim().toLowerCase(); const visible = sessions.filter((session) => (origin === 'all' || (origin === 'subagent' ? session.origin === 'subagent' : session.origin !== 'subagent')) && (needle.length === 0 || String(session.title || '').toLowerCase().includes(needle) || String(session.id || '').toLowerCase().includes(needle) || String(session.cwd || '').toLowerCase().includes(needle))); const rows = []; for (const session of visible) { rows.push(React.createElement('tr', { className: 'tk-row', key: session.id, onClick: () => setExpanded(expanded === session.id ? null : session.id) }, React.createElement('td', null, React.createElement('span', { className: 'tk-name' }, session.title || session.id), session.origin === 'subagent' ? React.createElement('span', { className: 'tk-tag' }, 'subagent') : null), React.createElement('td', null, fmtInt(session.requests)), React.createElement('td', null, fmtInt(session.input)), React.createElement('td', null, fmtInt(session.output)), React.createElement('td', null, fmtInt(session.cacheRead)), React.createElement('td', null, fmtInt(session.loop)), React.createElement('td', null, fmtCost(session.cost)), React.createElement('td', null, fmtTime(session.updatedAt)))); if (expanded === session.id) rows.push(React.createElement('tr', { key: session.id + '-detail' }, React.createElement('td', { colSpan: 8 }, RequestDetail(session)))) } const labels = ['会话', '请求', '输入', '输出', '缓存命中', '总量', '成本', '最后活动']; return React.createElement('div', { className: 'tk-card' }, React.createElement('div', { className: 'tk-toolbar', style: { justifyContent: 'space-between', marginBottom: '10px' } }, React.createElement('h3', { className: 'tk-section-title', style: { margin: 0 } }, '请求查看'), React.createElement('div', { className: 'tk-toolbar' }, React.createElement('select', { className: 'tk-select', value: origin, onChange: (event) => setOrigin(event.target.value) }, React.createElement('option', { value: 'all' }, '全部来源'), React.createElement('option', { value: 'main' }, '主会话'), React.createElement('option', { value: 'subagent' }, '子会话')), React.createElement('input', { className: 'tk-input', placeholder: '搜索会话 / ID / 路径', value: filter, onChange: (event) => setFilter(event.target.value) }))), visible.length === 0 ? React.createElement('div', { className: 'tk-empty' }, '没有符合条件的请求') : React.createElement('table', { className: 'tk-table' }, React.createElement('thead', null, React.createElement('tr', null, labels.map((label) => React.createElement('th', { key: label }, label)))), React.createElement('tbody', null, rows))) }
    function PriceTable() {
      const [pricing, setPricing] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [form, setForm] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [notice, setNotice] = React.useState(null)
      const [rateDraft, setRateDraft] = React.useState('')
      React.useEffect(() => {
        let alive = true
        const load = () => host.call('token-usage-pricing', {}).then((next) => {
          if (!alive) return
          setPricing(next)
          if (next !== null && typeof next === 'object') setCurrency({ rate: Number(next.exchangeRate) })
        }).catch(() => {})
        load()
        const stop = ctx.interval(load, 60000)
        return () => { alive = false; stop() }
      }, [])
      if (pricing === null || pricing.available !== true) return null
      const post = (body) => {
        setBusy(true)
        setNotice(null)
        fetch('/api/token-usage/pricing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
          .then((response) => response.json())
          .then((result) => {
            setNotice(result !== null && typeof result === 'object' ? result : { ok: false, message: String(result) })
            if (result !== null && typeof result === 'object' && result.ok) setForm(null)
            return host.call('token-usage-pricing', {})
          })
          .then((next) => setPricing(next))
          .catch((error) => setNotice({ ok: false, message: String(error && error.message ? error.message : error) }))
          .finally(() => setBusy(false))
      }
      const syncInfo = pricing.sync || {}
      const syncMeta = syncInfo.lastSyncAt > 0
        ? 'models.dev 上次同步 ' + fmtTime(syncInfo.lastSyncAt) + '（' + fmtInt(syncInfo.lastCount) + ' 条）'
        : '尚未从 models.dev 同步过'
      const sourceText = pricing.source === 'builtin+user'
        ? '来源：内置 ' + fmtInt(pricing.builtin) + ' 条 + 自定义/同步 ' + fmtInt(pricing.overrides) + ' 条'
        : '来源：' + (pricing.sourceLabel || '内置价目')
      const errorText = pricing.error ? '（价目文件读取失败：' + pricing.error + '）' : ''
      const labels = ['模型', '输入', '输出', '缓存命中', '缓存创建', '操作']
      const body = (pricing.entries || []).map((item) => React.createElement('tr', { key: item.modelId },
        React.createElement('td', null, item.displayName || item.modelId),
        React.createElement('td', null, fmtUnitPrice(item.input)),
        React.createElement('td', null, fmtUnitPrice(item.output)),
        React.createElement('td', null, fmtUnitPrice(item.cacheRead)),
        React.createElement('td', null, fmtUnitPrice(item.cacheWrite)),
        React.createElement('td', null,
          React.createElement('span', { className: 'tk-toolbar' },
            React.createElement('button', { className: 'tk-btn tk-mini-btn', disabled: busy, onClick: () => setForm({ modelId: item.modelId, displayName: item.displayName || item.modelId, input: String(item.input ?? 0), output: String(item.output ?? 0), cacheRead: String(item.cacheRead ?? 0), cacheWrite: String(item.cacheWrite ?? 0) }) }, '改'),
            React.createElement('button', { className: 'tk-btn tk-mini-btn', disabled: busy, onClick: () => post({ action: 'delete', modelId: item.modelId }) }, '删')))))
      const saveRate = () => {
        const raw = String(rateDraft).trim()
        const value = Number(raw === '' ? pricing.exchangeRate : raw)
        if (!Number.isFinite(value) || value <= 0) {
          setNotice({ ok: false, message: '汇率无效：需为正数（1 美元兑换的人民币）' })
          return
        }
        setCurrency({ rate: value })
        post({ action: 'rate', usdToCny: value })
      }
      const formField = (label, key, wide) => React.createElement('label', { key, className: wide ? 'tk-price-form-wide' : '' },
        label,
        React.createElement('input', { className: 'tk-input', value: String(form[key] ?? ''), disabled: busy, onChange: (event) => setForm({ ...form, [key]: event.target.value }) }))
      const tools = React.createElement('div', { className: 'tk-price-tools' },
        React.createElement('button', { className: 'tk-btn', disabled: busy, onClick: () => setForm({ modelId: '', displayName: '', input: '0', output: '0', cacheRead: '0', cacheWrite: '0' }) }, '＋ 添加 / 覆盖价格'),
        React.createElement('button', { className: 'tk-btn', disabled: busy, onClick: () => post({ action: 'sync' }) }, busy ? '处理中…' : '⟳ 同步 models.dev'),
        React.createElement('label', { className: 'tk-price-rate' }, '汇率 $→¥',
          React.createElement('input', { className: 'tk-input', value: rateDraft, placeholder: String(pricing.exchangeRate ?? 7.2), disabled: busy, style: { width: '72px' }, onChange: (event) => setRateDraft(event.target.value) })),
        React.createElement('button', { className: 'tk-btn tk-mini-btn', disabled: busy, onClick: saveRate }, '存汇率'),
        React.createElement('span', { className: 'tk-price-syncmeta' }, syncMeta + (syncInfo.lastSyncError ? ' · 上次同步失败：' + syncInfo.lastSyncError : '')))
      const editor = form === null ? null : React.createElement('div', { className: 'tk-price-form' },
        formField('模型 ID', 'modelId', true),
        formField('显示名', 'displayName', true),
        formField('输入 $/M', 'input'),
        formField('输出 $/M', 'output'),
        formField('缓存读 $/M', 'cacheRead'),
        formField('缓存写 $/M', 'cacheWrite'),
        React.createElement('button', { className: 'tk-btn tk-pop-apply', disabled: busy || String(form.modelId).trim() === '', onClick: () => post({ action: 'upsert', entry: form }) }, '保存'),
        React.createElement('button', { className: 'tk-btn', disabled: busy, onClick: () => setForm(null) }, '取消'))
      const noticeBar = notice === null ? null : React.createElement('div', { className: 'tk-price-notice' + (notice.ok ? '' : ' tk-price-notice-bad') }, notice.message)
      return React.createElement('div', { className: 'tk-card' },
        React.createElement('button', { className: 'tk-price-toggle', onClick: () => setOpen(!open), 'aria-expanded': open },
          React.createElement('span', null, '计价明细（每百万 Token）· 共 ' + fmtInt((pricing.entries || []).length) + ' 个模型 · ' + sourceText + errorText),
          React.createElement('span', null, open ? '−' : '+')),
        open ? React.createElement('div', null, tools, editor, noticeBar, React.createElement('table', { className: 'tk-table', style: { marginTop: '12px' } },
          React.createElement('thead', null, React.createElement('tr', null, labels.map((label) => React.createElement('th', { key: label }, label)))),
          React.createElement('tbody', null, body))) : null)
    }
    function smooth(points) { if (points.length === 0) return ''; if (points.length === 1) return 'M ' + points[0].x.toFixed(1) + ' ' + points[0].y.toFixed(1); let d = 'M ' + points[0].x.toFixed(1) + ' ' + points[0].y.toFixed(1); for (let i = 0; i < points.length - 1; i += 1) { const a = points[i]; const b = points[i + 1]; const mid = ((a.x + b.x) / 2).toFixed(1); d += ' C ' + mid + ' ' + a.y.toFixed(1) + ', ' + mid + ' ' + b.y.toFixed(1) + ', ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) } return d }
    function Trend(props) {
      props = props || {}
      const [hover, setHover] = React.useState(null)
      const sessions = props.sessions || []
      const range = props.range || 'today'
      const headerLabel = props.label !== undefined && props.label !== '' ? props.label : (range === 'today' ? '今天' : range === 'all' ? '全部时间' : range)
      const windowEnd = Number(props.end) || Date.now()
      const windowStart = Number(props.start) || 0
      const calls = []
      for (const session of sessions) {
        for (const call of session.calls || []) {
          const time = Number(call.time) || 0
          if (time <= 0) continue
          if (windowStart > 0 && time < windowStart) continue
          if (time > windowEnd) continue
          calls.push(call)
        }
      }
      if (calls.length === 0) {
        return React.createElement('div', { className: 'tk-card' },
          React.createElement('div', { className: 'tk-flex', style: { justifyContent: 'space-between' } },
            React.createElement('h3', { className: 'tk-section-title', style: { margin: 0 } }, '使用趋势'),
            React.createElement('span', { className: 'tk-sub' }, headerLabel)),
          React.createElement('div', { className: 'tk-empty' }, '这段时间还没有用量'))
      }
      let activityFirst = Infinity
      let activityLast = 0
      for (const call of calls) {
        if (call.time < activityFirst) activityFirst = call.time
        if (call.time > activityLast) activityLast = call.time
      }
      const first = activityFirst
      const last = activityLast <= activityFirst ? activityFirst + 60 * 1000 : activityLast
      const duration = Math.max(1, last - first)
      const axisRange = duration <= 36 * 3600 * 1000 ? 'today' : range
      const targetBucket = range === 'today' ? 60 * 1000 : range === '7d' ? 6 * 3600 * 1000 : range === '30d' ? 24 * 3600 * 1000 : range === '90d' ? 3 * 24 * 3600 * 1000 : 12 * 3600 * 1000
      const count = Math.min(96, Math.max(8, Math.round(duration / targetBucket) || 8))
      const span = duration / count
      const buckets = []
      for (let i = 0; i < count; i += 1) buckets.push({ start: first + i * span, end: first + (i + 1) * span, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 })
      for (const call of calls) {
        const index = Math.min(count - 1, Math.max(0, Math.floor((call.time - first) / span)))
        buckets[index].input += call.input || 0
        buckets[index].output += call.output || 0
        buckets[index].cacheRead += call.cacheRead || 0
        buckets[index].cacheWrite += call.cacheWrite || 0
        buckets[index].cost += call.cost || 0
      }
      const used = (bucket) => (bucket.input + bucket.output + bucket.cacheRead + bucket.cacheWrite + bucket.cost) > 0
      let from = 0
      let to = buckets.length - 1
      while (from < to && !used(buckets[from])) from += 1
      while (to > from && !used(buckets[to])) to -= 1
      const view = buckets.slice(from, to + 1)
      if (view.length > 0) {
        const step = view[0].end - view[0].start || span
        view.unshift({ start: view[0].start - step, end: view[0].start, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 })
      }
      const n = view.length
      const width = 760
      const height = 228
      const padLeft = 52
      const padRight = 52
      const padTop = 20
      const padBottom = 28
      const plotWidth = width - padLeft - padRight
      const plotHeight = height - padTop - padBottom
      const tokenMax = Math.max(1, ...view.map((item) => Math.max(item.input, item.output, item.cacheRead, item.cacheWrite))) * 1.12
      const costMax = Math.max(0.000001, ...view.map((item) => item.cost)) * 1.12
      const niceToken = (value) => {
        if (value >= 1e8) return (value / 1e8).toFixed(value >= 1e9 ? 1 : 2) + '亿'
        if (value >= 1e4) return (value / 1e4).toFixed(value >= 1e5 ? 0 : 1) + '万'
        return String(Math.round(value))
      }
      const x = (index) => padLeft + index / Math.max(1, n - 1) * plotWidth
      const clampY = (value) => Math.max(padTop, Math.min(height - padBottom, value))
      const tokenY = (value) => clampY(height - padBottom - value / tokenMax * plotHeight)
      const costY = (value) => clampY(height - padBottom - value / costMax * plotHeight)
      const baseY = height - padBottom
      const spec = [
        { key: 'cacheRead', label: '缓存命中', color: '#c084fc', mapper: tokenY, width: 2.2 },
        { key: 'cacheWrite', label: '缓存创建', color: '#f59e0b', mapper: tokenY },
        { key: 'input', label: '输入', color: '#60a5fa', mapper: tokenY },
        { key: 'output', label: '输出', color: '#4ade80', mapper: tokenY },
        { key: 'cost', label: '成本', color: '#f43f5e', mapper: costY, dash: '5 4' },
      ]
      const seriesPoints = (key, mapper) => {
        const pts = view.map((bucket, index) => ({ x: x(index), y: mapper(bucket[key] || 0), v: bucket[key] || 0 }))
        let b = pts.length - 1
        while (b > 0 && pts[b].v === 0) b -= 1
        return pts.slice(0, b + 1)
      }
      const paths = spec.map((item) => React.createElement('path', {
        key: item.key,
        className: 'tk-line',
        d: smooth(seriesPoints(item.key, item.mapper)),
        stroke: item.color,
        strokeWidth: item.width || 1.6,
        strokeDasharray: item.dash || undefined,
      }))
      const cachePts = seriesPoints('cacheRead', tokenY)
      const area = cachePts.length === 0 ? '' : smooth(cachePts) + ' L ' + cachePts[cachePts.length - 1].x.toFixed(1) + ' ' + baseY.toFixed(1) + ' L ' + cachePts[0].x.toFixed(1) + ' ' + baseY.toFixed(1) + ' Z'
      const ticks = 4
      const grid = []
      const yLabels = []
      const costLabels = []
      for (let i = 0; i <= ticks; i += 1) {
        const gy = padTop + plotHeight * i / ticks
        grid.push(React.createElement('line', { key: 'g' + i, className: 'tk-grid-line', x1: padLeft, x2: width - padRight, y1: gy, y2: gy }))
        yLabels.push(React.createElement('text', { key: 'yl' + i, className: 'tk-axis-text', x: padLeft - 8, y: gy + 3, textAnchor: 'end' }, niceToken(tokenMax * (1 - i / ticks))))
        costLabels.push(React.createElement('text', { key: 'cl' + i, className: 'tk-axis-text', x: width - padRight + 8, y: gy + 3, textAnchor: 'start' }, fmtCost(costMax * (1 - i / ticks))))
      }
      const axisCount = Math.min(12, Math.max(6, Math.round(n / 6)))
      const xLabels = []
      for (let i = 0; i < axisCount; i += 1) {
        const index = axisCount === 1 ? 0 : Math.round(i * (n - 1) / (axisCount - 1))
        const anchor = i === 0 ? 'start' : i === axisCount - 1 ? 'end' : 'middle'
        xLabels.push(React.createElement('text', { key: 'x' + i, className: 'tk-axis-text', x: x(index), y: height - 8, textAnchor: anchor }, axisTime(view[index].start, axisRange)))
      }
      const clip = React.createElement('clipPath', { id: 'tk-trend-clip' }, React.createElement('rect', { x: padLeft, y: padTop, width: plotWidth, height: plotHeight }))
      const activeHover = hover === null || hover < 0 || hover >= n ? null : hover
      let hoverGroup = null
      let tooltip = null
      if (activeHover !== null) {
        const bucket = view[activeHover]
        const hx = x(activeHover)
        hoverGroup = React.createElement('g', { key: 'hover' },
          React.createElement('line', { x1: hx, x2: hx, y1: padTop, y2: height - padBottom, stroke: '#8b8b95', strokeWidth: 1 }),
          spec.map((item) => React.createElement('circle', { key: item.key, className: 'tk-point', cx: hx, cy: item.mapper(view[activeHover][item.key] || 0), r: 3.2, fill: item.color })))
        const boxW = 168
        const boxX = Math.min(width - padRight - boxW, Math.max(padLeft, hx + 10))
        const boxY = padTop + 6
        const rows = [
          ['成本', fmtCost(bucket.cost), '#f43f5e'],
          ['缓存创建', fmtTokens(bucket.cacheWrite), '#f59e0b'],
          ['缓存命中', fmtTokens(bucket.cacheRead), '#a855f7'],
          ['输入', fmtTokens(bucket.input), '#3b82f6'],
          ['输出', fmtTokens(bucket.output), '#22c55e'],
        ]
        tooltip = React.createElement('g', { key: 'tip' },
          React.createElement('rect', { className: 'tk-tooltip', x: boxX, y: boxY, width: boxW, height: 108, rx: 8 }),
          React.createElement('text', { className: 'tk-tooltip-text', fill: '#fff', x: boxX + 12, y: boxY + 18, fontSize: 11 }, fmtTime(bucket.start)),
          rows.map((row, index) => React.createElement('g', { key: row[0] },
            React.createElement('circle', { cx: boxX + 16, cy: boxY + 36 + index * 14, r: 3.5, fill: row[2] }),
            React.createElement('text', { className: 'tk-tooltip-text', fill: '#ddd', x: boxX + 26, y: boxY + 40 + index * 14 }, row[0] + ': ' + row[1]))))
      }
      const legend = spec.map((item) => React.createElement('span', { className: 'tk-legend-item', key: item.key },
        React.createElement('span', { style: { width: 8, height: 8, borderRadius: 99, background: item.color, display: 'inline-block' } }),
        item.label))
      const move = (event) => {
        const node = event.currentTarget
        const rect = node.getBoundingClientRect()
        const plotStart = rect.left + padLeft / width * rect.width
        const plotSize = plotWidth / width * rect.width
        const ratio = plotSize > 0 ? (event.clientX - plotStart) / plotSize : 0
        const index = Math.min(n - 1, Math.max(0, Math.round(Math.max(0, Math.min(1, ratio)) * (n - 1))))
        setHover(index)
      }
      return React.createElement('div', { className: 'tk-card' },
        React.createElement('div', { className: 'tk-flex', style: { justifyContent: 'space-between' } },
          React.createElement('h3', { className: 'tk-section-title', style: { margin: 0 } }, '使用趋势'),
          React.createElement('span', { className: 'tk-sub' }, headerLabel)),
        React.createElement('div', { className: 'tk-chart' },
          React.createElement('svg', { viewBox: '0 0 760 228', preserveAspectRatio: 'none', role: 'img', 'aria-label': 'Token 与成本趋势图', onMouseMove: move, onMouseLeave: () => setHover(null) },
            React.createElement('defs', null,
              React.createElement('linearGradient', { id: 'tk-cache-fill', x1: '0', y1: '0', x2: '0', y2: '1' },
                React.createElement('stop', { offset: '0%', stopColor: '#a855f7', stopOpacity: '.22' }),
                React.createElement('stop', { offset: '100%', stopColor: '#a855f7', stopOpacity: '0' })),
              clip),
            React.createElement('g', { clipPath: 'url(#tk-trend-clip)' }, grid, React.createElement('path', { className: 'tk-area', d: area }), paths),
            hoverGroup, yLabels, costLabels, xLabels, tooltip)),
        React.createElement('div', { className: 'tk-legend' }, legend))
    }
    

    function ActivityHeatmap() {
      const [data, setData] = React.useState(null)
      const [tip, setTip] = React.useState(null)
      React.useEffect(() => {
        let alive = true
        fetch('/api/token-usage/activity', { headers: { accept: 'application/json' } })
          .then((response) => { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json() })
          .then((next) => { if (alive) setData(next) })
          .catch(() => { if (alive) setData({ days: [], activeDays: 0, error: true }) })
        return () => { alive = false }
      }, [])
      if (data === null) {
        return React.createElement('div', { className: 'tk-card' }, React.createElement('div', { className: 'tk-empty' }, '正在统计近一年活跃度…'))
      }
      const days = Array.isArray(data.days) ? data.days : []
      const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
      const levelOf = (requests) => requests <= 0 ? 0 : requests === 1 ? 1 : requests <= 4 ? 2 : requests <= 9 ? 3 : 4
      const cols = []
      for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7))
      const total = cols.length
      if (total === 0) {
        return React.createElement('div', { className: 'tk-card' },
          React.createElement('h3', { className: 'tk-section-title', style: { margin: 0 } }, '活跃度'),
          React.createElement('div', { className: 'tk-empty' }, '暂无活跃度数据'))
      }
      const marks = []
      let last = -1
      cols.forEach((col, index) => {
        const first = col.find((day) => day && day.date)
        if (!first) return
        const month = Number(first.date.slice(5, 7))
        if (month === last) return
        last = month
        marks.push({ start: index, label: months[month - 1] })
      })
      const monthStyle = { display: 'grid', gap: '3px', gridTemplateColumns: 'repeat(' + total + ', minmax(0, 1fr))' }
      const gridStyle = { display: 'grid', gap: '3px', gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, auto)', gridAutoColumns: 'minmax(0, 1fr)' }
      const monthCells = marks.map((mark, index) => React.createElement('span', {
        key: mark.start,
        className: 'tk-heat-month',
        style: { gridColumn: (mark.start + 1) + ' / ' + ((index + 1 < marks.length ? marks[index + 1].start : total) + 1) },
      }, mark.label))
      const cells = []
      cols.forEach((col, c) => {
        for (let r = 0; r < 7; r += 1) {
          const day = col[r]
          const key = 'c' + c + 'r' + r
          if (!day || !day.date) {
            cells.push(React.createElement('div', { key, className: 'tk-heat-cell', style: { visibility: 'hidden' } }))
            continue
          }
          const level = levelOf(day.requests)
          cells.push(React.createElement('div', {
            key,
            className: 'tk-heat-cell' + (level ? ' tk-heat-l' + level : ''),
            onMouseEnter: (event) => setTip({ x: event.clientX, y: event.clientY, day }),
            onMouseMove: (event) => setTip({ x: event.clientX, y: event.clientY, day }),
            onMouseLeave: () => setTip(null),
          }))
        }
      })
      const swatches = [0, 1, 2, 3, 4].map((level) => React.createElement('span', {
        key: level,
        className: 'tk-heat-swatch' + (level ? ' tk-heat-l' + level : ''),
        style: level ? undefined : { background: '#2f2f35' },
      }))
      const rangeLabel = days.length >= 2 && days[0].date && days[days.length - 1].date
        ? days[0].date + ' – ' + days[days.length - 1].date
        : ''
      const tooltip = tip ? React.createElement('div', { className: 'tk-heat-tip', style: { left: tip.x + 12, top: tip.y + 12 } },
        React.createElement('div', null, tip.day.date),
        React.createElement('div', null, (tip.day.requests || 0) + ' 次请求 · ' + fmtTokens(tip.day.tokens || 0) + ' tokens')) : null
      return React.createElement('div', { className: 'tk-card' },
        React.createElement('div', { className: 'tk-heat-top' },
          React.createElement('div', null,
            React.createElement('h3', { className: 'tk-section-title', style: { margin: 0 } }, '活跃度'),
            React.createElement('div', { className: 'tk-sub' }, '近1年 · ' + (data.activeDays || 0) + ' 个活跃日')),
          React.createElement('div', { className: 'tk-heat-legend' },
            React.createElement('span', null, rangeLabel),
            React.createElement('span', null, '少'), swatches, React.createElement('span', null, '多'))),
        React.createElement('div', { className: 'tk-heat' },
          React.createElement('div', { className: 'tk-heat-body' },
            React.createElement('div', { className: 'tk-heat-wd' },
              React.createElement('span', { style: { gridRow: 1 } }, '周一'),
              React.createElement('span', { style: { gridRow: 3 } }, '周三'),
              React.createElement('span', { style: { gridRow: 5 } }, '周五')),
            React.createElement('div', { className: 'tk-heat-main' },
              React.createElement('div', { className: 'tk-heat-months', style: monthStyle }, monthCells),
              React.createElement('div', { className: 'tk-heat-cols', style: gridStyle }, cells)))),
        tooltip)
    }
    
function Panel() { const [state, setState] = React.useState({ loading: true, data: null, error: null }); const [range, setRange] = React.useState('today'); const [filter, setFilter] = React.useState(''); const [origin, setOrigin] = React.useState('all'); const [expanded, setExpanded] = React.useState(null); const [pending, setPending] = React.useState(false); const requestSeq = React.useRef(0); const ranges = { today: '今天', '7d': '7 天', '30d': '30 天', '90d': '90 天', all: '全部' }; const [customStart, setCustomStart] = React.useState(() => toLocalInput(new Date(new Date().setHours(0, 0, 0, 0)))); const [customEnd, setCustomEnd] = React.useState(() => toLocalInput(new Date())); const [rangeOpen, setRangeOpen] = React.useState(false); const [currencyTick, setCurrencyTick] = React.useState(0); React.useEffect(() => { const listener = () => setCurrencyTick((tick) => tick + 1); currencyListeners.add(listener); return () => { currencyListeners.delete(listener) } }, []); const currencyLabel = CURRENCY.mode === 'CNY' ? '¥ 人民币' : '$ 美元'; const customValid = customStart !== '' && customEnd !== '' && new Date(customEnd).getTime() > new Date(customStart).getTime(); const query = range === 'custom' ? { range: 'custom', start: new Date(customStart).getTime(), end: new Date(customEnd).getTime() } : { range }; const rangeText = range === 'custom' ? (customStart.slice(5, 10).replace('-', '/') + ' ' + customStart.slice(11, 16) + ' – ' + customEnd.slice(5, 10).replace('-', '/') + ' ' + customEnd.slice(11, 16)) : ranges[range]; const rangeKey = JSON.stringify(query); React.useEffect(() => { let alive = true; const load = (force, showPending) => { if (showPending) setPending(true); const seq = ++requestSeq.current; return host.call('token-usage', { ...query, force: force === true }).then((data) => { if (alive && seq === requestSeq.current) setState({ loading: false, data, error: null }) }).catch((error) => { if (alive && seq === requestSeq.current) setState({ loading: false, data: null, error: String(error && error.message ? error.message : error) }) }).finally(() => { if (alive && seq === requestSeq.current) setPending(false) }) }; load(false, true); const stop = ctx.interval(() => load(false), 15000); return () => { alive = false; stop() } }, [rangeKey]); if (state.loading && state.data === null) return React.createElement('div', { className: 'tk-root' }, React.createElement('div', { className: 'tk-empty' }, '正在统计今天的会话用量…')); if (state.data === null) return React.createElement('div', { className: 'tk-root' }, React.createElement('div', { className: 'tk-card' }, React.createElement('div', { className: 'tk-empty' }, '读取失败：' + (state.error || 'unknown')))); const data = state.data; const totals = data.totals || {}; const base = (totals.input || 0) + (totals.cacheRead || 0) + (totals.cacheWrite || 0); const hit = base > 0 ? (totals.cacheRead || 0) / base * 100 : 0; const buttons = React.createElement('div', { className: 'tk-range' }, React.createElement('button', { className: 'tk-btn tk-range-btn', onClick: () => setRangeOpen(!rangeOpen), 'aria-expanded': rangeOpen, 'aria-haspopup': 'true' }, rangeText, React.createElement('span', { className: 'tk-range-caret' }, '▾')), rangeOpen ? React.createElement('div', { className: 'tk-pop-backdrop', onClick: () => setRangeOpen(false) }) : null, rangeOpen ? React.createElement('div', { className: 'tk-pop' }, ['today', '7d', '30d', '90d', 'all'].map((key) => React.createElement('button', { key, className: range === key ? 'tk-pop-item tk-pop-item-on' : 'tk-pop-item', onClick: () => { setRange(key); setRangeOpen(false) } }, ranges[key])), React.createElement('div', { className: 'tk-pop-sep' }), React.createElement('div', { className: 'tk-pop-title' }, '自定义时间段'), React.createElement('div', { className: 'tk-pop-row' }, React.createElement('span', { className: 'tk-pop-label' }, '从'), React.createElement('input', { className: 'tk-range-input', type: 'datetime-local', value: customStart, onChange: (event) => setCustomStart(event.target.value) })), React.createElement('div', { className: 'tk-pop-row' }, React.createElement('span', { className: 'tk-pop-label' }, '到'), React.createElement('input', { className: 'tk-range-input', type: 'datetime-local', value: customEnd, onChange: (event) => setCustomEnd(event.target.value) })), React.createElement('button', { className: 'tk-btn tk-pop-apply', disabled: !customValid, onClick: () => { setRange('custom'); setRangeOpen(false) } }, '应用自定义范围')) : null); const summary = React.createElement('div', { className: 'tk-summary' }, React.createElement('div', { className: 'tk-summary-icon' }, 'ϟ'), React.createElement('div', null, React.createElement('div', { className: 'tk-title' }, '真实消耗 Tokens'), React.createElement('div', { className: 'tk-total' }, fmtInt(totals.loop)), React.createElement('div', { className: 'tk-sub' }, '≈ ' + fmtTokens(totals.loop))), React.createElement('div', { className: 'tk-summary-side' }, React.createElement('div', { className: 'tk-summary-stat' }, React.createElement('div', { className: 'tk-summary-label' }, '总请求数'), React.createElement('div', { className: 'tk-summary-value' }, fmtInt(totals.requests))), React.createElement('div', { className: 'tk-summary-stat' }, React.createElement('div', { className: 'tk-summary-label' }, '总成本'), React.createElement('div', { className: 'tk-summary-value tk-summary-cost' }, fmtCost(totals.cost))))); const header = React.createElement('div', { className: 'tk-head' }, summary, React.createElement('div', { className: 'tk-actions' }, buttons, React.createElement('button', { className: 'tk-btn', title: '切换成本显示货币（数据仍按美元存储）', onClick: () => setCurrency({ mode: CURRENCY.mode === 'CNY' ? 'USD' : 'CNY' }) }, currencyLabel), React.createElement('button', { className: 'tk-btn', onClick: () => host.call('token-usage', { ...query, force: true }).then((next) => setState({ loading: false, data: next, error: null })).catch(() => {}) }, '刷新'))); const metrics = React.createElement('div', { className: 'tk-grid' }, metric('新增输入', fmtInt(totals.input)), metric('输出', fmtInt(totals.output)), metric('缓存创建', fmtInt(totals.cacheWrite)), metric('缓存命中', fmtInt(totals.cacheRead)), metric('推理', fmtInt(totals.reasoning)), metric('缓存命中率', hit.toFixed(1) + '%', React.createElement('div', { className: 'tk-bar' }, React.createElement('div', { style: { width: Math.min(100, hit).toFixed(1) + '%' } })))); return React.createElement('div', { className: 'tk-root' }, pending && React.createElement('div', { className: 'tk-switching' }, '切换中…'), header, metrics, React.createElement(ActivityHeatmap), modelTable(data.models || []), React.createElement(Trend, { sessions: data.sessions || [], range: data.range || range, label: range === 'custom' ? rangeText : '', start: data.start, end: data.end }), RequestTable(data.sessions || [], filter, setFilter, origin, setOrigin, expanded, setExpanded), React.createElement(PriceTable)) }
    function panelGlyph(size) { const edge = typeof size === 'number' && size > 0 ? size : 16; return React.createElement('span', { className: 'tk-entry-dot', style: { width: edge + 'px', height: edge + 'px' } }, 'T') }
    if (slots === undefined) return
    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, Panel))
    slots.inject('sidebar.panellist', () => slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, label: 'Token 用量', order: 50 }, (props) => panelGlyph(props !== null && typeof props === 'object' ? props.size : 16)))
  },
}
  },
})
