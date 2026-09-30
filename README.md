# dsh-toolkit

**简体中文** | [English](./README.en.md)

一个 DSH（DeepSeek Harness）Web 端 Bundle，把两件互相独立的事装在一起：

| 组件 | 侧边栏面板 | 给 Agent 的工具 | 解决的问题 |
| --- | --- | --- | --- |
| **image-gen** | 「图片生成」（order 49） | `generate_image` | 调用任意 OpenAI 兼容的图片接口生成与编辑图片，并管理图库与提示词 |
| **token-usage** | 「Token 用量」（order 50） | — | 统计全部会话的 Token 消耗与成本，含近一年活跃度热力图 |

两个组件可以单独启用：面板 key 不同（`image-gen` / `token-usage`），路由前缀也不同。

> **设计原则：不绑定任何服务商。** 插件不内置厂商模型、默认地址或私有网关——
> 模型目录完全由你自己添加，任何实现了标准 `POST /images/generations` 的服务都能接。

| 项目 | 要求 |
| --- | --- |
| DSH | **0.1.7 及以上**（验证版本 `0.1.7-rc.2`） |
| 运行环境 | DSH Web（`client.platform: web`），Node.js 18+ |
| 许可证 | [MIT](./LICENSE) |

界面文案为简体中文；本文中出现的界面文字、文件名、路由与标识符均保持原文。

---

## 安装

### 前置

- DSH **0.1.7+**，并有一个 Web profile（默认位于 `~/.dsh/profiles/<profile>/`）。

### 方式一：作为依赖安装（推荐）

1. 在 profile 的 `package.json` 里声明依赖与 bundle：

   ```jsonc
   // ~/.dsh/profiles/<profile>/package.json
   {
     "dependencies": {
       "dsh-toolkit": "^1.3.0"
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

## 组件一：图片生成（image-gen）

### 三步接入

1. 打开侧边栏 **「图片生成」→「设置」**。
2. 点 **「+ 添加模型」**，填写：
   - **API 地址**：例如 `https://your-gateway.example.com/v1`
   - **模型 id**：上游真实的 model 名；可点 **「获取可用模型」** 从 `/models` 探测并点选
   - **API 密钥**：写入 DSH 凭据库（优先）或配置文件
3. 点 **「加入目录」**，在 **「默认模型」** 下拉里选中它，回到「文生图」即可生成。

模型目录支持多条：添加、编辑、删除、设为默认、逐条测试连通性（只打 `/models`，**不扣费**）。

### 接口规范

生成只走**标准 OpenAI Images 接口**，没有任何厂商私有协议：

```http
POST {API地址}/images/generations
Authorization: Bearer {API密钥}
Content-Type: application/json

{ "model": "<模型 id>", "prompt": "<提示词>", "n": 1, "size": "1024x1024" }
```

- 图生图 / 编辑时追加 `"image": [<https URL 或 data URL>…]`（最多 9 张）。
- 响应取 `data[].url`，或 `data[].b64_json`（会自动转存为本地文件）。
- **绝不走 `chat/completions`**；不发送任何非标准字段。

### Agent 工具：`generate_image`

| 参数 | 说明 |
| --- | --- |
| `prompt` | 必填。详细提示词（主体、风格、场景、构图、光线） |
| `size` | 输出像素尺寸：`1024x1024`（默认）、`1536x1024`、`1024x1536`、`1792x1024`、`1024x1792` |
| `count` | 生成张数，1–4（默认 1） |
| `image` | 可选参考图数组（图生图 / 编辑 / 多图合成），最多 9 张；每项为本地路径、`https://` URL 或 data URL |

返回 `ok`、`model`、`count`、`size`、`imageUrls`（图片 URL，约 24 小时有效）、
`imageUrl`（首张）、`files`（本地落盘路径），部分失败时附 `partial`。

- 目录为空、或默认模型没有可用密钥时，工具**快速失败**并给出可操作提示，不会硬打上游。
- 工具超时 6 分钟。

### 侧边栏面板

| 区域 | 内容 |
| --- | --- |
| 左栏 · 最近生成 | 缩略图墙，分页加载（每页 48，滚到底自动续）；点击放大、收藏、删除、下载 |
| 左栏 · 收藏库 | 与「最近生成」同构，收藏落在独立目录 |
| 左栏 · 提示词库 | 常用提示词的增删改；每条可挂「已生成的图片」，可「加为风格」或「替换主体」 |
| 右栏 · 文生图 | 五段式表单 + 尺寸 / 张数，一键生成（不经过 Agent 对话） |
| 右栏 · 图生图 | 上传参考图、从左栏拖入缩略图、或填 URL / 本机路径，再写编辑指令 |
| 右栏 · 设置 | 模型目录：条目、密钥、连通性测试 |

生成表单的五段（后两段可选，留空不拼进提示词）：

```
主体 → 风格（可叠加多条）→ 构图与视角：… → 光线与氛围：… → 不要：…
```

- 负面以「不要：…」追加；输入本身已以「不要 / 避免 / Avoid」开头时原样保留，不会重复。
- 灯箱支持 `←` / `→` 切换、`Esc` 关闭。

### 数据落地

- 生成图统一落盘到 `~/image-gen/`（收藏 `~/image-gen-favorites/`），**不写入项目目录**；
  `IMAGE_GEN_DIR` 可整体改到别处（支持 `~` 展开）。
- 生成逐张串行（接口对并发不友好），单张失败不影响其余；落盘失败静默跳过，仍然返回图片 URL。

### 提示词库

- 库文件：`~/.dsh/image-gen-library.json`（`IMAGE_GEN_LIBRARY` 可改）。
- 每条记录：`{ id, title, text, size, images: [图片名…], createdAt, updatedAt }`；
  `title` 缺省取正文前 24 字符。

---

## 组件二：Token 用量与活跃度（token-usage）

统计 DSH **全部会话**（含 subagent）的 Token 用量与成本。数据来自会话事件流，不额外埋点；
live 会话、持久化会话、subagent 会话三路合并，持久化会话按 revision 增量缓存，事件到达即失效缓存。

### 面板「Token 用量」

- 顶部：`真实消耗 Tokens` 总量、`总请求数`、`总成本`；时间范围可切
  `今天`（默认）/ `7 天` / `30 天` / `90 天` / `全部` / **自定义时间段**；成本可切 `$ 美元` / `¥ 人民币`；
  主数据 15 秒轮询，另有手动「刷新」。
- 指标卡：`新增输入`、`输出`、`缓存创建`、`缓存命中`、`推理`、`缓存命中率`（带进度条）。
- **活跃度**：近一年按天的热力图（按当日请求数着色），显示活跃天数与日期区间。
- **模型分布**：`模型 / 请求 / 输入 / 输出 / 缓存读 / 缓存写 / 总量 / 成本 / 占比`。
- **使用趋势**：双 Y 轴折线（左 Token、右成本），各指标独立画线，从每条线自身第一个非 0 点起笔。
- **请求查看**：按会话聚合（`会话 / 请求 / 输入 / 输出 / 缓存命中 / 总量 / 成本 / 最后活动`），
  可按 `全部来源 / 主会话 / 子会话` 过滤、按标题 / ID / 路径搜索，点行展开到**单次请求**明细。
- **计价明细**：折叠区，展开后可增改删价目、同步 models.dev、设置汇率。

### 计价：三层合并，自带价目表

1. **内置表打底**：`components/token-usage/pricing-defaults.mjs` 随插件分发（79 条，美元 / 每百万 Token），永远可用。
2. **插件自有价目文件** `~/.dsh/token-usage/pricing.json`（`TOKEN_USAGE_PRICING` 可改）覆盖内置表，条目分两种来源：
   - `source: 'user'` — 面板里手工添加 / 修改的价目，**同步永不覆盖**；
   - `source: 'models-dev'` — 从 models.dev 同步写入，下次同步整体替换。
3. **删除墓碑** `deletedModelIds` — 删过的条目（含内置表里的）不会被同步复活。

文件缺失或损坏时只降级到内置表并在面板标注错误，不会把成本整体归零。

- **同步 models.dev**：面板「⟳ 同步 models.dev」拉 `https://models.dev/api.json`（15 秒超时），
  过滤非文本模型，ID 归一化后**只写入当前实际用过的模型**；匹配不到就明确提示、不写任何价目。
- **汇率**：默认 `7.2`，可在计价明细里改。数据一律**美元存储与计算**，换算只发生在显示层。
- 需要对齐网关与 models.dev 的命名差异时，在 `components/token-usage/host.js` 的 `MODEL_ALIASES` 里登记。

### 统计口径

- `总量`（`loop`）= 输入 + 输出 + 缓存读 + 缓存写，与会话行、顶部汇总同口径。
- `成本` = (输入 × 单价 + 输出 × 单价 + 缓存读 × 单价 + 缓存写 × 单价) ÷ 1,000,000。
- 模型名未命中价目时成本记 0，该次请求标「未配价」。

---

## 配置与环境变量

| 环境变量 | 作用 | 默认值 |
| --- | --- | --- |
| `IMAGE_GEN_DIR` | 生成图统一落盘目录（收藏固定在同级） | `~/image-gen` |
| `IMAGE_GEN_CONFIG` | 模型目录配置文件 | `~/.dsh/image-gen.json` |
| `IMAGE_GEN_LIBRARY` | 提示词库文件 | `~/.dsh/image-gen-library.json` |
| `CUSTOM_API_KEY` | 默认密钥来源（每条模型也可用自己的 `keyEnv`） | — |
| `TOKEN_USAGE_PRICING` | token-usage 自有价目文件 | `~/.dsh/token-usage/pricing.json` |
| `MODELS_DEV_API_URL` | models.dev 同步源（自检用） | `https://models.dev/api.json` |
| `TOKEN_USAGE_DIAG` | 设为 `1` 才写 token-usage 诊断日志（排障用） | 关闭 |

## 数据落地

| 路径 | 内容 |
| --- | --- |
| `~/image-gen/` | 生成图统一目录（文件名形如 `image-gen-<UTC 时间戳>-<序号>.png`） |
| `~/image-gen-favorites/` | 收藏图（收藏即复制一份，取消收藏只删这里） |
| `~/.dsh/image-gen.json` | 模型目录（`models` / `defaultId` / `keys`），权限 0600 |
| `~/.dsh/image-gen-library.json` | 提示词库，权限 0600 |
| `~/.dsh/token-usage/pricing.json` | 用户价目 + models.dev 同步结果 + 汇率 + 删除墓碑 |
| `<系统临时目录>/dsh-token-usage-host.log` | token-usage 诊断日志（仅 `TOKEN_USAGE_DIAG=1` 时生成） |

---

## HTTP 接口

面板与 Agent 之外的集成方可以直接调用这些路由（由插件经 `ctx.connection.fetch.register` 注册）。

### image-gen

| 方法与路径 | 说明 |
| --- | --- |
| `GET /api/image-gen` | 分页列出已保存图片（`offset` / `limit`，默认 24、上限 60） |
| `GET /api/image-gen/file?name=` | 读取单张图 |
| `POST /api/image-gen/delete` | `{ name }` 删除图片 |
| `GET /api/image-gen/favorites` | 收藏分页列表 |
| `GET /api/image-gen/favorites/file?name=` | 读取收藏图 |
| `POST /api/image-gen/favorite` | `{ name }` 收藏 |
| `POST /api/image-gen/unfavorite` | `{ name }` 取消收藏 |
| `GET /api/image-gen/config` | 脱敏后的模型目录视图（含密钥状态与来源，不含明文） |
| `POST /api/image-gen/config` | `action: setDefault` / `add` / `remove` |
| `POST /api/image-gen/config/test` | 连通性自检（只打 `/models`，不扣费）；带 `id` 时按条目测 |
| `POST /api/image-gen/config/models` | 探测服务端模型列表，只列识别出的生图模型 |
| `POST /api/image-gen/generate` | 面板生图 / 图生图（与 `generate_image` 共用同一条链路） |
| `GET` / `POST` `/api/image-gen/library` | 提示词库读取与写入（`action: upsert` / `delete` / `tag`） |

所有按名字取文件的接口都先 `basename()` 再比对白名单
`/^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/i`，用于阻断目录穿越。

### token-usage

| 方法与路径 | 说明 |
| --- | --- |
| `GET /api/token-usage` | 全量统计；`range=today\|7d\|30d\|90d\|all\|custom`，自定义配 `start` / `end`，`force=true` 跳过缓存 |
| `GET /api/token-usage/summary` | 只要汇总数字 |
| `GET /api/token-usage/pricing` | 价目表与来源（`builtin` / `overrides` / `sync` / `exchangeRate` / `error`） |
| `POST /api/token-usage/pricing` | `{ action: 'upsert' \| 'delete' \| 'sync' \| 'rate' }` |
| `GET /api/token-usage/activity` | 近一年逐日活跃度（请求数 + Token 数） |

---

## 开发者

### 目录结构

```
dsh-toolkit/
├── index.js               # Host 入口
├── client.js              # ⚠️ 由 build.mjs 生成，勿手改
├── build.mjs              # 把 components/*/client.js 拼成统一 client 产物
├── cordis.patch.yml       # 单一 Loader source，指向当前 live-entry
├── live-entry-N.js        # 当前生效的 Host 入口（N 递增以绕过模块缓存）
├── tools/check-client.mjs # 自检：静态 + 渲染冒烟 + host 冒烟
└── components/
    ├── image-gen/         # 生成：config / generate / library / 各路由 / client / host
    └── token-usage/       # 用量：host（统计 + 价目）/ activity / client / pricing-defaults.mjs
```

### 构建与自检

```bash
npm run build     # node build.mjs —— 改了任何 components/*/client.js 之后必须跑
npm run check     # node tools/check-client.mjs —— 改完必跑
npm test          # 二者串跑
```

自检分三段：

1. **静态**：扫 `components/*/client.js`，抓 `const X = … X …` 这类自引用（TDZ 会在运行时炸整个面板）。
2. **客户端渲染冒烟**：用最小 React 桩递归渲染两个组件真实的 Panel，覆盖加载中 / 已加载 / 自定义区间 /
   读取失败 / 空数据 / 灯箱放大 / 空画廊等分支，并**断言关键组件确实被渲染过**。
3. **Host 冒烟**：在 stub ctx 上真跑各组件的 `apply()`，断言 `generate_image` 的参数与输出 schema、
   全部路由及其状态码（含目录穿越防护）、模型目录增删改与空目录行为、提示词库读写；
   另跑 token-usage 的 scan 与价目合并（本地 HTTP server 模拟 models.dev）。**全程不触网**，
   自检写的是仓库根的 `.selfcheck-*.json`（已被 `.gitignore` 忽略）。

### 热更新（不重启 DSH）

Host 代码改动后 Node 模块缓存不会失效，必须换一个新的入口文件：

```js
// live-entry-N.js
import { apply } from './components/token-usage/host.js?v=N'   // ?v=N 是关键
```

再把 `cordis.patch.yml` 指向 `./live-entry-N.js`，然后 `plugin_manager` 的
`remove_bundle` → `install_bundle`。只改客户端时 `node build.mjs` 后刷新页面即可。

两条铁律：

1. **入口 URL 一旦 import 失败就被 ESM 记死**（模块记录按 resolved URL 缓存，失败同样缓存）：
   修好代码后必须换一个**全新的文件名**，否则仍报 `failed to import`。
2. **共享模块的导入行也要带 `?v=N`**：`?v=N` 只让带 query 的模块拿到新实例，组件内部不带 query 的
   `import './generate.js'` 会命中旧实例，报 `does not provide an export named …`。

---

## 许可证

[MIT](./LICENSE) © 2026 dsh-toolkit contributors