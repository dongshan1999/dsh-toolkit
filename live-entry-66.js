// live-entry-66.js：数据落点重构后的入口。
// 承接 65（65 已是可加载状态，这里不改 65，避免影响并行工作区）。
// 66 的改动：
//   1) 删除 image-gen/migrate.js 及其调用 —— 不再做老位置自动迁移（存档容错一律去掉）。
//   2) 数据目录改为按组件划分：$DSH_HOME/dsh-toolkit/{image-gen,token-usage,model-test,notifications}/…
//      （见 components/image-gen/paths.js 与 README 的数据目录一节）。
//   3) 收藏不再复制文件：图片全部留在 image-gen/images/，收藏改为 image-gen/favorites.json 索引。
//   4) 新增 toolkit 组件（设置分页）：GET /api/toolkit/settings 汇总各组件的数据落点，只读。
// 版本：image-gen ?v=44、token-usage ?v=29、model-test ?v=12、notifications ?v=10、
//       mcp ?v=2、skill ?v=2、toolkit ?v=1。
// 自检：`node -e "import('./live-entry-66.js')"` 应输出 ok 且 inject 里含 'timer'。
import { inject as imageGenInject, apply as imageGenApply } from './components/image-gen/host.js?v=44'
import { inject as imageGenGalleryInject, apply as imageGenGalleryApply } from './components/image-gen/gallery-page.js?v=44'
import { inject as imageGenActionsInject, apply as imageGenActionsApply } from './components/image-gen/gallery-actions.js?v=44'
import { inject as imageGenFavInject, apply as imageGenFavApply } from './components/image-gen/gallery-favorites.js?v=44'
import { inject as imageGenSettingsInject, apply as imageGenSettingsApply } from './components/image-gen/settings-routes.js?v=44'
import { inject as imageGenGenerateInject, apply as imageGenGenerateApply } from './components/image-gen/generate-route.js?v=44'
import { inject as imageGenLibraryInject, apply as imageGenLibraryApply } from './components/image-gen/library-routes.js?v=44'
import { inject as tokenUsageInject, apply as tokenUsageApply } from './components/token-usage/host.js?v=29'
import { inject as tokenActivityInject, apply as tokenActivityApply } from './components/token-usage/activity.js?v=29'
import { inject as modelTestInject, apply as modelTestApply } from './components/model-test/host.js?v=12'
import { inject as notificationsInject, apply as notificationsApply } from './components/notifications/host.js?v=10'
import { inject as mcpInject, apply as mcpApply } from './components/mcp/host.js?v=2'
import { inject as skillInject, apply as skillApply } from './components/skill/host.js?v=2'
import { inject as toolkitInject, apply as toolkitApply } from './components/toolkit/host.js?v=1'

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
  { id: 'toolkit', inject: toolkitInject, apply: toolkitApply },
]

export const inject = [
  ...new Set(parts.flatMap((part) => (Array.isArray(part.inject) ? part.inject : []))),
]

export function apply(ctx) {
  for (const part of parts) part.apply(ctx)
}
