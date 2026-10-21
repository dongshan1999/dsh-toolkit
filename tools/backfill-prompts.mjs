#!/usr/bin/env node
/**
 * 一次性回填：把旧版 dsh-imagegen 的 `index.json` 里记着的提示词，
 * 搬进本插件新的「图片 → 提示词」索引（image-prompts.json）。
 *
 * 背景：本插件早期的图片由另一套面板生成，那套面板把提示词记在
 * `$DSH_HOME/dsh-imagegen/index.json`（`entries[].images[].file` + `entries[].prompt`）。
 * 迁移只搬了图片文件，没搬提示词，于是那些老图在面板里显示「无提示词记录」。
 * 这个脚本把能对上号的那部分补回去（对不上的保持原样，绝不臆造）。
 *
 * 用法：
 *   node tools/backfill-prompts.mjs            # 只统计，不写
 *   node tools/backfill-prompts.mjs --write    # 真写入数据目录
 *   node tools/backfill-prompts.mjs --source <index.json 路径> --images <图片目录>
 *
 * 幂等：已经在索引里的图片不会被覆盖（新记录永远优先）。
 */
import { readFile, readdir, writeFile, mkdir, rename } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const args = process.argv.slice(2)
const write = args.includes('--write')
const argOf = (name) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : null
}

const home = process.env.DSH_HOME && process.env.DSH_HOME.trim() !== '' ? process.env.DSH_HOME.trim() : join(homedir(), '.dsh')
const sourceFile = argOf('--source') ?? join(home, 'dsh-imagegen', 'index.json')
const imagesDir = argOf('--images') ?? process.env.IMAGE_GEN_DIR ?? join(home, 'dsh-toolkit', 'images')
const promptsFile = process.env.IMAGE_GEN_PROMPTS ?? join(home, 'dsh-toolkit', 'image-prompts.json')

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (cause) {
    // 索引文件还不存在是新装的正常状态，不当错误报。
    if (cause?.code !== 'ENOENT') console.error('读不了 ' + file + '：' + String(cause?.message || cause))
    return null
  }
}

const legacy = await readJson(sourceFile)
if (legacy === null) process.exit(1)

const entries = Array.isArray(legacy.entries) ? legacy.entries : []
if (entries.length === 0) {
  console.log('旧索引里没有条目：' + sourceFile)
  process.exit(0)
}

let names
try {
  names = await readdir(imagesDir)
} catch (cause) {
  console.error('读不了图片目录 ' + imagesDir + '：' + String(cause?.message || cause))
  process.exit(1)
}
const present = new Set(names)

// 旧条目的 images[].file 是落盘文件名，但搬进数据目录时被加过 `imagegen-` 前缀
// （目录里是 imagegen-<uuid>-0.png，旧索引记的是 <uuid>-0.png），两种写法都要能对上。
const candidates = (file) => (file.startsWith('imagegen-') ? [file] : [file, 'imagegen-' + file])

const found = new Map()
for (const entry of entries) {
  const prompt = typeof entry?.prompt === 'string' ? entry.prompt.trim() : ''
  if (prompt === '') continue
  const files = Array.isArray(entry.images) ? entry.images : []
  for (const item of files) {
    const recorded = typeof item?.file === 'string' ? item.file : ''
    if (recorded === '') continue
    const name = candidates(recorded).find((candidate) => present.has(candidate))
    if (name === undefined || found.has(name)) continue
    found.set(name, {
      prompt,
      model: typeof entry.model === 'string' ? entry.model : '',
      size: typeof entry.size === 'string' ? entry.size : '',
      // 旧面板的 'edit' 就是图生图（带参考图），这里对齐新索引的取值。
      mode: entry.mode === 'edit' ? 'image' : 'text',
      createdAt: Number(entry.createdAt) || Date.now(),
    })
  }
}

console.log('旧索引条目：' + entries.length + ' 条 → 对上现有图片：' + found.size + ' 张')
console.log('图片目录：' + imagesDir)
console.log('写入目标：' + promptsFile)
if (found.size === 0) process.exit(0)

const current = (await readJson(promptsFile)) ?? { version: 1, images: {} }
const images = current !== null && typeof current === 'object' && current.images !== null && typeof current.images === 'object'
  ? current.images
  : {}

let added = 0
let skipped = 0
for (const [name, info] of found) {
  if (images[name] !== undefined) {
    skipped += 1
    continue
  }
  images[name] = info
  added += 1
}

console.log('新增 ' + added + ' 条，已在索引里跳过 ' + skipped + ' 条')
if (!write) {
  console.log('\n（只统计，未写入。加 --write 真写入。）')
  process.exit(0)
}
if (added === 0) {
  console.log('没有需要写的条目。')
  process.exit(0)
}

await mkdir(dirname(promptsFile), { recursive: true })
const tmp = promptsFile + '.' + process.pid + '.tmp'
await writeFile(tmp, JSON.stringify({ version: 1, images }, null, 2) + '\n', { mode: 0o600 })
await rename(tmp, promptsFile)
console.log('已写入 ' + promptsFile)
