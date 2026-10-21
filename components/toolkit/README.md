# 组件七：toolkit（六个分页、一个侧边栏入口）

侧边栏只注册「工具集」（`id='toolkit'`、`order=48`，图标 `T`）。打开后，在面板内切换六个分页：

| 分页 | 面板 key | 顺序 |
| --- | --- | --- |
| 图片生成 | `image-gen` | 49 |
| 模型测试 | `model-test` | 51 |
| 通知 | `notifications` | 52 |
| MCP | `mcp` | 53 |
| Skill | `skill` | 54 |
| 设置 | `__toolkit-settings` | 9999（壳内置） |

前五个来自各业务组件登记到注册表的面板；「设置」不经过注册表，由壳自己追加、永远排最后。
`token-usage` 保持独立，不在这六个分页中。各业务面板原有的 main key 与 Host 路由保留，例如
`ctx.layout.selectPanel('image-gen')` 仍能直接打开图片生成面板。

## 文件与构建

- [client.js](./client.js)：工具集壳源码。除注册表外壳外，还内置「设置」分页。
- [host.js](./host.js)：壳唯一的 Host 部分，一个只读路由 `GET /api/toolkit/settings`。
- [build.mjs](../../build.mjs)：扫描组件并生成唯一部署产物 [client.js](../../client.js)。
- [check-client.mjs](../../tools/check-client.mjs)：客户端与 Host 自检。

## 设置分页

「设置」回答一个问题：每个组件的数据到底落在哪。`GET /api/toolkit/settings` 返回数据根目录、
被环境变量接管的路径，以及每个组件的文件清单：image-gen（生成图目录 / 模型目录 / 提示词库 /
图片提示词索引 / 收藏索引 / 生图计费记录）、token-usage（价目文件）、model-test（参数覆盖 /
models.dev 预设）、notifications（配置 / 队列），外加 mcp 与 skill（`dir: null` + 说明：它们写
profile 的 `cordis.patch.yml` 与 skills 目录，不占数据目录）。每个文件行给 `kind`（dir/file）、
`exists`、`bytes`、`mtime`，没写过的显示「未创建」；被环境变量接管的项单独提示。

分页是**只读**的：不编辑任何配置文件，只告诉你路径（可一键复制）；要改就回对应组件自己的设置页。
它也不持有状态，刷新按钮只是重新请求接口。

改动组件客户端后，在仓库根目录执行 `node build.mjs`。连接正常时由 DSH 客户端热更新加载新产物，
未连接热更新时刷新页面。

## 组件如何共享面板

构建脚本把注册表与组件工厂一起放进模块的 `factory(require)` 闭包：

```js
window.__ModuleLoader__.load({
  id: 'dsh-toolkit',
  factory(require) {
    const __dshToolkitRegistry = {
      panels: new Map(),
      register(entry) { /* entry = { id, Panel, label, order, glyphText } */ },
      entries() { /* 按 order 升序返回面板 */ },
    }
    // 同一闭包内定义各组件工厂，再组合它们的 inject/apply。
  },
})
```

五个业务组件在 `apply()` 末尾登记自己的 Panel，工具集渲染时读取注册表。同一代 bundle 共享状态，
不同代各有自己的注册表；卸载旧插件时，Cordis 清理旧的槽位、样式与定时器。

注册表不能放在普通脚本顶层。DSH 通过 script 加载产物，同一页面再次执行顶层同名 `const` 会报
`SyntaxError: Identifier '__dshToolkitRegistry' has already been declared`，新模块无法替换旧模块。
此前「构建已去掉 `toolkit-quick`，页面仍显示 A/M/N」就是这种情况；移入工厂闭包后已通过实时槽位查询验收。

单独加载某个业务组件时没有共享注册表。组件用 `typeof __dshToolkitRegistry === 'object'` 守卫，
不存在时回退为自己的侧边栏入口。单独加载工具集壳时不注册空壳界面。

新增分页时，在组件的 `apply()` 中调用
`registry.register({ id: PANEL_KEY, Panel, label, order, glyphText })`，再运行构建。
组件目录由构建脚本自动发现，无须修改工具集分页列表。

## 切换与生命周期

当前分页位于注册表的 `shell.active`，面板通过 `useEffect` 订阅变化。非活动分页卸载，切回来再挂载，
所以组件自身尚未保存的表单状态可能重置。刷新或替换整个 bundle 后默认回到第一项（图片生成）。

通知的 8 秒轮询与系统投递在通知插件的 `apply()` 中启动，独立于 React 分页。
关闭通知分页或切去其他分页，仍会收到系统通知。

分页栏在窄面板中允许横向滚动（`overflow-x:auto`）。

## 验收与回归

运行 `node build.mjs && node tools/check-client.mjs`，检查：

- 普通脚本在同一页面上下文中连续执行两次，且已有旧注册表时仍能成功登记新 factory；
- 每次加载生成独立 factory，组件工厂不泄漏到页面全局；
- 工具集 main 面板与侧边栏入口均已注册，标签为「工具集」、顺序为 48；
- `toolkit-quick` 不存在，五个业务组件没有重复注册侧边栏入口；
- bundle 自己只贡献一个侧边栏入口；
- `ToolkitPanel` 实际渲染，显示六个分页标签（含「设置」），默认内容为图片生成。

本地自检通过后，再用 Client Inspect 的 `Slots.listSubTree` 检查 `sidebar.panellist`：
本 bundle 应只有 `toolkit`，没有 `toolkit-quick`。检查 `main` 时应仍能看到五个业务面板、
`token-usage` 和 `toolkit`。这验证运行页面确实替换了 bundle，不等同于截图视觉验收。
