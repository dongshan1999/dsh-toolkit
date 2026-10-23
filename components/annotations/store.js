/**
 * @local/annotations — 注释的落盘与索引（Host 侧，无路由、无 ctx 副作用）。
 *
 * 一个会话一个文件：annotations/<sessionId>.json
 *
 *   {
 *     version: 1,
 *     sessionId: 'session-00000000…',
 *     nextIndex: 4,               // 下一个可用编号；删除不重排，只增不减
 *     items: [{
 *       id: 'a1-lz9k2',           // 编号 + 时间戳 base36，前端拿它做 key
 *       index: 1,                 // 会话内编号（正文上标 / 按钮 / 注释栏三处同源）
 *       note: '',                 // 空串 = 还在「编辑中」
 *       quote: 'git clean -fdx',  // 划中的原文
 *       prefix: '建议先跑 ',       // 原文前 32 字，用于在正文里重新定位
 *       suffix: '\n',
 *       block: 3,                 // 选区所在文本块序号（兜底定位）
 *       offset: 128,              // 块内字符偏移（兜底定位）
 *       createdAt: 1761…, updatedAt: 1761…,
 *       draftedAt: 1761… | null,  // 第一次被写进草稿的时间，仅展示，不回写状态
 *       stale: false              // 原文已改动、找不到这段文本
 *     }]
 *   }
 *
 * 索引 index.json：{ version:1, sessions: { <sessionId>: { sessionTitle, count, open, updatedAt } } }
 *   count = 该会话注释总数，open = 还在编辑中（note 为空）的条数。
 *
 * 写文件一律 tmp + rename、0600，目录 0700；读不到就当空，不让面板报错。
 */
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { indexFile, maxPerSession, quoteChars, sessionFile } from './paths.js?v=2'

export const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
export const ITEM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/
/** 单条注释正文最多存多少字符（防止手滑粘一篇文章进来）。 */
export const NOTE_CHARS = 4000
/** 定位用的上下文各存多少字符。 */
export const CONTEXT_CHARS = 32

export class AnnotationsError {
  constructor(code, message, status = 400) {
    this.code = code
    this.message = message
    this.status = status
  }
}

function cleanText(value) {
  return typeof value === 'string' ? value : ''
}

function cleanInt(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback
}

function assertSessionId(value) {
  const text = cleanText(value).trim()
  if (!SESSION_ID_PATTERN.test(text)) {
    throw new AnnotationsError('annotations/invalid', 'sessionId 不合法')
  }
  return text
}

function assertItemId(value) {
  const text = cleanText(value).trim()
  if (!ITEM_ID_PATTERN.test(text)) {
    throw new AnnotationsError('annotations/invalid', 'id 不合法')
  }
  return text
}

function emptySession(sessionId) {
  return { version: 1, sessionId, nextIndex: 1, items: [] }
}

function normalizeItem(raw) {
  const item = raw !== null && typeof raw === 'object' ? raw : {}
  const note = cleanText(item.note).slice(0, NOTE_CHARS)
  return {
    id: cleanText(item.id),
    index: cleanInt(item.index, 0),
    note,
    quote: cleanText(item.quote).slice(0, quoteChars()),
    prefix: cleanText(item.prefix).slice(0, CONTEXT_CHARS),
    suffix: cleanText(item.suffix).slice(0, CONTEXT_CHARS),
    block: cleanInt(item.block, -1),
    offset: cleanInt(item.offset, -1),
    blockStart: cleanInt(item.blockStart, 0),
    blockEnd: cleanInt(item.blockEnd, 0),
    lineStart: cleanInt(item.lineStart, 0),
    lineEnd: cleanInt(item.lineEnd, 0),
    createdAt: cleanInt(item.createdAt, 0),
    updatedAt: cleanInt(item.updatedAt, 0),
    draftedAt: item.draftedAt === null || item.draftedAt === undefined ? null : cleanInt(item.draftedAt, 0),
    stale: item.stale === true,
  }
}

function normalizeSession(raw, sessionId) {
  const data = raw !== null && typeof raw === 'object' ? raw : {}
  const items = Array.isArray(data.items) ? data.items.map(normalizeItem).filter((item) => item.id !== '') : []
  items.sort((left, right) => left.index - right.index)
  const maxIndex = items.reduce((top, item) => Math.max(top, item.index), 0)
  return {
    version: 1,
    sessionId,
    nextIndex: Math.max(cleanInt(data.nextIndex, 1), maxIndex + 1, 1),
    items,
  }
}

/** 读 JSON：文件不存在 / 内容坏了都退回 fallback，不让面板因一个坏文件整页报错。 */
async function readJson(file, fallback) {
  try {
    const text = await readFile(file, 'utf8')
    const parsed = JSON.parse(text)
    return parsed !== null && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

/** 原子写：同目录 tmp → rename，权限 0600，目录 0700。 */
async function writeJson(file, data) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 })
  const tmp = file + '.tmp-' + process.pid + '-' + Math.random().toString(36).slice(2, 8)
  try {
    await writeFile(tmp, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 })
    await rename(tmp, file)
  } catch (cause) {
    try { await rm(tmp, { force: true }) } catch { /* 临时文件清不掉就留着 */ }
    throw cause
  }
}

export async function readSession(sessionId) {
  const id = assertSessionId(sessionId)
  return normalizeSession(await readJson(sessionFile(id), null), id)
}

async function writeSession(data) {
  await writeJson(sessionFile(data.sessionId), data)
}

function summaryOf(data, sessionTitle) {
  const open = data.items.filter((item) => item.note === '').length
  return {
    sessionId: data.sessionId,
    sessionTitle: cleanText(sessionTitle).slice(0, 200),
    count: data.items.length,
    open,
    updatedAt: Date.now(),
  }
}

/** 更新会话汇总；写失败不影响注释本身。 */
async function touchIndex(data, sessionTitle) {
  try {
    const index = await readJson(indexFile(), { version: 1, sessions: {} })
    const sessions = index.sessions !== null && typeof index.sessions === 'object' ? index.sessions : {}
    const previous = sessions[data.sessionId]
    const title = cleanText(sessionTitle) !== '' ? sessionTitle : cleanText(previous?.sessionTitle)
    if (data.items.length === 0) {
      delete sessions[data.sessionId]
    } else {
      sessions[data.sessionId] = summaryOf(data, title)
    }
    await writeJson(indexFile(), { version: 1, sessions })
  } catch { /* 汇总只是列表用，坏了不影响读写会话文件 */ }
}

export async function listItems(sessionId) {
  const data = await readSession(sessionId)
  const index = await readJson(indexFile(), { version: 1, sessions: {} })
  const summary = index.sessions !== null && typeof index.sessions === 'object' ? index.sessions[data.sessionId] : null
  return {
    sessionId: data.sessionId,
    sessionTitle: cleanText(summary?.sessionTitle),
    nextIndex: data.nextIndex,
    total: data.items.length,
    open: data.items.filter((item) => item.note === '').length,
    items: data.items,
  }
}

export async function createItem(input) {
  const options = input !== null && typeof input === 'object' ? input : {}
  const sessionId = assertSessionId(options.sessionId)
  const quote = cleanText(options.quote).slice(0, quoteChars())
  if (quote.trim() === '') {
    throw new AnnotationsError('annotations/invalid', 'quote 不能为空')
  }
  const data = await readSession(sessionId)
  if (data.items.length >= maxPerSession()) {
    throw new AnnotationsError('annotations/limit', '这个会话的注释数量已到上限（' + maxPerSession() + ' 条）', 409)
  }
  const now = Date.now()
  const index = data.items.length + 1
  const note = cleanText(options.note).slice(0, NOTE_CHARS)
  const item = {
    id: 'a' + index + '-' + now.toString(36),
    index,
    note,
    quote,
    prefix: cleanText(options.prefix).slice(-CONTEXT_CHARS),
    suffix: cleanText(options.suffix).slice(0, CONTEXT_CHARS),
    block: cleanInt(options.block, -1),
    offset: cleanInt(options.offset, -1),
    blockStart: cleanInt(options.blockStart, 0),
    blockEnd: cleanInt(options.blockEnd, 0),
    lineStart: cleanInt(options.lineStart, 0),
    lineEnd: cleanInt(options.lineEnd, 0),
    createdAt: now,
    updatedAt: now,
    draftedAt: note === '' ? null : now,
    stale: false,
  }
  data.nextIndex = index + 1
  data.items.push(item)
  await writeSession(data)
  await touchIndex(data, options.sessionTitle)
  return item
}

export async function updateItem(sessionId, id, patch) {
  const data = await readSession(sessionId)
  const itemId = assertItemId(id)
  const item = data.items.find((entry) => entry.id === itemId)
  if (item === undefined) {
    throw new AnnotationsError('annotations/not-found', '这条注释不存在（可能已经被删掉）', 404)
  }
  const options = patch !== null && typeof patch === 'object' ? patch : {}
  if (typeof options.note === 'string') item.note = options.note.slice(0, NOTE_CHARS)
  if (typeof options.quote === 'string' && options.quote.trim() !== '') item.quote = options.quote.slice(0, quoteChars())
  if (typeof options.prefix === 'string') item.prefix = options.prefix.slice(-CONTEXT_CHARS)
  if (typeof options.suffix === 'string') item.suffix = options.suffix.slice(0, CONTEXT_CHARS)
  if (options.block !== undefined) item.block = cleanInt(options.block, item.block)
  if (options.offset !== undefined) item.offset = cleanInt(options.offset, item.offset)
  if (options.blockStart !== undefined) item.blockStart = cleanInt(options.blockStart, item.blockStart)
  if (options.blockEnd !== undefined) item.blockEnd = cleanInt(options.blockEnd, item.blockEnd)
  if (options.lineStart !== undefined) item.lineStart = cleanInt(options.lineStart, item.lineStart)
  if (options.lineEnd !== undefined) item.lineEnd = cleanInt(options.lineEnd, item.lineEnd)
  if (options.stale !== undefined) item.stale = options.stale === true
  // 只在第一次插入草稿时记录，之后重新插入不覆盖（仅展示用）。
  // 第一次保存出内容也算插入（前端保存后立即写草稿）。
  if (item.draftedAt === null && item.note !== '') {
    item.draftedAt = cleanInt(options.draftedAt, Date.now())
  }
  item.updatedAt = Date.now()
  await writeSession(data)
  await touchIndex(data, options.sessionTitle)
  return item
}

/** 编号始终紧凑：1..n，nextIndex = n + 1（删除后后面的注释补上前面空出来的号）。 */
function compactIndexes(data) {
  data.items.forEach((entry, position) => { entry.index = position + 1 })
  data.nextIndex = data.items.length + 1
}

export async function deleteItem(sessionId, id) {
  const data = await readSession(sessionId)
  const itemId = assertItemId(id)
  const position = data.items.findIndex((entry) => entry.id === itemId)
  if (position < 0) {
    throw new AnnotationsError('annotations/not-found', '这条注释不存在（可能已经被删掉）', 404)
  }
  const [removed] = data.items.splice(position, 1)
  compactIndexes(data)
  await writeSession(data)
  await touchIndex(data)
  return removed
}

/** 发送后清空：条目全删、编号重置回 1（不归档，与功能案 D4 一致）。 */
export async function clearSession(sessionId) {
  const data = await readSession(sessionId)
  const cleared = data.items.length
  data.items = []
  data.nextIndex = 1
  await writeSession(data)
  await touchIndex(data)
  return { cleared }
}

export async function listSessions() {
  const index = await readJson(indexFile(), { version: 1, sessions: {} })
  const sessions = index.sessions !== null && typeof index.sessions === 'object' ? index.sessions : {}
  const rows = Object.entries(sessions).map(([sessionId, summary]) => ({
    sessionId,
    sessionTitle: cleanText(summary?.sessionTitle),
    count: cleanInt(summary?.count, 0),
    open: cleanInt(summary?.open, 0),
    updatedAt: cleanInt(summary?.updatedAt, 0),
  }))
  rows.sort((left, right) => right.updatedAt - left.updatedAt)
  return { total: rows.length, sessions: rows }
}

/** 删掉一个会话的注释文件；不传 sessionId 时清空整个注释目录的会话文件。 */
export async function purgeSessions(sessionId) {
  const index = await readJson(indexFile(), { version: 1, sessions: {} })
  const sessions = index.sessions !== null && typeof index.sessions === 'object' ? index.sessions : {}
  if (sessionId !== undefined && sessionId !== null && sessionId !== '') {
    const id = assertSessionId(sessionId)
    try { await rm(sessionFile(id), { force: true }) } catch { /* 已经不在 */ }
    delete sessions[id]
    await writeJson(indexFile(), { version: 1, sessions })
    return { purged: 1 }
  }
  let purged = 0
  for (const id of Object.keys(sessions)) {
    if (!SESSION_ID_PATTERN.test(id)) continue
    try {
      await rm(sessionFile(id), { force: true })
      purged += 1
    } catch { /* 已经不在 */ }
  }
  await writeJson(indexFile(), { version: 1, sessions: {} })
  return { purged }
}
