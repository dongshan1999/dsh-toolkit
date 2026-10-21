/**
 * @local/toolkit — 工具集壳的「设置」分页（Host 侧）。
 *
 * 这个组件本身不存用户数据，只负责把**其它组件的数据落点**汇总成一份只读清单，
 * 让用户在界面上直接看到「我的东西在哪、有没有、多大」：
 *
 *   GET /api/toolkit/settings →
 *     {
 *       ok, version, dataDir, overridden: {...}, overriddenNames: [...],
 *       components: [ { id, label, dir, note?, files: [ {label, path, kind, exists, bytes, mtime} ] } ]
 *     }
 *
 * 路径全部取自各组件自己的解析函数（paths.js / presets.js / notifications host），
 * 壳里不复制第二份路径真值，避免设置页显示的位置和实际读写的位置不一致。
 */
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import {
  configFile,
  dataDir,
  favoritesFile,
  imageGenDir,
  imagePromptsFile,
  imagesDir,
  libraryFile,
  modelTestDir,
  notificationsDir,
  pricingFile,
  resolvePaths,
  tokenUsageDir,
  usageFile,
} from '../image-gen/paths.js?v=44'
import { paramsFile, presetsFile } from '../model-test/presets.js?v=12'
import { configFile as notifyConfigFile, queueFile as notifyQueueFile } from '../notifications/host.js?v=10'

export const name = 'toolkit'
export const inject = ['connection', 'timer']

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function packageVersion() {
  try {
    const raw = readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
    const parsed = JSON.parse(raw)
    return typeof parsed?.version === 'string' ? parsed.version : ''
  } catch {
    return ''
  }
}

/** 单条数据项：存在性 + 大小 + mtime（读不到就 exists=false，不抛）。 */
function entry(label, path, kind = 'file') {
  let exists = false
  let bytes = 0
  let mtime = 0
  try {
    const info = statSync(path)
    if (kind === 'dir' ? info.isDirectory() : info.isFile()) {
      exists = true
      bytes = kind === 'dir' ? 0 : Number(info.size) || 0
      mtime = Number(info.mtimeMs) || 0
    }
  } catch { /* 不存在或不可读 */ }
  return { label, path, kind, exists, bytes, mtime }
}

/** 数据目录总览：每个组件一块，块内是它自己的文件/目录。 */
function storageOverview() {
  const imageGen = [
    entry('生成图目录', imagesDir(), 'dir'),
    entry('模型目录', configFile()),
    entry('提示词库', libraryFile()),
    entry('图片提示词索引', imagePromptsFile()),
    entry('收藏索引', favoritesFile()),
    entry('生图计费记录', usageFile()),
  ]
  return [
    {
      id: 'image-gen',
      label: '图片生成',
      dir: imageGenDir(),
      files: imageGen,
    },
    {
      id: 'token-usage',
      label: 'Token 用量',
      dir: tokenUsageDir(),
      files: [entry('价目文件', pricingFile())],
    },
    {
      id: 'model-test',
      label: '模型测试',
      dir: modelTestDir(),
      files: [entry('参数覆盖', paramsFile()), entry('models.dev 预设', presetsFile())],
    },
    {
      id: 'notifications',
      label: '通知',
      dir: notificationsDir(),
      files: [entry('通知配置', notifyConfigFile()), entry('通知队列', notifyQueueFile())],
    },
    {
      id: 'mcp',
      label: 'MCP 管理',
      dir: null,
      files: [],
      note: 'MCP 条目直接写进当前 profile 的 cordis.patch.yml，不占用数据目录。',
    },
    {
      id: 'skill',
      label: 'Skill 管理',
      dir: null,
      files: [],
      note: 'Skill 管理读写 profile 里的 skills 目录，不占用数据目录。',
    },
  ]
}

export function apply(ctx) {
  ctx.effect(() => {
    let disposeRoute
    const attempt = (remaining) => {
      try {
        disposeRoute = ctx.connection.fetch.register({
          path: '/api/toolkit/settings',
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: async () => {
            try {
              const components = storageOverview()
              const overridden = resolvePaths().overridden
              return json({
                ok: true,
                version: packageVersion(),
                dataDir: dataDir(),
                overridden,
                overriddenNames: Object.entries(overridden).filter(([, on]) => on === true).map(([key]) => key),
                components: components.map((component) => ({
                  ...component,
                  total: component.files.filter((file) => file.exists).length,
                  bytes: component.files.reduce((sum, file) => sum + file.bytes, 0),
                })),
              })
            } catch (cause) {
              return json({ ok: false, code: 'toolkit/settings-failed', message: String(cause?.message || cause) }, 500)
            }
          },
        })
        return true
      } catch (cause) {
        const message = String((cause && cause.message) || cause)
        if (remaining > 0 && message.includes('already registered')) {
          ctx.timeout(() => {
            if (disposeRoute === undefined) attempt(remaining - 1)
          }, 400)
          return false
        }
        return false
      }
    }
    attempt(10)
    return () => {
      if (disposeRoute !== undefined) disposeRoute()
    }
  }, 'toolkit: /api/toolkit/settings')
}
