/**
 * @local/dsh-toolkit — 统一数据目录（纯 Host 侧，无路由、无 ctx 副作用）。
 *
 * 运行时数据默认收在 **DSH Home** 下，并且**按组件分目录**，互不混放
 * （插件目录只放代码：重装/换路径/删包都不丢数据）：
 *
 *   $DSH_HOME/dsh-toolkit/image-gen/
 *     images/                 生成图（唯一图片目录；收藏不再复制文件）
 *     config.json             模型目录 + 密钥回落
 *     library.json            提示词库
 *     image-prompts.json      图片 → 提示词索引
 *     favorites.json          收藏索引（字段级标记，不搬文件）
 *     usage.jsonl             图片生成计费记录
 *   $DSH_HOME/dsh-toolkit/token-usage/pricing.json   用户价目 + 同步结果
 *   $DSH_HOME/dsh-toolkit/model-test/params.json     模型参数覆盖（见 model-test/presets.js）
 *   $DSH_HOME/dsh-toolkit/model-test/presets.json    同步来的预设（同上）
 *   $DSH_HOME/dsh-toolkit/notifications/config.json  通知配置（见 notifications/host.js）
 *   $DSH_HOME/dsh-toolkit/notifications/queue.json   通知队列（同上）
 *
 * 只读/写这里，**不做老位置兼容**：文件缺了就当空，不会去翻历史目录。
 *
 * $DSH_HOME：`process.env.DSH_HOME`（空白视为未设，支持 `~` 展开）→ `~/.dsh`，
 * 与官方 resolveDshHome 语义一致。刻意不 import 任何 @deepseek-ai 包：
 * 外部 link 安装的 bundle 从真实路径解析依赖，核心包不可达。
 *
 * 环境变量覆盖（优先级最高，逐项保留；绝对路径）：
 *   DSH_TOOLKIT_DATA    整个数据目录换到别处
 *   IMAGE_GEN_DIR       生成图目录
 *   IMAGE_GEN_CONFIG    模型目录文件
 *   IMAGE_GEN_LIBRARY   提示词库文件
 *   IMAGE_GEN_USAGE     生成计费记录文件
 *   IMAGE_GEN_PROMPTS   图片提示词索引文件
 *   IMAGE_GEN_FAVORITES 收藏索引文件
 *   TOKEN_USAGE_PRICING 价目文件
 *
 * 路径一律在**调用时**解析（读当时的 process.env），因此自检/测试可以在
 * 导入后改环境变量把读写重定向到临时目录。
 */
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'

/** 数据目录名（$DSH_HOME 下）。 */
export const DATA_DIR_NAME = 'dsh-toolkit'

/** 各组件的数据子目录名（组件之间不共享目录）。 */
export const IMAGE_GEN_DIR_NAME = 'image-gen'
export const TOKEN_USAGE_DIR_NAME = 'token-usage'
export const MODEL_TEST_DIR_NAME = 'model-test'
export const NOTIFICATIONS_DIR_NAME = 'notifications'

/** image-gen 数据子目录内的固定子项名。 */
export const IMAGES_DIR_NAME = 'images'
export const CONFIG_FILE_NAME = 'config.json'
export const LIBRARY_FILE_NAME = 'library.json'
export const USAGE_FILE_NAME = 'usage.jsonl'
export const PROMPTS_FILE_NAME = 'image-prompts.json'
export const FAVORITES_FILE_NAME = 'favorites.json'

/** token-usage 数据子目录内的固定子项名。 */
export const PRICING_FILE_NAME = 'pricing.json'

const DATA_ENV = 'DSH_TOOLKIT_DATA'
const IMAGE_DIR_ENV = 'IMAGE_GEN_DIR'
const CONFIG_ENV = 'IMAGE_GEN_CONFIG'
const LIBRARY_ENV = 'IMAGE_GEN_LIBRARY'
const USAGE_ENV = 'IMAGE_GEN_USAGE'
const PROMPTS_ENV = 'IMAGE_GEN_PROMPTS'
const FAVORITES_ENV = 'IMAGE_GEN_FAVORITES'
const PRICING_ENV = 'TOKEN_USAGE_PRICING'

/** 文本清洗：非字符串或纯空白视为未提供，返回 null；否则返回 trim 结果。全组件共用。 */
export function cleanText(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/** `~` 与 `~/x` 展开（与官方一致）；其它原样返回。 */
function expandHome(text) {
  if (text === '~') return homedir()
  if (text.startsWith('~/')) return join(homedir(), text.slice(2))
  return text
}

/** 环境变量文本覆盖：未设/空白视为未设，返回值已 trim。 */
export function envText(name) {
  return cleanText(process.env[name])
}

/** 环境变量目录覆盖：支持 `~` 展开，必须是绝对路径；未设/非绝对路径返回 null。 */
export function envDir(name) {
  const text = envText(name)
  if (text === null) return null
  const trimmed = expandHome(text).replace(/\/+$/, '')
  return trimmed !== '' && isAbsolute(trimmed) ? trimmed : null
}

/** DSH Home：`DSH_HOME`（空白视为未设，支持 `~` 展开）→ `~/.dsh`。 */
export function dshHome() {
  const fromEnv = envText('DSH_HOME')
  return fromEnv === null ? join(homedir(), '.dsh') : expandHome(fromEnv)
}

/** 数据根目录：`DSH_TOOLKIT_DATA` → `$DSH_HOME/dsh-toolkit`。 */
export function dataDir() {
  return envDir(DATA_ENV) ?? join(dshHome(), DATA_DIR_NAME)
}

/** image-gen 的数据目录：数据根/image-gen。 */
export function imageGenDir() {
  return join(dataDir(), IMAGE_GEN_DIR_NAME)
}

/** token-usage 的数据目录：数据根/token-usage。 */
export function tokenUsageDir() {
  return join(dataDir(), TOKEN_USAGE_DIR_NAME)
}

/** model-test 的数据目录：数据根/model-test。 */
export function modelTestDir() {
  return join(dataDir(), MODEL_TEST_DIR_NAME)
}

/** notifications 的数据目录：数据根/notifications。 */
export function notificationsDir() {
  return join(dataDir(), NOTIFICATIONS_DIR_NAME)
}

/** 生成图目录：`IMAGE_GEN_DIR` → image-gen/images。 */
export function imagesDir() {
  return envDir(IMAGE_DIR_ENV) ?? join(imageGenDir(), IMAGES_DIR_NAME)
}

/** 模型目录配置文件：`IMAGE_GEN_CONFIG` → image-gen/config.json。 */
export function configFile() {
  return envText(CONFIG_ENV) ?? join(imageGenDir(), CONFIG_FILE_NAME)
}

/** 提示词库文件：`IMAGE_GEN_LIBRARY` → image-gen/library.json。 */
export function libraryFile() {
  return envText(LIBRARY_ENV) ?? join(imageGenDir(), LIBRARY_FILE_NAME)
}

/** 生成计费记录文件：`IMAGE_GEN_USAGE` → image-gen/usage.jsonl。 */
export function usageFile() {
  return envText(USAGE_ENV) ?? join(imageGenDir(), USAGE_FILE_NAME)
}

/** 图片提示词索引：`IMAGE_GEN_PROMPTS` → image-gen/image-prompts.json。 */
export function imagePromptsFile() {
  return envText(PROMPTS_ENV) ?? join(imageGenDir(), PROMPTS_FILE_NAME)
}

/** 收藏索引：`IMAGE_GEN_FAVORITES` → image-gen/favorites.json。 */
export function favoritesFile() {
  return envText(FAVORITES_ENV) ?? join(imageGenDir(), FAVORITES_FILE_NAME)
}

/** 价目文件：`TOKEN_USAGE_PRICING` → token-usage/pricing.json。 */
export function pricingFile() {
  return envText(PRICING_ENV) ?? join(tokenUsageDir(), PRICING_FILE_NAME)
}

/**
 * 一次取齐全部路径 + 每一项是否被环境变量覆盖。
 * 只做字符串解析，不碰文件系统。
 */
export function resolvePaths() {
  return {
    dataDir: dataDir(),
    imageGenDir: imageGenDir(),
    imagesDir: imagesDir(),
    configFile: configFile(),
    libraryFile: libraryFile(),
    usageFile: usageFile(),
    promptsFile: imagePromptsFile(),
    favoritesFile: favoritesFile(),
    pricingFile: pricingFile(),
    tokenUsageDir: tokenUsageDir(),
    modelTestDir: modelTestDir(),
    notificationsDir: notificationsDir(),
    overridden: {
      data: envDir(DATA_ENV) !== null,
      images: envDir(IMAGE_DIR_ENV) !== null,
      config: envText(CONFIG_ENV) !== null,
      library: envText(LIBRARY_ENV) !== null,
      usage: envText(USAGE_ENV) !== null,
      prompts: envText(PROMPTS_ENV) !== null,
      favorites: envText(FAVORITES_ENV) !== null,
      pricing: envText(PRICING_ENV) !== null,
    },
  }
}
