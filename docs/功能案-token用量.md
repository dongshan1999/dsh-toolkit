# 功能案：Token 用量与成本（components/token-usage）

> 状态：已实现
> 关联组件：`components/token-usage/`（host.js + client.js）
> 面板位置：独立面板「Token 用量」（order 50），**不在「工具集」分页里**，也没有侧边栏入口（用户要求隐藏）；面板 key 仍是 `token-usage`，`ctx.layout.selectPanel('token-usage')` 可直达。

## 1. 要解决的问题

1. **用量不透明。** DSH 的会话事件里带 `usage`（输入、输出、缓存读/写、推理 token），但用户看不到
   跨会话的汇总：今天花了多少、哪个模型最贵、缓存命中率如何。
2. **会话形态不止一种。** 在跑的会话（live）、已持久化到磁盘的会话、只存在于
   `sessionController` 索引里的会话、以及 subagent 派生的子会话，都要计入同一份统计。
3. **价目会过时。** 各家模型的单价随时变。内置表只能保证「开箱有数」，需要用户覆盖与
   在线同步（models.dev）两层来更新，同时不能把用户手改的价格冲掉。
4. **生图不按 token 计费。** 图片生成按张收费，必须有自己的价目条目，并与 token 成本合并进同一个面板。
5. **活跃度需要长时间窗口。** 「最近一年哪天在干活」不是某个时间段查询的副产品，需要独立聚合。
6. **全量扫描很贵。** 会话日志可能很大，每次打开面板都全量解析会拖慢 DSH；需要按 revision 增量缓存。

## 2. 目标与非目标

### 目标

- 统计 DSH **全部会话**（含 subagent）的 Token 用量与成本。
- 面板默认「今天」，可切 `今天 / 7 天 / 30 天 / 90 天 / 全部`；15 秒轮询。
- 合并 live session、持久化 session 和 subagent session；持久化会话按 revision 增量缓存。
- 双 Y 轴趋势图、模型分布、会话明细、计价明细。
- 价目三层合并：内置表 → 用户覆盖 → models.dev 同步；生图按张单独计费。
- 近一年活跃度热力图（按天聚合请求数与 token 数）。
- **没有侧边栏入口**（用户要求隐藏；面板 key 仍是 `token-usage`，`ctx.layout.selectPanel('token-usage')` 可直达）。

### 非目标

- 不做计费网关、不做预算拦截、不改写任何请求或响应：只读会话事件做统计。
- 不改 DSH 自己的模型配置（model-test 才写 DSH 配置）；本组件只写自己的价目文件。
- 不内置任何厂商地址或密钥；价目同步只从公开的 models.dev 拉取模型价格。
- 不提供侧边栏入口，也不主动往「工具集」里加分页。
- 不做自动迁移，不自动搬老位置的数据。

## 3. 关键约束（决定了方案形状）

| # | 约束 | 依据 | 后果 |
|---|---|---|---|
| C1 | 会话事件流是唯一数据源 | host 只解析 `assistant/message` 事件里的 `data.usage` | 统计口径 = 事件流；不伪造、不按模型猜 token |
| C2 | 子会话有继承事件 | 读取时拿 `inheritedEventCount`，`seq < inherited` 的事件跳过 | 子会话只统计自己新增的调用，避免与父会话重复计数 |
| C3 | 会话来源有三种且可能互相缺失 | `sessions.list()`（live）/ `sessionController.list()`（索引）/ `sessionPersistence.list()`（持久化），逐级降级 | 任一服务不可用仍能出数；live 会话优先，不会被索引里的旧行覆盖 |
| C4 | 全量重扫代价高 | 持久化会话按 `revision`（拿不到时用 `updatedAt`）命中缓存 | 命中即复用 calls 与标题；`session/event`（assistant/message）、`session/created`、`session/disposed`、`api-session/added` 触发整体失效 |
| C5 | 请求里的模型名与价目 id 常不一致 | 匹配顺序：精确 → `MODEL_ALIASES` 别名 → 最长前缀 | 命中不了就记 0 成本，并把该请求标「未配价」，绝不猜价 |
| C6 | 价目必须可更新且不可丢用户改动 | 三层合并 + 条目 `source` + `deletedModelIds` 墓碑 | 用户手改永不被同步覆盖；删过的模型不会被同步复活 |
| C7 | 价目文件可能缺失或损坏 | 读取失败只降级到内置表并记 `error` | 面板照常显示，标题处注明「价目文件读取失败：…」 |
| C8 | 生图按张计费，不是 token | 从 `image-gen/config.json` 读 `pricePerImage`，生成记录来自 `image-gen/usage.jsonl` | 生图条目 `perImage`，伪会话行「图片生成」，成本 = 当前单价 × 张数 |
| C9 | 面板不露出入口 | `client.js` 只 `slots.inject('main', …)`，不注册 `sidebar.panellist` | 用户看不到侧边栏按钮，但 `selectPanel('token-usage')` 与直接路由仍可用 |
| C10 | 成本数据必须可跨汇率复用 | 数据一律按美元存储；`exchangeRate` 只用于显示换算 | 切货币不改写数据，只改显示；默认 `7.2` |

## 4. 数据模型与数据落点

### 4.1 统计单元：一次 assistant 调用

从每个会话事件流里提取 `assistant/message` 事件的 `data.usage`：

| 字段 | 含义 |
|---|---|
| `time` | 事件时间（毫秒） |
| `model` | `data.message.source.model` |
| `provider` | `data.message.source.provider` |
| `input` | `usage.inputTokens` |
| `output` | `usage.outputTokens` |
| `cacheRead` | `usage.cacheReadTokens` |
| `cacheWrite` | `usage.cacheWriteTokens` |
| `reasoning` | `usage.reasoningTokens` |

会话标题取事件流里 `session/title` 事件 `seq` 最大的一条（与客户端会话列表同源）。

### 4.2 响应里的行与桶

```ts
type Totals = {
  input: number; output: number; cacheRead: number; cacheWrite: number
  reasoning: number; cost: number; requests: number; unpriced: number; loop: number
}

type Call = {
  time: number; model: string; provider: string
  input: number; output: number; cacheRead: number; cacheWrite: number
  cost: number; priced: boolean; image?: true   // image 仅图片生成行
}

type SessionRow = {
  id: string; title: string; cwd: string
  origin: 'session' | 'subagent'
  live: boolean
  updatedAt: number
  input: number; output: number; cacheRead: number; cacheWrite: number
  reasoning: number; cost: number; requests: number; unpriced: number; loop: number
  calls: Call[]
}

type ModelBucket = {
  model: string; displayName: string
  input: number; output: number; cacheRead: number; cacheWrite: number
  cost: number; requests: number; loop: number
}
```

- `loop` = `input + output + cacheRead + cacheWrite`（面板顶部「真实消耗 Tokens」用它）。
- 行按 `cost` 降序、再按 `loop` 降序排；模型桶按 `cost` 降序、再按 `input` 降序排。
- 伪会话行「图片生成」固定 `id: 'image-gen'`、`origin: 'session'`、`live: false`，
  `calls[]` 里每张图一条 `{ … token 全 0, cost, priced, image: true }`。

### 4.3 价目文件 `pricing.json`

插件自有价目文件：`$DSH_HOME/dsh-toolkit/token-usage/pricing.json`（`TOKEN_USAGE_PRICING` 环境变量可改路径）。

```jsonc
{
  "version": 1,
  "models": [
    {
      "modelId": "<模型 id>",
      "displayName": "<显示名，缺省取 modelId>",
      "input": 0,
      "output": 0,
      "cacheRead": 0,
      "cacheWrite": 0,
      "source": "user"            // 'user' 手工增改（同步永不覆盖）| 'models-dev' 同步写入（下次同步刷新）
    }
  ],
  "deletedModelIds": [],           // 删除墓碑：含内置表里的条目，同步都不会复活
  "modelsDevSync": { "lastSyncAt": 0, "lastSyncError": null, "lastCount": 0 },
  "exchangeRate": 7.2              // 显示用汇率（美元 → 人民币）；数据仍按美元存
}
```

- 单价单位：**每百万 Token 的美元价**；非法/负值归 0（与成本计算口径一致）。
- **合并优先级**：用户手工（`source: 'user'`）> models.dev 同步（`source: 'models-dev'`）> 内置表；
  图片生成的按张条目最后覆盖同名条目。
- 文件缺失、结构不对、读取失败都只降级到内置表，并把错误串带给面板。
- 写文件用临时文件 + rename 的原子写。

### 4.4 数据目录与环境变量

按组件分目录放在 `$DSH_HOME/dsh-toolkit/` 下（`DSH_HOME` 未设时回退 `~/.dsh`，本机即
`~/.dsh/dsh-toolkit/`）。`$DSH_HOME` 解析规则：先读 `DSH_HOME`（空白视为未设，支持 `~` 展开），
未设回退 `~/.dsh`。

| 用途 | 环境变量 | 默认 |
|---|---|---|
| 数据目录 | `DSH_TOOLKIT_DATA` | `$DSH_HOME/dsh-toolkit` |
| 价目文件 | `TOKEN_USAGE_PRICING` | `$DSH_HOME/dsh-toolkit/token-usage/pricing.json` |
| 诊断日志 | `TOKEN_USAGE_DIAG` | 关闭；设为 `1` 才写 `<系统临时目录>/dsh-token-usage-host.log` |
| models.dev 同步源 | `MODELS_DEV_API_URL` | `https://models.dev/api.json` |

生图配置与计费记录属于 image-gen，在 `image-gen/config.json` 与 `image-gen/usage.jsonl`
（本组件只读它们来做成本合并）。

### 4.5 内置价目 `pricing-defaults.mjs`

- 内置价目表（每百万 Token，美元，**79 个模型快照**），随插件分发，永远可用。
- 手工调价直接改本文件；改完记得同步升 `host.js` 导入行的 `?v=` 与 live-entry 的版本。

### 4.6 生图按张计费（与 image-gen 的契约）

- 来源：`$DSH_HOME/dsh-toolkit/image-gen/config.json` 里带 `pricePerImage`（美元/张）的模型。
- 这些模型作为价目条目出现在计价明细：`perImage` 字段有值、token 单价显示 `—`，
  显示名后缀「（图片·按张）」、按张单价标在显示名旁。
- 每次生成在 `$DSH_HOME/dsh-toolkit/image-gen/usage.jsonl` 落一条记录；
  scan 时合并为伪会话行「图片生成」，**成本 = 当前每张单价 × 张数**（与 token 同哲学：当前价 × 历史用量）。
- 本组件对这两个 image-gen 文件只读，绝不回写。

### 4.7 缓存与刷新节奏

| 缓存 | 生命周期 | 失效方式 |
|---|---|---|
| scan 结果（按 `range[:start:end]`） | 4 秒 | `force=true` 或 `session/event`（assistant/message）、`session/created`、`session/disposed`、`api-session/added` |
| 持久化会话解析结果 | 按 `revision`（无 revision 时按 `updatedAt`） | revision 变化 |
| 生图花费记录 | 按文件 mtime | mtime 变化 |
| 价目合并表 | 按价目文件 mtime + 生图配置 mtime | mtime 变化或写价目后清缓存 |
| 活跃度 | 15 秒 + `assistant/message` 事件失效 | 事件驱动 |
| 面板轮询 | 主表格 15 秒、计价明细 60 秒 | 手动「刷新」 |

### 4.8 文件分工（原组件说明表格原样保留）

| 文件 | 作用 |
| --- | --- |
| `host.js` | 统计与缓存 + 经 `ctx.connection.fetch.register` 注册路由（`GET/POST /api/token-usage`、`/summary`、`/pricing`；会话事件触发缓存失效） |
| `client.js` | 浏览器面板源码。**不直接部署**：由根目录 `node build.mjs` 包装进统一入口 `client.js` |
| `pricing-defaults.mjs` | 内置价目表（每百万 Token，美元，79 个模型快照）。手工调价直接改本文件；改完记得同步升 `host.js` 导入行的 `?v=` 与 live-entry 的版本 |

### 4.9 没有自动迁移

插件不再自动搬老位置的数据，升级后手工 `mv` 到 §4.4 的对应位置；
工具集 →「设置」分页可以核对价目文件的实际落点。

## 5. 接口契约

所有路由前缀 `/api/token-usage`，由 `host.js` 经 `ctx.connection.fetch.register` 注册
（路径重复注册时最多重试 10 次，间隔 400 ms）。JSON 响应为 `{ ok?: true, ... }` 或
`{ ok: false, message }` / `{ code: 'token-usage/<reason>', message }`（HTTP 500 时用后者）。
响应头统一 `content-type: application/json; charset=utf-8`、`cache-control: no-store`。

| Method | Path | 入参 | 返回字段 | 错误码 |
|---|---|---|---|---|
| GET | `/api/token-usage` | `?range=today\|7d\|30d\|90d\|all\|custom&start=<ms>&end=<ms>&force=true` | `generatedAt / range / start / end / pricingSource / totals / models / sessions` | 500 `token-usage/failed` |
| GET | `/api/token-usage/summary` | 同上（除 `sessions` 与 `models`） | `range / loop / cost / requests / sessions / input / output / cacheRead / cacheWrite` | 500 `token-usage/failed` |
| GET | `/api/token-usage/pricing` | — | `available / source / sourceLabel / builtin / path / overrides / sync / exchangeRate / error / used / entries[]` | 500 `token-usage/failed` |
| POST | `/api/token-usage/pricing` | `{ action: 'upsert' \| 'delete' \| 'sync' \| 'rate', … }` | `upsert` / `delete` / `rate` → `{ ok, message, exchangeRate? }`；`sync` → 同步结果（失败 502） | 400（参数无效 / 未知操作）、500 `token-usage/failed` |
| GET | `/api/token-usage/activity` | — | `start / end / activeDays / days[{ date, requests, tokens }]` | 500 `token-usage/activity-failed` |

### 5.1 范围与时间窗口

- `range` 默认 `today`：从本地当天 00:00 到当前时刻。
- `7d` / `30d` / `90d`：当前时刻往前 7 / 30 / 90 天。
- `all`：不设起点（`start: null`），统计全部会话事件。
- `custom`：需 `start`、`end`（毫秒）。任一非法或 `end <= start` 时**退回今天**（`range: 'today'`）。
- `force=true` 跳过 4 秒 scan 缓存；会话列表按 `updatedAt`（或 `createdAt`）早于窗口起点的行会被跳过（`all` 除外）。

### 5.2 主路由字段

- `totals`：见 §4.2。
- `models[]`：`ModelBucket[]`，模型分布表直接渲染。
- `sessions[]`：`SessionRow[]`，含 `calls[]` 明细，供会话明细展开与趋势图使用。
- `pricingSource`：价目来源标记（`builtin` / `builtin+user`），面板据此显示「来源：…」。
- `generatedAt` / `start` / `end`：面板用来标注时间窗与「最后更新」。

### 5.3 摘要路由

`GET /api/token-usage/summary` 是轻量版：只回总量与会话数（`sessions` 是**数量**，不是数组），
适合外部脚本或二次集成。

### 5.4 价目路由

`GET /api/token-usage/pricing`：

- `entries[]`：合并后的价目条目，字段 `modelId / displayName / input / output / cacheRead / cacheWrite`
  （生图条目另有 `perImage`）。
- `used[]`：最近一次 scan 实际用过的模型名（「只看在用」的依据）。
- `source` / `sourceLabel` / `builtin`（内置条数）/ `overrides`（自定义+同步条数）/
  `path`（价目文件存在时才给）/ `sync`（`modelsDevSync`）/ `exchangeRate` / `error`。
- `available`：`entries.length > 0`。

`POST /api/token-usage/pricing`：

| action | 入参 | 行为 | 失败 |
|---|---|---|---|
| `upsert` | `{ entries: [...] }` 或 `{ entry: {...} }`，每条需 `modelId` | 写为 `source: 'user'`；同 id 覆盖；并从 `deletedModelIds` 移除该 id；回 `已保存 N 条价目（用户自定义，不会被同步覆盖）` | 400 `没有有效的价目条目（modelId 必填）` |
| `delete` | `{ modelId }` | 从 `models` 删掉，并写入 `deletedModelIds` 墓碑；回 `已删除 <id>（写入删除墓碑，同步不会复活）` | 400 `缺少 modelId` |
| `rate` | `{ usdToCny }` | 校验 `0 < 值 ≤ 1000` 后写 `exchangeRate`；回 `汇率已保存：1 美元 ≈ N 元人民币` | 400 `汇率无效：需为 0–1000 之间的数值（美元 → 人民币）` |
| `sync` | — | 拉 `https://models.dev/api.json`（15s 超时），过滤非文本模型、归一化 id、同 id 取最新发布，写入 `source: 'models-dev'`；成功回同步统计，失败回 502 并写 `lastSyncError` | 502（HTTP 非 200、超时、JSON 解析失败等） |
| 其它 | — | — | 400 `未知操作：<action>` |

`sync` 的过滤与归一化规则见 `host.js` 的 `flattenModelsDev()`：过滤 deprecated、audio、embedding、
image、tts 等非文本模型；id 归一化（剥 `provider/` 前缀、`:变体`、`@`→`-`、`[1m]` 后缀，转小写）；
同 id 取最新发布。

### 5.5 活跃度路由

`GET /api/token-usage/activity`：

- 窗口：从「今天 00:00 往前 364 天」再对齐到周一，末尾补到整周（约 52-53 周）；`days[]` 末尾可能补
  `{ date: '', requests: 0, tokens: 0 }` 的占位列。
- 每格 `{ date: 'YYYY-MM-DD', requests, tokens }`，`tokens` = 输入+输出+缓存读+缓存写。
- `activeDays`：有请求的天数。
- 失败统一 `{ code: 'token-usage/activity-failed', message }`（500）。

### 5.6 面板侧的调用名

浏览器面板不直接拼 URL，而是 `host.call('<虚拟方法名>', 参数)`，客户端壳把名字映射到路径：

| 虚拟方法名 | 实际路径 |
|---|---|
| `token-usage` | `/api/token-usage` |
| `token-usage-summary` | `/api/token-usage/summary` |
| `token-usage-pricing` | `/api/token-usage/pricing` |

## 6. 面板与交互

### 6.1 顶部：总览与控制

- 大号数字「真实消耗 Tokens」= `totals.loop`，下方 `≈ <可读单位>`；右侧「总请求数」「总成本」。
- 六个指标卡：新增输入 / 输出 / 缓存创建 / 缓存命中 / 推理 / 缓存命中率（带进度条）。
- 控制条：时间段下拉（`今天 / 7 天 / 30 天 / 90 天 / 全部` + 「自定义时间段」的从/到选择与「应用自定义范围」）、
  货币切换（`$ 美元` / `¥ 人民币`，只影响显示）、「刷新」。
- 切换时间段时右上角出现「切换中…」提示；读取失败显示「读取失败：<原因>」。

### 6.2 活跃度（近一年热力图）

- 卡片标题「活跃度」，按天聚合近一年（52 周网格）：行 = 周一到周日，列 = 周；顶部标月份。
- 按当天请求数分 5 档（0 / 1 / 2-4 / 5-9 / 10+），悬停显示「YYYY-MM-DD」「N 次请求 · X tokens」。
- 图例、日期范围（`首日 – 末日`）；空数据显示「暂无活跃度数据」。

### 6.3 模型分布

表格列：`模型 / 请求 / 输入 / 输出 / 缓存读 / 缓存写 / 总量 / 成本 / 占比`，按成本降序。

### 6.4 使用趋势（双 Y 轴）

- 按时间聚合的折线/面积图：左轴 token 量、右轴成本；悬停出具体数值。
- 只有一个时间点时退化为单点；窗口内没有调用时显示「这段时间还没有用量」。

### 6.5 会话明细

- 列：`会话 / 请求 / 输入 / 输出 / 缓存命中 / 总量 / 成本 / 最后活动`，按成本降序。
- 搜索框按标题、id、cwd 过滤；来源筛选 `全部来源 / 主会话 / 子会话`（`origin` 为 `subagent` 的归子会话）。
- 点一行展开该会话的 `calls[]`：`时间 / 模型 / 输入 / 输出 / 缓存命中 / 缓存创建 / 成本`，
  未命中价目的调用成本显示「未配价」。
- 图片生成的伪会话行也在同一张表里，展开可见每张图的按张成本。

### 6.6 计价明细

- 可折叠卡片，标题形如「计价明细（每百万 Token）· N / M 个模型 · 来源：内置 X 条 + 自定义/同步 Y 条」，
  并附 models.dev 同步状态（`models.dev 上次同步 <时间>（N 条）` 或「尚未从 models.dev 同步过」）；
  价目文件读取失败时标题带「（价目文件读取失败：…）」。
- 列：`模型 / 输入 / 输出 / 缓存命中 / 缓存创建 / 操作`；单价按当前货币换算显示（录入仍是美元/百万 Token）；
  生图条目 token 单价显示 `—`，显示名旁标 `$x/张`，操作列显示「图片生成面板 · 编辑模型里配置」。
- 「只看在用」默认开启：只显示最近一次 scan 实际用过的模型，可一键切回全量。
- 「⟳ 同步 models.dev」按钮：调用 `sync`，处理中显示「处理中…」。
- 汇率输入（`汇率 $→¥`）：保存后写 `exchangeRate` 并立刻用于显示换算。
- 价格表单「＋ 添加 / 覆盖价格」：填 `modelId / displayName / input / output / cacheRead / cacheWrite`
  后 upsert；每行「改」载入表单、「删」写删除墓碑。

## 7. 安全与隐私

1. **只读会话用量，不读正文。** 统计只取 `assistant/message` 的 `usage` 与会话标题事件，
   不落盘对话内容，也不把请求/响应文本写进日志。
2. **不写 DSH 配置。** 本组件唯一的写操作是插件自有价目文件 `pricing.json`；
   DSH 的模型/插件配置由 model-test 等组件负责。
3. **价目路径不接受请求参数。** 路径由环境变量（`TOKEN_USAGE_PRICING` / `DSH_TOOLKIT_DATA`）解析，
   路由没有「读写任意路径」的能力。
4. **参数校验。** 价目数值非法/负数归 0；汇率必须 `0 < r ≤ 1000`；`modelId` 必填；
   未知 action 一律 400，不会静默忽略。
5. **诊断日志默认关闭。** 只有 `TOKEN_USAGE_DIAG=1` 才写 `<系统临时目录>/dsh-token-usage-host.log`，
   内容只有计数、路径、耗时一类排障信息；不写价目明细以外的数据。
6. **同步只读公开数据。** models.dev 同步是单向拉取，不推送任何本地信息（除 HTTP 请求本身）。
7. **汇率只影响显示。** 数据始终按美元存储，切换货币不会回写 `usage`，也不会改历史成本。

## 8. 验收标准

1. `node --check components/token-usage/host.js`、`node --check components/token-usage/client.js` 通过。
2. `GET /api/token-usage` 不带参数返回今天的数据：`range: 'today'`、`start` 为本地 00:00、
   `totals.loop` 等于 `input+output+cacheRead+cacheWrite`。
3. 范围切换：`?range=7d / 30d / 90d / all` 各自窗口正确；`?range=custom&start=<ms>&end=<ms>` 生效，
   非法自定义范围退回 `today`。
4. 合并正确：live、持久化、subagent 会话都出现在 `sessions[]`；subagent 行 `origin: 'subagent'`；
   子会话不重复计入父会话（`seq < inheritedEventCount` 的事件被跳过）。
5. 增量缓存：同一窗口连续两次请求，第二次不重读未变更的持久化会话；`force=true` 强制重扫。
6. 价目：`GET /pricing` 返回 `entries`、`builtin`、`overrides`、`sync`、`used`、`exchangeRate`；
   `POST {action:'upsert'}` 后条目变 `source: 'user'`；`{action:'delete'}` 写入 `deletedModelIds`，
   下一次 `sync` 不会复活；`{action:'rate', usdToCny: 7.5}` 生效；未知 action 返回 400。
7. 生图合并：`image-gen/config.json` 里配了 `pricePerImage` 的模型出现在计价明细（按张），
   有一次生成记录时出现伪会话行「图片生成」，其成本 = 单价 × 张数；未配价模型该行标「未配价」且成本 0。
8. 活跃度：`GET /api/token-usage/activity` 返回约 365 天、末尾补齐整周；每格含 `date/requests/tokens`；
   失败时返回 `code: 'token-usage/activity-failed'`。
9. 面板没有侧边栏入口，但 `ctx.layout.selectPanel('token-usage')` 能打开；面板 key 为 `token-usage`。
10. 根目录 `node build.mjs` + `node tools/check-client.mjs` 全绿（由维护者在合并前执行；本次只改文档，
    不要求重跑）。

## 9. 已知限制

- **没有侧边栏入口。** 面板只能通过 `selectPanel('token-usage')` 或直接路由打开。
  旧版组件说明还写着「也注册在 toolkit 的共享注册表里，将来要在分页里露出只需去掉跳过条件」；
  按当前 `components/token-usage/client.js` 核对，它只登记 `main` 槽位、没有调用共享注册表的
  `register`，因此**现在没有可去掉的跳过条件**——要在「工具集」分页里露出需要补一次注册。
- **统计口径限于 `assistant/message` 的 `usage`。** 工具调用、外部 API 消耗、缓存之外的本地算力都不计。
- **未配价即成本 0。** 请求侧模型名未命中价目（精确 → 别名 → 最长前缀）时成本记 0，并标「未配价」。
- **内置价目是快照。** `pricing-defaults.mjs` 的 79 个模型价格会过时；需要同步 models.dev 或手改内置表
  （改完升 `?v=` 与 live-entry 版本）。
- **models.dev 匹配保守。** 只取精确 id 与日期快照后缀（如 `-20250514` / `-latest`），
  家族变体（`glm-x-flash-eu`、`grok-4.7` 这类）不会被前缀扩散带进来，因此可能少配到价。
- **同步依赖外网。** 15 秒超时；失败只写 `modelsDevSync.lastSyncError`，不改动已有价目。
- **汇率只是显示层。** 默认 7.2，手动改后只影响换算显示；历史成本不会因汇率变化而重算成另一套美元数。
- **图片生成行的 token 字段为 0。** 它只参与请求数/成本统计，不参与 token 总量与缓存命中率。
- **面板持续轮询。** 主表格 15 秒、计价明细 60 秒一次，长时间开着会产生周期性请求。
- **没有自动迁移。** 老位置的价目/配置需要手工 `mv` 到 §4.4 的对应位置；工具集 →「设置」可核对落点。
