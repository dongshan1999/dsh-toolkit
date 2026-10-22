# 组件三：model-test（模型连接与速度测试）

测 **DSH 自己配置的模型**「能不能连通、有多快」，支持三种粒度：

- **全部** —— 一次跑完当前可路由的所有模型；
- **单个组** —— 只测某个 provider 下的全部模型；
- **单组单模型** —— 只测某个 provider 下的某一个模型。

除此之外，面板会**按模型名自动推断参数**：内置 100+ 主流模型族的
`temperature / maxTokens / temperature 支持性 / 思考档位 / 上下文与输出上限`，
打开面板就能看到每个模型命中哪一族、下次测试会发什么参数，
也可以逐模型或整组手工覆盖，或一键从 [models.dev](https://models.dev) 同步最新快照。

## 前提：目录来自 DSH，不来自本插件

面板不含任何模型配置，它读的是 **DSH 运行时正在路由的东西**：

- **组** = `ctx.llm.listProviders()` 返回的**已注册 route**（`dl`、`xiaomi` 这类）。
  只有真正激活的 route 才发得出请求，所以未激活/dormant 的配置不会被假装成可测。
- **组内模型** = 逐组 `await ctx.llm.listModels(provider)`。
  某组抛错时进 `failures` 单独展示，**不影响其它组**（例如某个网关没配好）。
- **测试调用** = `ctx.llm.stream({ provider, model, messages, maxTokens, signal })`，
  与 agent 对话**同一条适配器链路**——凭证解析、路由选择、重试策略都由 DSH 负责，
  所以「连通性」结论与真实对话一致。面板**不接触任何密钥**，也不引入第二套地址配置。

> ⚠️ 与 image-gen 的「测试」按钮不同：那个只 `GET /models`、**不扣费**；
> 这里是真发一次推理请求。`maxTokens` 默认压到 256，prompt 默认是一段「测速」重复词
> （纯文本产出最稳定，便于比较 tok/s），但仍然**会真实计费**。

## 文件

- `host.js` — 目录构造 + 参数推断 + 探测逻辑 + 经 `ctx.connection.fetch.register` 注册路由。
- `presets.js` — 预设库（读内置表/同步结果）+ 参数分层解析 + 安全阀 + YAML 片段生成。纯函数，无 `ctx` 依赖。
- `presets-data.mjs` — **内置精选表**（主流模型族的参数快照，随仓库发布、离线可用）。
- `client.js` — 浏览器面板源码。**不直接部署**：由根目录 `node build.mjs`
  包装进统一入口 `client.js`。

## 面板「模型测试」

> 位置：侧边栏「工具集」（order 48）→ 分页「模型测试」。合并前是独立的侧边栏入口（order 51），
> 面板 key 仍是 `model-test`，`ctx.layout.selectPanel('model-test')` 照样能直接打开。

- 顶部 `测试全部` 一键跑完目录里所有模型；`刷新目录` 重新读取 DSH 的组与模型。
- 参数行（测试中禁用）：
  `超时`（15/30/60/120/180 秒）、`输出上限`（16/64/256/512 tokens）、
  `并发`（1/2/3/5/8）、`默认 temperature`、`默认档位`、`提示词`。
- **每个模型行**：状态点 + 模型名/ID + 实时读数 + 右侧 `测试` 按钮 → **单个组下单个模型**。
- **每个组头**：整行是折叠热区（`▸/▾` + 组名 + `N 个模型`）+ `整组参数` + `测试本组` → **整组**。
- **每个模型行**：模型名后跟一行参数徽标 ——
  `预设族名`（命中内置表/modes.dev）+ `已配置`（有手工覆盖）+
  生效参数摘要（`t=0.6 · max=64 · 中`，优先显示上次测试**真实发出**的值）。
  右侧 `参数` 按钮展开编辑区。
- 有结果时顶部出现汇总卡：`成功 x / y`、`平均首字`、`平均速度`、`最快 / 最慢`。
- 单测某个模型时**合并**而非覆盖已有读数，其它模型上一次的结果仍留在表里。
- 组默认全部收起（只显示组名与模型数）；点组头任意空白处展开，再点收起。

每行读数形如：

```
连接正常 · 首字 420 ms · 46.4 tok/s · 64 tokens 输出 · 总 1.80 s
失败：HTTP 401 unauthorized
超时：超过 120000ms 未返回
已中断：请求被中断
```

## 参数配置（按模型名自动补）

DSH 的 `ctx.llm.stream()` 只认三个可调参数：`temperature`、`maxTokens`、`reasoningEffort`。
（`stop` 被 `llm-pi-ai` 适配器显式拒绝：`llm-pi-ai does not support GenerateOptions.stop`。）
本面板把这几个参数做成「按模型名自动推断 + 可覆盖」：

### 参数从哪来（逐字段取值，先命中先用）

| 优先级 | 来源 | 存在哪 |
| --- | --- | --- |
| 1 | **本次指定** `run` 的 `targets[].params` / `body.params` | 一次性，不落盘 |
| 2 | **单模型覆盖** | `params.json`，键 `provider\0model` |
| 3 | **整组默认** | `params.json`，键 `provider\0*` |
| 4 | **预设命中** | `presets-data.mjs` 内置表 + `presets.json` 同步结果 |
| 5 | **全局默认** | 面板顶部的「默认 temperature / 默认档位」 |

每个字段**独立**取值：比如手工只配了 `temperature`，`reasoningEffort` 仍会从预设取。

**真实能力看「参数」抽屉，不看预设。** 点模型行的 `参数`，`DSH 现在：…` 那一段来自适配器的
`llm.resolveModelInfo(provider, model)`：`context.contextWindow`、`defaultMaxTokens`、
`reasoning.efforts` / `defaultEffort`、`inputModalities` 都是 DSH 解析出来的真实声明值，
并用它给参数做安全阀（不支持的档位自动降级）。模型行上那个 `t=0.7 · max=256 · 最高（预设）`
是 models.dev 预设 + 你的覆盖，属于**建议值**，两者不一致时以适配器声明为准。

`contextWindow` / 输出上限这类值没有可问的接口（网关不提供），只能读适配器声明；
`temperature`、`reasoningEffort` 是否真的生效在接口层也不可判定——聚合网关会静默忽略未知参数。
所以本面板不做「参数是否生效」的探测，只把声明值如实展示出来。

### 内置精选表

`presets-data.mjs` 收录 100+ 个主流模型族（OpenAI / Anthropic / Google / DeepSeek /
Qwen / GLM / Kimi / MiniMax / Grok / Mistral / Llama / 豆包 / 混元 / 阶跃 / 文心 / 百川 / 零一 等），
按 `id → 别名 → 正则` 三级匹配，**纯本地匹配、零网络**。每族记录：

`label / vendor / matches[] / supportsTemperature / reasoning{mode,levels,default,wire} /
contextWindow / maxTokens / suggest{temperature,maxTokens,reasoningEffort} / note`

### models.dev 一键同步

点顶部 `同步参数预设`：先读当前目录里的模型列表，再从 `https://models.dev/api.json`
只挑这些在用模型写进 `presets.json`（原生厂商优先于聚合商；过滤 deprecated 与非文本模型；
同归一化 id 去重）。同步结果按 id **覆盖**内置表同 id 条目，其余内置族照常生效。

地址可用 `MODELS_DEV_API_URL` 覆盖（内网镜像/离线测试）。

### 安全阀（绝不硬发模型不接受的参数）

预设只是**推荐值**，能不能发以适配器真实能力为准 —— 测试前会调
`ctx.llm.resolveModelInfo(provider, model)` 拿 `reasoning.efforts` / `defaultMaxTokens`：

- **档位不在能力里** → 退到 `defaultEffort`（或最低档），`note` 写明「该模型不支持 X，已改用 Y」。
  DSH 侧对非法档位是**直接抛错**（`UNSUPPORTED_REASONING_EFFORT`），不 clamp 不 alias，所以必须在这里拦。
- **预设标记 `supportsTemperature: false`**（o 系列、gpt-5/6 多数、claude-5 系、kimi-k3、
  MiniMax-M3.1-Flash 等）→ `temperature` 一律不发。
- **`maxTokens` 超过适配器 `defaultMaxTokens`** → 收顶并说明。
- **测速专用收顶**：预设建议的 `8192/16384` 是给真实对话用的输出上限，
  测速照发会白烧几千 tokens，所以测试时一律按顶部「输出上限」收顶。

能力探测失败（老适配器没有 `resolveModelInfo`）不会让测试失败，只是退回预设推断。

### 落盘位置

| 文件 | 内容 | 环境变量覆盖 |
| --- | --- | --- |
| `$DSH_HOME/dsh-toolkit/model-test/params.json` | 手工覆盖（逐模型 + 整组） | `MODEL_TEST_PARAMS` |
| `$DSH_HOME/dsh-toolkit/model-test/presets.json` | models.dev 同步结果 | `MODEL_TEST_PRESETS` |

写入走 `mkdirSync + tmp + renameSync` 原子替换；`DSH_TOOLKIT_DATA` 可整体改道（自检用）。

### 生成 YAML 片段

模型行 → `参数` → `生成 YAML 片段`：读适配器真实能力，产出可直接粘进
`cordis.patch.yml` 的 `llm-pi-ai.providers.<id>.models` 条目：

```yaml
- id: gpt-6-sol
  name: GPT-6 Sol
  contextWindow: 400000
  maxTokens: 8192
  input: [text]
  reasoningEfforts: { low: low, medium: medium, high: high }
  compat: { supportsTemperature: false }
```

这样接第三方 API 时不必再逐个查文档填参数。

## 指标口径

| 指标 | 口径 |
| --- | --- |
| `ttftMs`（首字延迟） | 首个 `text-delta` / `reasoning-delta` 到达时间；没有文本分片时退化为**首个分片**到达时间 |
| `tokensPerSecond` | `outputTokens ÷ 总耗时`，与网关「输出 TPS」同一口径；没有输出 token 时为 `null` |
| `totalMs` | 从发起 `stream()` 到流结束的总耗时 |
| `streamMs` | `totalMs - ttftMs`，即真正用于产出 token 的时间 |
| `ok` / `status` | `finish.reason.kind` 为 `stop` / `max-tokens` / `tool-calls` → `ok`；`error` / `aborted` → 失败 |

判定细节：

- **超时归因**：`timeoutMs` 到点即 `abort()`，并额外 `iterator.return()` 收尾；
  即使适配器不响应 abort，也有 `timeoutMs + 5s` 的硬超时兜底，
  结论归到 `超时`（`status: 'timeout'`）而不是笼统的失败。
- **连接成功但无输出**（例如全部命中缓存、或模型只回空串）仍算 `连接正常`，只是速度显示 `-`。
- **失败信息透传**：优先取 `finish.reason.failure.message`（含 provider 原始报错与 HTTP 状态）。
- 并发默认 3；一次「测试全部」的总时长约等于 `模型数 ÷ 并发 × 单次耗时`。

## 路由

| 方法与路径 | 说明 |
| --- | --- |
| `GET /api/model-test/catalog` | 目录：`{ ok, generatedAt, groups: [{ id, name, models: [{ id, name, inputModalities, preset, paramsOverride }] }], failures, providerCount, modelCount, declared, overrides, presets, files }` |
| `POST /api/model-test/run` | 跑测试，见下表 |
| `GET /api/model-test/presets` | 预设库：`{ meta, aliases, builtin[], synced[], files, thinkingLevels }` |
| `POST /api/model-test/presets/sync` | 按当前目录的模型从 models.dev 同步，落 `presets.json` |
| `GET /api/model-test/config` | 读手工覆盖：`{ overrides, file }` |
| `POST /api/model-test/config` | 写手工覆盖：`{ entries: [{ provider, model, params }] }`（`model: '*'` = 整组；三字段全 `null` = 删除） |
| `POST /api/model-test/inspect` | 单模型画像：`{ provider, model }` → `{ preset, live, overrides, params, snippet, thinkingLevels }` |
| `GET /api/model-test/dsh?provider=P&model=M` | 读 **DSH 真实配置**里该模型的字段（`current`）+ 预设建议（`proposed`）+ 逐字段 `diff` + 写入计划 `plan`；`available/reason` 说明这个 provider 能不能写 |
| `POST /api/model-test/dsh` | 把字段写进 DSH 配置：`{ provider, model, mode: 'fill' \| 'replace', revision? }`。`fill` 只补缺失字段，`replace` 用建议值覆盖差异字段 |


> `GET` 与 `POST` 共用 `/api/model-test/config` 一条 route（按 `request.method` 分流）：
> 路由表按 path 去重，同 path 注册两次会被判 `already registered`。

`POST /api/model-test/run` 的入参：

| 字段 | 说明 |
| --- | --- |
| `targets` | `[{ provider, model }]`，精确指定多条（优先级最高） |
| `provider` | 只测该组（不带 `model` 即整组） |
| `provider` + `model` | **只测该组单个模型** |
| `timeoutMs` | 默认 `120000`，clamp 到 1000–180000 |
| `maxTokens` | 默认 `256`，clamp 到 1–1024 |
| `concurrency` | 默认 `3`，clamp 到 1–8 |
| `prompt` | 默认「请连续输出 80 个「测速」…」，trim 后截断 200 字符 |
| `params` | 本次指定 `{ temperature, maxTokens, reasoningEffort }`，优先级最高（`targets[].params` 更细） |
| `targets[].params` | 逐目标的本次参数 |

返回 `{ ok, startedAt, finishedAt, options, catalog, summary, results }`，
`results[]` 每项：

```
{ provider, providerName, model, modelName, ok, status, finishKind, message,
  ttftMs, totalMs, streamMs, outputTokens, usage, tokensPerSecond,
  params: { temperature, maxTokens, reasoningEffort, source, sourceLabel, note, preset }, at }
```

`params` 是**实际发出的**参数与来源（`target | override | group | preset | default`），
`note` 记录安全阀的每一次调整（如「该模型不支持 极高(xhigh)，已改用 中(medium)」）。

`status ∈ ok | error | timeout | aborted`。

错误码：

- `400` + `model-test/no-target` —— 没匹配到任何目标（不空跑）。
- `503` + `model-test/llm-unavailable` —— `ctx.llm.stream` 不可用。
- `400` + `model-test/config-invalid` —— `entries` 不是数组 / 条目非法。
- `400` + `model-test/inspect-invalid` —— `inspect` 缺 `provider` 或 `model`。
- `502` + `model-test/presets-sync-failed` —— models.dev 拉取或匹配失败。
- `500` + `model-test/catalog-failed` / `model-test/run-failed` / `model-test/presets-failed` / `model-test/config-failed` / `model-test/inspect-failed` —— 未预期异常。
- `503` + `model-test/dsh-unavailable` —— `ctx.get('settings')` 不可用（DSH 版本没暴露配置写入通道）。
- `400` + `model-test/dsh-invalid` —— `/dsh` 缺 `provider`（POST 还要求 `model`）。
- `400` + `model-test/dsh-unavailable`（写时）—— 目标 provider 没在配置里声明 `models`（用内置目录 + `modelOverrides` 的形态不能直接写 `models`，会把目录缩成一个模型）。
- `409` + `model-test/dsh-conflict` —— 读完之后 DSH 配置被别人改过，`revision` 已过期；DSH 的 `settings` 用 CAS 拒绝这次写入，不会覆盖别人的改动。重新读取后再写即可。
- `500` + `model-test/dsh-write-failed` —— `settings.mutate` 抛错（DSH 侧已自动回滚原文件）。

### 两组参数的边界（最容易踩的地方）

面板上有两个看起来都在「配参数」的区块，落点完全不同：

| 区块 | 落到哪里 | 影响谁 | 能写 `temperature` 吗 |
| --- | --- | --- | --- |
| `参数`（上半） | 插件自己的 `params.json` | 只影响点「测试」发出的请求 | 能（每次调用参数） |
| `DSH 配置`（下半） | `cordis.patch.yml` 的 `llm-pi-ai.providers.<组>.models[]` | **真实对话** | 不能（DSH 无模型级槽位；`compat.supportsTemperature: false` 只在 `anthropic-messages` 协议下合法） |

`DSH 配置` 区先 `GET /api/model-test/dsh` 读取运行时合并后的真实字段，与预设建议逐字段
diff（`changed` / `before` / `after`），再按 `fill`（只补缺失）或 `replace`（覆盖差异）写入。
写入由 DSH 的 `configEditor` 承担：文件锁、保留 `!!js` 标签与注释、schema 校验、原子写、
Loader 热重载、失败自动回滚；写后立刻回读，`before / after` 是磁盘真值而不是回声。

`compat` 是**逐键**比较、逐键写入的（`set compat.<键>`，只写有差异的键），不会整块替换，
所以内置 catalog 带下来的 `chatTemplateKwargs` / `chatTemplateArgs` 不会被覆盖丢；schema
物化出来的空 `{}` 视为「没配」，既不显示也不算差异。`compat.supportsTemperature` 只对
`anthropic-messages` 协议 offer，面板按 provider 的 `api` 过滤，其它协议不产出这一项。

### 模型组收纳

组默认全部收起：首屏只看到每组一行（箭头 + 组名 + `N 个模型`），点组头任意空白处展开这一组，
再点一次收起。没有全局「收起全部 / 展开全部」按钮——收纳统一走组头。

- 组头里的按钮（`整组参数` / `测试本组`）有自己的动作，点在它们上面不会切换展开状态。
- 收起状态下点 `测试本组` 会先把这一组展开再跑，结果不会藏在收起区里。
- 折叠只影响渲染，不影响「测试本组」——收起的组照样能整组测。

## 为什么只列 `listProviders()` 而不列 `listConfigurableProviders()`

`listConfigurableProviders()` 是**声明目录**，包含休眠（dormant）条目——
它们可能压根没有激活的适配器 route，测了只会得到 `NO_ADAPTER` 一类的噪音错误。

`listProviders()` 是**已注册 route**，也正是 `ctx.llm.stream()` 能路由的集合。
所以目录以它为准；`listConfigurableProviders()` 只用来补显示名（`displayName`）。
