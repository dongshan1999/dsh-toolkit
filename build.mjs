// build.mjs — 生成顶层 client.js（唯一需要"构建"的一步，纯文本拼接，无打包器）
//
// 浏览器侧一个包只有一个 client 产物，因此各组件的 client.js（原样保留的
// 组件源码，window.__ModuleLoader__.load 包裹）由本脚本机械变换为独立工厂
// 函数（各自作用域，互不污染），拼进统一的 dsh-toolkit 入口。
//
// 用法：改了任何 components/*/client.js 之后，在本目录执行
//   node build.mjs        （或 npm run build）
// 然后按 README 的更新流程 remove_bundle + install_bundle 热更新。
// 只改组件 host.js 不需要跑本脚本。
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const PACKAGE_ID = 'dsh-toolkit'

const componentIds = readdirSync(join(root, 'components'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

function camelCase(id) {
  return id.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
}

/** 把组件 client 源码（load({ id, factory(require) { BODY } })）变换为 function NAME(require) { BODY } */
function toFactory(source, componentId) {
  const marker = 'factory(require) {'
  const open = source.indexOf(marker)
  if (open < 0) throw new Error(`components/${componentId}/client.js 里找不到 factory(require) {`)
  let body = source.slice(open + marker.length)
  const tail = '\n  },\n})'
  const close = body.lastIndexOf(tail)
  if (close < 0) throw new Error(`components/${componentId}/client.js 里找不到 load() 收尾`)
  body = body.slice(0, close)
  return { name: camelCase(componentId) + 'ClientFactory', code: body }
}

const factories = []
for (const componentId of componentIds) {
  const clientPath = join(root, 'components', componentId, 'client.js')
  if (!existsSync(clientPath)) continue
  const factory = toFactory(readFileSync(clientPath, 'utf8'), componentId)
  factories.push({ componentId, ...factory })
}

if (factories.length === 0) throw new Error('没有任何组件带 client.js，nothing to build')

const lines = [
  '// ⚠️ 本文件由 build.mjs 生成 —— 不要直接手改；改 components/<id>/client.js 后重新 node build.mjs',
  `// ${PACKAGE_ID} — Client 入口：各组件面板合并到一个浏览器模块，作用域互相独立。`,
  '',
]
for (const factory of factories) {
  lines.push(`// ─── 组件：${factory.componentId} ───`)
  lines.push(`function ${factory.name}(require) {${factory.code}\n}`)
  lines.push('')
}
lines.push(`window.__ModuleLoader__.load({`)
lines.push(`  id: '${PACKAGE_ID}',`)
lines.push(`  factory(require) {`)
lines.push(`    const components = [${factories.map((factory) => factory.name).join(', ')}]`)
lines.push(`    const plugins = components.map((component) => component(require))`)
lines.push(`    return {`)
lines.push(`      inject: [...new Set(plugins.flatMap((plugin) => (Array.isArray(plugin.inject) ? plugin.inject : [])))],`)
lines.push(`      apply(ctx) {`)
lines.push(`        for (const plugin of plugins) plugin.apply(ctx)`)
lines.push(`      },`)
lines.push(`    }`)
lines.push(`  },`)
lines.push(`})`)

const generated = lines.join('\n') + '\n'
writeFileSync(join(root, 'client.js'), generated)
console.log(`client.js 生成完成：组件 [${factories.map((factory) => factory.componentId).join(', ')}]，${generated.split('\n').length} 行`)
