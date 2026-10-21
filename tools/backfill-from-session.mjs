#!/usr/bin/env node
/**
 * 一次性回填：从 DSH 会话日志里捞回「生成图片时用的提示词」，补进图片提示词索引。
 *
 * 背景：本插件上线「图片 → 提示词」索引（components/image-gen/prompts.js）之前
 * 生成的图，索引里没有记录，面板只能显示「无提示词记录」。但当时那次生成是
 * 在某个会话里通过 `generate_image` 工具调用的，调用参数（prompt/size/count）
 * 和调用时间都完整留在会话日志里 —— 只要能证明「某张图是某次调用产出的」，
 * 就能把提示词如实补回去，不用臆造。
 *
 * 配对依据（两条同时成立才认）：
 *   1) 图片落盘时间在调用时间之后的窗口内（默认 150 秒，生图 + 下载 + 写盘）；
 *   2) 该窗口内的图片张数不超过调用要求的 count（count 缺省按 1 算）。
 * 时间窗内多出来的图不硬配（宁可留空，也不写错提示词）。
 *
 * 用法：
 *   node tools/backfill-from-session.mjs --session <session.v4.jsonl.zstd>      # 只统计
 *   node tools/backfill-from-session.mjs --session <...> --write                # 真写入
 *   node tools/backfill-from-session.mjs --session <...> --images <图片目录>
 *   node tools/backfill-from-session.mjs --session <...> --prompts <索引文件>
 *   可选 --window <秒>（默认 150）
 *
 * model 字段：调用参数里不带模型名，所以默认留空。传 --usage <usage.jsonl>
 * 时按「该图落盘时刻附近的用量记录」补上模型（间隔超过 --usage-window 毫秒
 * 就不补，宁空不猜）。
 *
 * 幂等：索引里已有的图片一律跳过，绝不覆盖（新记录永远优先，也更可信）。
 */
import { readFile, readdir, stat, writeFile, mkdir, rename } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { zstdDecompress } from 'node:zlib'
import { promisify } from 'node:util'

const zstdDecompressAsync = promisify(zstdDecompress)

const args = process.argv.slice(2)
const write = args.includes('--write')
const argOf = (name) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : null
}

const home = process.env.DSH_HOME && process.env.DSH_HOME.trim() !== '' ? process.env.DSH_HOME.trim() : join(homedir(), '.dsh')
const sessionFile = argOf('--session')
const imagesDir = argOf('--images') ?? process.env.IMAGE_GEN_DIR ?? join(home, 'dsh-toolkit', 'images')
const promptsFile = process.env.IMAGE_GEN_PROMPTS ?? argOf('--prompts') ?? join(home, 'dsh-toolkit', 'image-prompts.json')
const windowSeconds = Number(argOf('--window')) || 150
const usageFile = argOf('--usage')
const usageWindowMs = Number(argOf('--usage-window')) || 5000

if (sessionFile === null) {
  console.error('缺少 --session <会话日志路径>（.jsonl 或 .jsonl.zstd 均可）')
  process.exit(2)
}

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

/**
 * 解压会话日志。DSH 的 `session.v4.jsonl.zstd` 是**追加式多帧**文件 —— 每写一批事件
 * 就追加一个完整的 zstd 帧，整份文件里有上千个帧。`zstdDecompress` 只解第一个帧，
 * 直接用它只会拿到 header 那一行（实测 220 字节），所以这里自己按魔数切帧、逐帧解。
 *
 * 帧边界靠魔数猜，再用「解压是否成功」回退验证：魔数可能出现在压缩数据内部，
 * 于是从当前位置尝试每一个后续魔数作为结束点，第一个能干净解压的就采纳。
 */
async function decodeZstdFrames(raw) {
  if (typeof zstdDecompress !== 'function') {
    throw new Error('当前 Node 不支持 zstd 解压（需要 node:zlib 的 zstdDecompress），请先 zstd -d 解压再传 --session')
  }
  const starts = []
  for (let i = 0; i + 4 <= raw.length; i++) {
    if (raw[i] === ZSTD_MAGIC[0] && raw[i + 1] === ZSTD_MAGIC[1] && raw[i + 2] === ZSTD_MAGIC[2] && raw[i + 3] === ZSTD_MAGIC[3]) {
      starts.push(i)
      i += 3
    }
  }
  const parts = []
  let index = 0
  while (index < starts.length) {
    let decoded = null
    let next = index + 1
    for (let end = index + 1; end <= starts.length; end++) {
      const stop = end < starts.length ? starts[end] : raw.length
      try {
        decoded = await zstdDecompressAsync(raw.subarray(starts[index], stop))
        next = end
        break
      } catch {
        // 这个结束点切在压缩数据中间，换下一个魔数再试。
      }
    }
    if (decoded === null) break // 尾部残缺帧：丢掉，不影响已解出的内容。
    parts.push(decoded)
    index = next
  }
  return Buffer.concat(parts).toString('utf8')
}

/** 读会话日志：`.zstd` 走多帧解压，其余按纯文本读。 */
async function readSessionText(file) {
  const raw = await readFile(file)
  const looksZstd = raw.length >= 4 && raw[0] === ZSTD_MAGIC[0] && raw[1] === ZSTD_MAGIC[1] && raw[2] === ZSTD_MAGIC[2] && raw[3] === ZSTD_MAGIC[3]
  if (!looksZstd) return raw.toString('utf8')
  return decodeZstdFrames(raw)
}

let text
try {
  text = await readSessionText(sessionFile)
} catch (cause) {
  console.error('读不了会话日志 ' + sessionFile + '：' + String(cause?.message || cause))
  process.exit(1)
}

/** 从会话 JSONL 里抽出所有 generate_image 调用：{ seq, time(ms), prompt, size, count }。 */
function extractCalls(text) {
  const calls = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    // 便宜的前置过滤：绝大多数行不是工具调用。
    if (trimmed === '' || !trimmed.includes('generate_image')) continue
    let record
    try {
      record = JSON.parse(trimmed)
    } catch {
      continue
    }
    if (record?.type !== 'tool/call') continue
    const data = record.data
    if (data === null || typeof data !== 'object') continue
    if (data.name !== 'generate_image') continue
    let params
    try {
      // 注意：tool/call 的 arguments 是 JSON **字符串**，要二次解析。
      params = typeof data.arguments === 'string' ? JSON.parse(data.arguments) : data.arguments
    } catch {
      continue
    }
    if (params === null || typeof params !== 'object') continue
    const prompt = typeof params.prompt === 'string' ? params.prompt.trim() : ''
    if (prompt === '') continue
    calls.push({
      seq: record.seq,
      time: Number(record.time) || 0,
      prompt,
      size: typeof params.size === 'string' ? params.size : '',
      count: Math.max(1, Number(params.count) || 1),
      mode: Array.isArray(params.image) && params.image.length > 0 ? 'image' : 'text',
    })
  }
  return calls.sort((a, b) => a.time - b.time)
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (cause) {
    // 索引文件还不存在是新装的正常状态，不当错误报。
    if (cause?.code !== 'ENOENT') console.error('读不了 ' + file + '：' + String(cause?.message || cause))
    return null
  }
}

const calls = extractCalls(text)
if (calls.length === 0) {
  console.log('会话里没有带提示词的 generate_image 调用：' + sessionFile)
  process.exit(0)
}

let names
try {
  names = await readdir(imagesDir)
} catch (cause) {
  console.error('读不了图片目录 ' + imagesDir + '：' + String(cause?.message || cause))
  process.exit(1)
}

// 只考虑本插件落盘的图（generate.js 的 FILE_PREFIX 是 `image-gen`）。
const images = []
for (const name of names) {
  if (!name.startsWith('image-gen-') || !name.endsWith('.png')) continue
  try {
    const info = await stat(join(imagesDir, name))
    images.push({ name, mtime: info.mtimeMs })
  } catch {
    /* 单张读不到就跳过 */
  }
}
images.sort((a, b) => a.mtime - b.mtime)

/**
 * 读 usage.jsonl（每行 { time, model, size }），按落盘时刻就近取模型。
 * 生成流程是「先写图再记用量」，两者间隔在毫秒级；超过 usageWindowMs 就不认，
 * 免得把别的任务的用量按到这张图上。
 */
async function loadUsage() {
  if (usageFile === null) return []
  let raw
  try {
    raw = await readFile(usageFile, 'utf8')
  } catch (cause) {
    console.error('读不了用量记录 ' + usageFile + '：' + String(cause?.message || cause))
    return []
  }
  const rows = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    try {
      const row = JSON.parse(trimmed)
      const time = Number(row?.time)
      if (!Number.isFinite(time)) continue
      rows.push({ time, model: typeof row.model === 'string' ? row.model : '', size: typeof row.size === 'string' ? row.size : '' })
    } catch {
      /* 坏行忽略 */
    }
  }
  return rows.sort((a, b) => a.time - b.time)
}

const usageRows = await loadUsage()
const nearestUsage = (mtime) => {
  if (usageRows.length === 0) return null
  let best = null
  let bestGap = Infinity
  for (const row of usageRows) {
    const gap = Math.abs(row.time - mtime)
    if (gap < bestGap) {
      bestGap = gap
      best = row
    }
  }
  return bestGap <= usageWindowMs ? best : null
}

const current = (await readJson(promptsFile)) ?? { version: 1, images: {} }
const existing = current !== null && typeof current === 'object' && current.images !== null && typeof current.images === 'object'
  ? current.images
  : {}

const used = new Set()
const found = []
const ambiguous = []
for (const call of calls) {
  // 两边都是毫秒：tool/call 的 time 是 epoch 毫秒，stat().mtimeMs 也是毫秒。
  const start = call.time
  const end = start + windowSeconds * 1000
  const hit = images.filter((img) => img.mtime >= start && img.mtime <= end && !used.has(img.name))
  if (hit.length === 0) continue
  if (hit.length > call.count) {
    // 时间窗内图比要求的还多：说明旁边还有别的生成任务在跑，不能安全配对。
    ambiguous.push({ call, hit })
    continue
  }
  for (const img of hit) {
    used.add(img.name)
    const usage = nearestUsage(img.mtime)
    found.push({
      name: img.name,
      prompt: call.prompt,
      // 模型名不在调用参数里，只能从用量记录就近取；取不到就留空。
      model: usage === null ? '' : usage.model,
      // 尺寸优先用调用参数（用户请求值），没有才退用量记录里的实际值。
      size: call.size !== '' ? call.size : (usage === null ? '' : usage.size),
      mode: call.mode,
      createdAt: Math.round(call.time),
    })
  }
}

console.log('会话里的 generate_image 调用：' + calls.length + ' 次')
console.log('可安全配对（时间窗 + count 吻合）：' + found.length + ' 张')
console.log('图片目录：' + imagesDir)
console.log('写入目标：' + promptsFile)
if (ambiguous.length > 0) {
  console.log('\n时间窗内图片多于 count，未配对（请人工核对）：')
  for (const item of ambiguous) {
    console.log('  调用 seq=' + item.call.seq + ' count=' + item.call.count + ' → 命中 ' + item.hit.map((i) => i.name).join(', '))
  }
}
if (found.length === 0) process.exit(0)

let added = 0
let skipped = 0
for (const item of found) {
  if (existing[item.name] !== undefined) {
    skipped += 1
    continue
  }
  existing[item.name] = {
    prompt: item.prompt,
    model: item.model,
    size: item.size,
    mode: item.mode,
    createdAt: item.createdAt,
  }
  added += 1
}

console.log('\n新增 ' + added + ' 条，已在索引里跳过 ' + skipped + ' 条（新记录优先，不覆盖）')
if (!write) {
  console.log('（只统计，未写入。加 --write 真写入。）')
  process.exit(0)
}
if (added === 0) {
  console.log('没有需要写的条目。')
  process.exit(0)
}

await mkdir(dirname(promptsFile), { recursive: true })
const tmp = promptsFile + '.' + process.pid + '.tmp'
await writeFile(tmp, JSON.stringify({ version: 1, images: existing }, null, 2) + '\n', { mode: 0o600 })
await rename(tmp, promptsFile)
console.log('已写入 ' + promptsFile)
