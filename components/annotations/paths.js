/**
 * @local/annotations — 路径与限额解析（纯 Host 侧，无路由、无 ctx 副作用）。
 *
 * 数据落点与其它组件同构：$DSH_HOME/dsh-toolkit/annotations/（DSH_TOOLKIT_DATA 可整体改道）。
 *
 *   annotations/
 *   ├── index.json              会话汇总（每个会话多少条、几条还在编辑中）
 *   └── <sessionId>.json        一个会话的注释列表，index 只在这个会话内递增
 *
 * 环境变量（都可选，目录类只认绝对路径）：
 *   ANNOTATIONS_DIR / ANNOTATIONS_INDEX / ANNOTATIONS_MAX_PER_SESSION /
 *   ANNOTATIONS_QUOTE_CHARS / ANNOTATIONS_SELECTION_DELAY /
 *   ANNOTATIONS_FLOATING_BUTTON
 *
 * 目录真值只有一份：根目录复用 image-gen/paths.js 的 dataDir()。
 */
import { isAbsolute, join } from 'node:path'

import { dataDir } from '../image-gen/paths.js?v=44'

export const ANNOTATIONS_DIR_NAME = 'annotations'
export const INDEX_FILE_NAME = 'index.json'
export const SESSION_FILE_SUFFIX = '.json'

/** 单个会话最多多少条注释，超了接口返回 409。 */
export const DEFAULT_MAX_PER_SESSION = 500
/** 引用片段最多存多少字符（超出截断，只影响存盘，不影响高亮定位）。 */
export const DEFAULT_QUOTE_CHARS = 20000
/** 划词后浮出按钮的延迟：0 = 鼠标放开立即出。 */
export const DEFAULT_SELECTION_DELAY = 0

/** 读一个文本环境变量：空串/纯空白视为未设。 */
function envText(name) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/** 读一个目录环境变量：只接受绝对路径，相对路径视为未设（与其它组件一致）。 */
function envDir(name) {
  const text = envText(name)
  if (text === null) return null
  return isAbsolute(text) ? text : null
}

/** 读一个整数环境变量：不是整数或低于 min 就退回 fallback。 */
function envInt(name, fallback, min) {
  const text = envText(name)
  if (text === null) return fallback
  const value = Number(text)
  if (!Number.isFinite(value) || value < min) return fallback
  return Math.floor(value)
}

/** 读一个开关环境变量：只有明确的 off / false / 0 才算关。 */
function envSwitch(name, fallback) {
  const text = envText(name)
  if (text === null) return fallback
  const lowered = text.toLowerCase()
  if (lowered === 'off' || lowered === 'false' || lowered === '0' || lowered === 'no') return false
  if (lowered === 'on' || lowered === 'true' || lowered === '1' || lowered === 'yes') return true
  return fallback
}

/** 注释数据根目录。 */
export function annotationsDir() {
  return envDir('ANNOTATIONS_DIR') ?? join(dataDir(), ANNOTATIONS_DIR_NAME)
}

/** 会话汇总索引。 */
export function indexFile() {
  return envDir('ANNOTATIONS_INDEX') ?? join(annotationsDir(), INDEX_FILE_NAME)
}

/** 某个会话的注释文件。sessionId 的合法性由 store.js 校验，这里只拼路径。 */
export function sessionFile(sessionId) {
  return join(annotationsDir(), String(sessionId) + SESSION_FILE_SUFFIX)
}

export function maxPerSession() {
  return envInt('ANNOTATIONS_MAX_PER_SESSION', DEFAULT_MAX_PER_SESSION, 1)
}

export function quoteChars() {
  return envInt('ANNOTATIONS_QUOTE_CHARS', DEFAULT_QUOTE_CHARS, 16)
}

export function selectionDelay() {
  return envInt('ANNOTATIONS_SELECTION_DELAY', DEFAULT_SELECTION_DELAY, 0)
}

/** 划词浮层按钮总开关：`ANNOTATIONS_FLOATING_BUTTON=off` 时整个入口不装。 */
export function floatingButtonEnabled() {
  return envSwitch('ANNOTATIONS_FLOATING_BUTTON', true)
}

export function badgeEnabled() {
  return envSwitch('ANNOTATIONS_BADGE', true)
}

/** 一次性拿到全部落点与生效限额，供接口响应与设置分页展示。 */
export function resolveAnnotationPaths() {
  return {
    dir: annotationsDir(),
    index: indexFile(),
    maxPerSession: maxPerSession(),
    quoteChars: quoteChars(),
    selectionDelay: selectionDelay(),
    floatingButton: floatingButtonEnabled(),
    overridden: {
      dir: envDir('ANNOTATIONS_DIR') !== null,
      index: envDir('ANNOTATIONS_INDEX') !== null,
      maxPerSession: envText('ANNOTATIONS_MAX_PER_SESSION') !== null,
      quoteChars: envText('ANNOTATIONS_QUOTE_CHARS') !== null,
      selectionDelay: envText('ANNOTATIONS_SELECTION_DELAY') !== null,
      floatingButton: envText('ANNOTATIONS_FLOATING_BUTTON') !== null,
    },
  }
}
