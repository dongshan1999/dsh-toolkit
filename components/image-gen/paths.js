/**
 * @local/image-gen — 统一数据目录（纯 Host 侧，无路由、无 ctx 副作用）。
 *
 * 全部运行时数据默认收在**插件目录**的 data/ 下，与插件同进退：
 *
 *   <插件根>/data/images/      生成图（原 ~/image-gen）
 *   <插件根>/data/favorites/   收藏图（原 ~/image-gen-favorites）
 *   <插件根>/data/config.json  模型目录 + 密钥回落（原 ~/.dsh/image-gen.json）
 *   <插件根>/data/library.json 提示词库（原 ~/.dsh/image-gen-library.json）
 *
 * 三个环境变量（IMAGE_GEN_DIR / IMAGE_GEN_CONFIG / IMAGE_GEN_LIBRARY）
 * 仍可分别把生成图目录与两个文件覆盖到任意绝对路径；没设就走 data/ 默认。
 * data/ 已列入 .gitignore：图片与含密钥的配置不进版本库。
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 插件根目录：本文件位于 <根>/components/image-gen/paths.js，向上三级。 */
export const PLUGIN_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

/** 插件统一数据目录：<插件根>/data。 */
export const DATA_DIR = join(PLUGIN_ROOT, 'data')

/** 生成图默认目录：<插件根>/data/images。 */
export const IMAGES_DIR = join(DATA_DIR, 'images')

/** 收藏目录名：固定与生成图目录同级（data/favorites）。 */
export const FAVORITES_DIR_NAME = 'favorites'

/** 模型目录配置文件默认路径：<插件根>/data/config.json。 */
export const CONFIG_FILE = join(DATA_DIR, 'config.json')

/** 提示词库文件默认路径：<插件根>/data/library.json。 */
export const LIBRARY_FILE = join(DATA_DIR, 'library.json')
