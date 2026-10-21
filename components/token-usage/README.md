# 组件二：token-usage（Token 用量与成本面板）

统计 DSH **全部会话**（含 subagent）的 Token 用量与成本。

## 能力

- 面板默认「今天」，可切 `今天 / 7 天 / 30 天 / 90 天 / 全部`；15 秒轮询
- 合并 live session、持久化 session 和 subagent session；持久化会话按 revision 增量缓存
- 双 Y 轴趋势图、模型分布、会话明细、计价明细
- **没有侧边栏入口**（用户要求隐藏；面板 key 仍是 `token-usage`，`ctx.layout.selectPanel('token-usage')` 可直达，
  目前只注册 `main` 槽位，没有登记进 toolkit 的共享注册表——要在分页里露出，需要先补一次注册）

## 文件

- `host.js` — 统计与缓存 + 经 `ctx.connection.fetch.register` 注册路由
  （`GET/POST /api/token-usage`、`/summary`、`/pricing`；会话事件触发缓存失效）
- `client.js` — 浏览器面板源码。**不直接部署**：由根目录 `node build.mjs`
  包装进统一入口 `client.js`。
- `pricing-defaults.mjs` — 内置价目表（每百万 Token，美元，79 个模型快照）。
  手工调价直接改本文件；改完记得同步升 `host.js` 导入行的 `?v=` 与 live-entry
  的版本（见根 README 的两条铁律）。

## 计价（三层合并 + 图片生成按张，自带价目表）

- **内置打底**：`pricing-defaults.mjs` 随插件分发，永远可用。
- **插件自有价目文件**：`$DSH_HOME/dsh-toolkit/token-usage/pricing.json`
  （`TOKEN_USAGE_PRICING` 环境变量可改路径）。两层内容，条目带 `source` 区分：
  - `source: 'user'` — 面板里手工添加/修改的价目，**同步永不覆盖**；
  - `source: 'models-dev'` — models.dev 同步写入，下次同步刷新。
  - `deletedModelIds` 删除墓碑：删过的条目（含内置表里的）不会被同步复活。
- **图片生成（image-gen）按张计费**：`$DSH_HOME/dsh-toolkit/image-gen/config.json` 里配了
  `pricePerImage`（美元/张）的生图模型，会作为价目条目出现在计价明细
  （token 单价显示 `—`，按张单价标在显示名旁）；每次生成落一条记录到
  `$DSH_HOME/dsh-toolkit/image-gen/usage.jsonl`，scan 时合并为伪会话行「图片生成」，
  成本 = 当前每张单价 × 张数（与 token 同哲学：当前价 × 历史用量）。
- **合并优先级**：用户手工 > models.dev 同步 > 内置表；图片生成条目最后覆盖同名。
  文件损坏/缺失只降级内置并标错。
- **models.dev 同步**：面板「⟳ 同步 models.dev」按钮 → host 拉取
  `https://models.dev/api.json`（15s 超时），过滤非文本模型（deprecated、audio、
  embedding、image、tts 等），ID 归一化（剥 `provider/` 前缀、`:变体`、`@`→`-`、
  `[1m]` 后缀，转小写），同 ID 取最新发布；规则见 `host.js` 的 `flattenModelsDev()`。
  匹配**只取精确 + 日期快照后缀**（如 `-20250514` / `-latest`），家族变体
  （`glm-x-flash-eu`、`grok-4.7` 这类）不再被前缀扩散带进来。
- **只看在用**：计价明细默认只显示最近一次 scan 实际用过的模型
  （`GET /api/token-usage/pricing` 返回 `used`），可一键切回全量。
- **路由**：`GET /api/token-usage/pricing` 返回 entries + `source`/`builtin`/
  `overrides`/`sync`/`used`；`POST` 同一路由 `{action: 'upsert'|'delete'|'sync'}`。
- 请求侧模型名未命中（精确 → 别名 `MODEL_ALIASES` → 最长前缀）成本仍记 0，
  请求标「未配价」。
- **数据目录**：按组件分目录放在 `$DSH_HOME/dsh-toolkit/` 下（`DSH_HOME` 未设时回退 `~/.dsh`，
  本机即 `~/.dsh/dsh-toolkit/`），可用 `DSH_TOOLKIT_DATA` 整体换到别处。本组件的价目文件在
  `token-usage/pricing.json`；生图配置与计费记录属于 image-gen，在 `image-gen/config.json` 与
  `image-gen/usage.jsonl`（本组件只读它们来做成本合并）。
- **没有自动迁移**：插件不再自动搬老位置的数据，升级后按根 README「没有自动迁移」一节手工 `mv`；
  工具集 →「设置」分页可以核对价目文件的实际落点。
