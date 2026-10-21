/**
 * @local/image-gen — 生成花费记录（纯 Host 侧，无路由、无 ctx 副作用）。
 *
 * 每次成功生成落盘一条 JSONL 记录到数据目录 usage.jsonl
 * （默认 $DSH_HOME/dsh-toolkit/usage.jsonl，`IMAGE_GEN_USAGE` 可覆盖）：
 *   { time, model, size }
 * 成本不在写入时定格，由 token-usage 组件按「当前每张单价 × 张数」统一计算
 * （与 token 计价同哲学：当前价 × 历史用量）。
 * token-usage 通过 readImageUsages() 读取并合并进用量统计与计价明细。
 */
import { appendFile, readFile, stat } from 'node:fs/promises'

import { usageFile } from './paths.js?v=44'

const USAGE_ENV = 'IMAGE_GEN_USAGE'

/** 花费记录文件路径：`IMAGE_GEN_USAGE` 优先，默认数据目录 usage.jsonl。 */
export function usagePath() {
  const override = typeof process.env[USAGE_ENV] === 'string' ? process.env[USAGE_ENV].trim() : ''
  return override !== '' ? override : usageFile()
}

/** 追加一条生成记录（一张一条）；失败静默——记录缺失只影响统计，不影响生成。 */
export async function appendImageUsage(model, size, time = Date.now()) {
  try {
    const line = JSON.stringify({ time, model: String(model || ''), size: String(size || '') }) + '\n'
    await appendFile(usagePath(), line, { mode: 0o600 })
  } catch {}
}

/**
 * 读取全部生成记录（host 侧扫描用）。按行解析，跳过损坏行；
 * 文件不存在返回空数组，读取失败也返回空数组（统计降级，不抛错）。
 */
export async function readImageUsages() {
  let text
  try {
    text = await readFile(usagePath(), 'utf8')
  } catch {
    return []
  }
  const usages = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed !== null && typeof parsed === 'object' && typeof parsed.model === 'string' && parsed.model !== '') {
        usages.push({ time: Number(parsed.time) || 0, model: parsed.model, size: String(parsed.size || '') })
      }
    } catch {}
  }
  return usages
}

/** 记录文件 mtime（token-usage 做增量缓存用）；不存在返回 0。 */
export async function usageMtime() {
  try {
    const info = await stat(usagePath())
    return info.mtimeMs
  } catch {
    return 0
  }
}
