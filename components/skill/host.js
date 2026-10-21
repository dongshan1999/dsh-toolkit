// components/skill/host.js — Skill 管理（Host 侧）
//
// DSH 的 skill 就是磁盘上的 Markdown 文件，由 @deepseek-ai/dsh-skill-filesystem 扫描；
// 官方**没有**任何图形化入口，坏掉的文件被静默丢弃，用户在界面上完全看不到「我写的 skill 为什么没生效」。
// 本组件做三件事：把「服务端现在到底认到哪些 skill」摊开、把「没生效的具体原因」说清楚、允许在
// 白名单根里直接改。
//
// 路由（前缀 /api/skill/）：
//   GET    /api/skill/meta     dshHome / projectRoot / 各扫描根 / 依赖是否可用
//   GET    /api/skill/list     磁盘真相：所有根下的全部 skill（含解析失败的），带 shadowedBy / error / issues
//   GET    /api/skill/one      ?root=<rootId>&name=<skill>：原文 raw + 解析结果 + 正文 body
//   POST   /api/skill/save     { root, name, mode:'raw'|'structured', raw?, fields?, body? } 保存
//   POST   /api/skill/create   { root, name, description, whenToUse?, body?, kind } 新建
//   DELETE /api/skill/one      ?root=<rootId>&name=<skill>（+ ?force=1 才删带资源文件的目录）
//   POST   /api/skill/toggle   { root, name, modelInvocable?, userInvocable? } 只改两个布尔，保留正文/注释/顺序
//   POST   /api/skill/sync     用官方 ctx.get('skills') 快照做交叉校验（面板顶部显示「官方识别到 N 个」）
//
// 安全边界（本组件最容易写错的地方）：
//   - 可写根白名单只有三个：$DSH_HOME/skills、<projectRoot>/.dsh/skills、<projectRoot>/.agents/skills；
//     bundled / user-agents / custom 根一律只读（列表里标出来，前端据此禁用编辑与删除）。
//   - 路由只接受 rootId + skillName，**不接受任意路径**；名字还要按 kebab-case 再校验一次（不靠名字反推安全）。
//   - 每次读写前 resolve + realpath 双重校验，落在白名单根内才动；这样 `..` 与符号链接逃逸都过不去。
//   - 写文件统一 withFileLock + writeFileAtomic(0o644)，不自己 writeFile（半截文件会被扫描器读到）。
//
// 依赖：本文件**不能**直接 import 'yaml' 或任何 @deepseek-ai/*。
// 外部 link 安装的 bundle 从真实路径解析依赖，插件的 node_modules 里没有这些包，裸 import 会
// ERR_MODULE_NOT_FOUND。所以用 createRequire 锚到 profile 的 package.json，惰性解析。

import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, realpath, rm, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

export const name = 'skill'
export const inject = ['connection', 'timer']

/** 前端与路由共用的默认目录名。 */
const SKILLS_DIR = 'skills'
const SKILL_FILE = 'SKILL.md'
const SYSTEM_DIR = '.system'

/** 扫描根：rank 小者优先，同名 skill 只认 rank 最小那个（与官方 roots() 一致）。 */
const ROOT_DEFS = [
  { id: 'project-dsh', source: 'project-dsh', rank: 100, kind: 'project', writable: true },
  { id: 'project-agents', source: 'project-agents', rank: 200, kind: 'project', writable: true },
  { id: 'custom', source: 'custom', rank: 300, kind: 'custom', writable: false },
  { id: 'user-dsh', source: 'user-dsh', rank: 400, kind: 'user', writable: true },
  { id: 'user-agents', source: 'user-agents', rank: 500, kind: 'user', writable: false },
  { id: 'bundled', source: 'bundled', rank: 600, kind: 'bundled', writable: false },
]

/** kebab-case：官方 frontmatter 的 name 校验就是这个正则，写路径与建目录同样用它。 */
const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** 旧键 → 新键。官方报 `frontmatter field "X" is unsupported; use "Y"`，这里保持同一语义。 */
const LEGACY_KEYS = [
  { key: 'modelInvocable', replacement: 'disable-model-invocation', note: '布尔语义相反：true 表示允许模型调用，等价于省略 disable-model-invocation' },
  { key: 'disableModelInvocation', replacement: 'disable-model-invocation', note: '改成了 kebab-case' },
  { key: 'userInvocable', replacement: 'user-invocable', note: '改成了 kebab-case' },
]

/** 结构化保存时 frontmatter 的固定键顺序。 */
const FIELD_ORDER = ['name', 'description', 'whenToUse', 'metadata', 'disable-model-invocation', 'user-invocable']

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function messageOf(cause) {
  if (cause === null || cause === undefined) return '未知错误'
  if (typeof cause === 'string') return cause
  if (typeof cause.message === 'string' && cause.message !== '') return cause.message
  try {
    const text = JSON.stringify(cause)
    return typeof text === 'string' && text !== '' ? text : String(cause)
  } catch {
    return String(cause)
  }
}

async function readBody(request) {
  try {
    const body = await request.json()
    return body !== null && typeof body === 'object' ? body : {}
  } catch {
    return {}
  }
}

/** 文本清洗：非字符串或纯空白视为未提供。 */
function cleanText(value) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text === '' ? null : text
}

/** `~` 展开（只处理开头，避免把中间路径里的 `~` 当家目录）。 */
function expandHome(text) {
  if (typeof text !== 'string') return null
  const trimmed = text.trim()
  if (trimmed === '') return null
  if (trimmed === '~') return homedir()
  if (trimmed.startsWith('~/')) return join(homedir(), trimmed.slice(2))
  return isAbsolute(trimmed) ? trimmed : null
}

/** DSH Home：`DSH_HOME`（空白视为未设，支持 `~`）→ `~/.dsh`（与官方 resolveDshHome 语义一致）。 */
function resolveDshHome() {
  const fromEnv = expandHome(process.env.DSH_HOME)
  return fromEnv === null ? join(homedir(), '.dsh') : fromEnv
}

/**
 * 项目根：从 start 向上找最近的含 `.dsh` 或 `.git` 的目录（官方 findProjectRoot 的简化版），
 * 找不到就用 start 本身。
 */
function findProjectRoot(start) {
  let current
  try {
    current = resolve(start)
  } catch {
    return process.cwd()
  }
  for (;;) {
    if (existsSync(join(current, '.git')) || existsSync(join(current, '.dsh'))) return current
    const parent = dirname(current)
    if (parent === current) return resolve(start)
    current = parent
  }
}

/** 会话工作目录：优先 profileContext.cwd / .dir，再回退 process.cwd()。 */
function resolveCwd(ctx) {
  try {
    const profileContext = ctx.get('profileContext')
    if (profileContext !== null && profileContext !== undefined) {
      const candidate = cleanText(profileContext.cwd) ?? cleanText(profileContext.dir)
      if (candidate !== null) return resolve(expandHome(candidate) ?? candidate)
    }
  } catch {
    // 服务不存在时静默回退，绝不因此让 host 崩掉。
  }
  return resolve(process.cwd())
}

/** createRequire 锚点候选：profileContext.dir → DSH_HOME/profile → ~/.dsh/profile。 */
function requireAnchorCandidates(ctx) {
  const list = []
  try {
    const profileContext = ctx.get('profileContext')
    const dir = profileContext === null || profileContext === undefined ? null : cleanText(profileContext.dir)
    if (dir !== null) list.push(join(expandHome(dir) ?? dir, 'package.json'))
  } catch {
    // 忽略：继续用后面两个兜底锚点。
  }
  list.push(join(resolveDshHome(), 'profiles', 'desktop', 'package.json'))
  list.push(join(homedir(), '.dsh', 'profiles', 'desktop', 'package.json'))
  return list
}

/**
 * 惰性依赖解析：yaml / atomic-write 都从 profile 的 node_modules 取。
 * 返回 { yaml, atomic, error }，解析失败只记事实，不抛（面板要能显示「yaml 不可用」）。
 */
function createDeps(ctx) {
  let cached = null
  const load = () => {
    if (cached !== null) return cached
    const errors = []
    let yaml = null
    let atomic = null
    for (const anchor of requireAnchorCandidates(ctx)) {
      if (!existsSync(anchor)) continue
      try {
        const req = createRequire(anchor)
        if (yaml === null) {
          try {
            const mod = req('yaml')
            if (mod !== null && typeof mod.parse === 'function' && typeof mod.stringify === 'function') yaml = mod
          } catch (cause) {
            errors.push('yaml @ ' + anchor + ': ' + messageOf(cause))
          }
        }
        if (atomic === null) {
          try {
            const mod = req('@deepseek-ai/dsh-atomic-write')
            if (mod !== null && typeof mod.withFileLock === 'function' && typeof mod.writeFileAtomic === 'function') atomic = mod
          } catch (cause) {
            errors.push('atomic-write @ ' + anchor + ': ' + messageOf(cause))
          }
        }
      } catch (cause) {
        errors.push('anchor ' + anchor + ': ' + messageOf(cause))
      }
      if (yaml !== null && atomic !== null) break
    }
    if (yaml === null) errors.push('未能在 profile 的 node_modules 里解析到 yaml（frontmatter 读写不可用）')
    if (atomic === null) errors.push('未能在 profile 的 node_modules 里解析到 @deepseek-ai/dsh-atomic-write（保存不可用）')
    cached = { yaml, atomic, error: errors.length === 0 ? null : errors.join('；') }
    return cached
  }
  return { load }
}

/* ------------------------------------------------------------------ 扫描根 */

/**
 * 计算当前会话的全部扫描根。根目录可能不存在（exists:false），仍然返回，面板要显示「这里还没有」。
 * customRoots 来自 profile 配置（可选），只读。
 */
function buildRoots(ctx) {
  const dshHome = resolveDshHome()
  const cwd = resolveCwd(ctx)
  const projectRoot = findProjectRoot(cwd)
  const customRoots = readCustomSkillDirs(ctx)
  const paths = new Map([
    ['project-dsh', join(projectRoot, '.dsh', SKILLS_DIR)],
    ['project-agents', join(projectRoot, '.agents', SKILLS_DIR)],
    ['user-dsh', join(dshHome, SKILLS_DIR)],
    ['user-agents', join(homedir(), '.agents', SKILLS_DIR)],
  ])
  const roots = []
  for (const def of ROOT_DEFS) {
    if (def.id === 'custom') {
      customRoots.forEach((path, index) => {
        roots.push({
          id: index === 0 ? 'custom' : 'custom-' + (index + 1),
          path,
          source: 'custom',
          rank: def.rank + index,
          writable: false,
          exists: existsSync(path),
          label: '自定义 ' + (index + 1),
        })
      })
      continue
    }
    if (def.id === 'bundled') {
      const bundled = bundledSkillsDir()
      roots.push({
        id: 'bundled',
        path: bundled === null ? '' : bundled,
        source: 'bundled',
        rank: def.rank,
        writable: false,
        exists: bundled !== null && existsSync(bundled),
        label: '内置（只读）',
      })
      continue
    }
    const path = paths.get(def.id)
    roots.push({
      id: def.id,
      path,
      source: def.source,
      rank: def.rank,
      writable: def.writable,
      exists: existsSync(path),
      label: def.kind === 'project' ? '项目' : '用户',
    })
  }
  return { dshHome, cwd, projectRoot, roots: roots.sort((a, b) => a.rank - b.rank) }
}

/**
 * customSkillDirs：profile 配置里的自定义 skill 目录。官方字段名没有公开文档，
 * 这里同时容忍 customSkillDirs / skillDirs 两种拼写与数组/逗号串两种形态，取不到就是空数组。
 */
function readCustomSkillDirs(ctx) {
  const out = []
  const collect = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        const path = expandHome(typeof item === 'string' ? item : '')
        if (path !== null && !out.includes(path)) out.push(path)
      }
    }
  }
  try {
    const profileContext = ctx.get('profileContext')
    if (profileContext !== null && profileContext !== undefined) {
      collect(profileContext.customSkillDirs)
      collect(profileContext.skillDirs)
      const config = profileContext.config
      if (config !== null && typeof config === 'object') {
        collect(config.customSkillDirs)
        collect(config.skillDirs)
      }
    }
  } catch {
    // 配置取不到就当没有自定义根。
  }
  return out
}

/** bundled 根：应用内置的 skills 目录，只在能确定时才返回（找不到就空，不猜）。 */
function bundledSkillsDir() {
  const fromEnv = expandHome(process.env.DSH_BUNDLED_SKILLS)
  if (fromEnv !== null) return fromEnv
  const candidates = [
    join(process.resourcesPath ?? '', 'app.asar.unpacked', 'node_modules', '@deepseek-ai', 'dsh-agent-preset', 'skills'),
    join('/Applications', 'DeepSeek Harness.app', 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', '@deepseek-ai', 'dsh-agent-preset', 'skills'),
  ]
  for (const candidate of candidates) {
    if (candidate !== '' && existsSync(candidate)) return candidate
  }
  return null
}

function rootById(roots, id) {
  const wanted = cleanText(id)
  if (wanted === null) return null
  return roots.find((item) => item.id === wanted) ?? null
}

/* ------------------------------------------------------------- frontmatter */

/** 官方宽容布尔：true/false、yes/no、on/off、1/0（大小写不敏感），真布尔原样。 */
function readLooseBoolean(value) {
  if (typeof value === 'boolean') return { value, issue: null }
  if (typeof value === 'number' && (value === 1 || value === 0)) return { value: value === 1, issue: null }
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase()
    if (text === 'true' || text === 'yes' || text === 'on' || text === '1') return { value: true, issue: null }
    if (text === 'false' || text === 'no' || text === 'off' || text === '0') return { value: false, issue: null }
  }
  return { value: null, issue: '必须是布尔（true / false）' }
}

/**
 * 拆 frontmatter 与正文。
 * 官方要求文件**第一行**就是 `---`（容忍 BOM 与 CRLF），随后 YAML，再一行 `---` 结束；
 * 正文取剩余部分。返回 { ok, frontmatterText, body, issues, offset }。
 */
function splitFrontmatter(raw) {
  const text = raw.startsWith('\uFEFF') ? raw.slice(1) : raw
  const lines = text.split('\n')
  if (lines.length === 0 || lines[0].replace(/\r$/, '').trim() !== '---') {
    return {
      ok: false,
      issues: ['文件没有以 `---` 行开头：官方扫描器只接受带 YAML frontmatter 的 skill 文件'],
      frontmatterText: null,
      body: text,
    }
  }
  const endIndex = lines.findIndex((line, index) => index > 0 && line.replace(/\r$/, '').trim() === '---')
  if (endIndex === -1) {
    return {
      ok: false,
      issues: ['frontmatter 没有结束行 `---`：从第 1 行开始一直没有闭合'],
      frontmatterText: null,
      body: text,
    }
  }
  const frontmatterText = lines.slice(1, endIndex).join('\n')
  const body = lines.slice(endIndex + 1).join('\n')
  return { ok: true, issues: [], frontmatterText, body }
}

/**
 * 解析 + 逐条校验 frontmatter（与官方规则逐条对齐）。
 * 返回 { valid, parsed, body, issues, errors, frontmatterText, legacy }。
 * errors 是给「为什么没生效」用的人话，issues 是同一批问题的短句数组。
 */
function parseSkillText(yaml, raw, nameHint) {
  const split = splitFrontmatter(raw)
  if (!split.ok) {
    return {
      valid: false,
      parsed: null,
      body: split.body,
      frontmatterText: null,
      issues: split.issues,
      errors: split.issues,
      legacy: [],
    }
  }
  if (yaml === null) {
    return {
      valid: false,
      parsed: null,
      body: split.body,
      frontmatterText: split.frontmatterText,
      issues: ['yaml 依赖不可用，无法解析 frontmatter'],
      errors: ['yaml 依赖不可用，无法解析 frontmatter'],
      legacy: [],
    }
  }
  let data
  try {
    data = yaml.parse(split.frontmatterText)
  } catch (cause) {
    const detail = messageOf(cause)
    return {
      valid: false,
      parsed: null,
      body: split.body,
      frontmatterText: split.frontmatterText,
      issues: ['frontmatter 不是合法 YAML：' + detail],
      errors: ['frontmatter 不是合法 YAML：' + detail],
      legacy: [],
    }
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      parsed: null,
      body: split.body,
      frontmatterText: split.frontmatterText,
      issues: ['frontmatter 不是对象（key: value 映射）'],
      errors: ['frontmatter 不是对象（key: value 映射）'],
      legacy: [],
    }
  }

  // issues 是给面板逐条展示的短句；fatal 单独记一份，判断 valid 时不用猜文案前缀。
  const issues = []
  const fatal = []
  const legacy = []
  const add = (message, isFatal) => {
    issues.push(message)
    if (isFatal) fatal.push(message)
  }
  for (const entry of LEGACY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(data, entry.key)) {
      legacy.push(entry)
      add('frontmatter field "' + entry.key + '" is unsupported; use "' + entry.replacement + '"（' + entry.note + '）', true)
    }
  }

  const nameValue = data.name
  let nameOk = false
  if (nameValue === undefined || nameValue === null) {
    add('缺少必填字段 name', true)
  } else if (typeof nameValue !== 'string') {
    add('name 必须是字符串，实际是 ' + typeof nameValue, true)
  } else if (!SKILL_NAME_RE.test(nameValue)) {
    add('name 必须是 kebab-case（小写字母/数字，用 - 连接），实际是 "' + nameValue + '"', true)
  } else {
    nameOk = true
  }

  const descriptionValue = data.description
  if (typeof descriptionValue !== 'string' || descriptionValue.trim() === '') {
    add(descriptionValue === undefined || descriptionValue === null ? '缺少必填字段 description' : 'description 必须是非空字符串', true)
  }

  if (data.whenToUse !== undefined && data.whenToUse !== null && typeof data.whenToUse !== 'string') {
    add('whenToUse 必须是字符串', true)
  }
  if (data.metadata !== undefined && data.metadata !== null && (typeof data.metadata !== 'object' || Array.isArray(data.metadata))) {
    add('metadata 必须是对象', true)
  }

  // 两个开关的默认值与官方一致：省略 = 允许该面（模型可见 / 用户可调用）。
  const disableRaw = data['disable-model-invocation']
  const disableBoolean = disableRaw === undefined || disableRaw === null ? { value: false, issue: null } : readLooseBoolean(disableRaw)
  if (disableBoolean.issue !== null) add('disable-model-invocation ' + disableBoolean.issue, true)
  const userRaw = data['user-invocable']
  const userBoolean = userRaw === undefined || userRaw === null ? { value: true, issue: null } : readLooseBoolean(userRaw)
  if (userBoolean.issue !== null) add('user-invocable ' + userBoolean.issue, true)

  // 官方对「frontmatter.name 与文件/目录名不一致」只警告不丢弃，这里同样只提示。
  if (nameOk && typeof nameHint === 'string' && nameHint !== '' && nameValue !== nameHint) {
    add('frontmatter 里的 name "' + nameValue + '" 与文件名/目录名 "' + nameHint + '" 不一致（官方按文件名注册，只是警告）', false)
  }

  const parsed = {
    name: typeof nameValue === 'string' ? nameValue : null,
    description: typeof descriptionValue === 'string' ? descriptionValue : null,
    whenToUse: typeof data.whenToUse === 'string' ? data.whenToUse : null,
    metadata: data.metadata !== null && typeof data.metadata === 'object' && !Array.isArray(data.metadata) ? data.metadata : null,
    modelInvocable: disableBoolean.value !== true,
    userInvocable: userBoolean.value !== false,
  }

  return {
    valid: fatal.length === 0 && nameOk,
    parsed,
    body: split.body,
    frontmatterText: split.frontmatterText,
    issues,
    errors: fatal,
    legacy,
  }
}

/* ------------------------------------------------------------- 安全边界 */

/**
 * 可写根的 realpath 集合。根目录本身可能还不存在（首次创建），
 * 此时取「最近的已存在祖先」的 realpath 再拼回剩余段，得到「将来会是」的真实路径。
 */
async function writableRootReals(roots) {
  const out = []
  for (const root of roots) {
    if (root.writable !== true) continue
    const real = await realpathBesteffort(root.path)
    if (real !== null) out.push({ id: root.id, path: root.path, real })
  }
  return out
}

/** 对可能不存在的路径取 realpath：逐级向上找到存在的祖先，realpath 后拼回剩余段。 */
async function realpathBesteffort(target) {
  let current = resolve(target)
  const tail = []
  for (;;) {
    try {
      const real = await realpath(current)
      return tail.length === 0 ? real : join(real, ...tail.reverse())
    } catch {
      const parent = dirname(current)
      if (parent === current) return null
      tail.push(basename(current))
      current = parent
    }
  }
}

function isInside(child, parent) {
  if (child === parent) return true
  return child.startsWith(parent.endsWith(sep) ? parent : parent + sep)
}

/**
 * 校验目标路径落在某个可写根内：先 resolve 拦 `..`，再 realpath 比对拦符号链接。
 * 返回 { ok, real, rootId, message }。
 */
async function assertWritableTarget(roots, root, targetPath) {
  if (root.writable !== true) {
    return { ok: false, real: null, rootId: root.id, message: 'root "' + root.id + '" 只读（' + root.source + '），不允许写入' }
  }
  const resolvedTarget = resolve(targetPath)
  const resolvedRoot = resolve(root.path)
  if (!isInside(resolvedTarget, resolvedRoot)) {
    return { ok: false, real: null, rootId: root.id, message: '目标路径不在 root 内（可能是 ../ 穿越）' }
  }
  const writable = await writableRootReals(roots)
  const realTarget = await realpathBesteffort(resolvedTarget)
  if (realTarget === null) return { ok: false, real: null, rootId: root.id, message: '无法解析目标路径的真实位置' }
  const hit = writable.find((item) => isInside(realTarget, item.real))
  if (hit === undefined) {
    return { ok: false, real: realTarget, rootId: root.id, message: '目标路径的真实位置落在可写根之外（可能是符号链接逃逸）' }
  }
  return { ok: true, real: realTarget, rootId: hit.id, message: null }
}

/** 名字校验：路由里所有 root + name 的输入都要过这一关，绝不靠名字反推路径安全。 */
function validateSkillName(value) {
  const text = cleanText(value)
  if (text === null) return { ok: false, name: null, message: '缺少 name' }
  if (!SKILL_NAME_RE.test(text)) return { ok: false, name: null, message: 'name 必须是 kebab-case（小写字母/数字，用 - 连接），实际是 "' + text + '"' }
  return { ok: true, name: text, message: null }
}

/* --------------------------------------------------------------- 磁盘扫描 */

function skillPathFor(root, entryName, kind) {
  return kind === 'file' ? join(root.path, entryName + '.md') : join(root.path, entryName, SKILL_FILE)
}

/**
 * 扫描单个根：目录型（<name>/SKILL.md）与文件型（<name>.md，仅根下一层），跳过 `.system`。
 * 单条目读失败不抛（返回带 error 的条目），否则一个坏文件会让整个面板空白。
 */
async function scanRoot(yaml, root) {
  const out = []
  if (root.exists !== true) return out
  let entries
  try {
    entries = await readdir(root.path, { withFileTypes: true })
  } catch (cause) {
    out.push({
      name: '（无法读取该根）',
      path: root.path,
      rootId: root.id,
      source: root.source,
      relativePath: '',
      kind: 'broken',
      writable: root.writable,
      valid: false,
      description: null,
      whenToUse: null,
      modelInvocable: true,
      userInvocable: true,
      disabled: false,
      shadowedBy: null,
      error: '读取目录失败：' + messageOf(cause),
      issues: ['读取目录失败：' + messageOf(cause)],
      size: 0,
      mtimeMs: 0,
      resources: [],
    })
    return out
  }
  for (const entry of entries) {
    const entryName = entry.name
    if (entry.isDirectory()) {
      if (entryName === SYSTEM_DIR) continue
      const file = join(root.path, entryName, SKILL_FILE)
      const item = await readSkillEntry(yaml, root, entryName, file, 'directory')
      if (item !== null) out.push(item)
      continue
    }
    if (!entry.isFile() || !entryName.toLowerCase().endsWith('.md')) continue
    const name = entryName.slice(0, -3)
    if (name === '') continue
    const file = join(root.path, entryName)
    const item = await readSkillEntry(yaml, root, name, file, 'file')
    if (item !== null) out.push(item)
  }
  return out
}

async function readSkillEntry(yaml, root, skillName, file, kind) {
  let info
  try {
    info = await stat(file)
    if (!info.isFile()) return null
  } catch {
    // 目录型 skill 缺 SKILL.md：这本身就是要让用户看到的问题，不静默跳过。
    if (kind === 'directory') {
      return {
        name: skillName,
        path: file,
        rootId: root.id,
        source: root.source,
        relativePath: relative(root.path, file),
        kind,
        writable: root.writable,
        valid: false,
        description: null,
        whenToUse: null,
        modelInvocable: true,
        userInvocable: true,
        disabled: false,
        shadowedBy: null,
        error: '目录里没有 ' + SKILL_FILE + '（官方只认 <name>/SKILL.md，目录里其它 .md 不会被扫描）',
        issues: ['目录里没有 ' + SKILL_FILE],
        size: 0,
        mtimeMs: 0,
        resources: [],
      }
    }
    return null
  }
  let raw
  try {
    raw = await readFile(file, 'utf8')
  } catch (cause) {
    return {
      name: skillName,
      path: file,
      rootId: root.id,
      source: root.source,
      relativePath: relative(root.path, file),
      kind,
      writable: root.writable,
      valid: false,
      description: null,
      whenToUse: null,
      modelInvocable: true,
      userInvocable: true,
      disabled: false,
      shadowedBy: null,
      error: '读取失败：' + messageOf(cause),
      issues: ['读取失败：' + messageOf(cause)],
      size: info.size,
      mtimeMs: info.mtimeMs,
      resources: [],
    }
  }
  const result = parseSkillText(yaml, raw, skillName)
  const parsed = result.parsed
  const modelInvocable = parsed === null ? true : parsed.modelInvocable
  const userInvocable = parsed === null ? true : parsed.userInvocable
  return {
    name: skillName,
    path: file,
    rootId: root.id,
    source: root.source,
    relativePath: relative(root.path, file),
    kind,
    writable: root.writable,
    valid: result.valid,
    description: parsed === null ? null : parsed.description,
    whenToUse: parsed === null ? null : parsed.whenToUse,
    modelInvocable,
    userInvocable,
    disabled: modelInvocable === false && userInvocable === false,
    shadowedBy: null,
    error: result.valid ? null : result.errors.length > 0 ? result.errors.join('；') : result.issues.join('；'),
    issues: result.issues,
    size: info.size,
    mtimeMs: info.mtimeMs,
    resources: kind === 'directory' ? await listResources(dirname(file)) : [],
  }
}

/** 目录型 skill 里除 SKILL.md 之外的资源文件（删除前要给用户看清单）。 */
async function listResources(dir) {
  const out = []
  const walk = async (current, depth) => {
    if (depth > 4) return
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(full, depth + 1)
        continue
      }
      if (entry.isFile() && relative(dir, full) !== SKILL_FILE) out.push(relative(dir, full))
    }
  }
  await walk(dir, 0)
  return out.sort()
}

/** 应用遮蔽关系：同名 skill 只认 rank 最小那个（rank 越小越优先）。 */
function applyShadowing(skills) {
  const sorted = [...skills].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
  const winner = new Map()
  for (const item of sorted) {
    if (item.rank === undefined) continue
    const seen = winner.get(item.name)
    if (seen === undefined) {
      winner.set(item.name, item)
      continue
    }
    item.shadowedBy = { rootId: seen.rootId, path: seen.path }
  }
  return skills
}

/* --------------------------------------------------------------- 文件写入 */

/**
 * 用 YAML 文档生成 frontmatter（保留键顺序、只写必要的布尔）。
 * 这里刻意不手拼字符串：description 里可能有引号、冒号、换行，手拼必炸。
 */
function frontmatterFromFields(yaml, fields) {
  const lines = []
  const order = FIELD_ORDER
  const data = {}
  data.name = fields.name
  data.description = fields.description
  if (fields.whenToUse !== null && fields.whenToUse !== undefined && fields.whenToUse !== '') data.whenToUse = fields.whenToUse
  if (fields.metadata !== null && fields.metadata !== undefined) data.metadata = fields.metadata
  if (fields.modelInvocable === false) data['disable-model-invocation'] = true
  if (fields.userInvocable === false) data['user-invocable'] = false
  const ordered = {}
  for (const key of order) {
    if (Object.prototype.hasOwnProperty.call(data, key)) ordered[key] = data[key]
  }
  for (const key of Object.keys(data)) {
    if (!Object.prototype.hasOwnProperty.call(ordered, key)) ordered[key] = data[key]
  }
  // schema yaml-1.1 只是让 stringify 把 `yes` / `no` / `on` / `off` 这类值加引号：
  // 读到这类字符串时不会退化成布尔，官方宽容解析也不会误判。写出的仍是标准 YAML。
  const text = yaml.stringify(ordered, { lineWidth: 0, schema: 'yaml-1.1' })
  return text.endsWith('\n') ? text : text + '\n'
}

/** 组装完整文件：`---\n<yaml>---\n\n<body>\n`（body 去尾部空白，空正文不留空行堆）。 */
function composeSkillFile(frontmatterYaml, body) {
  const cleanBody = typeof body === 'string' ? body.replace(/\s+$/, '') : ''
  const yamlText = frontmatterYaml.endsWith('\n') ? frontmatterYaml : frontmatterYaml + '\n'
  return '---\n' + yamlText + '---\n\n' + cleanBody + '\n'
}

/**
 * 原子写 + 文件锁。withFileLock 自己在 filename 后面拼 `.lock`，所以要传目标文件本身；
 * 它的锁文件用 `wx` 打开，父目录必须先存在（目录型 skill 首次创建时目录还不存在）。
 */
async function writeSkillFile(atomic, file, content) {
  await mkdir(dirname(file), { recursive: true })
  await atomic.withFileLock(file, async () => {
    await atomic.writeFileAtomic(file, content, { mode: 0o644 })
  })
}

/* ------------------------------------------------------------------- 路由 */

function registerRoute(ctx, path, methods, handler) {
  ctx.effect(() => {
    let disposeRoute
    const attempt = (remaining) => {
      try {
        disposeRoute = ctx.connection.fetch.register({ path, methods, requestBody: 'buffered', fetch: handler })
        return true
      } catch (cause) {
        const message = messageOf(cause)
        if (remaining > 0 && message.includes('already registered')) {
          ctx.timeout(() => { if (disposeRoute === undefined) attempt(remaining - 1) }, 400)
          return false
        }
        throw cause
      }
    }
    attempt(10)
    return () => { if (disposeRoute !== undefined) disposeRoute() }
  }, `skill: ${path}`)
}

/** 官方 SkillRegistry 快照：存在则交叉校验，不存在就给 available:false（不要因此报错）。 */
async function officialSnapshot(ctx) {
  try {
    const skills = ctx.get('skills')
    if (skills === null || skills === undefined) return { available: false, complete: false, count: 0, names: [], error: null }
    const snapshot = typeof skills.snapshot === 'function' ? await skills.snapshot({}) : null
    const entries = snapshot !== null && typeof snapshot === 'object' && Array.isArray(snapshot.skills) ? snapshot.skills : []
    const names = entries.map((item) => (item !== null && typeof item === 'object' && typeof item.name === 'string' ? item.name : null)).filter((item) => item !== null)
    const complete = snapshot !== null && typeof snapshot === 'object' && (snapshot.complete === true || snapshot.complete === undefined)
    return { available: true, complete, count: names.length, names: names.sort(), error: null }
  } catch (cause) {
    return { available: false, complete: false, count: 0, names: [], error: messageOf(cause) }
  }
}

export function apply(ctx) {
  const deps = createDeps(ctx)

  /** 每次都重新算根：DSH_HOME 可能被测试改掉，会话 cwd 也可能变。 */
  const snapshotRoots = () => buildRoots(ctx)

  registerRoute(ctx, '/api/skill/meta', ['GET'], async () => {
    try {
      const { dshHome, cwd, projectRoot, roots } = snapshotRoots()
      const loaded = deps.load()
      const official = await officialSnapshot(ctx)
      return json({
        ok: true,
        dshHome,
        cwd,
        projectRoot,
        roots,
        yamlAvailable: loaded.yaml !== null,
        atomicAvailable: loaded.atomic !== null,
        officialAvailable: official.available,
        dependencyError: loaded.error,
      })
    } catch (cause) {
      return json({ ok: false, code: 'skill/meta-failed', message: messageOf(cause) }, 500)
    }
  })

  registerRoute(ctx, '/api/skill/list', ['GET'], async () => {
    try {
      const { dshHome, cwd, projectRoot, roots } = snapshotRoots()
      const loaded = deps.load()
      const collected = []
      for (const root of roots) {
        const items = await scanRoot(loaded.yaml, root)
        for (const item of items) {
          item.rank = root.rank
          collected.push(item)
        }
      }
      applyShadowing(collected)
      const official = await officialSnapshot(ctx)
      const list = collected.map((item) => ({
        name: item.name,
        path: item.path,
        rootId: item.rootId,
        source: item.source,
        rank: item.rank,
        relativePath: item.relativePath,
        kind: item.kind,
        writable: item.writable,
        valid: item.valid,
        description: item.description,
        whenToUse: item.whenToUse,
        modelInvocable: item.modelInvocable,
        userInvocable: item.userInvocable,
        disabled: item.disabled,
        shadowedBy: item.shadowedBy,
        error: item.error,
        issues: item.issues,
        size: item.size,
        mtimeMs: item.mtimeMs,
        resources: item.resources,
      }))
      const diskNames = new Set(list.filter((item) => item.valid).map((item) => item.name))
      const missingOnDisk = official.names.filter((name) => !diskNames.has(name))
      // 官方识别到、磁盘却没有的（bundled 在不可见位置时会这样），面板上给一句解释而不是判错。
      return json({
        ok: true,
        dshHome,
        cwd,
        projectRoot,
        roots,
        skills: list,
        counts: {
          total: list.length,
          valid: list.filter((item) => item.valid).length,
          invalid: list.filter((item) => !item.valid).length,
          shadowed: list.filter((item) => item.shadowedBy !== null).length,
        },
        official,
        discrepancies: { missingOnDisk },
      })
    } catch (cause) {
      return json({ ok: false, code: 'skill/list-failed', message: messageOf(cause) }, 500)
    }
  })

  registerRoute(ctx, '/api/skill/one', ['GET', 'DELETE'], async (request) => {
    return request.method.toUpperCase() === 'DELETE'
      ? handleDelete(ctx, deps, request)
      : handleOne(ctx, deps, request)
  })

  registerRoute(ctx, '/api/skill/save', ['POST'], async (request) => {
    try {
      const loaded = deps.load()
      const body = await readBody(request)
      const { roots } = snapshotRoots()
      const root = rootById(roots, body.root)
      if (root === null) return json({ ok: false, code: 'skill/unknown-root', message: '未知 root：' + String(body.root) }, 400)
      const checked = validateSkillName(body.name)
      if (!checked.ok) return json({ ok: false, code: 'skill/invalid-name', message: checked.message }, 400)
      if (loaded.yaml === null) return json({ ok: false, code: 'skill/yaml-unavailable', message: loaded.error }, 500)
      if (loaded.atomic === null) return json({ ok: false, code: 'skill/atomic-unavailable', message: loaded.error }, 500)

      const target = await locateSkill(roots, root, checked.name)
      const file = target.file
      const guard = await assertWritableTarget(roots, root, file)
      if (!guard.ok) return json({ ok: false, code: 'skill/forbidden', message: guard.message }, 403)

      const mode = cleanText(body.mode) ?? 'raw'
      let content
      if (mode === 'structured') {
        const fields = sanitizeFields(body.fields, checked.name)
        if (fields.issues.length > 0) return json({ ok: false, code: 'skill/invalid-frontmatter', message: fields.issues.join('；'), issues: fields.issues }, 400)
        content = composeSkillFile(frontmatterFromFields(loaded.yaml, fields), body.body)
        const verify = parseSkillText(loaded.yaml, content, checked.name)
        if (!verify.valid) return json({ ok: false, code: 'skill/invalid-frontmatter', message: verify.errors.join('；'), issues: verify.issues }, 400)
      } else if (mode === 'raw') {
        if (typeof body.raw !== 'string' || body.raw.trim() === '') {
          return json({ ok: false, code: 'skill/invalid-frontmatter', message: 'raw 为空', issues: ['raw 为空'] }, 400)
        }
        content = body.raw
        const verify = parseSkillText(loaded.yaml, content, checked.name)
        if (!verify.valid) {
          return json({ ok: false, code: 'skill/invalid-frontmatter', message: verify.errors.join('；'), issues: verify.issues }, 400)
        }
      } else {
        return json({ ok: false, code: 'skill/invalid-mode', message: 'mode 只能是 raw 或 structured' }, 400)
      }

      await writeSkillFile(loaded.atomic, file, content)
      return json({ ok: true, path: file, rootId: root.id, name: checked.name, mode, bytes: Buffer.byteLength(content, 'utf8') })
    } catch (cause) {
      return json({ ok: false, code: 'skill/save-failed', message: messageOf(cause) }, 500)
    }
  })

  registerRoute(ctx, '/api/skill/create', ['POST'], async (request) => {
    try {
      const loaded = deps.load()
      const body = await readBody(request)
      const { roots } = snapshotRoots()
      const root = rootById(roots, body.root)
      if (root === null) return json({ ok: false, code: 'skill/unknown-root', message: '未知 root：' + String(body.root) }, 400)
      const checked = validateSkillName(body.name)
      if (!checked.ok) return json({ ok: false, code: 'skill/invalid-name', message: checked.message }, 400)
      if (loaded.yaml === null) return json({ ok: false, code: 'skill/yaml-unavailable', message: loaded.error }, 500)
      if (loaded.atomic === null) return json({ ok: false, code: 'skill/atomic-unavailable', message: loaded.error }, 500)
      const kind = cleanText(body.kind) === 'file' ? 'file' : 'directory'
      const file = skillPathFor(root, checked.name, kind)
      const guard = await assertWritableTarget(roots, root, file)
      if (!guard.ok) return json({ ok: false, code: 'skill/forbidden', message: guard.message }, 403)

      const existing = await locateSkill(roots, root, checked.name)
      if (existing.found) return json({ ok: false, code: 'skill/exists', message: '已存在：' + existing.file }, 409)

      const fields = sanitizeFields({
        name: checked.name,
        description: body.description,
        whenToUse: body.whenToUse,
        metadata: body.metadata,
        modelInvocable: body.modelInvocable === undefined ? true : body.modelInvocable,
        userInvocable: body.userInvocable === undefined ? true : body.userInvocable,
      }, checked.name)
      if (fields.issues.length > 0) return json({ ok: false, code: 'skill/invalid-frontmatter', message: fields.issues.join('；'), issues: fields.issues }, 400)

      const defaultBody = typeof body.body === 'string' && body.body.trim() !== ''
        ? body.body
        : '# ' + checked.name + '\n\n' + (cleanText(body.description) ?? '') + '\n'
      const content = composeSkillFile(frontmatterFromFields(loaded.yaml, fields), defaultBody)
      await writeSkillFile(loaded.atomic, file, content)
      return json({ ok: true, path: file, rootId: root.id, name: checked.name, kind })
    } catch (cause) {
      return json({ ok: false, code: 'skill/create-failed', message: messageOf(cause) }, 500)
    }
  })

  registerRoute(ctx, '/api/skill/toggle', ['POST'], async (request) => {
    try {
      const loaded = deps.load()
      const body = await readBody(request)
      const { roots } = snapshotRoots()
      const root = rootById(roots, body.root)
      if (root === null) return json({ ok: false, code: 'skill/unknown-root', message: '未知 root：' + String(body.root) }, 400)
      const checked = validateSkillName(body.name)
      if (!checked.ok) return json({ ok: false, code: 'skill/invalid-name', message: checked.message }, 400)
      if (loaded.yaml === null) return json({ ok: false, code: 'skill/yaml-unavailable', message: loaded.error }, 500)
      if (loaded.atomic === null) return json({ ok: false, code: 'skill/atomic-unavailable', message: loaded.error }, 500)

      const target = await locateSkill(roots, root, checked.name)
      if (!target.found) return json({ ok: false, code: 'skill/not-found', message: '找不到 skill：' + checked.name }, 404)
      const guard = await assertWritableTarget(roots, root, target.file)
      if (!guard.ok) return json({ ok: false, code: 'skill/forbidden', message: guard.message }, 403)

      const raw = await readFile(target.file, 'utf8')
      const split = splitFrontmatter(raw)
      if (!split.ok) return json({ ok: false, code: 'skill/invalid-frontmatter', message: split.issues.join('；'), issues: split.issues }, 400)

      // 用 parseDocument 而不是 parse：set/delete 保住原有键顺序与注释，正文原样拼回。
      const doc = loaded.yaml.parseDocument(split.frontmatterText)
      if (doc.errors.length > 0) {
        const detail = doc.errors.map((item) => messageOf(item)).join('；')
        return json({ ok: false, code: 'skill/invalid-frontmatter', message: 'frontmatter 不是合法 YAML：' + detail, issues: [detail] }, 400)
      }
      if (doc.contents === null || typeof doc.contents !== 'object') {
        return json({ ok: false, code: 'skill/invalid-frontmatter', message: 'frontmatter 不是对象', issues: ['frontmatter 不是对象'] }, 400)
      }

      if (body.modelInvocable !== undefined) {
        if (typeof body.modelInvocable !== 'boolean') return json({ ok: false, code: 'skill/invalid-body', message: 'modelInvocable 必须是布尔' }, 400)
        if (body.modelInvocable === true) doc.delete('disable-model-invocation')
        else doc.set('disable-model-invocation', true)
      }
      if (body.userInvocable !== undefined) {
        if (typeof body.userInvocable !== 'boolean') return json({ ok: false, code: 'skill/invalid-body', message: 'userInvocable 必须是布尔' }, 400)
        if (body.userInvocable === true) doc.delete('user-invocable')
        else doc.set('user-invocable', false)
      }

      const text = doc.toString()
      const content = '---\n' + (text.endsWith('\n') ? text : text + '\n') + '---\n' + split.body
      await writeSkillFile(loaded.atomic, target.file, content)
      const verify = parseSkillText(loaded.yaml, content, checked.name)
      return json({
        ok: true,
        path: target.file,
        rootId: root.id,
        name: checked.name,
        parsed: verify.parsed,
        valid: verify.valid,
        issues: verify.issues,
      })
    } catch (cause) {
      return json({ ok: false, code: 'skill/toggle-failed', message: messageOf(cause) }, 500)
    }
  })

  registerRoute(ctx, '/api/skill/sync', ['POST'], async () => {
    try {
      const official = await officialSnapshot(ctx)
      return json({ ok: true, official })
    } catch (cause) {
      return json({ ok: false, code: 'skill/sync-failed', message: messageOf(cause) }, 500)
    }
  })
}

/* ------------------------------------------------------- 单个 skill 的定位 */

/**
 * 定位 root 下一个 skill 的文件：优先目录型，其次文件型。
 * 只用 root.path + 已校验的名字拼路径，不接受外部路径。
 */
async function locateSkill(roots, root, skillName) {
  const dirFile = join(root.path, skillName, SKILL_FILE)
  const flatFile = join(root.path, skillName + '.md')
  const dirExists = await pathStat(dirFile)
  if (dirExists !== null) return { found: true, file: dirFile, kind: 'directory' }
  const flatExists = await pathStat(flatFile)
  if (flatExists !== null) return { found: true, file: flatFile, kind: 'file' }
  // 目录存在但缺 SKILL.md 时，写入应落到目录型位置（用户点保存就是想让这个 skill 生效）。
  const dirStat = await pathStat(join(root.path, skillName))
  if (dirStat !== null && dirStat.isDirectory()) return { found: true, file: dirFile, kind: 'directory', missingFile: true }
  return { found: false, file: dirFile, kind: 'directory' }
}

async function pathStat(target) {
  try {
    return await stat(target)
  } catch {
    return null
  }
}

/* ------------------------------------------------------------- 单条与删除 */

function requestUrl(request) {
  try {
    return new URL(request.url)
  } catch {
    return null
  }
}

async function handleOne(ctx, deps, request) {
  try {
    const loaded = deps.load()
    const url = requestUrl(request)
    if (url === null) return json({ ok: false, code: 'skill/invalid-request', message: '无法解析请求 URL' }, 400)
    const { roots } = buildRoots(ctx)
    const root = rootById(roots, url.searchParams.get('root'))
    if (root === null) return json({ ok: false, code: 'skill/unknown-root', message: '未知 root：' + String(url.searchParams.get('root')) }, 400)
    const checked = validateSkillName(url.searchParams.get('name'))
    if (!checked.ok) return json({ ok: false, code: 'skill/invalid-name', message: checked.message }, 400)
    if (loaded.yaml === null) return json({ ok: false, code: 'skill/yaml-unavailable', message: loaded.error }, 500)

    const target = await locateSkill(roots, root, checked.name)
    if (!target.found) return json({ ok: false, code: 'skill/not-found', message: '找不到 skill：' + checked.name }, 404)
    const raw = await readFile(target.file, 'utf8').catch(() => null)
    if (raw === null) {
      return json({ ok: false, code: 'skill/not-found', message: '找不到文件：' + target.file }, 404)
    }
    const result = parseSkillText(loaded.yaml, raw, checked.name)
    const info = await pathStat(target.file)
    return json({
      ok: true,
      name: checked.name,
      rootId: root.id,
      source: root.source,
      path: target.file,
      relativePath: relative(root.path, target.file),
      kind: target.kind,
      writable: root.writable,
      raw,
      parsed: result.parsed,
      body: result.body,
      frontmatterText: result.frontmatterText,
      valid: result.valid,
      issues: result.issues,
      legacy: result.legacy.map((item) => ({ key: item.key, replacement: item.replacement })),
      resources: target.kind === 'directory' ? await listResources(dirname(target.file)) : [],
      size: info === null ? 0 : info.size,
      mtimeMs: info === null ? 0 : info.mtimeMs,
    })
  } catch (cause) {
    return json({ ok: false, code: 'skill/read-failed', message: messageOf(cause) }, 500)
  }
}

async function handleDelete(ctx, deps, request) {
  try {
    const url = requestUrl(request)
    if (url === null) return json({ ok: false, code: 'skill/invalid-request', message: '无法解析请求 URL' }, 400)
    const force = url.searchParams.get('force') === '1' || url.searchParams.get('force') === 'true'
    const { roots } = buildRoots(ctx)
    const root = rootById(roots, url.searchParams.get('root'))
    if (root === null) return json({ ok: false, code: 'skill/unknown-root', message: '未知 root：' + String(url.searchParams.get('root')) }, 400)
    const checked = validateSkillName(url.searchParams.get('name'))
    if (!checked.ok) return json({ ok: false, code: 'skill/invalid-name', message: checked.message }, 400)

    const target = await locateSkill(roots, root, checked.name)
    if (!target.found) return json({ ok: false, code: 'skill/not-found', message: '找不到 skill：' + checked.name }, 404)
    const guardTarget = target.kind === 'directory' ? dirname(target.file) : target.file
    const guard = await assertWritableTarget(roots, root, guardTarget)
    if (!guard.ok) return json({ ok: false, code: 'skill/forbidden', message: guard.message }, 403)

    if (target.kind === 'directory') {
      const resources = await listResources(dirname(target.file))
      if (resources.length > 0 && !force) {
        return json({
          ok: false,
          code: 'skill/has-resources',
          message: '目录里还有 ' + resources.length + ' 个资源文件，确认要一起删除请加 force',
          resources,
          path: dirname(target.file),
        }, 409)
      }
      await rm(dirname(target.file), { recursive: true, force: true })
    } else {
      await rm(target.file, { force: true })
    }
    return json({ ok: true, name: checked.name, rootId: root.id, kind: target.kind, path: guardTarget })
  } catch (cause) {
    return json({ ok: false, code: 'skill/delete-failed', message: messageOf(cause) }, 500)
  }
}

/* --------------------------------------------------------------- 字段清洗 */

/**
 * 结构化保存的字段归一：只认官方字段，布尔写真布尔，字符串做 trim。
 * metadata 只接受普通对象（数组与嵌套函数一律报错，避免写出扫描器不认的 YAML）。
 */
function sanitizeFields(input, expectedName) {
  const issues = []
  const data = input !== null && typeof input === 'object' ? input : {}
  const nameRaw = cleanText(data.name) ?? expectedName
  if (!SKILL_NAME_RE.test(nameRaw)) issues.push('name 必须是 kebab-case，实际是 "' + nameRaw + '"')
  const description = cleanText(data.description)
  if (description === null) issues.push('description 不能为空')
  const whenToUse = cleanText(data.whenToUse)
  let metadata = null
  if (data.metadata !== undefined && data.metadata !== null) {
    if (typeof data.metadata !== 'object' || Array.isArray(data.metadata)) issues.push('metadata 必须是对象')
    else metadata = data.metadata
  }
  const modelInvocable = data.modelInvocable === undefined ? true : data.modelInvocable
  if (typeof modelInvocable !== 'boolean') issues.push('modelInvocable 必须是布尔')
  const userInvocable = data.userInvocable === undefined ? true : data.userInvocable
  if (typeof userInvocable !== 'boolean') issues.push('userInvocable 必须是布尔')
  return {
    name: nameRaw,
    description: description ?? '',
    whenToUse,
    metadata,
    modelInvocable: modelInvocable === true,
    userInvocable: userInvocable === true,
    issues,
  }
}
