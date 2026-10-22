# dsh-toolkit

**简体中文** | [English](./README.en.md)

一个 DSH（DeepSeek Harness）Web 端 Bundle：把六件互相独立的事装在一起，五个面板再由「工具集」这一个侧边栏入口统一收口。

| 组件 | 面板 | 给 Agent 的工具 | 一句话 |
| --- | --- | --- | --- |
| **image-gen** | 「工具集」→「图片生成」 | `generate_image` | 调任意 OpenAI 兼容生图接口生成 / 编辑图片，管图库、提示词与收藏 |
| **token-usage** | 「Token 用量」（order 50，独立面板） | — | 统计全部会话的 Token 消耗与成本，含近一年活跃度热力图 |
| **model-test** | 「工具集」→「模型测试」 | — | 测 DSH 已配置模型的连通性、首字延迟与输出速度，并按模型名补参数 |
| **notifications** | 「工具集」→「通知」 | — | 16 类事件的提醒中心；提醒只走系统通知，应用内零打扰 |
| **mcp** | 「工具集」→「MCP」 | — | profile `cordis.patch.yml` 里 MCP server 的列 / 增 / 改 / 删 / 启停 / 探活 |
| **skill** | 「工具集」→「Skill」 | — | 六个扫描根下 skill 的浏览、编辑、新建、删除与启停 |
| **toolkit** | 「工具集」（order 48） | — | 把上面五个面板收进同一套界面，外加内置的只读「设置」分页 |

各业务组件可以单独启用：面板 key 不同（`image-gen` / `token-usage` / `model-test` / `notifications` / `mcp` / `skill`），路由前缀也不同。
「工具集」是外壳：浏览器侧负责侧边栏入口与分页切换，Host 侧只有一个只读的设置路由。

> **设计原则：不绑定任何服务商。** 插件不内置厂商模型、默认地址或私有网关——
> 模型目录完全由你自己添加，任何实现了标准 `POST /images/generations` 的服务都能接。
> `model-test` 同理：它只测 **DSH 自己已经配置并可路由**的模型，不引入第二套凭证或地址。

| 项目 | 要求 |
| --- | --- |
| DSH | **0.1.7 及以上**（验证版本 `0.1.7-rc.2`） |
| 运行环境 | DSH Web（`client.platform: web`），Node.js 18+ |
| 许可证 | [MIT](./LICENSE) |

界面文案为简体中文；本文中出现的界面文字、文件名、路由与标识符均保持原文。

文档分两层：本文是**上手与索引**；每个组件的需求、约束、接口契约、验收口径在
[`docs/`](./docs/) 的功能案里，组件的实现细节在同目录的 `README.md` 里。

---

## 安装

DSH **0.1.7+**，并有一个 Web profile（默认位于 `~/.dsh/profiles/<profile>/`）。

### 方式一：作为依赖安装（推荐）

1. 在 profile 的 `package.json` 里声明依赖与 bundle：

   ```jsonc
   // ~/.dsh/profiles/<profile>/package.json
   {
     "dependencies": {
       "dsh-toolkit": "^0.2.0"
     },
     "dsh": {
       "profile": {
         "bundles": [
           // …
           "dsh-toolkit"
         ]
       }
     }
   }
   ```

2. 让 DSH 加载它：用 `plugin_manager` 的 `install_bundle`（target 填 `dsh-toolkit`），或重启 DSH。
   返回 `application: restart-required` 时，重启后即可生效。

### 方式二：本地 link（开发调试）

```jsonc
"dependencies": { "dsh-toolkit": "link:/absolute/path/to/dsh-toolkit" }
```

> ⚠️ `remove_bundle` 会把上面两处声明**一并从 profile 的 `package.json` 删掉**，
> 重新安装前要手动加回，否则包管理器会去 registry 找 `link:` 本地包并失败。

---

## 组件速览

每个组件一句起点，细节都在功能案与组件 README 里。

### 图片生成（image-gen）

「工具集」→「图片生成」→「设置」→ **「+ 添加模型组」**（组名 / API Key / 链接）→ **「获取模型」** 勾选后保存 → 选默认模型，回「文生图」即可。
收藏不是第二个目录：图片只有 `image-gen/images/` 一份，`favorites.json` 只存标记。

契约、数据模型、错误码：[功能案-图片生成](./docs/功能案-图片生成.md) · 实现：[components/image-gen/README.md](./components/image-gen/README.md)

### Token 用量与活跃度（token-usage）

独立面板（order 50），不在「工具集」分页里。统计全部会话的 Token 与成本，价目三层合并
（内置表 → 用户覆盖 → models.dev 同步），生图按张单独计费；近一年活跃度热力图按天聚合。

契约：[功能案-token用量](./docs/功能案-token用量.md) · 实现：[components/token-usage/README.md](./components/token-usage/README.md)

### 模型测试（model-test）

目录来自 DSH 自己的模型路由（不引入任何第二套凭证）。可整批、整组或只测单个模型，
看首字延迟 / 总耗时 / 每秒 token；能按模型名自动补 `temperature / maxTokens / reasoningEffort`，
并可一键把参数写进 DSH 真实配置（`fill` 或 `replace`，带 revision CAS）。
组默认收起，点组头（组名 / 箭头 / 空白处）展开；点「测试本组」会自动展开该组。

契约：[功能案-模型测试](./docs/功能案-模型测试.md) · 实现：[components/model-test/README.md](./components/model-test/README.md)

### 通知（notifications）

订阅 16 类事件（会话完成、需要权限、模型失败、子智能体结局……），提醒只走**系统通知中心**
（停留、点击跳回会话），应用内部不弹任何东西；面板是历史记录与场景开关。未读状态与去重计数落
`notifications/queue.json`，重启不丢。

契约：[功能案-通知](./docs/功能案-通知.md) · 实现：[components/notifications/README.md](./components/notifications/README.md)

### MCP 管理（mcp）

列出当前 profile `cordis.patch.yml` 里所有 MCP server（含 disabled），支持新增 / 编辑 / 删除 /
启停与一次性探活；写 YAML 时字节级保留 `!!js` 与注释，密钥默认脱敏，`reveal=1` 才给原文。

契约与错误码：[功能案-mcp管理](./docs/功能案-mcp管理.md) · 实现：[components/mcp/README.md](./components/mcp/README.md)

### Skill 管理（skill）

六个扫描根全量列出（坏文件也列并给出原因），可写根内新增 / 编辑 / 删除 / 启停；保存前按官方规则
校验 frontmatter，磁盘是真相、官方服务只是旁证。

契约：[功能案-skill管理](./docs/功能案-skill管理.md) · 实现：[components/skill/README.md](./components/skill/README.md)

### 工具集壳（toolkit）

侧边栏只留一条「工具集」，点开后在面板顶部切分页：图片生成 / 模型测试 / 通知 / MCP / Skill / 设置。
切走的分页会卸载（未保存表单重置）；「设置」是壳内置的只读页，显示各组件数据落在哪、是否已创建、
多大、何时改过。

契约：[功能案-工具集壳](./docs/功能案-工具集壳.md) · 实现：[components/toolkit/README.md](./components/toolkit/README.md)

---

## 配置与环境变量

| 环境变量 | 作用 | 默认值 |
| --- | --- | --- |
| `DSH_TOOLKIT_DATA` | 整个数据目录换到别处（绝对路径，支持 `~` 展开） | `$DSH_HOME/dsh-toolkit` |
| `IMAGE_GEN_DIR` | 生成图统一落盘目录 | `$DSH_HOME/dsh-toolkit/image-gen/images` |
| `IMAGE_GEN_CONFIG` | 模型目录配置文件 | `$DSH_HOME/dsh-toolkit/image-gen/config.json` |
| `IMAGE_GEN_LIBRARY` | 提示词库文件 | `$DSH_HOME/dsh-toolkit/image-gen/library.json` |
| `IMAGE_GEN_USAGE` | 生成计费记录文件 | `$DSH_HOME/dsh-toolkit/image-gen/usage.jsonl` |
| `IMAGE_GEN_PROMPTS` | 图片提示词索引文件 | `$DSH_HOME/dsh-toolkit/image-gen/image-prompts.json` |
| `IMAGE_GEN_FAVORITES` | 收藏索引文件 | `$DSH_HOME/dsh-toolkit/image-gen/favorites.json` |
| `IMAGE_GEN_KEY_<组 id>` | 模型组自己的密钥（组间互不覆盖） | — |
| `TOKEN_USAGE_PRICING` | token-usage 自有价目文件 | `$DSH_HOME/dsh-toolkit/token-usage/pricing.json` |
| `MODEL_TEST_PARAMS` | 模型测试的逐模型参数覆盖 | `$DSH_HOME/dsh-toolkit/model-test/params.json` |
| `MODEL_TEST_PRESETS` | models.dev 同步下来的预设表 | `$DSH_HOME/dsh-toolkit/model-test/presets.json` |
| `MODELS_DEV_API_URL` | models.dev 同步源（自检用） | `https://models.dev/api.json` |
| `TOKEN_USAGE_DIAG` | 设为 `1` 才写 token-usage 诊断日志 | 关闭 |
| `NOTIFICATIONS_CONFIG` | 通知配置（总开关 / 阈值 / 16 类场景开关） | `$DSH_HOME/dsh-toolkit/notifications/config.json` |
| `NOTIFICATIONS_QUEUE` | 通知队列（未读状态、去重计数） | `$DSH_HOME/dsh-toolkit/notifications/queue.json` |
| `NOTIFICATIONS_NATIVE` | 设为 `off` 关掉系统通知通道，只留站内记录（自检用） | 开启 |
| `DSH_HOME` | DSH Home 位置（决定默认数据目录） | `~/.dsh` |

`DSH_TOOLKIT_DATA` 换掉整个数据目录，其余变量逐项覆盖单个路径。`$DSH_HOME` 先读环境变量（空白视为未设，
支持 `~`），未设则回退 `~/.dsh`。密钥解析顺序：配置文件 `keys[keyEnv]` → DSH 凭据库 → 环境变量 `keyEnv`。

---

## 数据落地

运行时数据**按组件分目录**收在 `$DSH_HOME/dsh-toolkit/`（本机即 `~/.dsh/dsh-toolkit/`），组件之间不共用文件：

| 路径 | 内容 |
| --- | --- |
| `image-gen/images/` | 唯一图片目录（`image-gen-<UTC 时间戳>-<序号>.png`） |
| `image-gen/favorites.json` | 收藏索引（`{ version: 1, images: { 文件名: { favoritedAt } } }`），0600 |
| `image-gen/config.json` | 模型目录 v2（`version` / `providers` / `models` / `defaultId` / `keys`），0600 |
| `image-gen/library.json` | 提示词库，0600 |
| `image-gen/usage.jsonl` | 图片生成计费记录（每次成功生成一行） |
| `image-gen/image-prompts.json` | 图片 → 提示词索引，0600 |
| `token-usage/pricing.json` | 用户价目 + models.dev 同步结果 + 汇率 + 删除墓碑 |
| `model-test/params.json` | 逐模型参数覆盖 |
| `model-test/presets.json` | models.dev 预设表（同步结果） |
| `notifications/config.json` | 通知配置，0600 |
| `notifications/queue.json` | 通知队列，重启不丢，0600 |
| `<系统临时目录>/dsh-token-usage-host.log` | token-usage 诊断日志（仅 `TOKEN_USAGE_DIAG=1`） |

`mcp` 与 `skill` **不占数据目录**：直接读写当前 profile 的 `cordis.patch.yml` 与 `skills/` 目录。

### 没有自动迁移

插件**不会**在启动时搬运任何老数据。从旧的平铺布局升级过来时，需要保留就手工搬：

```bash
mkdir -p ~/.dsh/dsh-toolkit/image-gen
mv ~/.dsh/dsh-toolkit/images/*            ~/.dsh/dsh-toolkit/image-gen/images/ 2>/dev/null
mv ~/.dsh/dsh-toolkit/config.json         ~/.dsh/dsh-toolkit/image-gen/ 2>/dev/null
mv ~/.dsh/dsh-toolkit/library.json        ~/.dsh/dsh-toolkit/image-gen/ 2>/dev/null
mv ~/.dsh/dsh-toolkit/usage.jsonl         ~/.dsh/dsh-toolkit/image-gen/ 2>/dev/null
mv ~/.dsh/dsh-toolkit/image-prompts.json  ~/.dsh/dsh-toolkit/image-gen/ 2>/dev/null
```

老版 `favorites/` 目录不必搬：把图放回 `image-gen/images/` 后重新点一次收藏即可。
搬完用「工具集 → 设置」刷新核对实际落点。

---

## HTTP 接口

面板与 Agent 之外可以直接调这些路由（由插件经 `ctx.connection.fetch.register` 注册）。
每个接口的入参、返回字段与错误码写在对应功能案的「接口契约」一节。

| 前缀 | 组件 | 契约 |
| --- | --- | --- |
| `/api/image-gen` | image-gen | [功能案-图片生成](./docs/功能案-图片生成.md) |
| `/api/token-usage` | token-usage | [功能案-token用量](./docs/功能案-token用量.md) |
| `/api/model-test` | model-test | [功能案-模型测试](./docs/功能案-模型测试.md) |
| `/api/notifications` | notifications | [功能案-通知](./docs/功能案-通知.md) |
| `/api/mcp` | mcp | [功能案-mcp管理](./docs/功能案-mcp管理.md) |
| `/api/skill` | skill | [功能案-skill管理](./docs/功能案-skill管理.md) |
| `/api/toolkit` | toolkit | [功能案-工具集壳](./docs/功能案-工具集壳.md) |

所有按名字取文件的接口都先 `basename()` 再比对白名单 `/^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/i`，用于阻断目录穿越。

---

## 开发与自检

```bash
npm run build     # node build.mjs —— 改了任何 components/*/client.js 之后必须跑
npm run check     # node tools/check-client.mjs —— 改完必跑
npm run scrub     # node tools/scrub-check.mjs —— 上传前脱敏扫描（工作区 + git 历史）
npm test          # build + check
```

自检分五段，细节见命令行输出：

1. **静态**：抓 `components/*/client.js` 里的自引用 TDZ 与暗色下会消失的配色。
2. **客户端渲染冒烟**：用最小 React 桩渲染七个面板，覆盖加载 / 空 / 错误 / 各交互分支。
3. **Host 冒烟**：在 stub ctx 上真跑各组件 `apply()`，断言 `generate_image` schema、全部路由与状态码、
   模型测试的三种结论、token-usage 的统计与价目合并；通知单独一段（`[3b]`）逐个触发 16 类事件。
4. **MCP 真实读写（`[3b]`）**：沙箱假 patch 上真跑增删改启停，断言 `!!js` / 块标量 / 注释字节级保真、
   密钥默认脱敏、错误分支与 `applied:false`；**全程只动临时目录**。
5. **数据目录（`[4]`）**：默认路径与环境变量覆盖、收藏索引行为、`migrate.js` 已删、
   `toolkit` 的 `GET /api/toolkit/settings` 组件清单与存在性。

自检不触网、不弹系统通知（`NOTIFICATIONS_NATIVE=off`），产物写在仓库根 `.selfcheck-*.json`（已忽略）。

### 目录结构

```
dsh-toolkit/
├── index.js               # Host 入口
├── client.js              # ⚠️ 由 build.mjs 生成，勿手改
├── build.mjs              # 把 components/*/client.js 拼成统一 client 产物
├── cordis.patch.yml       # 单一 Loader source，指向当前 live-entry
├── live-entry-N.js        # 当前生效的 Host 入口（N 递增以绕过模块缓存）
├── docs/                  # 各组件功能案（需求 / 契约 / 验收口径）
├── tools/check-client.mjs # 自检
├── tools/scrub-check.mjs  # 上传前脱敏扫描
└── components/            # image-gen / mcp / model-test / notifications / skill / toolkit / token-usage
```

### 热更新（不重启 DSH）

Host 代码改动后 Node 模块缓存不会失效，必须换新入口，并用 `?v=N` 更新共享模块的导入 URL：

```js
// live-entry-N.js
import { apply } from './components/token-usage/host.js?v=N'   // ?v=N 是关键
```

- 把仓库的 `cordis.patch.yml` 指向新的 `./live-entry-N.js`，`.gitignore` 里那条例外同步改成新的 N
  （自检会核对两者一致）。
- 换入口后**别把旧入口留在磁盘上**：组合树可能还钉在旧文件上，而旧入口一旦 `import` 了已删除的模块，
  整个插件激活失败、所有 `/api/*` 变成 404。自检会逐个 `import()` 磁盘上的入口提前抓这个。
- 让运行中的进程读到新入口：重启 DSH，或在 `~/.dsh/profiles/<profile>/cordis.patch.yml` 末尾追加一行注释
  触发组合树重解析。
- 只改客户端时跑 `node build.mjs`，`dsh-client-hmr` 会推 `rebuilt` 让页面替换模块；未连接热更新时刷新页面。

---

## 许可证

[MIT](./LICENSE) © 2026 dsh-toolkit contributors
