// live-entry-67.js：去掉模型测试「探针」后的入口。
// 承接 66（66 是数据落点重构后的版本，这里不改 66，避免影响并行工作区）。
// 67 的改动：
//   1) 删除 POST /api/model-test/probe 路由与其四个辅助函数（runCapabilityCall /
//      getRedProbeImage / capabilityCheck / isExplicitlyUnsupported）。
//   2) 模型测试面板去掉「探针」按钮和探针结果卡片：真实参数本来就在「参数 → DSH 配置」里读
//      适配器声明（resolveModelInfo），探针只能验证「声明是否生效」，成本与结论都不划算。
//   3) model-test/host.js 内部 probeModel 改名为 measureModel（它其实是测速的单次调用，
//      与已删除的「能力探针」无关，避免再被误读）。
// 67.1：模型行头去掉参数/预设徽章（信息移进「参数」抽屉）；diff 忽略 off 档位。
// 版本：image-gen ?v=44、token-usage ?v=29、model-test ?v=14（dsh-config ?v=13）、notifications ?v=10、
//       mcp ?v=2、skill ?v=2、toolkit ?v=1。
// 自检：`node -e "import('./live-entry-67.js')"` 应输出 ok 且 inject 里含 'timer'。
import { inject as imageGenInject, apply as imageGenApply } from './components/image-gen/host.js?v=44'
import { inject as imageGenGalleryInject, apply as imageGenGalleryApply } from './components/image-gen/gallery-page.js?v=44'
import { inject as imageGenActionsInject, apply as imageGenActionsApply } from './components/image-gen/gallery-actions.js?v=44'
import { inject as imageGenFavInject, apply as imageGenFavApply } from './components/image-gen/gallery-favorites.js?v=44'
import { inject as imageGenSettingsInject, apply as imageGenSettingsApply } from './components/image-gen/settings-routes.js?v=44'
import { inject as imageGenGenerateInject, apply as imageGenGenerateApply } from './components/image-gen/generate-route.js?v=44'
import { inject as imageGenLibraryInject, apply as imageGenLibraryApply } from './components/image-gen/library-routes.js?v=44'
import { inject as tokenUsageInject, apply as tokenUsageApply } from './components/token-usage/host.js?v=29'
import { inject as tokenActivityInject, apply as tokenActivityApply } from './components/token-usage/activity.js?v=29'
import { inject as modelTestInject, apply as modelTestApply } from './components/model-test/host.js?v=14'
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
