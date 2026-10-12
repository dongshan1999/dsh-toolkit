// 数据目录搬进 DSH Home：默认 $DSH_HOME/dsh-toolkit/（DSH_TOOLKIT_DATA 可整体改道），
// 首次启动把 <插件根>/data/ 与 1.3.0 老位置（~/image-gen、~/.dsh/image-gen*.json、
// ~/.dsh/token-usage/pricing.json）自动迁移过来（见 components/image-gen/migrate.js）。
// 按热更新铁律换全新入口文件名，组件模块统一 ?v=37；token-usage host.js 升 ?v=23；
// token-usage 的价目/生成计费读路径与 image-gen 同源（IMAGE_GEN_CONFIG / IMAGE_GEN_USAGE 同样生效）。
import { inject as imageGenInject, apply as imageGenApply } from './components/image-gen/host.js?v=37'
import { inject as imageGenGalleryInject, apply as imageGenGalleryApply } from './components/image-gen/gallery-page.js?v=37'
import { inject as imageGenActionsInject, apply as imageGenActionsApply } from './components/image-gen/gallery-actions.js?v=37'
import { inject as imageGenFavInject, apply as imageGenFavApply } from './components/image-gen/gallery-favorites.js?v=37'
import { inject as imageGenSettingsInject, apply as imageGenSettingsApply } from './components/image-gen/settings-routes.js?v=37'
import { inject as imageGenGenerateInject, apply as imageGenGenerateApply } from './components/image-gen/generate-route.js?v=37'
import { inject as imageGenLibraryInject, apply as imageGenLibraryApply } from './components/image-gen/library-routes.js?v=37'
import { migrateLegacyData } from './components/image-gen/migrate.js?v=37'
import { inject as tokenUsageInject, apply as tokenUsageApply } from './components/token-usage/host.js?v=23'
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