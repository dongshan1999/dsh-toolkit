// live-entry-76.js：把注释组件（annotations）接回来（76.1 起注释带「第几段第几行」定位）。
// 承接 75。75 之所以回退注释组件，是因为当时「插件直接没了」——后来查清真正原因是
// package.json 的 exports 被改坏、丢了 "./client" 键：DSH 的客户端模块加载器
// （@deepseek-ai/dsh-client-modules）要求声明 dsh.client 的包必须导出 "./client"，
// 缺了它整个客户端 bundle 被静默跳过（host 仍 active、/api 正常，但入口和面板全消失）。
// 该键已恢复，并在 tools/check-client.mjs 的 [4.3] 加了守护断言。
// 76 的改动：① 接回 annotations（?v=2，客户端四处挂载点全走 safeInject，单点失败不拖垮 bundle）；
//           ② toolkit host ?v=8 → ?v=10（组件清单多一块「注释」；76.1 跟进 annotations 模块版本）。
//           ③ 76.1：注释记录 blockStart/blockEnd/lineStart/lineEnd，草稿与注释栏显示「第 2 段第 12–18 行」。
// 版本：image-gen ?v=44、token-usage ?v=29、model-test ?v=16、notifications ?v=13、
//       mcp ?v=2、skill ?v=2、clipboard ?v=3、annotations ?v=2、toolkit ?v=10。
// 自检：`node -e "import('./live-entry-76.js')"` 应输出 ok 且 inject 里含 'timer'。
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
import { inject as notificationsInject, apply as notificationsApply } from './components/notifications/host.js?v=13'
import { inject as mcpInject, apply as mcpApply } from './components/mcp/host.js?v=2'
import { inject as skillInject, apply as skillApply } from './components/skill/host.js?v=2'
import { inject as clipboardInject, apply as clipboardApply } from './components/clipboard/host.js?v=3'
import { inject as annotationsInject, apply as annotationsApply } from './components/annotations/host.js?v=2'
import { inject as toolkitInject, apply as toolkitApply } from './components/toolkit/host.js?v=10'

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
  { id: 'annotations', inject: annotationsInject, apply: annotationsApply },
  { id: 'toolkit', inject: toolkitInject, apply: toolkitApply },
]

export const inject = [
  ...new Set(parts.flatMap((part) => (Array.isArray(part.inject) ? part.inject : []))),
]

export function apply(ctx) {
  for (const part of parts) part.apply(ctx)
}
