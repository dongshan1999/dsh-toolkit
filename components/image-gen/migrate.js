/**
 * @local/image-gen — 一次性数据迁移：老位置 → $DSH_HOME/dsh-toolkit（纯 Host 侧）。
 *
 * 插件加载时自动跑一次（见 index.js / live-entry-*.js 的 apply），幂等、失败不影响启动：
 *
 *   1. 数据目录里有 `.migrated` 标记 → 直接返回（后续启动秒退）。
 *   2. 逐项检查目标是否已存在：已存在就跳过，**绝不覆盖**新目录里已有的数据。
 *   3. 迁移前先在数据目录写 `.migration-backup-<时间戳>.json` 清单（记录每项的
 *      source/target/状态/字节数），搬完原地更新为结果——万一中途失败，靠它就能对账。
 *   4. 同一分区用 rename（瞬时、不拷字节）；跨分区才退化为复制后删源。
 *      任一项失败：保留原文件、记入清单、**不**写 `.migrated`，下次启动重试。
 *
 * 迁移源（每项按顺序取第一个存在的；老位置全部保留为空壳，不删目录本身）：
 *   images      <插件根>/data/images             → ~/image-gen（1.3.0）
 *   favorites   <插件根>/data/favorites          → ~/image-gen-favorites（1.3.0）
 *   config.json <插件根>/data/config.json        → $DSH_HOME/image-gen.json → ~/.dsh/image-gen.json（1.3.0）
 *   library.json<插件根>/data/library.json       → $DSH_HOME/image-gen-library.json → ~/.dsh/image-gen-library.json
 *   usage.jsonl <插件根>/data/usage.jsonl
 *   pricing.json<插件根>/data/token-usage/pricing.json → $DSH_HOME/token-usage/pricing.json → ~/.dsh/token-usage/pricing.json
 *   兜底        <插件根>/data/ 里剩下的其它条目（例如 archive/）逐个搬走
 *
 * 对应项被环境变量接管时（例如设了 IMAGE_GEN_DIR）不迁移——那份数据不归默认目录管。
 */
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { PLUGIN_ROOT, dshHome, resolvePaths } from './paths.js?v=37'

/** 迁移完成标记（数据目录内）。存在则永不再迁移。 */
export const MIGRATED_MARKER = '.migrated'

/** 迁移清单文件名前缀（数据目录内）。 */
export const BACKUP_PREFIX = '.migration-backup-'

/** <插件根>/data/ 里由上面各项负责的条目；剩下的走兜底搬运。 */
const KNOWN_LEGACY_ENTRIES = new Set(['images', 'favorites', 'config.json', 'library.json', 'usage.jsonl', 'token-usage'])

function samePath(a, b) {
  try {
    return resolve(a) === resolve(b)
  } catch {
    return false
  }
}

/** 源路径占用字节数（目录递归求和）：只为清单留个账，出错按 0 记。 */
function sizeOf(path) {
  try {
    const info = statSync(path)
    if (!info.isDirectory()) return info.size
    let total = 0
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      total += sizeOf(join(path, entry.name))
    }
    return total
  } catch {
    return 0
  }
}

function firstExisting(candidates) {
  for (const candidate of [...new Set(candidates)]) {
    if (candidate !== undefined && candidate !== null && existsSync(candidate)) return candidate
  }
  return null
}

/** 搬一项：同分区 rename，跨分区复制后删源；目标已存在则跳过。 */
function moveItem(entry) {
  if (existsSync(entry.to)) return { status: 'skipped-exists' }
  mkdirSync(dirname(entry.to), { recursive: true })
  try {
    renameSync(entry.from, entry.to)
    if (entry.mode !== null) chmodSync(entry.to, entry.mode)
    return { status: 'moved' }
  } catch (error) {
    if (error?.code !== 'EXDEV') throw error
  }
  cpSync(entry.from, entry.to, { recursive: true, force: false, errorOnExist: true, preserveTimestamps: true })
  if (entry.mode !== null) chmodSync(entry.to, entry.mode)
  try {
    rmSync(entry.from, { recursive: true, force: true })
    return { status: 'copied' }
  } catch {
    return { status: 'copied-left-source' }
  }
}

/** 迁移计划：逐项找源，目标不存在且源存在才搬。 */
function buildPlan({ root, home, sh, paths, target }) {
  const legacy = join(root, 'data')
  const items = [
    {
      kind: 'images',
      to: paths.imagesDir,
      candidates: [join(legacy, 'images'), join(home, 'image-gen')],
      blocked: paths.overridden.images,
      mode: null,
    },
    {
      kind: 'favorites',
      to: paths.favoritesDir,
      candidates: [join(legacy, 'favorites'), join(home, 'image-gen-favorites')],
      // 收藏固定跟着生成图目录走，IMAGE_GEN_DIR 被接管时收藏也不搬。
      blocked: paths.overridden.images,
      mode: null,
    },
    {
      kind: 'config.json',
      to: paths.configFile,
      candidates: [join(legacy, 'config.json'), join(sh, 'image-gen.json'), join(home, '.dsh', 'image-gen.json')],
      blocked: paths.overridden.config,
      mode: 0o600,
    },
    {
      kind: 'library.json',
      to: paths.libraryFile,
      candidates: [join(legacy, 'library.json'), join(sh, 'image-gen-library.json'), join(home, '.dsh', 'image-gen-library.json')],
      blocked: paths.overridden.library,
      mode: 0o600,
    },
    {
      kind: 'usage.jsonl',
      to: paths.usageFile,
      candidates: [join(legacy, 'usage.jsonl')],
      blocked: paths.overridden.usage,
      mode: null,
    },
    {
      kind: 'token-usage/pricing.json',
      to: paths.pricingFile,
      candidates: [join(legacy, 'token-usage', 'pricing.json'), join(sh, 'token-usage', 'pricing.json'), join(home, '.dsh', 'token-usage', 'pricing.json')],
      blocked: paths.overridden.pricing,
      mode: 0o600,
    },
  ]

  const plan = []
  for (const item of items) {
    if (item.blocked) continue
    if (samePath(item.to, legacy) || item.to.startsWith(legacy + '/')) continue
    const from = firstExisting(item.candidates)
    if (from === null) continue
    plan.push({ kind: item.kind, from, to: item.to, mode: item.mode })
  }

  // 兜底：<插件根>/data/ 里没被上面认领的条目（例如 archive/）也搬走，老目录留空。
  if (existsSync(legacy)) {
    let leftovers = []
    try {
      leftovers = readdirSync(legacy, { withFileTypes: true })
    } catch {
      leftovers = []
    }
    for (const entry of leftovers) {
      if (KNOWN_LEGACY_ENTRIES.has(entry.name) || entry.name.startsWith('.')) continue
      const from = join(legacy, entry.name)
      const to = join(target, entry.name)
      if (samePath(from, to) || existsSync(to)) continue
      plan.push({ kind: `extra:${entry.name}`, from, to, mode: null })
    }
  }
  return plan
}

/**
 * 执行一次性迁移。幂等、绝不抛错（失败只记录，插件照常启动）。
 *
 * 可注入 root/home/sh/dshHome/paths 便于自检在临时目录里完整跑一遍；
 * 生产路径下全部取默认值。
 * 返回 { ran, reason, moved, copied, skipped, errors, manifest, entries }。
 */
export function migrateLegacyData(options = {}) {
  const result = { ran: false, reason: null, moved: 0, copied: 0, skipped: 0, errors: [], manifest: null, entries: [] }
  try {
    const paths = options.paths ?? resolvePaths()
    const target = options.dataDir ?? paths.dataDir
    const root = options.pluginRoot ?? PLUGIN_ROOT
    const home = options.home ?? homedir()
    const sh = options.dshHome ?? dshHome()

    if (samePath(target, join(root, 'data'))) {
      result.reason = 'target-is-legacy-dir'
      return result
    }

    mkdirSync(target, { recursive: true })
    if (existsSync(join(target, MIGRATED_MARKER))) {
      result.reason = 'already-migrated'
      return result
    }

    result.ran = true
    const plan = buildPlan({ root, home, sh, paths, target })
    if (plan.length === 0) {
      writeMarker(target, 0)
      result.reason = 'nothing-to-migrate'
      return result
    }

    for (const entry of plan) {
      entry.bytes = sizeOf(entry.from)
      entry.status = 'planned'
    }

    // 清单文件只建一个：先落计划（万一中途崩了能对账），搬完原地更新为结果。
    const manifestPath = join(target, `${BACKUP_PREFIX}${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
    result.manifest = manifestPath
    writeManifest(manifestPath, plan, result, 'planned')

    const entries = []
    for (const entry of plan) {
      try {
        const outcome = moveItem(entry)
        entries.push({ ...entry, status: outcome.status })
        if (outcome.status === 'moved') result.moved += 1
        else if (outcome.status === 'copied' || outcome.status === 'copied-left-source') result.copied += 1
        else result.skipped += 1
      } catch (error) {
        entries.push({ ...entry, status: 'error', error: String(error?.message ?? error) })
        result.errors.push(`${entry.from} → ${entry.to}: ${error?.message ?? error}`)
      }
    }
    result.entries = entries
    writeManifest(manifestPath, entries, result, result.errors.length === 0 ? 'done' : 'partial')

    if (result.errors.length === 0) writeMarker(target, result.moved + result.copied)
    else result.reason = 'partial-failure'
    report(result, target)
  } catch (error) {
    result.errors.push(String(error?.message ?? error))
    result.reason = 'error'
  }
  return result
}

function writeMarker(target, count) {
  try {
    writeFileSync(join(target, MIGRATED_MARKER), JSON.stringify({ at: new Date().toISOString(), moved: count }) + '\n')
  } catch {}
}

function writeManifest(file, entries, result, status) {
  try {
    writeFileSync(file, JSON.stringify({
      at: new Date().toISOString(),
      status,
      dataDir: result.manifest === null ? null : dirname(file),
      moved: result.moved,
      copied: result.copied,
      skipped: result.skipped,
      errors: result.errors,
      entries,
    }, null, 2) + '\n')
  } catch {}
}

function report(result, target) {
  if (result.errors.length > 0) {
    console.warn(`[dsh-toolkit] 数据迁移未完成（${result.errors.length} 项失败，下次启动重试）：${result.errors[0]}`)
    return
  }
  if (result.moved + result.copied > 0) {
    console.log(`[dsh-toolkit] 数据目录已迁移到 ${target}（移动 ${result.moved} 项、复制 ${result.copied} 项）`)
  }
}