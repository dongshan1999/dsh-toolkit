// live-entry-70.js：剪贴板加上「自动清理」后的入口。
// 承接 69。
// 70 的改动：
//   1) 剪贴板新增清理：config.json 里 cleanupEnabled / cleanupMaxAgeDays /
//      cleanupMaxTotalBytes 三个字段（默认 关闭 / 30 天 / 不限），
//      粘贴与刷新列表时顺手清理一次，面板另有「立即清理」按钮。
//   2) 新增 POST /api/clipboard/cleanup：按天数删过期条目、按总量从最旧开始删，
//      只动 <根>/<YYYY-MM-DD>/ 下的文件，索引里指向别处的路径一律跳过。
//   3) store.js 修 writeConfig 的 undefined 覆盖问题（保存清理设置不再把阈值清回默认）。
// 版本：image-gen ?v=44、token-usage ?v=29、model-test ?v=16、notifications ?v=10、
//       mcp ?v=2、skill ?v=2、clipboard ?v=3、toolkit ?v=3。
// 自检：`node -e "import('./live-entry-70.js')"` 应输出 ok 且 inject 里含 'timer'。
import { inject as imageGenInject, apply as imageGenApply } from './components/image-gen/host.js?v=44'
import { inject as imageGenGalleryInject, apply as imageGenGalleryApply } from './components/image-gen/gallery-page.js?v=44'
import { inject as imageGenActionsInject, apply as imageGenActionsApply } from './components/image-gen/gallery-actions.js?v=44'
import { inject as imageGenFavInject, apply as imageGenFavApply } from './components/image-gen/gallery-favorites.js?v=44'
import { inject as imageGenSettingsInject, apply as imageGenSettingsApply } from './components/image-gen/settings-routes.js?v=44'
import { inject as imageGenGenerateInject, apply as imageGenGenerateApply } from './components/image-gen/generate-route.js?v=44'
import { inject as imageGenLibraryInject, apply as imageGenLibraryApply } from './components/image-gen/library-routes.js?v=44'
import { inject as tokenUsageInject, apply as tokenUsageApply } from './components/token-usage/host.js?v=29'
import { inject as tokenActivityInject, apply as tokenActivityApply } from './components/token-usage/activity.js?v=29'
import { inject as modelTestInject, apply as modelTestApply } from './components/model-test/host.js?v=16'
import { inject as notificationsInject, apply as notificationsApply } from './components/notifications/host.js?v=10'
import { inject as mcpInject, apply as mcpApply } from './components/mcp/host.js?v=2'
import { inject as skillInject, apply as skillApply } from './components/skill/host.js?v=2'
import { inject as clipboardInject, apply as clipboardApply } from './components/clipboard/host.js?v=3'
import { inject as toolkitInject, apply as toolkitApply } from './components/toolkit/host.js?v=3'

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
