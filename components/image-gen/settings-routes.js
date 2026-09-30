/**
 * @local/image-gen — 生图模型接入设置路由。
 *
 *   GET  /api/image-gen/config       当前生效的 baseURL / model / Key 状态（永不回传密钥明文）
 *   POST /api/image-gen/config       写入 baseURL / model / API Key
 *   POST /api/image-gen/config/test  连通性自检：只打 /models，不触发生图扣费
 *
 * 写入目标见 ./config.js（本机配置文件 + 凭据库）。
 */
import { addModel, configView, removeModel, resolveConfig, resolveModelById, saveApiKey, setDefaultModel } from './config.js?v=35'

export const name = 'image-gen-settings'
export const inject = ['settings', 'credentials', 'connection']

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

  registerRoute('/api/image-gen/config', ['GET', 'POST'], async (request) => {
    try {
      if (request.method === 'GET') {
        return json({ ok: true, config: await configView(ctx) })
      }
      const body = await request.json().catch(() => ({}))
      const action = String(body?.action ?? '')
      if (action === 'setDefault') {
        const result = await setDefaultModel(String(body?.id ?? ''))
        if (result.ok !== true) return json({ ok: false, message: result.error }, 400)
        return json({ ok: true, message: '已切换默认模型', config: await configView(ctx) })
      }
      if (action === 'add') {
        const result = await addModel(body)
        if (result.ok !== true) return json({ ok: false, message: result.error }, 400)
        // 随附密钥：存进该条目自己的 keyEnv（自定义组默认 CUSTOM_API_KEY），不串组。
        let keyNote = ''
        const attachedKey = textField(body, 'apiKey')
        if (attachedKey !== undefined && attachedKey !== null && result.entry?.keyEnv) {
          const stored = await saveApiKey(ctx, attachedKey, result.entry.keyEnv)
          keyNote = stored === 'credentials' ? '，密钥已写入凭据库' : '，密钥已写入配置文件'
        }
        return json({ ok: true, id: result.id, message: '已加入模型目录' + keyNote, config: await configView(ctx) })
      }
      if (action === 'remove') {
        const result = await removeModel(String(body?.id ?? ''))
        if (result.ok !== true) return json({ ok: false, message: result.error }, 400)
        return json({ ok: true, message: '已从目录移除', config: await configView(ctx) })
      }
      return json({ ok: false, message: `未知操作：${action || '（空）'}` }, 400)
    } catch (cause) {
      return json({ ok: false, message: String((cause && cause.message) || cause) }, 500)
    }
  })

  registerRoute('/api/image-gen/config/test', ['POST'], async (request) => {
    try {
      const body = await request.json().catch(() => ({}))
      let baseURL
      let apiKey
      // 带 id：按目录条目测试（用该条自己的 baseURL 与 keyEnv 解析密钥）。
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
        return json({ ok: false, message: '这条模型还没有可用的 API Key：先在设置里为对应分组填入再测试。' }, 400)
      }
      return json(await testConnection(baseURL, apiKey))
    } catch (cause) {
      return json({ ok: false, message: String((cause && cause.message) || cause) }, 500)
    }
  })

  // 拉取 /models 模型列表：不触发生成，只读探测；把生图模型单列出来供设置页选择。
  registerRoute('/api/image-gen/config/models', ['POST'], async (request) => {
    try {
      const body = await request.json().catch(() => ({}))
      const resolved = await resolveConfig(ctx)
      const baseURL = textField(body, 'baseURL') ?? resolved.baseURL
      const apiKey = textField(body, 'apiKey') ?? resolved.apiKey
      if (apiKey === null) {
        return json({ ok: false, message: '还没有 API Key：先在设置里填入 API Key，再加载模型列表。' }, 400)
      }
      const test = await testConnection(baseURL, apiKey)
      if (test.ok !== true) {
        return json({ ok: false, status: test.status, message: test.message }, 400)
      }
      return json({ ok: true, baseURL, models: test.models, all: test.count, message: test.message })
    } catch (cause) {
      return json({ ok: false, message: String((cause && cause.message) || cause) }, 500)
    }
  })
}