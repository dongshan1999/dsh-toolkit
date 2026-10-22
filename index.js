// @local/dsh-toolkit — 图片生成（image-gen）+ Token 用量与活跃度（token-usage）
//                     + 模型测试（model-test）+ 通知（notifications）
//                     + MCP 管理（mcp）+ Skill 管理（skill）
//                     + 剪贴板长文本转文件（clipboard）
//                     + 工具集壳的「设置」分页（toolkit）
//
// 运行时数据按组件分开收在 $DSH_HOME/dsh-toolkit/<组件>/ 下（DSH_TOOLKIT_DATA 可整体改道）；
// 不做老位置自动迁移，迁移/兼容请用户手工处理。
import { inject as imageGenInject, apply as imageGenApply } from './components/image-gen/host.js'
import { inject as imageGenGalleryInject, apply as imageGenGalleryApply } from './components/image-gen/gallery-page.js'
import { inject as imageGenActionsInject, apply as imageGenActionsApply } from './components/image-gen/gallery-actions.js'
import { inject as imageGenFavInject, apply as imageGenFavApply } from './components/image-gen/gallery-favorites.js'
import { inject as imageGenSettingsInject, apply as imageGenSettingsApply } from './components/image-gen/settings-routes.js'
import { inject as imageGenGenerateInject, apply as imageGenGenerateApply } from './components/image-gen/generate-route.js'
import { inject as imageGenLibraryInject, apply as imageGenLibraryApply } from './components/image-gen/library-routes.js'
import { inject as tokenUsageInject, apply as tokenUsageApply } from './components/token-usage/host.js'
import { inject as tokenActivityInject, apply as tokenActivityApply } from './components/token-usage/activity.js'
import { inject as modelTestInject, apply as modelTestApply } from './components/model-test/host.js'
import { inject as notificationsInject, apply as notificationsApply } from './components/notifications/host.js'
import { inject as mcpInject, apply as mcpApply } from './components/mcp/host.js'
import { inject as skillInject, apply as skillApply } from './components/skill/host.js'
import { inject as clipboardInject, apply as clipboardApply } from './components/clipboard/host.js'
import { inject as toolkitInject, apply as toolkitApply } from './components/toolkit/host.js'

export const name = 'dsh-toolkit'

const parts = [
  { id: 'image-gen', inject: imageGenInject, apply: imageGenApply },
  { id: 'image-gen-gallery', inject: imageGenGalleryInject, apply: imageGenGalleryApply },
  { id: 'image-gen-actions', inject: imageGenActionsInject, apply: imageGenActionsApply },
  { id: 'image-gen-favorites', inject: imageGenFavInject, apply: imageGenFavApply },
  { id: 'image-gen-settings', inject: imageGenSettingsInject, apply: imageGenSettingsApply },
  { id: 'image-gen-generate', inject: imageGenGenerateInject, apply: imageGenGenerateApply },
  { id: 'image-gen-library', inject: imageGenLibraryInject, apply: imageGenLibraryApply },
  { id: 'token-usage', inject: tokenUsageInject, apply: tokenUsageApply },
  { id: 'token-usage-activity', inject: tokenActivityInject, apply: tokenActivityApply },
  { id: 'model-test', inject: modelTestInject, apply: modelTestApply },
  { id: 'notifications', inject: notificationsInject, apply: notificationsApply },
  { id: 'mcp', inject: mcpInject, apply: mcpApply },
  { id: 'skill', inject: skillInject, apply: skillApply },
  { id: 'clipboard', inject: clipboardInject, apply: clipboardApply },
  { id: 'toolkit', inject: toolkitInject, apply: toolkitApply },
]

export const inject = [
  ...new Set(parts.flatMap((part) => (Array.isArray(part.inject) ? part.inject : []))),
]

export function apply(ctx) {
  for (const part of parts) part.apply(ctx)
}