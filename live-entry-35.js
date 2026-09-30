// 数据目录统一收敛：生成图 / 收藏 / 模型配置 / 提示词库全部默认落插件目录 data/ 下
// （新增 components/image-gen/paths.js 统一路径，原 ~/image-gen 与 ~/.dsh/image-gen* 不再回退）。
// 按热更新铁律换全新入口文件名，组件模块统一 ?v=35；token-usage 沿用 host.js?v=19。
import { inject as imageGenInject, apply as imageGenApply } from './components/image-gen/host.js?v=35'
import { inject as imageGenGalleryInject, apply as imageGenGalleryApply } from './components/image-gen/gallery-page.js?v=35'
import { inject as imageGenActionsInject, apply as imageGenActionsApply } from './components/image-gen/gallery-actions.js?v=35'
import { inject as imageGenFavInject, apply as imageGenFavApply } from './components/image-gen/gallery-favorites.js?v=35'
import { inject as imageGenSettingsInject, apply as imageGenSettingsApply } from './components/image-gen/settings-routes.js?v=35'
import { inject as imageGenGenerateInject, apply as imageGenGenerateApply } from './components/image-gen/generate-route.js?v=35'
import { inject as imageGenLibraryInject, apply as imageGenLibraryApply } from './components/image-gen/library-routes.js?v=35'
import { inject as tokenUsageInject, apply as tokenUsageApply } from './components/token-usage/host.js?v=19'
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
  for (const part of parts) part.apply(ctx)
}
