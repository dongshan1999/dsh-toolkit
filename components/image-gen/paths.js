/**
 * @local/image-gen — 统一数据目录（纯 Host 侧，无路由、无 ctx 副作用）。
 *
 * 全部运行时数据默认收在 **DSH Home** 下的 dsh-toolkit/，与插件安装位置解耦
 * （插件目录只放代码：重装/换路径/删包都不丢数据）：
 *
 *   $DSH_HOME/dsh-toolkit/images/                 生成图（原 <插件根>/data/images、更早的 ~/image-gen）
 *   $DSH_HOME/dsh-toolkit/favorites/              收藏图（固定与 images/ 同级）
 *   $DSH_HOME/dsh-toolkit/config.json             模型目录 + 密钥回落（原 ~/.dsh/image-gen.json）
 *   $DSH_HOME/dsh-toolkit/library.json            提示词库（原 ~/.dsh/image-gen-library.json）
 *   $DSH_HOME/dsh-toolkit/usage.jsonl             图片生成计费记录
 *   $DSH_HOME/dsh-toolkit/token-usage/pricing.json 用户价目 + 同步结果 + 汇率 + 删除墓碑
 *
 * $DSH_HOME：`process.env.DSH_HOME`（空白视为未设，支持 `~` 展开）→ `~/.dsh`，
 * 与官方 resolveDshHome 语义一致。刻意不 import 任何 @deepseek-ai 包：
 * 外部 link 安装的 bundle 从真实路径解析依赖，核心包不可达。
 *
 * 环境变量覆盖（优先级最高，逐项保留）：
 *   DSH_TOOLKIT_DATA    整个数据目录换到别处（绝对路径）
 *   IMAGE_GEN_DIR       生成图目录（收藏固定与其同级）
 *   IMAGE_GEN_CONFIG    模型目录文件
 *   IMAGE_GEN_LIBRARY   提示词库文件
 *   IMAGE_GEN_USAGE     生成计费记录文件
 *   TOKEN_USAGE_PRICING 价目文件
 *
 * 路径一律在**调用时**解析（读当时的 process.env），因此自检/测试可以在
 * 导入后改环境变量把读写重定向到临时目录；老位置的一次性迁移见 migrate.js。
 */
import { homedir } from 'node:os'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 插件根目录：本文件位于 <根>/components/image-gen/paths.js，向上三级。 */
export const PLUGIN_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

/** 数据目录名（$DSH_HOME 下）。 */
export const DATA_DIR_NAME = 'dsh-toolkit'

/** 收藏目录名：固定与生成图目录同级。 */
export const FAVORITES_DIR_NAME = 'favorites'

/** 数据目录内的固定子项名。 */
export const IMAGES_DIR_NAME = 'images'
export const CONFIG_FILE_NAME = 'config.json'
export const LIBRARY_FILE_NAME = 'library.json'
export const USAGE_FILE_NAME = 'usage.jsonl'
export const PRICING_FILE_NAME = join('token-usage', 'pricing.json')

const DATA_ENV = 'DSH_TOOLKIT_DATA'
const IMAGE_DIR_ENV = 'IMAGE_GEN_DIR'
const CONFIG_ENV = 'IMAGE_GEN_CONFIG'
const LIBRARY_ENV = 'IMAGE_GEN_LIBRARY'
const USAGE_ENV = 'IMAGE_GEN_USAGE'
const PRICING_ENV = 'TOKEN_USAGE_PRICING'

function cleanText(value) {
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

/** 数据目录：`DSH_TOOLKIT_DATA` → `$DSH_HOME/dsh-toolkit`。 */
export function dataDir() {
  return envDir(DATA_ENV) ?? join(dshHome(), DATA_DIR_NAME)
}

/** 生成图目录：`IMAGE_GEN_DIR` → 数据目录/images。 */
export function imagesDir() {
  return envDir(IMAGE_DIR_ENV) ?? join(dataDir(), IMAGES_DIR_NAME)
}

/** 收藏目录：固定与生成图目录同级（跟着 IMAGE_GEN_DIR 走）。 */
export function favoritesDir() {
  return join(dirname(imagesDir()), FAVORITES_DIR_NAME)
}

/** 模型目录配置文件：`IMAGE_GEN_CONFIG` → 数据目录/config.json。 */
export function configFile() {
  return envText(CONFIG_ENV) ?? join(dataDir(), CONFIG_FILE_NAME)
}

/** 提示词库文件：`IMAGE_GEN_LIBRARY` → 数据目录/library.json。 */
export function libraryFile() {
  return envText(LIBRARY_ENV) ?? join(dataDir(), LIBRARY_FILE_NAME)
}

/** 生成计费记录文件：`IMAGE_GEN_USAGE` → 数据目录/usage.jsonl。 */
export function usageFile() {
  return envText(USAGE_ENV) ?? join(dataDir(), USAGE_FILE_NAME)
}

/** 价目文件：`TOKEN_USAGE_PRICING` → 数据目录/token-usage/pricing.json。 */
export function pricingFile() {
  return envText(PRICING_ENV) ?? join(dataDir(), PRICING_FILE_NAME)
}

/**
 * 一次性取齐全部路径 + 每一项是否被环境变量覆盖（迁移逻辑据此跳过被接管的项）。
 * 只做字符串解析，不碰文件系统。
 */
export function resolvePaths() {
  const images = imagesDir()
  return {
    dataDir: dataDir(),
    imagesDir: images,
    favoritesDir: join(dirname(images), FAVORITES_DIR_NAME),
    configFile: configFile(),
    libraryFile: libraryFile(),
    usageFile: usageFile(),
    pricingFile: pricingFile(),
    overridden: {
      data: envDir(DATA_ENV) !== null,
      images: envDir(IMAGE_DIR_ENV) !== null,
      config: envText(CONFIG_ENV) !== null,
      library: envText(LIBRARY_ENV) !== null,
      usage: envText(USAGE_ENV) !== null,
      pricing: envText(PRICING_ENV) !== null,
    },
  }
}