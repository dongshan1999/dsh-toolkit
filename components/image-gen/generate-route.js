/**
 * @local/image-gen — 面板生图路由（右栏「文生图 / 图生图」表单直接触发生成）。
 *
 *   POST /api/image-gen/generate
 *   body: { prompt, size?, count?, images?: [{ kind: 'saved'|'path'|'url'|'data', value }] }
 *
 * 与 generate_image 工具共用 ./generate.js 同一条链路；参考图允许直接点名
 * 收纳里已保存的图片（kind: 'saved'），省掉导出再上传；已保存图按
 * scanImageDirs() 解析（统一目录优先 + 历史工作区兼容）。
 * 返回落盘后的文件名（面板按名字取图，不受 24 小时 URL 过期影响）。
 */
import { readFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'

import { resolveConfig } from './config.js?v=34'
import { MAX_COUNT, MAX_REFERENCES, generateMany, pickCount, pickSize, resolveReferenceImage, scanImageDirs } from './generate.js?v=34'

export const name = 'image-gen-generate'
export const inject = ['settings', 'credentials', 'connection', 'sessions']

const IMAGE_NAME = /^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/i
const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
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

/** 把「收纳里已保存的图片名」读成 data URI（只在扫描目录集合里找：统一目录优先 + 历史工作区兼容）。 */
async function readSavedReference(dirs, name) {
  const safe = basename(String(name ?? ''))
  if (!IMAGE_NAME.test(safe)) return { error: '参考图文件名非法' }
  for (const dir of dirs) {
    const full = join(dir, safe)
    try {
      const bytes = await readFile(full)
      const mime = MIME_BY_EXT[extname(safe).toLowerCase()] ?? 'image/png'
      return { value: `data:${mime};base64,${bytes.toString('base64')}` }
    } catch { /* 下一个目录 */ }
  }
  return { error: `收纳里找不到这张图：${safe}` }
}

async function resolveReferences(dirs, rawImages) {
  if (rawImages.length > MAX_REFERENCES) return { error: `参考图片最多 ${MAX_REFERENCES} 张` }
  const references = []
  for (const raw of rawImages) {
    if (raw !== null && typeof raw === 'object' && raw.kind === 'saved') {
      const saved = await readSavedReference(dirs, raw.value)
      if (saved.error !== undefined) return { error: saved.error }
      references.push(saved.value)
      continue
    }
    const value = raw !== null && typeof raw === 'object' ? raw.value : raw
    const resolved = await resolveReferenceImage(value)
    if (resolved.error !== undefined) return { error: resolved.error }
    references.push(resolved.value)
  }
  return { references }
}

export function apply(ctx) {
  ctx.effect(() => {
    let disposeRoute
    const attempt = (remaining) => {
      try {
        disposeRoute = ctx.connection.fetch.register({
          path: '/api/image-gen/generate',
          methods: ['POST'],
          requestBody: 'buffered',
          fetch: async (request) => {
            try {
              const body = await request.json().catch(() => ({}))
              const prompt = String(body?.prompt ?? '').trim()
              if (prompt === '') return json({ ok: false, message: 'prompt 不能为空' }, 400)
              const size = pickSize(body?.size)
              const count = pickCount(body?.count)
              const dirs = scanImageDirs(ctx)
              const { baseURL, model, apiKey, keyEnv, name, empty } = await resolveConfig(ctx)
              if (empty === true || model === null) {
                return json({ ok: false, message: '模型目录为空：先在「设置」里添加模型（被删除的内置模型重新添加同 id 即可恢复）。' }, 400)
              }
              if (apiKey === null) {
                return json({ ok: false, message: `默认模型「${name || model}」还没有密钥（${keyEnv}）：打开「设置」为对应分组填入后再生成。` }, 400)
              }
              const rawImages = Array.isArray(body?.images) ? body.images : []
              const resolvedRefs = await resolveReferences(dirs, rawImages)
              if (resolvedRefs.error !== undefined) return json({ ok: false, message: resolvedRefs.error }, 400)

              const { results, failures } = await generateMany({
                baseURL, apiKey, model, prompt, size, count,
                references: resolvedRefs.references,
              })
              if (results.length === 0) {
                return json({ ok: false, message: failures[0] ?? '生图 API 返回空结果', model, size }, 502)
              }
              return json({
                ok: true,
                model,
                size,
                count: results.length,
                files: results.map((item) => item.name).filter((name) => name !== null),
                images: results.map((item) => ({
                  name: item.name,
                  // data URL 体积过大，不回传；面板按 name 从本地读图。
                  ...(/^https:\/\//i.test(item.url) ? { url: item.url } : {}),
                })),
                ...(failures.length > 0 ? { partial: `其中 ${failures.length} 张失败：${failures[0]}` } : {}),
              })
            } catch (cause) {
              return json({ ok: false, message: String(cause?.message || cause) }, 500)
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
  }, 'image-gen: /api/image-gen/generate')
}