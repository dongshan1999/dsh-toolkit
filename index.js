// @local/dsh-toolkit — 图片生成（image-gen）+ Token 用量与活跃度（token-usage）
//
// 运行时数据默认收在 $DSH_HOME/dsh-toolkit/（DSH_TOOLKIT_DATA 可整体改道）；
// 加载时先跑一次老位置 → 新目录的迁移（幂等，见 components/image-gen/migrate.js）。
import { inject as imageGenInject, apply as imageGenApply } from './components/image-gen/host.js'
import { inject as imageGenGalleryInject, apply as imageGenGalleryApply } from './components/image-gen/gallery-page.js'
import { inject as imageGenActionsInject, apply as imageGenActionsApply } from './components/image-gen/gallery-actions.js'
import { inject as imageGenFavInject, apply as imageGenFavApply } from './components/image-gen/gallery-favorites.js'
import { inject as imageGenSettingsInject, apply as imageGenSettingsApply } from './components/image-gen/settings-routes.js'
import { inject as imageGenGenerateInject, apply as imageGenGenerateApply } from './components/image-gen/generate-route.js'
import { inject as imageGenLibraryInject, apply as imageGenLibraryApply } from './components/image-gen/library-routes.js'
import { migrateLegacyData } from './components/image-gen/migrate.js'
import { inject as tokenUsageInject, apply as tokenUsageApply } from './components/token-usage/host.js'
import { inject as tokenActivityInject, apply as tokenActivityApply } from './components/token-usage/activity.js'

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
]

export const inject = [
  ...new Set(parts.flatMap((part) => (Array.isArray(part.inject) ? part.inject : []))),
]

export function apply(ctx) {
  // 数据目录一次性迁移（幂等、失败不影响启动）：必须在任何路由/工具读写数据之前跑。
  migrateLegacyData()
  for (const part of parts) part.apply(ctx)
}