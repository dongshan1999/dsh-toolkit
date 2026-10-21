#!/usr/bin/env node
// 上传前脱敏扫描：工作区（含未跟踪、不含 .gitignore 忽略的）+ git 历史。
//
// 只报告、不改文件；发现任何疑似密钥 / 本机绝对路径 / 邮箱时退出码为 1，
// 方便 `npm run scrub` 或 CI 直接卡住上传。
//
// 用法：
//   node tools/scrub-check.mjs               # 工作区 + 历史
//   node tools/scrub-check.mjs --no-history  # 只扫工作区
//   node tools/scrub-check.mjs --quiet       # 只输出有问题的行
//
// 例外：命中行里出现 ALLOW 中任一标记时视为「已声明的假值」（例如自检夹具），
// 不报错；新增夹具请带上 `-fixture-` 或写进 ALLOW，别写真实密钥。

import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const MAX_BYTES = 2 * 1024 * 1024

const PATTERNS = [
  { id: '密钥 sk-', re: /sk-[A-Za-z0-9_-]{20,}/ },
  { id: '密钥 sk-ant-', re: /sk-ant-[A-Za-z0-9_-]{16,}/ },
  { id: '密钥 Google', re: /AIza[0-9A-Za-z_-]{30,}/ },
  { id: '令牌 GitHub', re: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { id: '令牌 Slack', re: /xox[abposr]-[A-Za-z0-9-]{10,}/ },
  { id: '密钥 AWS', re: /AKIA[0-9A-Z]{16}/ },
  { id: '私钥', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: 'JWT', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { id: '绝对路径 macOS', re: /(?<![A-Za-z0-9._-])\/Users\/[A-Za-z0-9._-]+/ },
  { id: '绝对路径 Linux', re: /(?<![A-Za-z0-9._-])\/home\/[A-Za-z0-9._-]+/ },
  { id: '绝对路径 Windows', re: /[A-Za-z]:\\\\Users\\\\[A-Za-z0-9._-]+/ },
  { id: '邮箱', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/ },
]

// 已是公开示例的域名 / 已声明的假值，不算泄漏。
const ALLOW = [
  /-fixture-/,                       // 自检夹具，例如 sk-fixture-example-not-real
  /example-not-real/,
  /\/(?:home|Users)\/x(?:\/|$)/,      // 自检里的占位家目录 /home/x、/Users/x
  /@example\.(com|org|net)/i,
  /noreply@github\.com/i,
  /users\.noreply\.github\.com/i,
  /git\+https:\/\/github\.com\//i,
]

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    ...options,
  })
}

function isAllowed(line) {
  return ALLOW.some((re) => re.test(line))
}

function scanText(text, where, findings, counters) {
  text.split('\n').forEach((line, index) => {
    if (!line) return
    counters.lines += 1
    if (isAllowed(line)) return
    for (const { id, re } of PATTERNS) {
      if (!re.test(line)) continue
      const hit = line.match(re)[0]
      findings.push({ where, line: index + 1, id, hit, text: line.trim().slice(0, 200) })
    }
  })
}

function looksBinary(buffer) {
  const sample = buffer.subarray(0, 4096)
  return sample.includes(0)
}

function scanWorkingTree(findings, counters) {
  const list = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    .split('\0')
    .filter(Boolean)
  for (const file of list) {
    const absolute = join(ROOT, file)
    let stat
    try {
      stat = statSync(absolute)
    } catch {
      continue // 已删除但仍在索引里，跳过
    }
    if (!stat.isFile() || stat.size > MAX_BYTES) continue
    const buffer = readFileSync(absolute)
    if (looksBinary(buffer)) continue
    counters.files += 1
    scanText(buffer.toString('utf8'), relative(ROOT, absolute), findings, counters)
  }
}

function scanHistory(findings, counters) {
  const output = git(['log', '--all', '-p', '--no-color', '--no-ext-diff', '--unified=0'])
  let commit = ''
  let file = ''
  let lineNo = 0
  for (const line of output.split('\n')) {
    const commitMatch = /^commit ([0-9a-f]{40})/.exec(line)
    if (commitMatch) {
      commit = commitMatch[1].slice(0, 8)
      counters.commits += 1
      continue
    }
    const fileMatch = /^\+\+\+ b\/(.+)$/.exec(line)
    if (fileMatch) {
      file = fileMatch[1]
      continue
    }
    const hunkMatch = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
    if (hunkMatch) {
      lineNo = Number(hunkMatch[1])
      continue
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      counters.historyLines += 1
      const where = `${file || '?'}:${lineNo} (commit ${commit})`
      const body = line.slice(1)
      if (body && !isAllowed(body)) {
        for (const { id, re } of PATTERNS) {
          if (!re.test(body)) continue
          findings.push({ where, line: lineNo, id, hit: body.match(re)[0], text: body.trim().slice(0, 200) })
        }
      }
      lineNo += 1
      continue
    }
    if (!line.startsWith('-') && !line.startsWith('\\')) {
      // 未以 + 开头的上下文行（--unified=0 下不多）也会推进行号
      if (lineNo > 0 && !line.startsWith('diff ') && !line.startsWith('index ') &&
          !line.startsWith('--- ') && !line.startsWith('new file') && !line.startsWith('deleted file') &&
          !line.startsWith('similarity') && !line.startsWith('rename') && !line.startsWith('Binary')) {
        lineNo += 1
      }
    }
  }
}

const args = new Set(process.argv.slice(2))
const quiet = args.has('--quiet')
const withHistory = !args.has('--no-history')

const findings = []
const counters = { files: 0, lines: 0, commits: 0, historyLines: 0 }

if (!quiet) console.log('脱敏扫描 dsh-toolkit\n')
if (!quiet) console.log('[1] 工作区（已跟踪 + 未跟踪，不含 .gitignore）')
scanWorkingTree(findings, counters)
if (!quiet) console.log(`    扫描 ${counters.files} 个文件 / ${counters.lines} 行`)

if (withHistory) {
  if (!quiet) console.log('[2] git 历史（git log --all -p 的新增行）')
  try {
    scanHistory(findings, counters)
    if (!quiet) console.log(`    扫描 ${counters.commits} 次提交 / ${counters.historyLines} 行新增`)
  } catch (error) {
    console.error(`    跳过：git 历史读取失败（${error.message}）`)
  }
}

const grouped = new Map()
for (const finding of findings) {
  const key = `${finding.where}\u0000${finding.line}`
  if (!grouped.has(key)) grouped.set(key, [])
  grouped.get(key).push(finding)
}

if (grouped.size === 0) {
  if (!quiet) console.log('\n结果：通过 —— 没有疑似密钥、本机绝对路径或邮箱。')
  process.exit(0)
}

console.log(`\n结果：发现 ${grouped.size} 处需要处理\n`)
for (const items of grouped.values()) {
  const first = items[0]
  console.log(`  ${first.where}:${first.line}  ${items.map((i) => i.id).join(' / ')}`)
  console.log(`      ${first.text}`)
}
console.log('\n改掉上面每一处（示例路径用 ~，示例密钥用 -fixture- 假值），再跑一次。')
process.exit(1)
