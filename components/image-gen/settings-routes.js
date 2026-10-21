/**
 * @local/image-gen — 生图模型接入设置路由。
 *
 *   GET  /api/image-gen/config        当前生效的默认模型 + 组/模型目录（永不回传密钥明文）
 *   POST /api/image-gen/config        单一写入口，按 action 区分：
 *       { action: 'addProvider',    name?, baseURL, apiKey?, models?: [{ model, name? }] }
 *       { action: 'updateProvider', id, name?, baseURL?, apiKey? }
 *       { action: 'removeProvider', id }
 *       { action: 'addModels',      providerId, models: [{ model, name?, pricePerImage? }] }
 *       { action: 'updateModel',    id, name?, model?, pricePerImage? }
 *       { action: 'removeModel',    id }
 *       { action: 'setDefault',     id }
 *   POST /api/image-gen/config/test    连通性自检：只打 /models，不触发生图扣费（{ id } 指定模型或组）
 *   POST /api/image-gen/config/models  拉取可用模型：{ id } 按组、{ baseURL, apiKey } 按临时参数；
 *                                      返回 added = 该组已添加的上游模型 id（面板据此置灰）
 *
 * 写入目标与结构见 ./config.js。
 */
import {
  addModels,
  addProvider,
  configView,
  removeModel,
  removeProvider,
  resolveConfig,
  resolveModelById,
  resolveProviderById,
  setDefaultModel,
  updateModel,
  updateProvider,
} from './config.js?v=44'

export const name = 'image-gen-settings'
export const inject = ['settings', 'credentials', 'connection', 'timer']

const TEST_TIMEOUT_MS = 15000

/** 生图模型识别：认出常见生图命名，同时排除嵌入/语音/视频/重排等非生图模型。
 *  hunyuan / qwen / seed 这类既有文本也有生图的名字不单独收录，靠 image 等后缀命中。 */
const IMAGE_MODEL_HINT = /image|dall|flux|draw|imagine|banana|seedream|seededit|kolors|wanx|kandinsky|pixart|midjourney|ideogram|recraft|stable-?diffusion|sdxl|sd-?xl|sd\d|txt2img|t2i/i
const NON_IMAGE_HINT = /embed|rerank|moderation|tts|audio|speech|whisper|asr|video|ocr/i

/** 从 /models 列表里挑出生图模型（纯函数，自检直接回归）。 */
export function filterImageModels(ids) {
  return (Array.isArray(ids) ? ids : [])
    .filter((id) => typeof id === 'string' && id !== '')
    .filter((id) => IMAGE_MODEL_HINT.test(id) && !NON_IMAGE_HINT.test(id))
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

/** 允许显式置空来"恢复默认"，因此文本字段单独判空串与 null 两种语义。 */
function textField(body, field) {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return undefined
  const value = body[field]
  if (value === null) return null
  const text = String(value).trim()
  return text === '' ? undefined : text
}

async function testConnection(baseURL, apiKey) {
  let response
  try {
    response = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, accept: 'application/json' },
      signal: AbortSignal.timeout(TEST_TIMEOUT_MS),
    })
  } catch (error) {
    return { ok: false, message: `连接失败：${String(error?.cause?.message ?? error?.message ?? error)}` }
  }
  const text = await response.text().catch(() => '')
  if (response.status === 401 || response.status === 403) {
    return { ok: false, status: response.status, message: `接口可达，但 Key 被拒绝（HTTP ${response.status}）` }
  }
  if (response.status === 404) {
    return { ok: false, status: 404, message: '接口可达，但该地址没有 /models 列表（部分中转站如此）；可直接试生成一张图确认。' }
  }
  if (response.status !== 200) {
    return { ok: false, status: response.status, message: `接口返回 HTTP ${response.status}：${text.slice(0, 200) || '无响应体'}` }
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, status: 200, message: `接口可达，但 /models 返回的不是 JSON：${text.slice(0, 120)}` }
  }
  const ids = (Array.isArray(parsed?.data) ? parsed.data : [])
    .map((item) => (typeof item?.id === 'string' ? item.id : null))
    .filter((id) => id !== null)
  const imageIds = filterImageModels(ids)
  return {
    ok: true,
    status: 200,
    count: ids.length,
    imageCount: imageIds.length,
    // 只列生图模型（不回退成全部）：面板只该拿生图模型去建目录。
    models: imageIds.slice(0, 24),
    message: ids.length === 0
      ? '接口可达，但 /models 没有列出模型；可直接试生成一张图确认。'
      : imageIds.length === 0
        ? `接口可达，共 ${ids.length} 个模型，但没识别出生图模型；可手动填写模型 id。`
        : `接口可达，共 ${ids.length} 个模型，其中 ${imageIds.length} 个生图模型已列出。`,
  }
}

export function apply(ctx) {
  function registerRoute(path, methods, handler) {
    ctx.effect(() => {
      let disposeRoute
      const attempt = (remaining) => {
        try {
          disposeRoute = ctx.connection.fetch.register({
            path,
            methods,
            requestBody: 'buffered',
            fetch: handler,
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
    }, `image-gen: ${path}`)
  }

  // 写操作统一在这里：成功一律回传最新的完整目录视图，客户端拿一份全量渲染。
  const WRITES = {
    async addProvider(body) {
      const result = await addProvider(ctx, body)
      return { ok: result.ok, status: result.ok ? 200 : 400, id: result.id, message: result.message || result.error }
    },
    async updateProvider(body) {
      const result = await updateProvider(ctx, body)
      return { ok: result.ok, status: result.ok ? 200 : 400, id: result.id, message: result.message || result.error }
    },
    async removeProvider(body) {
      const result = await removeProvider(body?.id)
      return { ok: result.ok, status: result.ok ? 200 : 400, message: result.message || result.error }
    },
    async addModels(body) {
      const result = await addModels(body?.providerId, body?.models)
      return { ok: result.ok, status: result.ok ? 200 : 400, added: result.added, message: result.message || result.error }
    },
    async updateModel(body) {
      const result = await updateModel(body)
      return { ok: result.ok, status: result.ok ? 200 : 400, id: result.id, message: result.message || result.error }
    },
    async removeModel(body) {
      const result = await removeModel(body?.id)
      return { ok: result.ok, status: result.ok ? 200 : 400, message: result.message || result.error }
    },
    async setDefault(body) {
      const result = await setDefaultModel(body?.id)
      return { ok: result.ok, status: result.ok ? 200 : 400, id: result.id, message: result.ok ? '已切换默认模型' : result.error }
    },
  }

  registerRoute('/api/image-gen/config', ['GET', 'POST'], async (request) => {
    try {
      if (request.method === 'GET') {
        return json({ ok: true, config: await configView(ctx) })
      }
      const body = await request.json().catch(() => ({}))
      const action = String(body?.action ?? '')
      const write = WRITES[action === 'remove' ? 'removeModel' : action]
      if (write === undefined) return json({ ok: false, message: `未知操作：${action || '（空）'}` }, 400)
      const result = await write(body)
      if (result.ok !== true) return json({ ok: false, message: result.message }, result.status ?? 400)
      return json({ ...result, config: await configView(ctx) })
    } catch (cause) {
      return json({ ok: false, message: String((cause && cause.message) || cause) }, 500)
    }
  })

  registerRoute('/api/image-gen/config/test', ['POST'], async (request) => {
    try {
      const body = await request.json().catch(() => ({}))
      let baseURL
      let apiKey
      // 带 id：按目录条目测试（用该条所属组的 baseURL 与该组密钥）。
      if (typeof body?.id === 'string' && body.id.trim() !== '') {
        const one = await resolveModelById(ctx, body.id)
        if (one === null) return json({ ok: false, message: '目录里没有这个模型' }, 404)
        baseURL = one.baseURL
        apiKey = one.apiKey
      } else {
        const resolved = await resolveConfig(ctx)
        baseURL = textField(body, 'baseURL') ?? resolved.baseURL
        apiKey = textField(body, 'apiKey') ?? resolved.apiKey
      }
      if (apiKey === null) {
        return json({ ok: false, message: '这条模型所属的组还没有 API Key：先在设置里为对应组填入再测试。' }, 400)
      }
      return json(await testConnection(baseURL, apiKey))
    } catch (cause) {
      return json({ ok: false, message: String((cause && cause.message) || cause) }, 500)
    }
  })

  // 拉取 /models：{ id } 用该组的链接与密钥（获取 / 更新模型），{ baseURL, apiKey } 用表单里刚填的
  // （组还没保存时）。added 回传该组已有的上游模型 id，面板把已添加的置灰。
  registerRoute('/api/image-gen/config/models', ['POST'], async (request) => {
    try {
      const body = await request.json().catch(() => ({}))
      let baseURL
      let apiKey
      let added = []
      const providerId = typeof body?.id === 'string' ? body.id.trim() : ''
      if (providerId !== '') {
        const provider = await resolveProviderById(ctx, providerId)
        if (provider === null) return json({ ok: false, message: '没有这个模型组' }, 404)
        // 表单里刚改过的链接 / Key 优先（改完链接不必先存盘就能拉列表），没填就回落该组已存的值。
        baseURL = textField(body, 'baseURL') ?? provider.baseURL
        apiKey = textField(body, 'apiKey') ?? provider.apiKey
        added = provider.models
      } else {
        const resolved = await resolveConfig(ctx)
        baseURL = textField(body, 'baseURL') ?? resolved.baseURL
        apiKey = textField(body, 'apiKey') ?? resolved.apiKey
      }
      if (apiKey === null) {
        return json({ ok: false, message: '这个组还没有 API Key：先填 Key（或先保存该组）再获取模型。' }, 400)
      }
      const test = await testConnection(baseURL, apiKey)
      if (test.ok !== true) {
        return json({ ok: false, status: test.status, message: test.message }, 400)
      }
      return json({ ok: true, baseURL, models: test.models, all: test.count, added, message: test.message })
    } catch (cause) {
      return json({ ok: false, message: String((cause && cause.message) || cause) }, 500)
    }
  })
}