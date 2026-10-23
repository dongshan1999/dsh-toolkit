window.__ModuleLoader__.load({
  id: "@local/annotations",
  factory(require) {
    const React = require("react")
// annotations：会话里划词 → 浮出「＋ 注释 N」→ 在输入框上方的注释栏里写 → 保存后正文
// 高亮 + 词尾上标，并把 `注释 N@"引用"：正文` 写进草稿。
//
// 为什么只能这么做（详见 docs/功能案-对话注释.md）：
//   - DSH 没有 selection-toolbar slot，也没有可扩展的右键菜单 → 划词浮层只能自己画；
//   - 输入框是 Lexical 富文本，插件 import 不到 lexical 的节点 API → 插入/删除走
//     execCommand('insertText') + Range.deleteContents()，再用 innerText 回读校验；
//   - 消息条目没有稳定 id → 锚点用「会话 id + quote + 前后 32 字上下文 + 全文偏移」。
//
// 数据与编号都在 Host（/api/annotations），本文件只管交互与绘制。
const CSS = [
  // 浮动按钮与角标用**固定配色**，不依赖主题变量：浮层挂在 shell.overlay 里，
  // 那个作用域不一定继承到主题的 alias 变量，之前出现「白底白字 = 一个空白圆角块」。
  '.an-float{position:fixed;z-index:60;display:flex;gap:6px;align-items:center;color:#e6edf3}',
  '.an-float-btn{font:inherit;font-size:12px;line-height:20px;padding:5px 12px;border-radius:16px;border:1px solid #2f6fed;background:#2f6fed;color:#ffffff;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.32);white-space:nowrap}',
  '.an-float-btn:hover{background:#2563eb;border-color:#2563eb}',
  '.an-float-btn-primary{border-color:#2f6fed;background:#2f6fed;color:#ffffff}',
  '.an-float-btn-primary:hover{background:#2563eb;filter:brightness(1.05)}',
  '.an-dock{margin:0 auto 6px;width:100%;max-width:920px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#161b22);color:var(--dsw-alias-label-primary,#e6edf3);padding:6px 10px;display:flex;flex-direction:column;gap:4px}',
  '.an-dock-head{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#9aa4b2)}',
  '.an-dock-title{font-weight:600;color:var(--dsw-alias-label-primary,#e6edf3)}',
  '.an-dock-ops{margin-left:auto;display:flex;gap:6px}',
  '.an-btn{font:inherit;font-size:11px;line-height:1.5;padding:2px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1,#30363d);background:transparent;color:var(--dsw-alias-label-secondary,#9aa4b2);cursor:pointer;white-space:nowrap}',
  '.an-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
  '.an-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary,#3b82f6);color:#fff}',
  '.an-btn-danger:hover{color:var(--dsw-alias-label-error,#e5484d);border-color:var(--dsw-alias-label-error,#e5484d)}',
  '.an-item{display:flex;gap:8px;align-items:flex-start;padding:4px 2px;border-radius:6px}',
  '.an-item:hover{background:var(--dsw-alias-interactive-bg-hover)}',
  '.an-num{flex:none;min-width:18px;height:18px;border-radius:4px;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 18%,transparent);color:var(--dsw-alias-brand-primary,#3b82f6);font-size:11px;line-height:18px;text-align:center;font-variant-numeric:tabular-nums}',
  '.an-quote{flex:1 1 auto;min-width:0;font-size:12px;color:var(--dsw-alias-label-primary,#e6edf3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-font-mono,ui-monospace,monospace)}',
  '.an-note{font-size:12px;color:var(--dsw-alias-label-secondary,#9aa4b2);line-height:1.6;word-break:break-word}',
  '.an-flag{flex:none;font-size:10px;padding:0 5px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1,#30363d);color:var(--dsw-alias-label-secondary,#9aa4b2)}',
  '.an-flag-warn{color:var(--dsw-alias-label-warning,#c76a00);border-color:currentColor}',
  '.an-ops{flex:none;display:flex;gap:4px;align-items:center}',
  '.an-editor{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px}',
  '.an-textarea{font:inherit;font-size:12px;line-height:1.6;width:100%;box-sizing:border-box;resize:vertical;min-height:52px;max-height:120px;padding:6px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-0,#0d1117);color:var(--dsw-alias-label-primary,#e6edf3)}',
  '.an-empty{font-size:12px;color:var(--dsw-alias-label-secondary,#9aa4b2);padding:10px 2px}',
  '.an-panel{display:flex;flex-direction:column;gap:0;height:100%;min-height:0;box-sizing:border-box;background:var(--dsw-alias-bg-layer-0,#0d1117);color:var(--dsw-alias-label-primary,#e6edf3)}',
  '.an-panel-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
  '.an-panel-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary,#e6edf3)}',
  '.an-panel-sub{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#9aa4b2)}',
  '.an-panel-body{flex:1 1 auto;min-height:0;overflow:auto;padding:8px 14px 18px;display:flex;flex-direction:column;gap:6px}',
].join('')

// 会话内这几块都走**内联样式**：conversation.input.dock / shell.overlay 这两个挂载点的
// 作用域不一定吃到插件往 document.head 注入的样式表（实测注释栏按钮会退化成浏览器
// 默认的白底黑字），内联 style 不受影响。
const S = {
  dock: {
    margin: '0 0 6px', width: '100%', maxWidth: '100%', boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,.12)', borderRadius: '10px',
    background: 'rgba(255,255,255,.04)', padding: '6px 10px',
    display: 'flex', flexDirection: 'column', gap: '4px',
    // 输入框贴了图片/附件时会变高，把上方这块区域挤出可视区；限高 + 内部滚动，
    // 再抬一层，避免被附件预览盖住。
    position: 'relative', zIndex: 8, maxHeight: '32vh', overflowY: 'auto',
  },
  head: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9aa4b2' },
  title: { fontWeight: 600, color: '#e6edf3' },
  ops: { marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' },
  btn: {
    font: 'inherit', fontSize: '11px', lineHeight: '18px', padding: '2px 8px', borderRadius: '6px',
    border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: '#c9d1d9',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  btnDanger: { color: '#f2777a', borderColor: 'rgba(242,119,122,.45)' },
  btnPrimary: { color: '#ffffff', background: '#2f6fed', borderColor: '#2f6fed' },
  item: { display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '4px 2px' },
  num: {
    flex: 'none', minWidth: '18px', height: '18px', borderRadius: '4px',
    background: 'rgba(47,111,237,.28)', color: '#8ab4ff', fontSize: '11px',
    lineHeight: '18px', textAlign: 'center',
  },
  chip: {
    flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(47,111,237,.55)',
    background: 'rgba(47,111,237,.16)', color: '#cfe0ff', fontSize: '12px',
    lineHeight: '18px', cursor: 'pointer', fontFamily: 'inherit',
  },
  tips: {
    position: 'fixed', width: '420px', maxWidth: '92vw', maxHeight: '320px', overflow: 'auto',
    padding: '10px 12px', borderRadius: '10px', background: '#0f1620',
    border: '1px solid rgba(138,180,255,.35)', boxShadow: '0 12px 32px rgba(0,0,0,.45)',
    zIndex: 2147483000, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '6px',
  },
  tipsHead: { fontSize: '11px', color: '#8ab4ff', fontWeight: 600 },
  tipsQuote: {
    margin: 0, fontSize: '12px', color: '#e6edf3', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    fontFamily: 'ui-monospace, monospace', background: 'rgba(255,255,255,.04)',
    borderLeft: '2px solid rgba(47,111,237,.6)', padding: '6px 8px', borderRadius: '4px',
  },
  tipsNote: { margin: 0, fontSize: '12px', color: '#c8d3e0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  where: {
    flex: '0 0 auto', fontSize: '11px', color: '#8ab4ff', whiteSpace: 'nowrap',
    borderBottom: '1px dashed rgba(138,180,255,.45)', cursor: 'help',
  },
  quote: {
    // 引用固定宽度并省略：不固定的话它会吃掉整行，把右边的输入框挤成一列。
    flex: '0 0 auto', width: '200px', maxWidth: '38%', fontSize: '12px', color: '#e6edf3',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontFamily: 'ui-monospace, monospace',
  },
  note: { fontSize: '12px', color: '#c9d1d9', lineHeight: 1.6, wordBreak: 'break-word' },
  flag: {
    flex: 'none', fontSize: '10px', padding: '0 5px', borderRadius: '999px',
    border: '1px solid rgba(255,255,255,.2)', color: '#9aa4b2',
  },
  flagWarn: { color: '#e3b341', borderColor: 'rgba(227,179,65,.5)' },
  editor: { flex: '1 1 auto', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '4px' },
  textarea: {
    font: 'inherit', fontSize: '12px', lineHeight: 1.6, width: '100%', boxSizing: 'border-box',
    resize: 'vertical', minHeight: '52px', maxHeight: '120px', padding: '6px 8px',
    borderRadius: '6px', border: '1px solid rgba(255,255,255,.2)',
    background: 'rgba(0,0,0,.25)', color: '#e6edf3',
  },
  panel: {
    display: 'flex', flexDirection: 'column', gap: '0', height: '100%', minHeight: 0,
    boxSizing: 'border-box', background: 'transparent', color: '#e6edf3',
  },
  panelTop: {
    display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
    padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,.1)',
  },
  panelTitle: { fontSize: '14px', fontWeight: 600, color: '#e6edf3' },
  panelSub: { fontSize: '12px', lineHeight: 1.6, color: '#9aa4b2' },
  panelBody: {
    flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '8px 14px 18px',
    display: 'flex', flexDirection: 'column', gap: '6px',
  },
  empty: { fontSize: '12px', color: '#9aa4b2', padding: '10px 2px' },
}
const btnStyle = (extra) => Object.assign({}, S.btn, extra === undefined ? {} : extra)

const PANEL_KEY = 'annotations'
const LABEL = '注释'
const ORDER = 56
const LS_SESSION = 'dsh.annotations.session'
const BUILD_TAG = '1023n'
const DRAFT_PREFIX = '[注释 '
/** 草稿里的条目起始标记（Codex 同款：[注释 N] "原文"：批注）。 */
function draftMark(index) { return DRAFT_PREFIX + index + ']' }

/** 与 Host 的 highlight 名保持一致（同一条注释一个名字，便于单独撤掉）。 */
const HL_PREVIEW = 'dsh-annotation-preview'
const HL_SAVED = 'dsh-annotation-saved'

const shared = {
  sessionId: '',
  sessionTitle: '',
  items: [],
  nextIndex: 1,
  limits: { maxPerSession: 500, quoteChars: 2000, selectionDelay: 0, floatingButton: true },
  selection: null,
  notice: '',
  listeners: new Set(),
  loading: false,
}

function subscribe(listener) {
  shared.listeners.add(listener)
  return () => { shared.listeners.delete(listener) }
}

function publish() {
  for (const listener of Array.from(shared.listeners)) {
    try { listener() } catch { /* 单个订阅者出错不影响其它人 */ }
  }
}

function announce(text) {
  shared.notice = text
  publish()
  if (shared.noticeTimer !== undefined) clearTimeout(shared.noticeTimer)
  shared.noticeTimer = setTimeout(() => {
    shared.notice = ''
    publish()
  }, 4000)
}

// ── 网络 ────────────────────────────────────────────────────────────────────
async function fetchJson(url, init) {
  const response = await fetch(url, Object.assign({ headers: { accept: 'application/json' } }, init))
  const body = await response.json().catch(() => null)
  if (!response.ok || body === null || body.ok !== true) {
    const message = body !== null && typeof body.message === 'string' ? body.message : 'HTTP ' + response.status
    const error = new Error(message)
    error.code = body !== null && typeof body.code === 'string' ? body.code : 'annotations/failed'
    throw error
  }
  return body
}

function postJson(url, payload) {
  return fetchJson(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  })
}

// ── DOM 小工具（自检环境里没有真实 DOM，全部守卫） ──────────────────────────
function hasDom() {
  return typeof document !== 'undefined' && document !== null && typeof document.querySelector === 'function'
}

function chatRoot() {
  if (!hasDom()) return null
  try { return document.querySelector('[data-conversation-region="chat"]') } catch { return null }
}

function editorRoot() {
  if (!hasDom()) return null
  try {
    return document.querySelector('[data-lexical-editor="true"]')
      || document.querySelector('[data-conversation-region="composer"] [contenteditable="true"]')
  } catch { return null }
}

/** 把 root 里的文本节点按顺序串成一份全文，并记下每段的起止，供偏移 ↔ Range 互转。 */
// 聊天区动辄几十万字，每次划词都重新 TreeWalker 会明显发涩；这里缓存一份，
// 内容一变就由 chat 上的 MutationObserver 置脏（见 apply 的 index cache 段）。
let indexCache = null
function invalidateIndex() {
  indexCache = null
}

const BLOCK_TAGS = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DIV', 'DL', 'DT',
  'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER',
  'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH',
  'THEAD', 'TR', 'UL'])

function closestBlock(node) {
  let element = node !== null && node !== undefined && node.nodeType === 1 ? node : node?.parentElement
  let guard = 0
  while (element !== null && element !== undefined && guard < 24) {
    const tag = typeof element.tagName === 'string' ? element.tagName.toUpperCase() : ''
    if (BLOCK_TAGS.has(tag)) return element
    element = element.parentElement
    guard += 1
  }
  return null
}

function textIndex(root) {
  if (indexCache !== null && indexCache.root === root) return indexCache.index
  const nodes = []
  const filter = typeof NodeFilter !== 'undefined' && NodeFilter !== null ? NodeFilter.SHOW_TEXT : 4
  if (typeof document.createTreeWalker !== 'function') return { text: '', nodes }
  const walker = document.createTreeWalker(root, filter, null)
  let text = ''
  let node = walker.nextNode()
  let lastBlock = null
  while (node !== null) {
    const value = node.nodeValue || ''
    if (value !== '') {
      // 段落之间补一个 \n：选区跨段时 selection.toString() 会带换行，
      // 而 textContent 拼接没有——不补就永远匹配不到跨段 quote。
      const block = closestBlock(node)
      if (text !== '' && block !== lastBlock) text += '\n'
      lastBlock = block
    }
    nodes.push({ node, start: text.length, end: text.length + value.length })
    text += value
    node = walker.nextNode()
  }
  const index = { text, nodes }
  indexCache = { root, index }
  return index
}

function offsetOfPoint(index, container, offset) {
  if (container !== null && container.nodeType === 3) {
    for (const entry of index.nodes) {
      if (entry.node === container) return entry.start + Math.min(offset, entry.end - entry.start)
    }
    return -1
  }
  if (container !== null && typeof container.childNodes !== 'undefined') {
    if (offset < container.childNodes.length) {
      let node = container.childNodes[offset]
      while (node !== null && node !== undefined && node.nodeType !== 3) node = node.firstChild
      if (node !== null && node !== undefined) {
        for (const entry of index.nodes) {
          if (entry.node === node) return entry.start
        }
      }
    }
    // 落在容器末尾 → 用最后一个文本节点的结尾。
    if (index.nodes.length > 0) return index.nodes[index.nodes.length - 1].end
  }
  return -1
}

function rangeFromOffsets(index, start, end) {
  if (typeof document.createRange !== 'function') return null
  // 偏移可能落在块间补的 \n 上（不属于任何文本节点）→ 吸附到最近的文本边界。
  const snap = (pos) => {
    for (const entry of index.nodes) {
      if (pos <= entry.end) return { node: entry.node, offset: Math.max(0, pos - entry.start) }
    }
    return null
  }
  const head = snap(start)
  const tail = snap(end)
  if (head === null || tail === null) return null
  try {
    const range = document.createRange()
    range.setStart(head.node, head.offset)
    range.setEnd(tail.node, tail.offset)
    return range
  } catch {
    return null
  }
}

/** 在全文里找 quote：多个候选位置时用前后文匹配度挑最像的那个。 */
const SPACE_UNIT = '\u0001'

/** 把各类空白压成同一个占位字符，长度不变 ⇒ 匹配位置可以直接当原文偏移用。 */
function glueSpaces(value) {
  return String(value).replace(/\s+/gu, (run) => SPACE_UNIT.repeat(run.length))
}

function locate(index, quote, prefix, suffix) {
  const text = index.text
  const needle = String(quote === undefined || quote === null ? '' : quote).trim().replace(/\r\n/gu, '\n')
  if (text === '' || needle === '') return -1
  // 换行 vs 空格、多个空格 vs 一个空格，都算同一个位置；长度不变所以偏移照旧可用。
  const hay = glueSpaces(text)
  const pin = glueSpaces(needle)
  const pre = glueSpaces(String(prefix === undefined || prefix === null ? '' : prefix))
  const suf = glueSpaces(String(suffix === undefined || suffix === null ? '' : suffix))
  let best = -1
  let bestScore = -1
  let from = 0
  for (;;) {
    const at = hay.indexOf(pin, from)
    if (at < 0) break
    let score = 0
    if (pre !== '') {
      const before = hay.slice(Math.max(0, at - pre.length), at)
      score += before === pre ? 3 : before.endsWith(pre.slice(-8)) ? 1 : 0
    }
    if (suf !== '') {
      const after = hay.slice(at + pin.length, at + pin.length + suf.length)
      score += after === suf ? 3 : after.startsWith(suf.slice(0, 8)) ? 1 : 0
    }
    if (score > bestScore) {
      best = at
      bestScore = score
    }
    from = at + 1
  }
  if (best >= 0) return best
  // 兜底：旧数据里 quote 可能夹着多出来的空行/缩进，把空白全部去掉再比一次，
  // 命中后用映射还原成原偏移。
  const slimmer = (value) => {
    const chars = []
    const map = []
    for (let i = 0; i < value.length; i += 1) {
      const ch = value[i]
      if (/\s/u.test(ch) === false) { chars.push(ch); map.push(i) }
    }
    return { text: chars.join(''), map }
  }
  const flat = slimmer(text)
  const probe = slimmer(needle)
  if (probe.text === '' || flat.text.length < probe.text.length) return -1
  const hit = flat.text.indexOf(probe.text)
  if (hit < 0) return -1
  return flat.map[hit]
}

function isIgnoredNode(node) {
  let element = node !== null && node !== undefined && node.nodeType === 1 ? node : node?.parentElement
  let guard = 0
  while (element !== null && element !== undefined && guard < 8) {
    const tag = typeof element.tagName === 'string' ? element.tagName.toLowerCase() : ''
    if (tag === 'button' || tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'pre' || tag === 'img' || tag === 'iframe') return true
    if (element.isContentEditable === true) return true
    if (element.getAttribute && element.getAttribute('data-composer-chip') !== null) return true
    element = element.parentElement
    guard += 1
  }
  return false
}

/** 选区起点/终点所在的消息块：chatRoot 的直接子元素。 */
function messageBlock(chat, node) {
  if (chat === null || node === null || node === undefined) return null
  let element = node.nodeType === 1 ? node : node.parentElement
  let guard = 0
  while (element !== null && element !== undefined && guard < 64) {
    if (element.parentElement === chat) return element
    element = element.parentElement
    guard += 1
  }
  return null
}

/** 消息块在聊天区里的序号（从 1 开始；找不到就是 0）。 */
function blockIndexOf(chat, element) {
  if (chat === null || element === null || element === undefined) return 0
  const children = chat.children
  if (children === undefined || children === null || typeof children.length !== 'number') return 0
  for (let i = 0; i < children.length; i += 1) {
    if (children[i] === element) return i + 1
  }
  return 0
}

/** 文本节点所属的块级宿主（块内分段/代码块各算一行）。 */
function blockHost(block, node) {
  let element = node !== null && node !== undefined && node.nodeType === 1 ? node : node?.parentElement
  let guard = 0
  while (element !== null && element !== undefined && guard < 32) {
    if (element.parentElement === block) return element
    element = element.parentElement
    guard += 1
  }
  return block
}

/**
 * 块内行号：段落/代码块之间算换行，文本节点内部的 \n 也算换行。
 * 只用于「这条注释指的是哪几行」的展示，不参与重新定位，所以允许近似。
 */
function lineAt(block, node, offset) {
  if (block === null || node === null || node === undefined) return 0
  if (typeof document.createTreeWalker !== 'function') return 0
  const filter = typeof NodeFilter !== 'undefined' && NodeFilter !== null ? NodeFilter.SHOW_TEXT : 4
  let walker = null
  try { walker = document.createTreeWalker(block, filter, null) } catch { return 0 }
  let line = 1
  let lastHost = null
  let current = walker.nextNode()
  let guard = 0
  while (current !== null && guard < 20000) {
    guard += 1
    const host = blockHost(block, current)
    if (lastHost !== null && host !== lastHost) line += 1
    lastHost = host
    const value = current.nodeValue || ''
    if (current === node) {
      return line + (value.slice(0, offset).match(/\n/g) || []).length
    }
    line += (value.match(/\n/g) || []).length
    current = walker.nextNode()
  }
  return line
}

/** 输入框（composer）本体的顶边：划词浮层不能越过它，否则会盖住输入框。 */
function composerTop() {
  const node = editorRoot()
  if (node !== null && node !== undefined && typeof node.getBoundingClientRect === 'function') {
    const box = node.getBoundingClientRect()
    if (box !== null && box !== undefined && typeof box.top === 'number' && box.top > 0) return box.top
  }
  return null
}

/** 把选区描述成可存盘、可再定位的锚点。 */
function describeSelection(chat) {
  if (!hasDom() || typeof window === 'undefined' || window === null) return null
  const selection = typeof window.getSelection === 'function' ? window.getSelection() : null
  if (selection === null || selection === undefined || selection.isCollapsed === true) return null
  if (typeof selection.rangeCount !== 'number' || selection.rangeCount === 0) return null
  if (selection.toString().trim().length < 2) return null
  let range
  try { range = selection.getRangeAt(0) } catch { return null }
  if (range === null || range === undefined) return null
  if (chat !== null && chat.contains !== undefined && chat.contains(range.commonAncestorContainer) !== true) return null
  if (isIgnoredNode(range.commonAncestorContainer)) return null
  const index = textIndex(chat)
  const start = offsetOfPoint(index, range.startContainer, range.startOffset)
  const end = offsetOfPoint(index, range.endContainer, range.endOffset)
  if (start < 0 || end <= start) return null
  // quote 必须和 index.text 同源，否则换行/空格口径不同，存下去以后就定位不到了。
  const quote = index.text.slice(start, end)
  if (quote.trim().length < 2) return null
  // 定位用**选区最后一行**的矩形：整段选区的 bounding box 跨行时右边缘会跑到最宽那行，
  // 按钮就离鼠标松开的位置很远，看起来「漂浮不定」。getClientRects() 的最后一个才是
  // 选区结尾所在行。
  let rect = null
  if (typeof range.getClientRects === 'function') {
    const rects = range.getClientRects()
    if (rects !== null && rects !== undefined && rects.length > 0) rect = rects[rects.length - 1]
  }
  if ((rect === null || rect === undefined) && typeof range.getBoundingClientRect === 'function') {
    rect = range.getBoundingClientRect()
  }
  // 选区滚到输入框下面时，矩形会伸进 composer 区域；浮层跟着跑到输入框上会遮住正在编辑的内容，
  // 所以把矩形底边夹在输入框顶边上方。
  const limit = composerTop()
  if (rect !== null && rect !== undefined && limit !== null && typeof rect.bottom === 'number' && rect.bottom > limit - 8) {
    const height = typeof rect.height === 'number' ? rect.height : 0
    rect = { left: rect.left, right: rect.right, top: limit - 8 - height, bottom: limit - 8, width: rect.width, height }
  }
  const startBlock = messageBlock(chat, range.startContainer)
  const endBlock = messageBlock(chat, range.endContainer)
  return {
    quote,
    prefix: index.text.slice(Math.max(0, start - 32), start),
    suffix: index.text.slice(end, end + 32),
    block: -1,
    offset: start,
    blockStart: blockIndexOf(chat, startBlock),
    blockEnd: blockIndexOf(chat, endBlock),
    lineStart: lineAt(startBlock, range.startContainer, range.startOffset),
    lineEnd: lineAt(endBlock, range.endContainer, range.endOffset),
    rect: rect === null || rect === undefined
      ? null
      : { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
  }
}

// ── 高亮（CSS Custom Highlight API；不支持的浏览器静默降级） ─────────────────
function highlightSupported() {
  return typeof CSS !== 'undefined' && CSS !== null && CSS.highlights !== null && CSS.highlights !== undefined
    && typeof Highlight === 'function'
}

function setHighlight(name, ranges) {
  if (!highlightSupported()) return
  try {
    if (ranges.length === 0) {
      CSS.highlights.delete(name)
      return
    }
    CSS.highlights.set(name, new Highlight(...ranges))
  } catch { /* 浏览器不支持 multirange 时忽略 */ }
}

function clearPreview() {
  setHighlight(HL_PREVIEW, [])
}

// ── 正文编号角标（蓝底白字小徽章，样式对齐 Codex 的 annotation 标记） ────────
const BADGE_ATTR = 'data-annotations-badges'
let badgeLayerNode = null

function destroyBadges() {
  if (badgeLayerNode !== null && badgeLayerNode.parentNode !== null) {
    badgeLayerNode.parentNode.removeChild(badgeLayerNode)
  }
  badgeLayerNode = null
}

/**
 * 角标层挂在 body 上、用 fixed 定位：不依赖会话容器是谁、有没有 position/overflow。
 * 位置来自 Range.getClientRects()（实时视口坐标），滚动时只挪位置、不重新定位文本。
 */
function badgeLayer() {
  if (badgeLayerNode !== null && badgeLayerNode.parentNode !== null) return badgeLayerNode
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null
  const host = document.body !== null && document.body !== undefined ? document.body : document.documentElement
  if (host === null || host === undefined) return null
  badgeLayerNode = document.createElement('div')
  badgeLayerNode.setAttribute(BADGE_ATTR, '')
  badgeLayerNode.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147482000'
  host.appendChild(badgeLayerNode)
  return badgeLayerNode
}

/**
 * 真正裁剪正文的那个祖先：从 chat 往上找第一个 overflow 不是 visible 的元素。
 * 不看属性名（`data-conversation-scroll` 那类标记会变），只看浏览器实际怎么裁。
 */
function clippingRect(node) {
  const readStyle = typeof window !== 'undefined' && window !== null && typeof window.getComputedStyle === 'function'
    ? window.getComputedStyle
    : (typeof getComputedStyle === 'function' ? getComputedStyle : null)
  if (readStyle === null) return null
  let element = node
  let guard = 0
  while (element !== null && element !== undefined && guard < 40) {
    if (element.nodeType === 1 && typeof element.getBoundingClientRect === 'function') {
      const style = readStyle(element)
      const oy = style === null || style === undefined ? '' : String(style.overflowY || '')
      const ox = style === null || style === undefined ? '' : String(style.overflowX || '')
      // 只要不是 visible（auto/scroll/hidden/clip/overlay…）就认为会裁掉内容。
      const clipsY = oy !== '' && oy !== 'visible'
      const clipsX = ox !== '' && ox !== 'visible'
      if (clipsY || clipsX) {
        const rect = element.getBoundingClientRect()
        if (rect.height > 0 && rect.width > 0) {
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
        }
      }
    }
    element = element.parentElement
    guard += 1
  }
  return null
}

/** 角标必须落在「真正裁剪正文的祖先」的可视矩形内，文本滚出去它也一起消失。 */
function badgeClip() {
  const chat = chatRoot()
  if (chat === null || chat === undefined) return null
  if (typeof chat.getBoundingClientRect !== 'function') return null
  const chatRect = chat.getBoundingClientRect()
  // 上边界：真正裁剪容器的顶边（也就是会话标题下沿）；找不到就用 chat 顶边。
  const scrollClip = clippingRect(chat)
  const base = scrollClip !== null ? scrollClip : { left: chatRect.left, right: chatRect.right, top: chatRect.top, bottom: chatRect.bottom }
  let top = base.top
  let bottom = base.bottom
  // 下边界：注释栏顶边 / 输入框顶边，谁更靠上就用谁——这两块区域不该被角标侵入。
  const readRect = (selector) => {
    if (typeof document.querySelector !== 'function') return null
    const node = document.querySelector(selector)
    if (node === null || node === undefined || typeof node.getBoundingClientRect !== 'function') return null
    const rect = node.getBoundingClientRect()
    return rect.height > 0 && rect.width > 0 ? rect : null
  }
  const dockRect = readRect('[data-annotations-dock]')
  const composerRect = readRect('[data-conversation-region="composer"]')
  if (dockRect !== null) bottom = Math.min(bottom, dockRect.top - 2)
  if (composerRect !== null) bottom = Math.min(bottom, composerRect.top - 2)
  if (bottom <= top) bottom = top + 1
  return { left: base.left, right: base.right, top, bottom }
}

const BADGE_CSS = 'position:fixed;display:inline-flex;align-items:center;justify-content:center;'
  + 'min-width:14px;height:14px;padding:0 3px;border-radius:7px;background:#2f6fed;color:#fff;'
  + 'font-size:10px;line-height:14px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.35);pointer-events:none'

/** 与 items 数量对不上的定位失败数，显示在注释栏标题里方便排查。 */
let badgeMissed = 0
/** 是否找到了真正的裁剪容器（找不到就退化成只按视口裁剪）。 */
let badgeClipFound = false

function syncBadges() {
  if (anchored.length === 0) { destroyBadges(); badgeMissed = 0; return }
  const layer = badgeLayer()
  if (layer === null) return
  const viewW = typeof window !== 'undefined' && typeof window.innerWidth === 'number' ? window.innerWidth : 0
  const viewH = typeof window !== 'undefined' && typeof window.innerHeight === 'number' ? window.innerHeight : 0
  const nodes = layer.childNodes !== undefined && layer.childNodes !== null ? layer.childNodes : []
  let used = 0
  let missed = 0
  for (const entry of anchored) {
    const range = entry.range
    let rect = null
    if (range !== null && range !== undefined && typeof range.getClientRects === 'function') {
      const rects = range.getClientRects()
      if (rects !== null && rects !== undefined && rects.length > 0) rect = rects[rects.length - 1]
    }
    if (rect === null || rect === undefined || rect.width === 0 && rect.height === 0) { missed += 1; continue }
    // 两层裁剪：视口 + 会话正文容器的可视矩形。
    // 文本滚出容器（被 overflow 裁掉）时，角标也必须一起消失，不能浮在空白处。
    const clip = badgeClip()
    badgeClipFound = clip !== null
    const badgeTop = rect.top - 17
    const badgeMid = badgeTop + 7
    const badgeLeft = rect.right - 7
    let inside = rect.bottom > 0 && rect.top < viewH && rect.right > 0 && rect.left < viewW
    if (inside && clip !== null) {
      inside = badgeMid >= clip.top - 1 && badgeMid <= clip.bottom + 1
        && badgeLeft >= clip.left - 1 && badgeLeft <= clip.right + 1
    }
    // 会话标题是 sticky/fixed 覆盖层：文本还在滚动区里、但被标题盖住时，
    // 矩形依然是正的，靠坐标判断不出来。直接问浏览器「这个点最上层是谁」。
    if (inside && typeof document.elementFromPoint === 'function') {
      const chat = chatRoot()
      const probeX = Math.min(Math.max(rect.left + 2, 0), Math.max(0, viewW - 1))
      const probeY = Math.min(Math.max(rect.top + Math.min(rect.height / 2, 6), 0), Math.max(0, viewH - 1))
      const hit = document.elementFromPoint(probeX, probeY)
      if (hit !== null && hit !== undefined && chat !== null && chat !== undefined && chat.contains !== undefined) {
        if (chat.contains(hit) !== true && hit !== chat) inside = false
      }
    }
    let node = nodes[used]
    if (node === undefined || node === null) {
      node = document.createElement('span')
      layer.appendChild(node)
    }
    node.textContent = String(entry.index)
    node.style.cssText = BADGE_CSS
    node.style.left = String(Math.round(rect.right - 7)) + 'px'
    node.style.top = String(Math.round(rect.top - 17)) + 'px'
    node.style.display = inside ? 'inline-flex' : 'none'
    used += 1
  }
  for (let i = used; i < nodes.length; i += 1) {
    const node = nodes[i]
    if (node !== null && node !== undefined && node.style !== undefined) node.style.display = 'none'
  }
  badgeMissed = missed + Math.max(0, shared.items.length - anchored.length)
}

/**
 * 已定位注释的 range 缓存：内容或尺寸变化时重算，正文只保留 CSS 高亮。
 * 编号不上正文（对齐 Codex：注释是选区元数据，正文保持干净），只出现在浮动按钮与注释栏。
 */
let anchored = []

/** 重画：一条注释一个 range，正文只画高亮。 */
let repaintRetry = null
function repaintHighlights() {
  const chat = chatRoot()
  if (chat === null && shared.items.length > 0) {
    // 注释数据可能先到、会话正文后渲染：等 DOM 挂上再画一次（最多 20 次 / 300ms）。
    if (repaintRetry === null) {
      let tries = 0
      const tick = () => {
        repaintRetry = null
        if (chatRoot() !== null) { repaintHighlights(); return }
        tries += 1
        if (tries < 20) repaintRetry = setTimeout(tick, 300)
      }
      repaintRetry = setTimeout(tick, 300)
    }
  }
  if (chat === null || shared.items.length === 0) {
    setHighlight(HL_SAVED, [])
    anchored = []
    destroyBadges()
    return
  }
  const index = textIndex(chat)
  const ranges = []
  const next = []
  for (const item of shared.items) {
    const at = locate(index, item.quote, item.prefix, item.suffix)
    if (at < 0) {
      if (item.stale !== true) markStale(item)
      continue
    }
    const range = rangeFromOffsets(index, at, at + item.quote.length)
    if (range === null) continue
    ranges.push(range)
    next.push({ index: item.index, range })
  }
  setHighlight(HL_SAVED, ranges)
  anchored = next
  syncBadges()
}

let badgeRaf = 0
/** 滚动/尺寸变化时只挪角标位置（Range 已缓存），用一帧合并多次事件。 */
function scheduleBadges() {
  if (typeof window === 'undefined' || window === null || typeof window.requestAnimationFrame !== 'function') {
    syncBadges()
    return
  }
  if (badgeRaf !== 0) return
  badgeRaf = window.requestAnimationFrame(() => {
    badgeRaf = 0
    syncBadges()
  })
}

const staleMarked = new Set()
function markStale(item) {
  if (staleMarked.has(item.id)) return
  staleMarked.add(item.id)
  postJson('/api/annotations/update', { sessionId: shared.sessionId, id: item.id, stale: true }).catch(() => {})
}

// ── 草稿读写（Lexical：只能用 execCommand + 回读校验） ──────────────────────
/** 引用的规模：`3 行 · 128 字`。行数按原选区里的换行算（浏览器在多行选区里会带 \n）。 */
/**
 * 人看的位置文案：只报行号（段号只用于内部定位，不展示）。
 * 同段落 → 「第 12–18 行」；跨段落 → 「第 12 行 → 第 4 行」。
 */
function whereLabel(item) {
  const lineStart = Number(item.lineStart) || 0
  const lineEnd = Number(item.lineEnd) || 0
  if (lineStart <= 0 && lineEnd <= 0) return ''
  const from = lineStart > 0 ? lineStart : 1
  if (lineEnd <= 0 || lineEnd === lineStart) return '第 ' + from + ' 行'
  return '第 ' + from + ' 行 → 第 ' + lineEnd + ' 行'
}

function draftLine(item) {
  const quote = String(item.quote || '').replace(/\s+/g, ' ').trim()
  const where = whereLabel(item)
  return draftMark(item.index) + (where === '' ? '' : ' ' + where) + ' "' + quote + '"：' + item.note
}

/** 从草稿里剥掉某条注释的块（多行块：从 `[注释 N]` 那行到下一个 `[注释 M]` 之前）。 */
function stripDraftBlock(text, mark) {
  const lines = text.split('\n')
  const keep = []
  let skipping = false
  for (const line of lines) {
    if (/^\s*(?:\[注释 \d+\]|注释 *\d+@)/u.test(line)) {
      if (mark === null) { skipping = false; continue }
      skipping = line.indexOf(mark) >= 0
      if (skipping) continue
    }
    if (!skipping) keep.push(line)
  }
  return keep.join('\n')
}

function draftText() {
  const editor = editorRoot()
  if (editor === null) return null
  try { return typeof editor.innerText === 'string' ? editor.innerText : (editor.textContent || '') } catch { return null }
}

function focusEditorEnd(editor) {
  try {
    const selection = window.getSelection()
    if (selection === null) return
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  } catch { /* 光标放不到末尾时退回默认位置 */ }
}

/** 把一行草稿写进输入框；已有同名编号就不重复写。 */
function insertDraft(item) {
  const editor = editorRoot()
  if (editor === null) return false
  const current = draftText()
  if (current !== null && current.indexOf(draftMark(item.index)) >= 0) return true
  focusEditorEnd(editor)
  const line = draftLine(item)
  // Lexical 在 root 上监听 paste，会把 \n 转成真正的段落；
  // insertText 不认换行，所以优先走 paste，失败再退回 insertText。
  const paste = (text) => {
    try {
      if (typeof DataTransfer !== 'function' || typeof ClipboardEvent !== 'function') return false
      const data = new DataTransfer()
      data.setData('text/plain', text)
      editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
      return true
    } catch { return false }
  }
  if (paste(current !== null && current.trim() !== '' ? '\n' + line : line)) {
    // Lexical 的 paste 是异步消化的，这里不能立刻回读；80ms 后还没看到编号就补一次 insertText。
    setTimeout(() => {
      const after = draftText()
      if (after !== null && after.indexOf(draftMark(item.index)) >= 0) return
      const again = editorRoot()
      if (again === null) return
      focusEditorEnd(again)
      try { document.execCommand('insertText', false, line) } catch { /* 忽略 */ }
    }, 80)
    return true
  }
  // paste 不可用时的兜底：Lexical 的 insertText 不认 \n，
  // 只能先 insertParagraph 另起一段，再插文本。
  const hasContent = current !== null && current.trim() !== ''
  const paragraph = () => {
    try {
      if (typeof document.execCommand === 'function') document.execCommand('insertParagraph', false)
    } catch { /* 不支持 insertParagraph 时退回纯文本换行 */ }
  }
  if (hasContent) paragraph()
  try {
    if (typeof document.execCommand === 'function' && document.execCommand('insertText', false, line)) {
      paragraph()
      return true
    }
  } catch { /* 老浏览器不支持 insertText */ }
  try {
    const selection = window.getSelection()
    if (selection === null || selection.rangeCount === 0) return false
    const range = selection.getRangeAt(0)
    range.deleteContents()
    range.insertNode(document.createTextNode(line))
    selection.collapseToEnd()
    return true
  } catch {
    return false
  }
}

/** 从草稿里删掉 `注释 N@…` 那一行（删不掉只提示，不回滚注释）。 */
/**
 * 编号紧凑重排后重写草稿：先剥掉所有「注释 N@…」行，再按当前条目顺序补回已插入的。
 * 用户自己写的其它行原样保留。
 */
function rebuildDraft() {
  const editor = editorRoot()
  if (editor === null) return
  const current = draftText()
  if (current === null) return
  let kept = stripDraftBlock(current, null).split('\n')
  while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop()
  const lines = shared.items
    .filter((item) => item.draftedAt !== null && item.draftedAt !== undefined)
    .map((item) => draftLine(item))
  if (lines.length === 0 && kept.length > 0 && current === kept.join('\n')) return
  const text = kept.concat(lines).join('\n')
  if (text === current) return
  focusEditorEnd(editor)
  try {
    if (typeof document.execCommand === 'function'
      && document.execCommand('selectAll', false, null)
      && document.execCommand('insertText', false, text)) return
  } catch { /* 退回 Range 方案 */ }
  try {
    const selection = window.getSelection()
    if (selection === null) return
    const range = document.createRange()
    range.selectNodeContents(editor)
    selection.removeAllRanges()
    selection.addRange(range)
    if (typeof range.deleteContents === 'function') range.deleteContents()
    range.insertNode(document.createTextNode(text))
  } catch { /* 写不进去就只保留注释栏的状态 */ }
}

function removeDraftLine(item) {
  const editor = editorRoot()
  if (editor === null) return false
  const current = draftText()
  if (current === null) return false
  if (current.indexOf(draftMark(item.index)) < 0) return true
  const keep = stripDraftBlock(current, draftMark(item.index)).split('\n')
  while (keep.length > 0 && keep[keep.length - 1].trim() === '') keep.pop()
  focusEditorEnd(editor)
  try {
    if (typeof document.execCommand === 'function' && document.execCommand('selectAll', false, null) && document.execCommand('insertText', false, keep.join('\n'))) return true
  } catch { /* 退回下面的 Range 方案 */ }
  try {
    const selection = window.getSelection()
    if (selection === null) return false
    const range = document.createRange()
    range.selectNodeContents(editor)
    selection.removeAllRanges()
    selection.addRange(range)
    if (typeof range.deleteContents === 'function') range.deleteContents()
    const node = document.createTextNode(keep.join('\n'))
    range.insertNode(node)
    return true
  } catch {
    return false
  }
}

// ── 数据 ────────────────────────────────────────────────────────────────────
function applyPage(page) {
  shared.sessionId = typeof page.sessionId === 'string' ? page.sessionId : shared.sessionId
  shared.sessionTitle = typeof page.sessionTitle === 'string' ? page.sessionTitle : ''
  shared.items = Array.isArray(page.items) ? page.items : []
  shared.nextIndex = typeof page.nextIndex === 'number' ? page.nextIndex : 1
  if (page.limits !== undefined && page.limits !== null) shared.limits = Object.assign(shared.limits, page.limits)
  publish()
  repaintHighlights()
  publish()
}

let loadToken = 0
function load() {
  if (shared.sessionId === '') {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_SESSION) : null
    if (typeof stored === 'string' && stored !== '') shared.sessionId = stored
  }
  if (shared.sessionId === '') return Promise.resolve()
  const token = ++loadToken
  shared.loading = true
  return fetchJson('/api/annotations?sessionId=' + encodeURIComponent(shared.sessionId))
    .then((page) => {
      if (token !== loadToken) return
      shared.loading = false
      applyPage(page)
    })
    .catch((error) => {
      shared.loading = false
      announce('读取注释失败：' + String(error && error.message ? error.message : error))
    })
}

function createAnnotation() {
  const selection = shared.selection
  if (selection === null) return
  shared.selection = null
  clearPreview()
  publish()
  postJson('/api/annotations', {
    sessionId: shared.sessionId,
    sessionTitle: shared.sessionTitle,
    quote: selection.quote,
    prefix: selection.prefix,
    suffix: selection.suffix,
    block: selection.block,
    offset: selection.offset,
    blockStart: selection.blockStart,
    blockEnd: selection.blockEnd,
    lineStart: selection.lineStart,
    lineEnd: selection.lineEnd,
    note: '',
  })
    .then((data) => {
      shared.items = shared.items.concat([data.item])
      shared.nextIndex = data.nextIndex
      publish()
      repaintHighlights()
      announce('已添加注释 ' + data.item.index + '，在输入框上方写内容')
    })
    .catch((error) => {
      announce('添加注释失败：' + String(error && error.message ? error.message : error))
    })
}

function saveNote(item, note) {
  return postJson('/api/annotations/update', { sessionId: shared.sessionId, id: item.id, note })
    .then((data) => {
      shared.items = shared.items.map((entry) => (entry.id === item.id ? data.item : entry))
      publish()
      repaintHighlights()
      if (data.item.note !== '') {
        const inserted = insertDraft(data.item)
        if (inserted) {
          postJson('/api/annotations/update', { sessionId: shared.sessionId, id: item.id, draftedAt: Date.now() }).catch(() => {})
          shared.items = shared.items.map((entry) => (entry.id === item.id ? Object.assign({}, entry, { draftedAt: Date.now() }) : entry))
          publish()
        } else {
          announce('注释已保存，但没写进输入框（找不到编辑区），可以点「重新插入」')
        }
      }
      return data.item
    })
}

function removeAnnotation(item) {
  return postJson('/api/annotations/delete', { sessionId: shared.sessionId, id: item.id })
    .then(() => {
      shared.items = shared.items.filter((entry) => entry.id !== item.id)
      // 编号紧凑：删掉第 1 条后，原来的第 2 条要变成 1
      shared.items.forEach((entry, position) => { entry.index = position + 1 })
      shared.nextIndex = shared.items.length + 1
      publish()
      repaintHighlights()
      rebuildDraft()
      announce('已删除注释 ' + item.index)
    })
    .catch((error) => announce('删除失败：' + String(error && error.message ? error.message : error)))
}

function clearAll() {
  const sessionId = shared.sessionId
  if (sessionId === '') return Promise.resolve()
  return postJson('/api/annotations/clear', { sessionId })
    .then(() => {
      const removed = shared.items.length
      shared.items = []
      shared.nextIndex = 1
      setHighlight(HL_SAVED, [])
      publish()
      if (removed > 0) announce('已清空 ' + removed + ' 条注释')
    })
    .catch((error) => announce('清空失败：' + String(error && error.message ? error.message : error)))
}

// ── 划词浮层按钮 ────────────────────────────────────────────────────────────
function Overlay() {
  const [selection, setSelection] = React.useState(shared.selection)
  React.useEffect(() => subscribe(() => setSelection(shared.selection)), [])
  if (selection === null) return null
  const overlap = shared.items.find((item) => item.quote !== '' && (selection.quote.indexOf(item.quote) >= 0 || item.quote.indexOf(selection.quote) >= 0))
  const editing = overlap !== undefined && overlap.note !== ''
  const label = editing ? '编辑 注释 ' + overlap.index : '＋ 注释 ' + shared.nextIndex
  // 按钮放在选区最后一行的**右外侧**，不压在文字上；贴到视口右边就翻到左侧，
  // 贴到底部就往上收。rect 已经是「选区最后一行」的矩形（见 describeSelection），
  // 所以多行选区也不会跑到整段的外接角上。
  const rect = selection.rect
  const viewportWidth = typeof window !== 'undefined' && typeof window.innerWidth === 'number' ? window.innerWidth : 1200
  const viewportHeight = typeof window !== 'undefined' && typeof window.innerHeight === 'number' ? window.innerHeight : 800
  const buttonWidth = 112
  let left = 120
  let top = 120
  if (rect !== null) {
    left = rect.right + 8
    if (left + buttonWidth > viewportWidth - 8) left = Math.max(8, rect.right - buttonWidth)
    top = Math.min(rect.bottom + 6, viewportHeight - 44)
  }
  return React.createElement(
    'div',
    null,
    React.createElement('div', {
      className: 'an-float',
      // 定位必须内联：shell.overlay 的容器不一定吃到 document.head 里的样式表，
      // 只给 class 会退化成 static —— left/top 失效，按钮被塞进 slot 容器的角落（看起来像"没出来"）。
      style: { position: 'fixed', left: left + 'px', top: top + 'px', zIndex: 2147483000, pointerEvents: 'auto', margin: 0, padding: 0, lineHeight: 0 },
    },
      React.createElement('button', {
        type: 'button',
        className: 'an-float-btn an-float-btn-primary',
        // 关键样式再内联一份：shell.overlay 的作用域不一定吃到 document.head 里的
        // 主题/样式表，只靠 class 会退化成浏览器默认按钮（深色界面上就是白底白字）。
        style: {
          fontSize: '12px',
          lineHeight: '20px',
          padding: '5px 12px',
          borderRadius: '16px',
          border: '1px solid #2f6fed',
          background: '#2f6fed',
          color: '#ffffff',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,.32)',
          whiteSpace: 'nowrap',
        },
        title: editing ? '这段已经注过，点它是改那一条' : '保存后写进输入框上方的注释栏',
        onMouseDown: (event) => { if (event !== null && typeof event.preventDefault === 'function') event.preventDefault() },
        onClick: () => {
          if (editing) {
            shared.selection = null
            publish()
            announce('注释 ' + overlap.index + ' 在输入框上方的注释栏里')
            return
          }
          createAnnotation()
        },
      }, label)),
  )
}

// ── 注释栏（conversation.input.dock, order 30） ─────────────────────────────
function Dock() {
  const [items, setItems] = React.useState(shared.items)
  const [notice, setNotice] = React.useState(shared.notice)
  const [collapsed, setCollapsed] = React.useState(false)
  const [drafts, setDrafts] = React.useState({})
  // 已保存的注释收成一个「注释 N」小标签；点它回到编辑态。
  const [editingId, setEditingId] = React.useState('')
  // 悬停标签时自绘 tips（原生 title 在停靠区里不弹，且只能显示纯文本）。
  const [hover, setHover] = React.useState(null)
  // 注释栏宽度跟着输入框本体走：dock 容器比 composer 卡片宽，直接 100% 会「比输入框宽一截」。
  const [composerWidth, setComposerWidth] = React.useState(0)
  const [dockMax, setDockMax] = React.useState(0)
  React.useEffect(() => subscribe(() => {
    setItems(shared.items.slice())
    setNotice(shared.notice)
  }), [])
  React.useEffect(() => {
    const measure = () => {
      // 只量输入框本体（contenteditable 根）。composer region 是全宽容器，
      // 用它会让注释栏仍然比输入卡片宽一截。
      const editor = editorRoot()
      const composer = typeof document !== 'undefined' && typeof document.querySelector === 'function'
        ? document.querySelector('[data-conversation-region="composer"]')
        : null
      const node = editor !== null ? editor : composer
      let width = 0
      if (node !== null && node !== undefined && typeof node.getBoundingClientRect === 'function') {
        const box = node.getBoundingClientRect()
        width = box !== null && typeof box.width === 'number' ? box.width : 0
      }
      setComposerWidth(width > 120 ? Math.round(width) : 0)
      // 注释栏在输入框上方；粘贴图片后 composer 会长高，把注释栏顶出去。
      // 按「输入框顶边 - 聊天区顶边」算一个上限，超高就自己内部滚动，不再顶没。
      const chat = chatRoot()
      const top = composerTop()
      let max = 0
      if (chat !== null && top !== null && typeof chat.getBoundingClientRect === 'function') {
        const box = chat.getBoundingClientRect()
        if (box !== null && box !== undefined && typeof box.top === 'number') {
          max = Math.max(96, Math.round(top - box.top - 24))
        }
      }
      setDockMax(max)
    }
    measure()
    // 粘贴图片 / 拖入附件会让 composer 长高，window 的 resize 不会触发；用 ResizeObserver 盯住它。
    let observer = null
    const editor = editorRoot()
    if (editor !== null && typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(() => measure())
      observer.observe(editor)
    }
    const target = typeof window !== 'undefined' && typeof window.addEventListener === 'function' ? window : null
    if (target !== null) {
      target.addEventListener('resize', measure)
      const timer = setTimeout(measure, 300)
      return () => {
        clearTimeout(timer)
        target.removeEventListener('resize', measure)
        if (observer !== null) observer.disconnect()
      }
    }
    return () => { if (observer !== null) observer.disconnect() }
  }, [])
  if (items.length === 0) return null
  const open = items.filter((item) => item.note === '').length
  const save = (item) => {
    const text = typeof drafts[item.id] === 'string' ? drafts[item.id].trim() : ''
    if (text === '') {
      announce('先写点内容再保存')
      return
    }
    saveNote(item, text)
      .then(() => setEditingId(''))
      .catch((error) => announce('保存失败：' + String(error && error.message ? error.message : error)))
  }
  const rows = items.map((item) => {
    const editing = item.note === '' || editingId === item.id
    if (!editing) {
      return React.createElement('div', { className: 'an-item', style: S.item, key: item.id },
        React.createElement('button', {
          type: 'button',
          className: 'an-chip',
          style: S.chip,
          onMouseEnter: (event) => {
            const node = event !== null && event !== undefined && typeof event.target?.getBoundingClientRect === 'function'
              ? event.target
              : null
            const box = node !== null ? node.getBoundingClientRect() : null
            const viewW = typeof window !== 'undefined' && typeof window.innerWidth === 'number' ? window.innerWidth : 1200
            const viewH = typeof window !== 'undefined' && typeof window.innerHeight === 'number' ? window.innerHeight : 800
            setHover({
              id: item.id,
              left: box !== null ? Math.max(12, Math.min(box.left, viewW - 440)) : 24,
              bottom: box !== null ? Math.max(12, viewH - box.top + 8) : 200,
            })
          },
          onMouseLeave: () => setHover(null),
          onClick: () => {
            setDrafts(Object.assign({}, drafts, { [item.id]: item.note }))
            setHover(null)
            setEditingId(item.id)
          },
        }, '注释 ' + item.index))
    }
    const ops = []
    ops.push(React.createElement('button', {
      key: 'del', type: 'button', style: btnStyle(S.btnDanger),
      onClick: () => {
        setEditingId('')
        removeAnnotation(item)
      },
    }, '删除'))
    if (item.note !== '') {
      ops.push(React.createElement('button', {
        key: 'insert',
        type: 'button',
        style: btnStyle(),
        title: '把这一条重新写进输入框',
        onClick: () => {
          const editor = editorRoot()
          if (editor !== null) focusEditorEnd(editor)
          if (insertDraft(item)) announce('已把注释 ' + item.index + ' 写进输入框')
          else announce('没找到输入框，复制这行手动粘贴：' + draftLine(item))
        },
      }, '重新插入'))
    }
    ops.push(React.createElement('button', {
      key: 'save', type: 'button', style: btnStyle(S.btnPrimary),
      onClick: () => save(item),
    }, '保存'))
    return React.createElement('div', { className: 'an-item', style: S.item, key: item.id },
      React.createElement('span', { style: S.num }, String(item.index)),
      React.createElement('div', { style: S.editor },
        React.createElement('textarea', {
          style: S.textarea,
          value: typeof drafts[item.id] === 'string' ? drafts[item.id] : '',
          placeholder: '写这条注释…（保存后会写进下面的输入框）',
          onChange: (event) => setDrafts(Object.assign({}, drafts, { [item.id]: event.target.value })),
          autoFocus: true,
        }),
        React.createElement('div', { style: S.ops }, ops)))
  })
  const hovered = hover === null ? null : items.find((item) => item.id === hover.id) || null
  const tips = hovered === null ? null : React.createElement('div', {
    className: 'an-tips',
    style: Object.assign({}, S.tips, { left: hover.left, bottom: hover.bottom }),
  },
    React.createElement('div', { style: S.tipsHead },
      '注释 ' + hovered.index + (whereLabel(hovered) === '' ? '' : ' · ' + whereLabel(hovered))),
    React.createElement('div', { style: S.tipsQuote }, hovered.quote),
    React.createElement('div', { style: S.tipsNote }, hovered.note))
  const dockStyle = Object.assign({}, S.dock,
    composerWidth > 0 ? { maxWidth: composerWidth + 'px', marginLeft: 'auto', marginRight: 'auto' } : {},
    dockMax > 0 ? { maxHeight: dockMax + 'px' } : {})
  return React.createElement('div', { className: 'an-dock', 'data-annotations-dock': '', style: dockStyle },
    React.createElement('div', { style: S.head },
      React.createElement('span', { style: S.title }, '注释 · ' + items.length + ' 条' + (open > 0 ? '（另有 ' + open + ' 条编辑中）' : '')
        + ' · 定位 ' + Math.max(0, items.length - badgeMissed) + '/' + items.length
        + ' · 裁剪 ' + (badgeClipFound ? '有' : '无')
        + ' · ' + BUILD_TAG),
      notice !== '' ? React.createElement('span', { style: S.flag }, notice) : null,
      React.createElement('div', { style: S.ops },
        React.createElement('button', {
          type: 'button', style: btnStyle(),
          onClick: () => setCollapsed(!collapsed),
        }, collapsed ? '展开' : '收起'))),
    collapsed ? null : rows,
    collapsed ? null : tips)
}

// ── toolkit 分页「注释」 ────────────────────────────────────────────────────
function Panel() {
  const [items, setItems] = React.useState(shared.items)
  const [notice, setNotice] = React.useState(shared.notice)
  const [sessions, setSessions] = React.useState([])
  React.useEffect(() => subscribe(() => {
    setItems(shared.items.slice())
    setNotice(shared.notice)
  }), [])
  React.useEffect(() => {
    fetchJson('/api/annotations/index').then((data) => setSessions(Array.isArray(data.sessions) ? data.sessions : [])).catch(() => {})
  }, [])
  const rows = items.length === 0
    ? React.createElement('div', { style: S.empty }, '这个会话还没有注释。在会话正文里划词，松开鼠标就会出现「＋ 注释 N」按钮。')
    : items.map((item) => React.createElement('div', { style: S.item, key: item.id },
        React.createElement('span', { style: S.num }, String(item.index)),
        whereLabel(item) === ''
        ? null
        : React.createElement('span', { style: S.where, title: item.quote }, whereLabel(item)),
        React.createElement('div', { style: S.editor },
          React.createElement('div', { style: S.note }, item.note === '' ? '（编辑中，还没写内容）' : item.note),
          React.createElement('div', { style: S.ops },
            React.createElement('button', {
              type: 'button',
              style: btnStyle(),
              onClick: () => {
                if (editorRoot() !== null) focusEditorEnd(editorRoot())
                insertDraft(item)
              },
            }, '插入草稿')))))
  return React.createElement('div', { className: 'an-panel', style: S.panel },
    React.createElement('div', { style: S.panelTop },
      React.createElement('span', { style: S.panelTitle }, '注释'),
      React.createElement('span', { style: S.panelSub }, '划词即出按钮，保存后写进输入框上方的注释栏；正文只保留高亮，编号在注释栏里。' + ' · ' + BUILD_TAG),
      React.createElement('div', { style: S.ops },
        notice !== '' ? React.createElement('span', { style: S.flag }, notice) : null,
        React.createElement('button', {
          type: 'button',
          style: btnStyle(S.btnDanger),
          onClick: () => {
            if (items.length === 0) return
            if (typeof window !== 'undefined' && typeof window.confirm === 'function' && window.confirm('清空这个会话的全部注释？') !== true) return
            clearAll()
          },
        }, '清空本会话'),
        React.createElement('button', { type: 'button', style: btnStyle(), onClick: () => { load() } }, '刷新'))),
    React.createElement('div', { style: S.panelBody }, rows),
    sessions.length === 0 ? null : React.createElement('div', { style: S.panelBody },
      React.createElement('div', { style: S.panelSub }, '有注释的会话（' + sessions.length + '）'),
      sessions.slice(0, 30).map((row) => React.createElement('div', { style: S.item, key: row.sessionId },
        React.createElement('span', { style: S.quote, title: row.sessionId }, row.sessionTitle !== '' ? row.sessionTitle : row.sessionId),
        React.createElement('span', { style: S.flag }, row.count + ' 条' + (row.open > 0 ? ' · ' + row.open + ' 编辑中' : ''))))))
}

// ── 生命周期 ────────────────────────────────────────────────────────────────
return {
  inject: ['slots', 'layout'],
  apply(ctx) {
  const slots = ctx.slots
  const registry = typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null

  ctx.effect(() => {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return () => {}
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
    return () => el.remove()
  }, 'annotations: styles')

  // ── 当前会话（composer.dock 是 session 作用域，标准 props 带 sessionId）──
  function FocusTracker(props) {
    const sessionId = props !== null && typeof props === 'object' && typeof props.sessionId === 'string' ? props.sessionId : ''
    React.useEffect(() => {
      if (sessionId === '') return undefined
      if (shared.sessionId !== sessionId) {
        shared.sessionId = sessionId
        shared.items = []
        shared.selection = null
        clearPreview()
        publish()
        if (typeof localStorage !== 'undefined') {
          try { localStorage.setItem(LS_SESSION, sessionId) } catch { /* 隐私模式 */ }
        }
        load()
      }
      return undefined
    }, [sessionId])
    return null
  }

  // 注册一律走 safeInject：DSH 的 slots.inject 会把 callback 里的异常转成
  // 异步重抛（queueMicrotask），一处注册失败就会把整个客户端 bundle 顶掉，
  // 连带把「工具集」入口和其它面板一起弄没。每个注册单独兜住，失败只 console.warn。
  const warnSlot = (key, error) => {
    if (typeof console !== 'undefined' && console !== null && typeof console.warn === 'function') {
      console.warn('[annotations] 注册插槽 ' + key + ' 失败：', error)
    }
  }
  const safeInject = (key, options, component) => {
    try {
      slots.inject(key, () => {
        try {
          return slots.register(options, component)
        } catch (error) {
          warnSlot(key, error)
          return () => {}
        }
      })
    } catch (error) {
      warnSlot(key, error)
    }
  }
  safeInject('conversation.composer.dock', { name: 'conversation.composer.dock', id: 'annotations-focus', order: 90 }, FocusTracker)
  safeInject('conversation.input.dock', { name: 'conversation.input.dock', id: 'annotations-dock', order: 30 }, Dock)
  safeInject('shell.overlay', { name: 'shell.overlay', id: 'annotations-overlay', order: 60 }, Overlay)
  safeInject('main', { name: 'main', key: PANEL_KEY }, Panel)
  if (registry !== null) {
    try {
      registry.register({ id: PANEL_KEY, Panel, label: LABEL, order: ORDER, glyphText: 'A' })
    } catch (error) {
      warnSlot('toolkit-registry', error)
    }
  } else {
    safeInject('sidebar.panellist', { name: 'sidebar.panellist', id: PANEL_KEY, label: LABEL, order: ORDER },
      () => React.createElement('span', { className: 'an-flag' }, 'A'))
  }

  // ── 全文索引缓存失效：聊天内容一变（新消息、流式追加、折叠展开）就置脏 ──
  ctx.effect(() => {
    if (typeof MutationObserver !== 'function') return () => {}
    let observer = null
    const attach = () => {
      const chat = chatRoot()
      if (chat === null || observer !== null) return
      observer = new MutationObserver(() => invalidateIndex())
      observer.observe(chat, { childList: true, subtree: true, characterData: true })
      invalidateIndex()
    }
    let timer = null
    const attachAndStop = () => {
      attach()
      if (observer !== null && timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }
    // chat 是异步挂载的，第一次取不到就低频重试（2s 一次，拿到即停）。
    attachAndStop()
    if (observer === null && typeof setInterval === 'function') timer = setInterval(attachAndStop, 2000)
    return () => {
      if (timer !== null) clearInterval(timer)
      if (observer !== null) observer.disconnect()
    }
  }, 'annotations: index cache')

  // ── 划词：mouseup 立即出（不等停顿）──
  if (typeof document !== 'undefined' && document !== null && typeof document.addEventListener === 'function') {
    let delay = null
    const clearSelection = () => {
      if (shared.selection === null) return
      shared.selection = null
      clearPreview()
      publish()
    }
    const pick = () => {
      delay = null
      delayRaf = false
      if (shared.limits.floatingButton === false) return
      const chat = chatRoot()
      if (chat === null) return clearSelection()
      const next = describeSelection(chat)
      if (next === null) return clearSelection()
      shared.selection = next
      // 预览高亮直接用当前选区自己的 range，不必再回全文里找一遍。
      let range = null
      if (next.rect !== null) {
        try {
          const selection = typeof window.getSelection === 'function' ? window.getSelection() : null
          range = selection !== null && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
        } catch { range = null }
      }
      if (range !== null) setHighlight(HL_PREVIEW, [range])
      publish()
    }
    // 鼠标刚松开时浏览器还要处理选区绘制；同一帧里做 TreeWalker + 取矩形会让按钮「迟一拍」。
    // 放到下一帧（无 rAF 的环境退回 setTimeout 0），手感立刻就跟上。
    let delayRaf = false
    const cancelDelay = () => {
      if (delay === null) return
      if (delayRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(delay)
      else clearTimeout(delay)
      delay = null
      delayRaf = false
    }
    const nextFrame = (fn) => {
      if (typeof requestAnimationFrame === 'function') {
        delayRaf = true
        return requestAnimationFrame(() => { delay = null; delayRaf = false; fn() })
      }
      delayRaf = false
      return setTimeout(fn, 0)
    }
    const schedule = () => {
      cancelDelay()
      const wait = Number(shared.limits.selectionDelay) || 0
      if (wait <= 0) {
        delay = nextFrame(pick)
      } else {
        delay = setTimeout(pick, wait)
      }
    }
    const onMouseUp = (event) => {
      if (event !== null && event.button !== undefined && event.button !== 0) return
      // 点在注释栏 / 输入框里不算划词：否则浮动按钮会跑到注释栏旁边。
      const target = event !== null && event !== undefined ? event.target : null
      if (target !== null && target !== undefined && typeof target.closest === 'function'
        && target.closest('textarea, input, .an-dock, [contenteditable="true"]') !== null) {
        clearSelection()
        return
      }
      schedule()
    }
    const onSelectionChange = () => {
      // 鼠标拖动由 mouseup 负责；这里只接键盘选择（Shift+方向键、三击）。
      if (shared.selection !== null) return
      // 正在注释栏 / 输入框里编辑时，浏览器还留着旧的正文选区，别据此再弹按钮。
      const active = typeof document !== 'undefined' ? document.activeElement : null
      if (active !== null && active !== undefined) {
        const tag = typeof active.tagName === 'string' ? active.tagName.toLowerCase() : ''
        if (tag === 'textarea' || tag === 'input' || active.isContentEditable === true) return
      }
      const chat = chatRoot()
      if (chat === null) return
      const next = describeSelection(chat)
      if (next === null) return
      shared.selection = next
      publish()
    }
    const onScroll = () => {
      clearSelection()
      scheduleBadges()
    }
    const onKeyDown = (event) => {
      if (event !== null && event.key === 'Escape') clearSelection()
    }
    // 窗口尺寸变化后选区矩形会变，角标要跟着重画。
    let repaintTimer = null
    const onResize = () => {
      if (repaintTimer !== null) clearTimeout(repaintTimer)
      repaintTimer = setTimeout(() => { repaintTimer = null; repaintHighlights(); syncBadges() }, 120)
    }
    if (typeof window !== 'undefined' && window !== null && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', onResize)
    }
    document.addEventListener('mouseup', onMouseUp, true)
    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('scroll', onScroll, true)
    document.addEventListener('keydown', onKeyDown, true)
    ctx.effect(() => () => {
      cancelDelay()
      if (repaintTimer !== null) clearTimeout(repaintTimer)
      if (typeof window !== 'undefined' && window !== null && typeof window.removeEventListener === 'function') {
        window.removeEventListener('resize', onResize)
      }
      if (typeof document.removeEventListener !== 'function') return
      document.removeEventListener('mouseup', onMouseUp, true)
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }, 'annotations: selection listeners')

    // 发送检测：草稿在一次突变里被清空 → 600ms 后仍为空 → 视为已发送，清空注释。
    // 手动逐字删除不会在一次突变里清空，因此不会被误判（功能案 §9 有说明）。
    let lastDraft = ''
    ctx.effect(() => {
      const editor = editorRoot()
      if (editor === null || typeof MutationObserver !== 'function') return () => {}
      const observer = new MutationObserver(() => {
        const current = draftText()
        if (current === null) return
        const wasText = lastDraft.trim() !== ''
        lastDraft = current
        if (wasText && current.trim() === '' && shared.items.length > 0) {
          setTimeout(() => {
            const still = draftText()
            if (still !== null && still.trim() === '') clearAll()
          }, 600)
        }
      })
      try { observer.observe(editor, { childList: true, subtree: true, characterData: true }) } catch { return () => {} }
      return () => { try { observer.disconnect() } catch { /* 已断开 */ } }
    }, 'annotations: send watcher')
  }

  // 首次加载（浏览器刷新后会话 id 由 FocusTracker 给出；面板想先有数据可手动刷新）
    load()
  },
  }
  },
})
