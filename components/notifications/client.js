window.__ModuleLoader__.load({
  id: "@local/notifications",
  factory(require) {
    const React = require("react")
// 本组件不做任何站内提醒：没有浮层 toast，也不注册 shell.overlay。
// 提醒一律交给操作系统通知中心（渲染进程的 Notification，Electron 会把它
// 交给系统，署名是 DSH 应用本体）。原因是站内 toast 有三个绕不过去的毛病：
//   1. 它只在 DSH 窗口看得见时存在，切到别的 app 就等于没提醒；
//   2. `shell.overlay` 的容器是 `position:absolute; inset:0; z-index:20;
//      overflow:hidden`，聊天区内部用到 z-index:1100，很容易被盖住；
//   3. 用户明确要求「应用内部不要提醒，只要系统通知」。
// 面板（sidebar 里的「通知」）仍然保留：它是历史记录，不主动弹任何东西。
//
// 信息排版（用户指定）：标题是「谁」——工作区 / 会话名；正文第一段是「为什么」
// ——哪个场景触发的（会话完成、需要权限…），后面才是细节。所以 item.title 是
// 标题、item.status 是场景 label、item.body 是明细，这里组装给系统通知。
//
// 点击通知会跳回对应会话（`uiWorkspace.openSession`），并关闭这条通知。
// 找不到会话（会话已删、Host 没给 id）时退化成「只关闭」。
const CSS = '.nf-root{position:relative;display:flex;flex-direction:column;gap:14px;padding:18px 20px 12px;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;min-height:0;background:var(--dsw-alias-bg-layer-0)}.nf-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;flex:none}.nf-title{margin:0;font-size:18px;font-weight:650;color:var(--dsw-alias-label-primary)}.nf-sub{margin-top:6px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);max-width:640px}.nf-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.nf-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;font-size:12px;line-height:1.6;border-radius:6px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.nf-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.nf-btn:disabled{opacity:.5;cursor:default}.nf-btn-on{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.nf-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600}.nf-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;flex:none}.nf-stat{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:10px 12px}.nf-stat-label{font-size:11px;color:var(--dsw-alias-label-secondary)}.nf-stat-value{font-size:19px;font-weight:650;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;margin-top:3px}.nf-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;overflow:hidden;flex:none}.nf-card-head{display:flex;align-items:center;gap:10px;padding:10px 12px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}.nf-list{display:flex;flex-direction:column}.nf-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;cursor:pointer;min-width:0}.nf-item+.nf-item{border-top:1px solid var(--dsw-alias-border-l2)}.nf-item:hover{background:var(--dsw-alias-interactive-bg-hover)}.nf-item-read{opacity:.62}.nf-dot{flex:none;width:7px;height:7px;margin-top:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}.nf-kind-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}.nf-lv-info{background:var(--dsw-alias-state-success-primary)}.nf-lv-warning{background:var(--dsw-alias-state-warn-primary)}.nf-lv-error{background:var(--dsw-alias-state-error-primary)}.nf-lv-action{background:var(--dsw-alias-brand-primary)}.nf-lv-success{background:var(--dsw-alias-state-success-primary)}.nf-lv-approval{background:var(--dsw-alias-state-warn-primary)}.nf-lv-question{background:var(--dsw-alias-brand-primary)}.nf-tone-label{font-weight:600}.nf-tone-success{color:var(--dsw-alias-state-success-primary)}.nf-tone-approval{color:var(--dsw-alias-state-warn-primary)}.nf-tone-failure{color:var(--dsw-alias-state-error-primary)}.nf-tone-question{color:var(--dsw-alias-brand-primary)}.nf-tone-warning{color:var(--dsw-alias-state-warn-primary)}.nf-item-main{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1 1 auto}.nf-item-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);min-width:0}.nf-item-body{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}.nf-item-detail{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}.nf-item-meta{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--dsw-alias-label-tertiary);flex-wrap:wrap}.nf-tag{flex:none;display:inline-flex;align-items:center;padding:0 6px;font-size:10px;line-height:1.7;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-weight:600}.nf-warn{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:9px;border:1px solid var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-bg-layer-1);font-size:12px;line-height:1.6;color:var(--dsw-alias-label-primary);flex:none}.nf-jump{flex:none;padding:0 6px;font-size:10px;line-height:1.7;border-radius:6px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}.nf-jump:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.nf-count{flex:none;display:inline-flex;align-items:center;padding:0 5px;font-size:10px;line-height:1.7;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}.nf-kind-row{display:flex;align-items:center;gap:10px;padding:7px 12px;font-size:12px}.nf-kind-row+.nf-kind-row{border-top:1px solid var(--dsw-alias-border-l2)}.nf-kind-icon{flex:none;font-size:12px;line-height:1}.nf-kind-label{color:var(--dsw-alias-label-primary);flex:none;min-width:96px}.nf-kind-hint{color:var(--dsw-alias-label-tertiary);flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nf-empty{padding:14px;font-size:12px;color:var(--dsw-alias-label-secondary)}.nf-msg{margin-top:2px;font-size:12px;line-height:1.5;word-break:break-all}.nf-msg-ok{color:var(--dsw-alias-state-success-primary)}.nf-msg-err{color:var(--dsw-alias-state-error-primary)}.nf-path{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;flex:none}.nf-entry-dot{display:inline-flex;align-items:center;justify-content:center;border-radius:5px;font-size:10px;font-weight:700;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}.nf-switch{flex:none;display:inline-flex;align-items:center;justify-content:center;width:34px;height:19px;padding:0;border-radius:999px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);position:relative}.nf-switch::after{content:"";width:13px;height:13px;border-radius:50%;background:var(--dsw-alias-label-tertiary);transition:transform .16s ease}.nf-switch-on{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary)}.nf-switch-on::after{transform:translateX(7px);background:var(--dsw-alias-bg-base)}'
const PANEL_KEY = 'notifications'
// 两档轮询，各管一件事：
//   POLL_MS      弹通知的心跳。只问「有没有比 lastSeq 新的条目」（light=1 增量，
//                响应通常几十字节），所以可以很密 —— 之前 8 秒一次拉全量，
//                最坏要等到 8 秒后系统通知才出来，这就是「回调有点慢」的来源。
//   FULL_POLL_MS 全量快照。列表、未读计数、配置都在里面，几百条上百 KB，
//                保持原来的节奏即可。
const POLL_MS = 1500
const FULL_POLL_MS = 8000
// 同一会话、同一场景的「成功」类通知，一分钟内只弹第一条，后面的只进面板。
// 长任务连着跑好几轮时，「会话完成」会一条接一条地弹，吵得没法看。
// 只合并 level === 'info'（会话完成 / 子智能体完成）；审批、提问、失败、警告
// 一律不合并 —— 那些是需要用户真的动手或多看一眼的。
const THROTTLE_MS = 60000
const LEVEL_LABEL = { info: '信息', warning: '警告', error: '错误', action: '待处理' }
const LEVEL_CLASS = { info: 'nf-lv-info', warning: 'nf-lv-warning', error: 'nf-lv-error', action: 'nf-lv-action' }
// 面板要一眼分出「成功 / 待审批 / 待回答 / 失败」：level 只有 info/warning/error/action 四档，
// 而 action 里同时装着审批和提问，所以按场景 id 再细分一层色调。只影响显示，Host 的推送策略不变。
const KIND_TONE = {
  'turn-completed': 'success',
  'subagent-completed': 'success',
  'approval-required': 'approval',
  'plan-review': 'approval',
  'question-required': 'question',
}
const TONE_LABEL = { success: '成功', approval: '待审批', failure: '失败', question: '待回答', warning: '警告', info: '信息' }
// 系统通知标题前的圆点。Host 会在条目 / 场景上给 icon，但那个字段是后加的：
// 宿主还没重启（跑旧入口）时条目里没有 icon，若只认 item.icon 就会退化成
// 清一色「⚪」，看着像没分类。所以前端按同一套色调自己兜底。
const TONE_ICON = { success: '🟢', approval: '🟠', question: '🔵', failure: '🔴', warning: '🟡', info: '⚪' }
const TONE_CLASS = {
  success: 'nf-lv-success',
  approval: 'nf-lv-approval',
  failure: 'nf-lv-error',
  question: 'nf-lv-question',
  warning: 'nf-lv-warning',
  info: 'nf-lv-info',
}
const EMPTY_PAGE = { loading: true, data: null, error: null }
const PERM_LABEL = { granted: '系统通知已开', denied: '系统通知被拒绝', default: '开启系统通知', unsupported: '此环境不支持系统通知' }
/** Host 侧探测到的系统通知通道名。 */
const NATIVE_LABEL = { osascript: 'macOS 通知中心', 'notify-send': 'Linux 通知中心', none: '不可用' }
return {
  inject: ['slots', 'timer'],
  apply(ctx) {
    ctx.effect(() => {
      const el = document.createElement("style")
      el.textContent = CSS
      document.head.appendChild(el)
      return () => el.remove()
    }, "notifications: styles")

    const slots = ctx.slots

    const fetchJson = (url, init) => fetch(url, {
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      cache: 'no-store',
      ...init,
    }).then((response) => response.json().catch(() => null).then((body) => {
      const failure = body !== null && typeof body === 'object' && typeof body.message === 'string' && body.message !== ''
        ? body.message
        : 'HTTP ' + response.status
      if (!response.ok || body === null || typeof body !== 'object' || body.ok !== true) throw new Error(failure)
      return body
    }))
    const load = () => fetchJson('/api/notifications')
    /** 轻量增量：只回「比 seq 新」的条目，心跳专用。 */
    const loadLight = (seq) => fetchJson('/api/notifications?light=1&seq=' + encodeURIComponent(String(seq)))
    const act = (action, extra) => fetchJson('/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ action, ...(extra === undefined ? {} : extra) }),
    })

    // ── 共享数据源 ──────────────────────────────────────────────
    // 面板和 toast 都要同一份通知列表，但只能有一个轮询器，否则同一条通知
    // 会被拉两次、系统通知也会弹两次。所以这里做一个极小的 store：
    // apply 里起唯一的定时器，两个 React 组件订阅它。
    const store = { page: null, listeners: new Set() }
    function publish(page) {
      store.page = page
      for (const listener of Array.from(store.listeners)) {
        try { listener(page) } catch { /* 单个组件渲染异常不能拖垮轮询 */ }
      }
    }
    function subscribe(listener) {
      store.listeners.add(listener)
      return () => { store.listeners.delete(listener) }
    }
    // 增量心跳的水位线：条目 id 形如 `n285`，只比其中的序号。
    // -1 = 还没拿到全量快照，此时不发心跳（否则历史记录会被当成新通知）。
    let lastSeq = -1
    // 提示音开关在 config 里，只有全量快照带；心跳响应不带，这里缓存一份。
    let soundOn = true
    const soundOf = (config) => (config !== null && typeof config === 'object'
      && config.native !== null && typeof config.native === 'object' && config.native.sound === false) ? false : true
    let requestSeq = 0
    function refresh() {
      const seq = ++requestSeq
      load().then((data) => {
        // 迟到的响应不能覆盖新数据，否则「刚标记已读」会被旧快照打回去。
        if (seq !== requestSeq) return
        if (typeof data.seq === 'number' && data.seq > lastSeq) lastSeq = data.seq
        soundOn = soundOf(data.config)
        publish({ loading: false, data, error: null })
      }, (cause) => {
        if (seq !== requestSeq) return
        const message = cause !== null && typeof cause === 'object' && typeof cause.message === 'string' ? cause.message : String(cause)
        publish({ loading: false, data: store.page !== null ? store.page.data : null, error: message })
      })
    }
    refresh()
    // `timer` 是硬依赖（在 inject 里声明），但应用加载早期它可能还没就位；
    // 没有定时器就退化成「只在面板打开时拉一次」，不能让整个插件起不来。
    if (typeof ctx.interval === 'function') {
      ctx.interval(poll, POLL_MS)
      ctx.interval(refresh, FULL_POLL_MS)
    }

    // ── 系统通知 ────────────────────────────────────────────────
    const supported = () => typeof Notification !== 'undefined'
    const permission = () => (supported() ? Notification.permission : 'unsupported')
    /**
     * 系统通知：本插件唯一的提醒通道。
     * 在 DSH desktop（Electron）里，渲染进程的 Notification 由主进程转交给操作
     * 系统，署名是 DSH 应用本体；在普通浏览器里就是标准的 Web Notification。
     *
     * 三个选项合起来才是用户要的「停留，等我自己关掉」：
     *   requireInteraction: true —— Web 标准，保持可见直到用户交互；
     *   timeoutType: 'never'    —— Electron 专有（macOS / Windows 生效），不自动消失；
     *   silent                  —— 由面板上的「提示音」开关控制。
     * 只设 requireInteraction 在某些 Chromium 版本上仍会被系统样式降级成横幅，
     * 两个都写才是稳的。
     */
    function notify(item, sound) {
      if (!supported()) return false
      // 只有「明确被拒绝」才放弃。'default' 还要试：Electron 主进程对非 media
      // 权限一律放行，requestPermission() 是异步的，等它 resolve 再弹会把启动
      // 头几秒的通知全丢掉。
      if (Notification.permission === 'denied') return false
      // 标题 = 图标 + 谁（工作区 / 会话），正文第一行 = 为什么（场景），第二行才是明细。
      // 通知中心里能一眼看到的只有标题和一两行正文，顺序反了就没用了。
      // 系统通知不允许自定义颜色，四类只能在标题前带一个图标（Host 在条目上给了 icon）：
      // 🟢 成功 / 🟠 待审批 / 🔵 待回答 / 🔴 失败 / 🟡 警告。
      // Host 没给（旧入口跑着 / 字段还没落地）时按场景色调自己推，别退化成白点。
      const icon = (typeof item.icon === 'string' && item.icon !== ''
        ? item.icon
        : TONE_ICON[toneOf(item)] || '⚪') + ' '
      const base = typeof item.title === 'string' && item.title !== '' ? item.title : 'DSH'
      const title = icon + base
      const status = typeof item.status === 'string' && item.status !== '' ? item.status : ''
      const detail = typeof item.body === 'string' && item.body !== '' ? item.body : ''
      const body = status === '' ? detail : detail === '' ? status : status + ' · ' + detail
      try {
        const note = new Notification(title, {
          body,
          tag: item.id,
          requireInteraction: true,
          timeoutType: 'never',
          silent: sound !== true,
        })
        // 标已读只发一次：onclick 里 note.close() 会再触发 onclose，
        // 幂等但白白多发一个请求，用 flagged 挡掉。
        let readSent = false
        const markItemRead = () => {
          if (readSent) return
          readSent = true
          act('read', { ids: [item.id] }).catch(() => {})
        }
        // 点击 → 标已读 → 跳到那条通知对应的会话，然后关掉通知本身。
        // openSession 找不到会话时会自己报错，这里吞掉：最差退化成「只关闭」。
        note.onclick = () => {
          markItemRead()
          openSession(item.sessionId)
          try { note.close() } catch { /* 系统已经关掉了 */ }
        }
        // 用户手动关掉通知（点 ×、从通知中心清除）也算已读——
        // 他已经看到了，面板里不该再亮着未读。
        note.onclose = () => {
          markItemRead()
        }
        return true
      } catch {
        return false
      }
    }

    // 「点击通知」的落点。uiWorkspace.openSession(target) 接受 SessionId（或
    // SubagentAddress），正好是通知条目里的 sessionId。服务没装/会话不存在时
    // 静默失败——通知该关还是要关。
    function openSession(sessionId) {
      const id = typeof sessionId === 'string' ? sessionId.trim() : ''
      if (id === '') return false
      let workspace = null
      try {
        workspace = typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : ctx.uiWorkspace
      } catch { workspace = null }
      if (workspace === null || workspace === undefined || typeof workspace.openSession !== 'function') return false
      try {
        workspace.openSession(id)
        return true
      } catch {
        return false
      }
    }

    // 新通知 → 弹系统通知。放在 apply 里而不是某个 React 组件里：面板没被打开
    // 时也必须能提醒（React 组件只有被渲染时才存在）。
    const notified = { ids: [] }
    // 同一会话同一场景的节流表：key = 场景 + 会话，value = 上次弹的时间。
    const throttled = new Map()
    // 用户此刻正在看的会话。由 session 作用域的 FocusTracker 回报，空串表示
    // 「不知道 / 不在任何会话里」。
    const view = { sessionId: '' }
    const windowFocused = () => {
      if (typeof document !== 'undefined' && typeof document.hasFocus === 'function') {
        try { return document.hasFocus() === true } catch { return true }
      }
      return true
    }
    const infoLevel = (item) => item !== null && typeof item === 'object' && item.level === 'info'
    const sessionOf = (item) => (item !== null && typeof item === 'object' && typeof item.sessionId === 'string' ? item.sessionId : '')
    /**
     * 该不该为这条通知打扰用户。两个理由成立就静默：
     *   1. 你正盯着这个会话（窗口有焦点、会话 id 一致）—— 结果就在眼前，再弹
     *      一次系统通知纯属噪音。审批 / 提问 / 失败不受影响：那些要人动手。
     *   2. 同一会话同一场景的「成功」类通知，一分钟内已经弹过一次。
     * 同一条通知（同 id）不重复弹由 deliver() 的 notified 表保证。
     */
    function quiet(item) {
      if (!infoLevel(item)) return false
      const sessionId = sessionOf(item)
      if (sessionId !== '' && sessionId === view.sessionId && windowFocused()) return true
      const key = String(item.kind) + '\u0000' + sessionId
      const now = Date.now()
      const last = throttled.get(key)
      if (typeof last === 'number' && now - last < THROTTLE_MS) return true
      throttled.set(key, now)
      if (throttled.size > 200) {
        for (const [entry, at] of throttled) if (now - at >= THROTTLE_MS) throttled.delete(entry)
      }
      return false
    }
    /** 唯一的弹通知入口：去重 → 静默判定 → 真的弹。 */
    function deliver(item) {
      if (item === null || typeof item !== 'object') return false
      if (item.read === true) return false
      const id = typeof item.id === 'string' ? item.id : ''
      if (id === '') return false
      if (notified.ids.indexOf(id) !== -1) return false
      notified.ids.push(id)
      if (notified.ids.length > 300) notified.ids.splice(0, notified.ids.length - 300)
      if (quiet(item)) return false
      return notify(item, soundOn)
    }
    /** items 倒序（最新在前），反过来按时间顺序弹，否则多条同时到达时会乱序。 */
    function deliverAll(items) {
      for (let index = items.length - 1; index >= 0; index -= 1) deliver(items[index])
    }
    let notifyReady = false
    const watch = (page) => {
      const data = page !== null && page.data !== null && typeof page.data === 'object' ? page.data : null
      if (data === null || !Array.isArray(data.items)) return
      if (notifyReady === false) {
        // 首帧拿到的是历史记录（可能几百条），全部记成「已提醒」并埋进节流表，
        // 绝不补弹。
        notifyReady = true
        for (const item of data.items) {
          if (typeof item.id === 'string') notified.ids.push(item.id)
          if (infoLevel(item)) throttled.set(String(item.kind) + '\u0000' + sessionOf(item), Number(item.createdAt) || 0)
        }
        if (notified.ids.length > 300) notified.ids.splice(0, notified.ids.length - 300)
        return
      }
      deliverAll(data.items)
    }
    subscribe(watch)
    /**
     * 心跳：只问「有没有比 lastSeq 新的条目」，有新条目才弹。轻量响应通常几十
     * 字节，所以可以 1.5 秒一次 —— 会话一跑完，最多 1.5 秒系统通知就出来。
     */
    let polling = false
    function poll() {
      if (polling || lastSeq < 0) return
      polling = true
      loadLight(lastSeq).then((data) => {
        polling = false
        if (typeof data.seq === 'number' && data.seq > lastSeq) lastSeq = data.seq
        const items = Array.isArray(data.items) ? data.items : []
        if (items.length === 0) return
        if (notifyReady === false) { notifyReady = true; return }
        deliverAll(items)
        refresh()
      }, () => { polling = false })
    }
    // 当前会话怎么看：conversation.composer.dock 是 session 作用域的槽位，标准
    // props 里有 sessionId，且只在当前打开的会话里渲染。注册一个返回 null 的
    // 空组件，切会话时它跟着挂载 / 卸载，就能一直知道「现在在看哪个会话」。
    function FocusTracker(props) {
      const sessionId = props !== null && typeof props === 'object' && typeof props.sessionId === 'string' ? props.sessionId : ''
      React.useEffect(() => {
        view.sessionId = sessionId
        return () => {
          if (view.sessionId === sessionId) view.sessionId = ''
        }
      }, [sessionId])
      return null
    }
    slots.inject('conversation.composer.dock', () => slots.register(
      { name: 'conversation.composer.dock', id: 'notifications-focus', order: 900 },
      FocusTracker,
    ))
    // 权限：Electron 主进程对非 media 权限一律放行，浏览器里会弹一次系统询问。
    // 失败无所谓——面板上有「开启系统通知」按钮可以手动再要一次。
    if (supported() && Notification.permission === 'default') {
      try { Notification.requestPermission().catch(() => {}) } catch { /* 老浏览器没有 Promise 版 */ }
    }

    const fmtAgo = (at) => {
      const diff = Date.now() - Number(at)
      if (!Number.isFinite(diff) || diff < 60000) return '刚刚'
      if (diff < 3600000) return Math.round(diff / 60000) + ' 分钟前'
      if (diff < 86400000) return Math.round(diff / 3600000) + ' 小时前'
      return Math.round(diff / 86400000) + ' 天前'
    }
    // 条目用 .kind，设置页的场景目录用 .id —— 两种形状都接。
    const toneOf = (entry) => {
      const key = typeof entry.kind === 'string' ? entry.kind : (typeof entry.id === 'string' ? entry.id : '')
      if (KIND_TONE[key] !== undefined) return KIND_TONE[key]
      const level = typeof entry.level === 'string' ? entry.level : 'info'
      if (level === 'error') return 'failure'
      if (level === 'warning') return 'warning'
      return level === 'action' ? 'approval' : 'info'
    }
    const toneLabel = (tone) => (TONE_LABEL[tone] !== undefined ? TONE_LABEL[tone] : String(tone))
    const toneClass = (tone) => 'nf-dot ' + (TONE_CLASS[tone] !== undefined ? TONE_CLASS[tone] : 'nf-lv-info')
    const toneDotClass = (tone) => 'nf-kind-dot ' + (TONE_CLASS[tone] !== undefined ? TONE_CLASS[tone] : 'nf-lv-info')
    const nativeLabel = (native) => {
      const channel = typeof native.channel === 'string' ? native.channel : 'none'
      const text = NATIVE_LABEL[channel] !== undefined ? NATIVE_LABEL[channel] : channel
      if (native.supported !== true) {
        return text + (typeof native.reason === 'string' && native.reason !== '' ? '（' + native.reason + '）' : '')
      }
      return text + (typeof native.sent === 'number' && native.sent > 0 ? '，已投递 ' + native.sent + ' 条' : '')
    }
    function panelGlyph(size) {
      const edge = typeof size === 'number' && size > 0 ? size : 16
      return React.createElement('span', { className: 'nf-entry-dot', style: { width: edge + 'px', height: edge + 'px' } }, 'N')
    }

    // ── 面板 ────────────────────────────────────────────────────
    // hook 槽位顺序（自检按顺序注入，改动必须同步 tools/check-client.mjs）：
    //   0 page / 1 filter / 2 notice / 3 sysPerm / 4 showKinds
    function NotificationsPanel() {
      const [page, setPage] = React.useState(store.page !== null ? store.page : EMPTY_PAGE)
      const [filter, setFilter] = React.useState('all')
      const [notice, setNotice] = React.useState(null)
      const [sysPerm, setSysPerm] = React.useState(permission())
      const [showKinds, setShowKinds] = React.useState(false)

      React.useEffect(() => {
        const stop = subscribe(setPage)
        return stop
      }, [])

      const data = page.data
      const items = data !== null && Array.isArray(data.items) ? data.items : []
      const kinds = data !== null && Array.isArray(data.kinds) ? data.kinds : []
      const config = data !== null && data.config !== null && typeof data.config === 'object' ? data.config : {}
      const files = data !== null && data.files !== null && typeof data.files === 'object' ? data.files : {}
      const unread = data !== null && typeof data.unread === 'number' ? data.unread : 0
      const total = data !== null && typeof data.total === 'number' ? data.total : items.length
      const enabledKinds = kinds.filter((kind) => kind.enabled === true).length
      const native = data !== null && data.native !== null && typeof data.native === 'object' ? data.native : {}
      const shown = filter === 'unread' ? items.filter((item) => item.read !== true) : items

      const say = (kind, text) => setNotice({ kind, text })
      const run = (promise, okText) => promise.then(() => {
        if (okText !== undefined) say('ok', okText)
        refresh()
      }, (cause) => {
        const message = cause !== null && typeof cause === 'object' && typeof cause.message === 'string' ? cause.message : String(cause)
        say('err', '操作失败：' + message)
      })

      const markRead = (item) => {
        if (item.read === true) return
        // 乐观更新：先本地置读，请求失败后由下一次 refresh 纠正。
        if (data !== null && Array.isArray(data.items)) {
          const next = data.items.map((one) => (one.id === item.id ? { ...one, read: true } : one))
          setPage({ ...page, data: { ...data, items: next, unread: Math.max(0, unread - 1) } })
        }
        act('read', { ids: [item.id] }).then(refresh, () => refresh())
      }
      const markAll = () => run(act('readAll'), '已把 ' + unread + ' 条标记为已读')
      const clearRead = () => run(act('clear'), '已清空已读通知')
      const clearAll = () => run(act('clearAll'), '已清空全部通知')
      // 主通道自测：不经过 Host、不写队列，直接弹一条本地系统通知，用来确认
      // 「停留 + 点击只关闭」在当前环境里成立。
      const testLocal = () => {
        const nativeCfg = config.native !== null && typeof config.native === 'object' ? config.native : {}
        const ok = notify({ id: 'local-test', title: 'DSH 通知测试', status: '测试通知', body: '这条会一直停在屏幕上，等你自己点掉；点它会关掉（这条没有对应会话，所以不跳转）。' }, nativeCfg.sound !== false)
        say(ok ? 'ok' : 'err', ok ? '已弹出一条系统通知，看看屏幕右上角' : '这个环境弹不出系统通知（权限被拒或不支持）')
      }
      const toggleKind = (kind) => {
        const next = {}
        for (const one of kinds) next[one.id] = one.id === kind.id ? kind.enabled !== true : one.enabled === true
        run(act('config', { config: { kinds: next } }))
      }
      const toggleEnabled = () => run(act('config', { config: { enabled: config.enabled !== true } }))
      const nativeConfig = config.native !== null && typeof config.native === 'object' ? config.native : {}
      const toggleNative = () => run(act('config', { config: { native: { enabled: nativeConfig.enabled === false } } }))
      const toggleSound = () => run(act('config', { config: { native: { sound: nativeConfig.sound === false } } }))
      // 系统设置：用户「没看到通知」时，除了权限还有一件事只能他自己改——
      // 提醒样式。macOS 上如果是「横幅」，通知会几秒后自己滑走；改成「提醒」
      // 才会像用户要求的那样停在屏幕上等人处理。
      const openSettingsPage = () => run(act('open-settings'), '已打开系统通知设置：把「提醒样式」改成「提醒」，通知就会一直停着等你点掉')
      const askPermission = () => {
        if (!supported()) { setSysPerm('unsupported'); return }
        try {
          Notification.requestPermission().then((result) => {
            setSysPerm(result)
            say(result === 'granted' ? 'ok' : 'err', result === 'granted' ? '系统通知已开启' : '系统通知未开启（' + result + '）')
          }, () => setSysPerm(permission()))
        } catch {
          setSysPerm(permission())
        }
      }

      // 一行里排的是「谁 → 为什么 → 多少次」：标题（工作区 / 会话）→ 场景徽章 → 去重计数。
      // 顺序是用户指定的：先看清是哪个会话，再看它因为什么冒出来。
      const itemNode = (item) => {
        const tone = toneOf(item)
        return React.createElement('div', {
          key: item.id,
          className: 'nf-item' + (item.read === true ? ' nf-item-read' : ''),
          onClick: () => markRead(item),
          title: item.read === true ? '已读' : '点击标记为已读',
        },
        React.createElement('span', { className: toneClass(tone), title: toneLabel(tone) }),
        React.createElement('div', { className: 'nf-item-main' },
          React.createElement('div', { className: 'nf-item-title' },
            item.title,
            typeof item.status === 'string' && item.status !== ''
              ? React.createElement('span', { className: 'nf-tag' }, item.status)
              : null,
            typeof item.count === 'number' && item.count > 1 ? React.createElement('span', { className: 'nf-count' }, '×' + item.count) : null),
          React.createElement('div', { className: 'nf-item-body' }, item.body),
          item.detail !== undefined && item.detail !== '' ? React.createElement('div', { className: 'nf-item-detail' }, item.detail) : null,
          React.createElement('div', { className: 'nf-item-meta' },
            React.createElement('span', { className: 'nf-tone-label nf-tone-' + tone }, toneLabel(tone)),
            // 整条的点击是「标记已读」，所以跳会话必须另给一个按钮——不然 meta 上写
            // 「点击可跳到该会话」就是空头支票（自检里也有用例盯着这个按钮）。
            item.sessionId !== undefined && item.sessionId !== ''
              ? React.createElement('button', {
                type: 'button',
                className: 'nf-jump',
                onClick: (event) => {
                  if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                  markRead(item)
                  openSession(item.sessionId)
                },
                title: '打开这条通知对应的会话',
              }, '跳到会话')
              : null,
            React.createElement('span', null, fmtAgo(item.createdAt)))))
      }
      const kindNode = (kind) => {
        const tone = toneOf(kind)
        return React.createElement('div', { key: kind.id, className: 'nf-kind-row' },
          React.createElement('span', { className: toneDotClass(tone), title: toneLabel(tone) }),
          // 同一个图标也出现在系统通知标题前，这里是它的「图例」。
          // Host 没给 icon（跑着旧入口）时按色调兜底，免得整页清一色白点。
          React.createElement('span', { className: 'nf-kind-icon' },
            typeof kind.icon === 'string' && kind.icon !== '' ? kind.icon : TONE_ICON[tone] || '\u26AA'),
          React.createElement('span', { className: 'nf-kind-label' }, kind.label),
          React.createElement('span', { className: 'nf-kind-hint', title: kind.hint }, kind.hint),
          React.createElement('button', {
            type: 'button',
            className: 'nf-switch' + (kind.enabled === true ? ' nf-switch-on' : ''),
            onClick: () => toggleKind(kind),
            title: kind.enabled === true ? '已启用，点击关闭' : '已关闭，点击启用',
          }))
      }

      return React.createElement('div', { className: 'nf-root' },
        React.createElement('div', { className: 'nf-head' },
          React.createElement('div', null,
            React.createElement('h2', { className: 'nf-title' }, '通知'),
            React.createElement('div', { className: 'nf-sub' },
              '会话完成、需要你批准、模型失败、子智能体结束时都会在这里留一条记录。Host 侧负责收集，浏览器只负责显示——所以页面刷不刷、开不开，记录都不会丢。')),
          React.createElement('div', { className: 'nf-actions' },
            React.createElement('button', { type: 'button', className: 'nf-btn', onClick: markAll, disabled: unread === 0 }, '全部已读'),
            React.createElement('button', { type: 'button', className: 'nf-btn', onClick: clearRead }, '清空已读'),
            React.createElement('button', { type: 'button', className: 'nf-btn', onClick: clearAll }, '清空全部'),
            React.createElement('button', { type: 'button', className: 'nf-btn nf-btn-primary', onClick: testLocal }, '测试系统通知'),
            React.createElement('button', { type: 'button', className: 'nf-btn', onClick: openSettingsPage, title: '打开系统通知设置：把提醒样式改成「提醒」，通知才会停在屏幕上等你了' }, '系统通知设置'),
            React.createElement('button', {
              type: 'button',
              className: 'nf-btn' + (sysPerm === 'granted' ? ' nf-btn-on' : ''),
              onClick: askPermission,
              disabled: sysPerm === 'granted' || sysPerm === 'unsupported',
            }, PERM_LABEL[sysPerm] !== undefined ? PERM_LABEL[sysPerm] : '开启系统通知'))),

        // 用户没开通知时的兜底引导：不弹系统通知是「静默失败」最典型的形态，
        // 所以这里必须有一块显眼的东西告诉他去开哪两个开关（权限 + 提醒样式）。
        sysPerm === 'denied' || sysPerm === 'default'
          ? React.createElement('div', { className: 'nf-warn' },
            React.createElement('div', { style: { flex: '1 1 auto', minWidth: '0' } },
              sysPerm === 'denied'
                ? '系统通知被拒绝了，所以现在一条都不会弹——只有这个面板里还在记流水账。去「系统设置 → 通知」里把 DSH 的通知打开，或者点右边的按钮重新申请一次。'
                : '系统通知还没被允许，现在只有这个面板在记录。点右边的按钮申请一次（桌面版 DSH 里一般会直接通过）。'),
            React.createElement('button', {
              type: 'button',
              className: 'nf-btn nf-btn-primary',
              onClick: askPermission,
              disabled: sysPerm === 'unsupported',
            }, sysPerm === 'denied' ? '重新申请通知权限' : '开启通知权限'),
            React.createElement('button', { type: 'button', className: 'nf-btn', onClick: openSettingsPage }, '打开系统设置'))
          : null,

        React.createElement('div', { className: 'nf-stats' },
          React.createElement('div', { className: 'nf-stat' },
            React.createElement('div', { className: 'nf-stat-label' }, '未读'),
            React.createElement('div', { className: 'nf-stat-value' }, String(unread))),
          React.createElement('div', { className: 'nf-stat' },
            React.createElement('div', { className: 'nf-stat-label' }, '记录总数'),
            React.createElement('div', { className: 'nf-stat-value' }, String(total))),
          React.createElement('div', { className: 'nf-stat' },
            React.createElement('div', { className: 'nf-stat-label' }, '已启用场景'),
            React.createElement('div', { className: 'nf-stat-value' }, enabledKinds + ' / ' + kinds.length))),

        React.createElement('div', { className: 'nf-actions' },
          React.createElement('button', {
            type: 'button',
            className: 'nf-btn' + (config.enabled !== false ? ' nf-btn-on' : ''),
            onClick: toggleEnabled,
          }, config.enabled !== false ? '通知总开关：开' : '通知总开关：关'),
          React.createElement('button', { type: 'button', className: 'nf-btn', onClick: () => setFilter('all') }, filter === 'all' ? '· 全部' : '全部'),
          React.createElement('button', { type: 'button', className: 'nf-btn', onClick: () => setFilter('unread') }, filter === 'unread' ? '· 仅未读' : '仅未读'),
          React.createElement('button', { type: 'button', className: 'nf-btn', onClick: () => setShowKinds(!showKinds) }, showKinds ? '收起场景设置' : '场景设置（' + kinds.length + '）'),
          React.createElement('button', { type: 'button', className: 'nf-btn', onClick: refresh }, '刷新')),

        // 兜底通道（Host 起子进程直接调操作系统通知中心）。默认关闭：
        // 主通道是渲染进程的 Notification，那条署名是 DSH 本体、还能停在屏幕上。
        // 这条只有在页面根本加载不起来时才有意义，打开后每条通知会多弹一条。
        React.createElement('div', { className: 'nf-actions' },
          React.createElement('button', {
            type: 'button',
            className: 'nf-btn' + (native.enabled === true ? ' nf-btn-on' : ''),
            onClick: toggleNative,
            title: '兜底通道：由 Host 直接调操作系统通知中心。打开后每条通知会多弹一条（署名不是 DSH）',
          }, native.enabled === true ? '兜底通道：开' : '兜底通道：关'),
          React.createElement('button', {
            type: 'button',
            className: 'nf-btn' + (native.sound !== false ? ' nf-btn-on' : ''),
            onClick: toggleSound,
            title: '系统通知是否带提示音',
          }, native.sound !== false ? '提示音：开' : '提示音：关'),
          React.createElement('span', { className: 'nf-path' }, '兜底状态：' + nativeLabel(native))),

        notice !== null ? React.createElement('div', { className: 'nf-msg ' + (notice.kind === 'ok' ? 'nf-msg-ok' : 'nf-msg-err') }, notice.text) : null,
        page.error !== null && page.error !== undefined ? React.createElement('div', { className: 'nf-msg nf-msg-err' }, '读取失败：' + page.error) : null,

        showKinds === true ? React.createElement('div', { className: 'nf-card' },
          React.createElement('div', { className: 'nf-card-head' }, '场景设置'),
          kinds.map((kind) => kindNode(kind))) : null,

        React.createElement('div', { className: 'nf-card' },
          React.createElement('div', { className: 'nf-card-head' }, filter === 'unread' ? '未读通知' : '全部通知'),
          page.loading === true && data === null
            ? React.createElement('div', { className: 'nf-empty' }, '正在读取通知…')
            : shown.length === 0
              ? React.createElement('div', { className: 'nf-empty' }, filter === 'unread' ? '没有未读通知。' : '还没有通知。会话跑完一轮、需要你批准、或者模型报错时，这里会出现一条记录。')
              : React.createElement('div', { className: 'nf-list' }, shown.map((item) => itemNode(item)))),

        React.createElement('div', { className: 'nf-path' },
          '记录与配置落在 ' + (typeof files.config === 'string' && files.config !== '' ? files.config : '$DSH_HOME/dsh-toolkit/notifications/config.json') +
          '。可用 NOTIFICATIONS_CONFIG / NOTIFICATIONS_QUEUE 覆盖。'),
        React.createElement('div', { className: 'nf-path' },
          '提醒只走系统通知中心：通知的标题是「工作区 / 会话」，正文第一段是原因（会话完成、需要权限、模型失败…）。点通知会跳回那条会话并关掉通知；找不到会话时只关闭。'),
        React.createElement('div', { className: 'nf-path' },
          '没收到通知？按这个顺序查：① 顶部有没有提示权限被拒——有就点「开启通知权限」；② 「系统通知设置」里把 DSH 的提醒样式改成「提醒」而不是「横幅」，否则通知会几秒后自己滑走；③ 确认下面的「通知总开关」和对应的场景开关都是开的。'),
        React.createElement('div', { className: 'nf-path' },
          '这个面板是历史记录，自己不会弹任何东西。上面那排是渲染进程系统通知（DSH desktop 里署名就是 DSH 本体）；下面那排是 Host 兜底通道（直接调 macOS / Linux 的通知中心），默认关闭，只有你想在页面加载不到时也留一条时才需要打开。'))
    }

    if (slots === undefined) return
    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, NotificationsPanel))
    // 侧边栏入口：和 dsh-toolkit 其它组件一起加载时统一交给 toolkit 组件管理
    // （在共享注册表里登记一份）；单独加载本文件时注册表不存在，退回自己注册。
    const registry = typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null
    if (registry !== null) {
      registry.register({ id: PANEL_KEY, Panel: NotificationsPanel, label: '通知', order: 52, glyphText: 'N' })
    } else {
      slots.inject('sidebar.panellist', () => slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, label: '通知', order: 52 }, (props) => panelGlyph(props !== null && typeof props === 'object' ? props.size : 16)))
    }
  },
}
  },
})
