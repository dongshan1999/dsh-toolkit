/**
 * @local/clipboard — 路径与阈值解析（纯 Host 侧，无路由、无 ctx 副作用）。
 *
 * 数据落点与其它组件同构：$DSH_HOME/dsh-toolkit/clipboard/（DSH_TOOLKIT_DATA 可整体改道）。
 *
 *   clipboard/
 *   ├── index.json      条目索引
 *   ├── config.json     自动转换开关 + 阈值
 *   └── 2026-10-22/     按本地日期分文件夹，文件名 <HHmmss>-<sha1 前 8 位>.<ext>
 *
 * 环境变量（都可选，绝对路径才认）：
 *   CLIPBOARD_DIR / CLIPBOARD_INDEX / CLIPBOARD_THRESHOLD_CHARS / CLIPBOARD_THRESHOLD_LINES
 *
 * 目录真值只有一份：根目录复用 image-gen/paths.js 的 dataDir()，
 * 不在本文件里复制 $DSH_HOME 的解析逻辑。
 */
import { isAbsolute, join } from 'node:path'

import { dataDir } from '../image-gen/paths.js?v=44'

export const CLIPBOARD_DIR_NAME = 'clipboard'
export const INDEX_FILE_NAME = 'index.json'
export const CONFIG_FILE_NAME = 'config.json'

export const DEFAULT_THRESHOLD_CHARS = 2000
export const DEFAULT_THRESHOLD_LINES = 30

/** 读一个文本环境变量：空串/纯空白视为未设。 */
function envText(name) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/** 读一个目录环境变量：只接受绝对路径，相对路径视为未设（与 image-gen 一致）。 */
function envDir(name) {
  const text = envText(name)
  if (text === null) return null
  return isAbsolute(text) ? text : null
}

/** 读一个正整数环境变量：不是正数就退回 fallback。 */
function envInt(name, fallback, min) {
  const text = envText(name)
  if (text === null) return fallback
  const value = Number(text)
  if (!Number.isFinite(value) || value < min) return fallback
  return Math.floor(value)
}

/** 剪贴板数据根目录。 */
export function clipboardDir() {
  return envDir('CLIPBOARD_DIR') ?? join(dataDir(), CLIPBOARD_DIR_NAME)
}

/** 索引文件。 */
export function indexPath() {
  return envDir('CLIPBOARD_INDEX') ?? join(clipboardDir(), INDEX_FILE_NAME)
}

/** 配置文件的绝对路径。 */
export function configFile() {
  return join(clipboardDir(), CONFIG_FILE_NAME)
}

/** 字符阈值（仅环境变量覆盖，用户配置在 store.js 里读 config.json）。 */
export function thresholdChars() {
  return envInt('CLIPBOARD_THRESHOLD_CHARS', DEFAULT_THRESHOLD_CHARS, 1)
}

/** 行数阈值。 */
export function thresholdLines() {
  return envInt('CLIPBOARD_THRESHOLD_LINES', DEFAULT_THRESHOLD_LINES, 1)
}

/** 一次性拿到全部落点与生效阈值，供接口响应与设置分页展示。 */
export function resolveClipboardPaths() {
  return {
    dir: clipboardDir(),
    index: indexPath(),
    config: configFile(),
    thresholdChars: thresholdChars(),
    thresholdLines: thresholdLines(),
    overridden: {
      dir: envDir('CLIPBOARD_DIR') !== null,
      index: envDir('CLIPBOARD_INDEX') !== null,
      chars: envText('CLIPBOARD_THRESHOLD_CHARS') !== null,
      lines: envText('CLIPBOARD_THRESHOLD_LINES') !== null,
    },
  }
}
