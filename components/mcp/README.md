# 组件五：mcp（MCP 管理面板）

解决一个具体问题：DSH 里每个 MCP server 都是 `@deepseek-ai/dsh-mcp-client` 的一个**插件实例**，
多 server 靠 profile 的 `cordis.patch.yml` 里多条 `insert` 承载。**官方没有任何图形化入口**，
想加一个 MCP server 只能手改 YAML —— 而这份 YAML 里混着 `!!js` 标签、块标量与大量注释，
手写字符串替换必错，`loader` 自己写回又会丢掉所有注释。

本组件把这件事补上：列 / 增 / 改 / 删 / 启停 / 一次性探活，**全部基于 yaml 的 parseDocument 保真写入**。

面板「MCP」（侧边栏「工具集」→ 分页「MCP」，order 53）。

## 能力

| 能力 | 说明 |
| --- | --- |
| 列出全部 server | 扫 patch 里所有 `name: '@deepseek-ai/dsh-mcp-client'` 的条目，连同 `{id, disabled}` 覆盖行一起读；`enabled` / `transport` / `toolPrefix` 一并推导 |
| 新增 | 面板填表 → 写到 patch 的 `insert` 数组尾部，同时补一条 `{id, disabled:false}` 覆盖行。id 默认 `mcp-<serverName>`，撞车返回 409 |
| 编辑 | 只替换该条目的 `config` 键，条目上其它键（如果有）原样保留 |
| 删除 | `insert` 里的元素与对应覆盖行**一起删**，不留孤儿 `disabled` 行 |
| 启停 | 改覆盖行的 `disabled`；没有覆盖行就补一条。等同于 `pluginManager.setPluginEnabled` 的效果 |
| 一次性探活 | 用 `@modelcontextprotocol/client` 另起一条连接（连上 → 列工具 → 断开），**不碰运行中的实例、不改配置**，20 秒硬超时 |
| 密钥脱敏 | `env`（stdio）/ `headers`（http）默认只给前 4 位 + `…`；要原文必须显式 `reveal=1` |
| 热更 | 写完调 `hmr.runExclusive(() => hmr.reconcileProfile([...]))`；hmr 缺席时**如实回报「需重启」**，不假装成功 |

## 文件

| 文件 | 作用 |
| --- | --- |
| `host.js` | HTTP 路由 + YAML 读写（parseDocument 保真）+ 表单校验 + 探活（无第三方裸 import，依赖走 `createRequire` 锚点） |
| `client.js` | 浏览器面板源码（由根目录 `node build.mjs` 包装进统一入口） |
| `README.md` | 本文件 |

## 为什么必须自己改 YAML

官方的三条写入通道，**没有一条能覆盖「增 / 删 MCP 条目」**：

| 通道 | 能做什么 | 为什么不够 |
| --- | --- | --- |
| `settings.mutate(ns, ops)` | 改**已存在** entry 的 volatile 字段 | mcp-client 的 Config 是 `z.union([stdio, streamable-http])`，源码里没有 `volatile` 标记 → `settings.describe()` 对它直接返回 `[]`，`mutate` 抛 `Plugin entry "<ns>" has no volatile fields` |
| `configEditor.edit(entry, change)` | 改**已存在** entry 的 config | 源码里没有新增 / 删除 entry 的路径 |
| `pluginManager.setPluginEnabled(id, enabled)` | 翻 `disabled` | 写不了 config，也建不出新条目 |

所以增删改启停全部由本组件自己操作 YAML。**为什么这样是安全的**：用 `yaml` 的 `parseDocument`
并注册 `!!js` 自定义标签（`tag:yaml.org,2002:js`，resolve 原样返回字符串），对该文件可做到
**字节级往返**。已在真实 profile（36493 字节、21 个顶层 item、14 处 `!!js`、7 处块标量、
大量注释）上实测：

- `parseDocument(before)` → `String(doc)` **与 before 完全一致**；
- 新增一条再删掉它，结果同样与原文逐字节相同；
- 改 `disabled` 前后行数不变。

这正是官方 `config-editor` / `plugin-manager` 内部用的同一套姿势。

写文件流程也与官方一致：

```
withFileLock(<profile>/package.json)                    ← 锁整个 profile
  → writeFileAtomic(patchPath, String(doc), {mode:0o600})  ← 原子替换
  → 重新 parseDocument 校验 errors === 0                   ← 不合法绝不落盘
→ hmr.runExclusive(() => hmr.reconcileProfile([...]))    ← 热更
```

`reconcileProfile` **必须在 `runExclusive` 内调用**，否则官方抛
`HMR profile reconciliation must run inside runExclusive`。

## 数据模型

patch 里一条 MCP server 的形状（官方 `insert` 语义）：

```yaml
- insert:
    - id: mcp-mastergo                                   # 条目 id，面板用它定位
      name: '@deepseek-ai/dsh-mcp-client'                # 只认这个 name
      config:                                            # 官方 Config（schemastery union）
        transport: stdio
        serverName: mastergo
        command: /opt/homebrew/bin/npx
        args: ['-y', '@mastergo/magic-mcp']
        env: { MG_MCP_TOKEN: 'mg_…' }
        cwd: ~/code
    - id: mcp-godot
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        transport: streamable-http
        serverName: godot
        url: https://example.com/mcp
        headers: { Authorization: 'Bearer …' }
- id: mcp-mastergo                                       # 覆盖行：只管启停
  disabled: false
- id: mcp-godot
  disabled: true
```

`GET /api/mcp/servers` 的单条结构：

```jsonc
{
  "entryId": "mcp-mastergo",
  "serverName": "mastergo",
  "transport": "stdio",
  "enabled": true,
  "hasOverride": true,              // patch 里有没有显式 {id, disabled} 行
  "config": {
    "transport": "stdio",
    "serverName": "mastergo",
    "command": "/opt/homebrew/bin/npx",
    "args": ["-y", "@mastergo/magic-mcp"],
    "env": { "MG_MCP_TOKEN": "mg-s…" },   // 默认脱敏
    "cwd": "~/code",
    "toolCallTimeoutMs": 60000,
    "failOnStartupError": false,
    "maxInstructionBytes": 32768,
    "reconnect": { "enabled": true, "initialDelayMs": 500, "maxDelayMs": 30000, "maxAttempts": 10 },
    "toolPrefix": "mcp__mastergo__",
    "secretKeys": ["env"]
  }
}
```

### 字段规则（照抄官方 Config）

| 字段 | stdio | streamable-http | 规则 |
| --- | --- | --- | --- |
| `transport` | ✓ | ✓ | 必须是 `stdio` / `streamable-http` |
| `serverName` | 必填 | 必填 | `/^[A-Za-z0-9_-]{1,32}$/`，决定工具名前缀 |
| `command` | 必填 | — | 可执行文件路径或命令名 |
| `args` | `[]` | — | 字符串数组 |
| `env` | `{}` | — | 字符串字典，**算密钥** |
| `cwd` | `''` | — | 空串 = 继承父进程 |
| `url` | — | 必填 | MCP endpoint |
| `headers` | — | `{}` | 字符串字典，**算密钥** |
| `toolCallTimeoutMs` | 60000 | 60000 | 正整数 |
| `failOnStartupError` | `false` | `false` | 启动失败是否让插件报错 |
| `maxInstructionBytes` | 32768 | 32768 | 正整数 |
| `reconnect.enabled` | `true` | `true` | 断线重连总开关 |
| `reconnect.initialDelayMs` | 500 | 500 | 1–2147483647 |
| `reconnect.maxDelayMs` | 30000 | 30000 | 1–2147483647 |
| `reconnect.maxAttempts` | 10 | 10 | ≥ 1 |

## 工具命名约定

运行时公开工具名是 `mcp__<serverName>__<rawName>`。DeepSeek 的 function-name 上限 64 字符且只允许
`[A-Za-z0-9_-]`，所以官方在规范化后被改动 / 截断时会追加 **12 位 SHA-256 十六进制**：

```js
normalized.slice(0, 64 - 12 - 1) + '_' + hash
```

面板展示的 `toolPrefix`（`mcp__<serverName>__`）只是**前缀**，实际工具名可能带哈希后缀。

## 路由

统一前缀 `/api/mcp/`，与 `/api/toolkit/*`、`/api/model-test/*`、`/api/skill/*` 不冲突。
同 path 的 GET/POST 与 DELETE 分成两次注册，handler 内按 `request.method` 分流。

成功响应 `{ ok: true, ... }`；失败统一 `{ ok: false, code: 'mcp/<reason>', message }` + 4xx/5xx。

| 方法与路径 | 说明 |
| --- | --- |
| `GET /api/mcp/meta` | `{ ok, patchPath, profileDir, yamlAvailable, atomicAvailable, mcpClientAvailable, hmrAvailable, mcpEntryCount, patchExists, defaults, limits, dependencyError }` |
| `GET /api/mcp/servers` | 全部 server；`reveal=1` 才给密钥原文 |
| `GET /api/mcp/server?id=` | 单条；`reveal=1` 同上 |
| `POST /api/mcp/server` | 无 `entryId` = 新增（id 默认 `mcp-<serverName>`）；带 `entryId` = 更新。体：`{ entryId?, config, enabled?, preserveSecrets? }` |
| `DELETE /api/mcp/server?id=` | 删除条目 + 对应覆盖行 |
| `POST /api/mcp/server/enabled` | `{ id, enabled }` |
| `POST /api/mcp/test` | `{ id }` 或 `{ config }` → 一次性探活 |
| `POST /api/mcp/reload` | 手动触发 `hmr.reconcileProfile` |

写操作的成功响应都带 `{ applied, warnings, note }`：`applied:false` + `note` 表示
「配置已写入磁盘，但 hmr 不可用，需要重启 DSH 生效」。

### 探活结果

```jsonc
{
  "ok": true,
  "probe": {
    "ok": true,
    "transport": "stdio",
    "serverName": "mastergo",
    "serverInfo": { "name": "…", "version": "…" },
    "protocolVersion": "2025-06-18",
    "capabilities": { "tools": {} },
    "toolCount": 12,
    "tools": [{ "name": "get_dsl", "description": "…", "publicName": "mcp__mastergo__get_dsl" }],
    "durationMs": 1834,
    "startedAt": 1700000000000
  }
}
```

探活失败**不算路由失败**：HTTP 仍是 200，`probe.ok === false` 且 `probe.error` 给原因
（连不上 / 超时 / 依赖不可用）。只有 `id` 不存在才是 404。

### 错误码

| HTTP | code | 触发条件 |
| --- | --- | --- |
| 400 | `mcp/missing-id` | 需要 `id` 的接口没给 |
| 400 | `mcp/invalid-config` | 表单校验不过（serverName 非法 / stdio 缺 command / http 缺 url / 数值非法），`message` 里逐条列出 |
| 404 | `mcp/not-found` | 该 id 在 patch 里不存在 |
| 404 | `mcp/patch-missing` | profile 的 `cordis.patch.yml` 不存在 |
| 409 | `mcp/id-exists` | 新增时 id 已被占用（含与覆盖行撞车） |
| 409 | `mcp/patch-empty` | patch 为空或顶层不是 YAML 序列 |
| 503 | `mcp/dependency-unavailable` | 解析不到 `yaml` 或 `@deepseek-ai/dsh-atomic-write` |
| 500 | `mcp/meta-failed` / `list-failed` / `read-failed` / `write-failed` / `test-failed` / `reload-failed` | 未预期异常 |

`mcp/meta` 是唯一在依赖缺失时**不报错**的接口：它照常返回 200，只是
`yamlAvailable:false` + `dependencyError`，面板据此把「保存」按钮禁掉并显示原因。

## 安全设计

- **路由只接受 patch 条目 id，不接受任何文件路径**。`patchPath` 一律来自
  `ctx.get('profileContext').patchPath`，没有「读任意 YAML」这种通用接口。
- **密钥默认不出主机**：`env` / `headers` 的值默认脱敏（长度 ≤ 8 只给 `…`，否则前 4 位 + `…`）。
  面板要原文必须点「显示密钥」，那才会发一次 `reveal=1`。
- **脱敏值不会写回磁盘**：面板默认拿的是脱敏后的字典；用户没点「显示密钥」就保存时，客户端带
  `preserveSecrets: true`，服务端从**旧 config** 搬运真实 `env` / `headers`，绝不把 `"abcd…"` 写进
  `cordis.patch.yml`。这条是 `[3b]` 自检里专门断言的核心项。
- **写入前自校验**：`String(doc)` 之后重新 `parseDocument`，`errors` 非 0 直接抛错，一个字节都不落。
- **原子写 + 文件锁**：`withFileLock(<profile>/package.json)` + `writeFileAtomic(..., {mode:0o600})`，
  不用裸 `writeFile`（半截 YAML 会让整轮 Loader 回滚）。
- **探活是独立连接**：连上 → `listTools()` → `finally` 关 `client` 与 `transport`，20 秒硬超时
  （`Promise.race`）。不影响正在运行的 mcp-client 实例，也不改配置。

## 依赖解析（为什么没有 `import 'yaml'`）

本仓库被 link 安装到 `~/.dsh/profiles/desktop/node_modules/dsh-toolkit`，ESM 从**真实路径**向上解析
依赖，仓库自身没有 `node_modules`，裸 `import 'yaml'` 直接 `ERR_MODULE_NOT_FOUND`。

所以 `host.js` 里用 `createRequire` 锚到 profile 的 `package.json` 再 `req()`：

1. `ctx.get('profileContext').dir` + `/package.json`
2. `$DSH_HOME/profiles/desktop/package.json`
3. `~/.dsh/profiles/desktop/package.json`

三个依赖各自独立降级，互不牵连：

| 依赖 | 用途 | 缺失时 |
| --- | --- | --- |
| `yaml` | patch 读写（parseDocument + !!js 标签） | 列表 / 写入全部 503；`meta` 报 `yamlAvailable:false` |
| `@deepseek-ai/dsh-atomic-write` | `withFileLock` + `writeFileAtomic` | 写入 503；读取仍可用 |
| `@modelcontextprotocol/client`（+ `/stdio`） | 一次性探活 | 只有 `/api/mcp/test` 报「依赖不可用」，其余照常 |

惰性解析 + 缓存，解析失败只把 `dependencyError` 带到 `meta` 里，**不会让 host 崩掉**。
整个 `host.js` 零 `@deepseek-ai` / 第三方裸 import。

> 注意 `@modelcontextprotocol/client` 的 **stdio transport 在子路径**
> （`@modelcontextprotocol/client/stdio`），根导出里没有 `StdioClientTransport`。
> 官方 mcp-client 也是这么导入的。

## 面板

- **顶部 meta 条**：配置路径 / 条目数 / 能力灯（`✓ yaml ✓ atomic ✓ mcpClient ✓ hmr`）/
  「刷新」/「重新加载插件」。能力缺失显示 `✕`，悬停看 `dependencyError`。
- **左列**：`+ 新增 server` 按钮 + server 列表。每项显示 serverName、已启用 / 已停用徽标、
  transport、entryId、`toolPrefix*`。空态文案提示条目会写进 profile 的 `cordis.patch.yml`。
- **右列**：详情表单。serverName、transport 下拉、stdio 的 command / args（一行一个）/ cwd 或
  http 的 url；密钥区默认显示前 4 位 + 「显示密钥」；高级区 `toolCallTimeoutMs` /
  `maxInstructionBytes` / reconnect 三个数值 + 「断线自动重连」「启动失败即报错」两个开关；
  底部「保存 / 测试连接 / 停用·启用 / 删除」。有未保存改动时显示「有未保存改动」，
  切换条目、删除前都会 `confirm`。
- **探活结果**：一张工具表（原始名 / 公开名 / 描述）+ 服务端信息与耗时；失败时显示原因。
- 新增态与编辑态共用一个表单，新增态的路径行显示「保存后写入 …（id 默认为 `mcp-<serverName>`）」。

## 验收方式

组件不单独带测试脚本，真实的增删改启停断言在 `tools/check-client.mjs` 的 **`[3b]`** 段里
（用沙箱里的假 patch，**绝不碰 `~/.dsh`**）。手工验：

```bash
# 1) 语法
node --check components/mcp/host.js
node --check components/mcp/client.js

# 2) 全量自检（含 [3b]：真实 patch 的增删改启停 + 字节级保真）
node build.mjs && node tools/check-client.mjs
```

`[3b]` 覆盖的点：

- 假 patch 里混入 `!!js` 标签、块标量、注释 → 增删改之后**原有行一字不动**（保真核心断言）。
- `meta` 的 `yamlAvailable` / `atomicAvailable` / `mcpEntryCount` 与 patch 一致。
- 列表按 `entryId` 排序，`skill-filesystem` 这类非 mcp 条目不会被算进来。
- `env` 默认脱敏（含前缀、不含原文）；`reveal=1` 才给原文。
- 新增 http 条目 → 落盘；id 撞车 409；删除后 insert 元素与覆盖行都不留。
- 更新时 `preserveSecrets:true` → 磁盘上的真 token 仍在，其它字段已换新。
- 启停写 / 翻 `disabled`，不产生孤儿行。
- 7 条错误分支（404 × 3、400 × 3、missing-id）。
- hmr 缺席时 `applied:false` + `note`，**不假装热更**。

## 已知限制

- **只能管 `cordis.patch.yml`**：如果将来出现 home 级 patch（`~/.dsh/cordis.patch.yml`）或
  `--patch` 命令行覆盖，它们会盖过 profile 的写入。官方 `config-editor` 的做法是写完后重新 compose
  比对，不一致就抛 `overridden by a home patch or command-line overlay`；本组件只做文件级写入，
  这类冲突需要看 `hmr` 的 `warnings`。
- **hmr 不可用时不会自动重启**：`applied:false` + `note` 是明确提示，需要用户手动重启 DSH。
- **探活会真的启动子进程**（stdio）或打网络（http）：不要把不可信的 `command` / `url` 粘进面板。
- **不显示运行中实例的实时状态**：面板读的是**磁盘上的配置**，不是运行中 instance 的连接状态。
  想知道连没连上，用「测试连接」。
- **`!!js` 标签只做原样透传**：本组件从不求值它们，也不会新增 `!!js` 值。
- **条目 id 与 serverName 是两回事**：id 是 patch 里的 Loader entry id（可任意，默认 `mcp-<serverName>`），
  serverName 才是工具名前缀的来源。改 serverName 会让工具名整批改变。
