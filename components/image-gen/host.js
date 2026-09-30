/**
 * @local/image-gen — 图片生成工具（host-only，零核心包导入）。
 *
 * 注册 `generate_image` 工具：走**标准 OpenAI Images 接口**
 * `POST {baseURL}/images/generations`（绝不走 chat/completions，也没有厂商私有协议）。
 *
 * 刻意不 import 任何 @deepseek-ai 包：外部 link 安装的 bundle 从真实路径
 * 解析依赖，核心包不可达；全部能力通过 ctx 服务获得（与 @local/token-usage
 * 同一模式）。工具定义用原生 JSON-Schema 形状（与官方 mcp-client 注册
 * 形状一致，ToolRuntime 直接接受）。
 *
 * 模型接入（接口地址 / 模型 id / API Key）全部交给 ./config.js：
 * 面板「设置」Tab 写配置文件，工具与面板读到同一份真相。
 *
 * 图片 URL 约 24 小时过期，因此同时统一下载到 imageDir()（默认 ~/image-gen，
 * `IMAGE_GEN_DIR` 可覆盖）并返回本地路径；下载失败不影响返回 URL。
 * 跟会话工作区无关，图片不落进项目目录。
 */
import { DEFAULT_KEY_ENV, DEFAULT_SIZE, SIZES, resolveConfig } from './config.js?v=34'
// 共享模块在 Host ESM 缓存里按 URL 区分，不带 query 会命中旧实例拿不到新导出；
// 改了任何共享底层（config.js / generate.js / library.js）都要同步升这个 ?v。
import { MAX_COUNT, MAX_REFERENCES, generateMany, pickCount, pickSize, resolveReferenceImage } from './generate.js?v=34'

export const name = 'image-gen'
export const inject = ['tools', 'credentials']

const TOOL_TIMEOUT_MS = 360000

export function apply(ctx) {
  const register = (tool) => {
    if (typeof ctx.effect === 'function') ctx.effect(() => ctx.tools.register(tool), 'image-gen: generate_image')
    else ctx.tools.register(tool)
  }

  register({
    name: 'generate_image',
    description:
      '调用已配置的图片生成接口（标准 OpenAI Images 接口 `POST /images/generations`）生成或编辑图片。'
      + '用户要求生成、绘制、创建图片时直接文生图；'
      + '要修改/重绘/风格化已有图片时传 image（本地路径、https URL 或 data URL）做图生图，并在 prompt 里说明改动要求。'
      + '提示词越详细越好（主体、风格、场景、构图、光线）。'
      + `size 为输出像素尺寸，常用 ${SIZES.join('、')}（默认 ${DEFAULT_SIZE}）。`
      + `count 可一次生成多张（1-${MAX_COUNT}）。返回图片 URL（约 24 小时有效）和已保存的本地文件路径。`
      + '图片统一保存在固定目录（默认 ~/image-gen，环境变量 IMAGE_GEN_DIR 可覆盖），不写入当前项目。'
      + '模型与接口地址在「图片生成」面板的设置里配置。',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: '详细的图片生成提示词，建议包含主体、风格、场景、构图、光线等细节。' },
        size: { type: 'string', description: `输出像素尺寸，例如 1024x1024（默认）、1536x1024、1024x1536、1792x1024、1024x1792。` },
        count: { type: 'integer', description: `生成张数（1-${MAX_COUNT}，默认 1）。` },
        image: {
          type: 'array',
          items: { type: 'string' },
          description: '可选：参考图片（图生图 / 编辑 / 多图合成）。每项为本地文件路径、https URL 或 data URL；传入后按 prompt 对参考图重绘或编辑。',
        },
      },
      required: ['prompt'],
      additionalProperties: false,
    },
    timeoutMs: TOOL_TIMEOUT_MS,
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          error: { type: 'string' },
          model: { type: 'string' },
          count: { type: 'integer' },
          size: { type: 'string' },
          imageUrls: { type: 'array', items: { type: 'string' } },
          imageUrl: { type: 'string' },
          files: { type: 'array', items: { type: 'string' } },
          partial: { type: 'string' },
        },
        required: ['ok'],
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    async execute(args, exec) {
      exec?.signal?.throwIfAborted?.()
      const prompt = String(args?.prompt ?? '').trim()
      if (prompt === '') return { ok: false, error: 'prompt 不能为空' }
      const size = pickSize(args?.size)
      const count = pickCount(args?.count)

      const { baseURL, model, apiKey, keyEnv, name, empty } = await resolveConfig(ctx)
      if (empty === true || model === null) {
        return { ok: false, error: '模型目录为空：请先在「图片生成 → 设置」里添加一个模型（接口地址 + 模型 id）。' }
      }
      if (apiKey === null) {
        return { ok: false, error: `默认模型「${name || model}」还没有密钥（${keyEnv || DEFAULT_KEY_ENV}）：请在「图片生成 → 设置」里为该模型填入 API Key。` }
      }

      // 参考图（图生图）：归一为 https URL / data URL；任一失败直接报错返回。
      const rawImages = Array.isArray(args?.image) ? args.image : []
      if (rawImages.length > MAX_REFERENCES) {
        return { ok: false, error: `参考图片最多 ${MAX_REFERENCES} 张` }
      }
      const references = []
      for (const raw of rawImages) {
        const resolved = await resolveReferenceImage(raw)
        if (resolved.error !== undefined) return { ok: false, error: resolved.error }
        references.push(resolved.value)
      }

      const { results, failures } = await generateMany({ baseURL, apiKey, model, prompt, size, count, references, signal: exec?.signal })
      const imageUrls = []
      const files = []
      for (const item of results) {
        if (!imageUrls.includes(item.url)) imageUrls.push(item.url)
        if (item.file !== null) files.push(item.file)
      }
      if (imageUrls.length === 0) {
        return { ok: false, error: failures[0] ?? '生图 API 返回空结果' }
      }
      return {
        ok: true,
        model,
        count: imageUrls.length,
        size,
        imageUrls,
        imageUrl: imageUrls[0],
        files,
        ...(failures.length > 0 ? { partial: `其中 ${failures.length} 张失败：${failures[0]}` } : {}),
      }
    },
  })
}