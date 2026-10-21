# 功能案：MCP 管理（components/mcp）

> 状态：已实现
> 关联组件：`components/mcp/`（host.js + client.js + README.md）
> 面板位置：侧边栏「工具集」（order 48）→ 分页「MCP」（order 53）
> 同步维护：本文与 `components/mcp/README.md` 保持一致，改动时请同时更新。

## 1. 要解决的问题

DSH 里每个 MCP server 都是一个 `@deepseek-ai/dsh-mcp-client` 插件实例，配置只能手写进 profile 的
`cordis.patch.yml`：

```yaml
- insert:
    - id: mcp-mastergo
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: mastergo
        transport: stdio
        command: /opt/homebrew/bin/npx
        args: [ '-y', '@mastergo/magic-mcp' ]
        cwd: ~/code
        env: { MG_MCP_TOKEN: 'mg_...', API_BASE_URL: 'https://mastergo.com' }
- id: mcp-mastergo
  disabled: false
```

现状痛点：

1. **没有官方管理界面。** 官方只提供 Settings 里的插件 tab 容器，MCP 的增删改全要手改 YAML。
2. **手改极易改坏。** 该文件 36 KB / 21 个顶层 item，含 14 处 `!!js` 自定义标签、7 处块标量、
   大量历史注释。任何字符串替换式编辑都可能破坏 `!!js` 语义或吞掉注释。
3. **schema 靠猜。** `transport` 是 union（stdio / streamable-http），字段名与默认值没有提示，
   写错一个字段整个 patch 激活失败，且报错指向 Loader 而非具体字段。
4. **看不见运行结果。** server 起没起来、暴露了哪些工具、工具名前缀是什么，只能靠问 agent。
5. **密钥明文躺在配置里。** `env` / `headers` 里是 token，随便截屏或分享配置就泄漏。

## 2. 目标与非目标

### 目标

- 在面板里**列出**当前 profile 的所有 MCP server（含 disabled 的），显示 transport、工具名前缀、
  启停状态、env/header 键名（值默认脱敏）。
- **编辑已有条目**：按 transport 切换字段表单，写入 patch。
- **新增条目**：`id` 默认 `mcp-<serverName>`，写进 patch 的 insert 列表，并同时补一条
  `{ id, disabled:false }` 覆盖行；`id` 与已有条目或覆盖行撞车时返回 409，不覆盖。
- **删除条目**：连条目本体与启停覆盖行一起删掉。
- **启停**：只翻转 `disabled`，不动条目本体。
- **一次性探活**：真连一次 MCP server，报告握手是否成功、协议版本、serverInfo、工具清单与耗时。
- **写后热更**：调 HMR reconcile，不重启进程。

### 非目标

- 不实现 MCP 客户端。运行时永远是官方 `@deepseek-ai/dsh-mcp-client`，本组件只管配置。
- 不代理 MCP 工具调用。工具一旦注册，agent 走官方通道路由。
- 不管 `mcpResources` 的资源注册（官方 `@deepseek-ai/dsh-mcp-resources` 负责）。
- 不改 home 级 patch / `--patch` 覆盖层（只写当前 profile 的文件，并在面板里提示存在更高优先级覆盖）。

## 3. 关键技术约束（决定了方案形状）

| # | 约束 | 依据 | 后果 |
|---|---|---|---|
| C1 | 仓库无 `node_modules`，`import 'yaml'` 直接 `ERR_MODULE_NOT_FOUND` | 本仓被 `link:` 安装到 `~/.dsh/profiles/desktop/node_modules/dsh-toolkit`，ESM 从真实路径向上解析 | 必须用 `createRequire(<profile>/package.json)` 惰性解析 |
| C2 | `settings.mutate` 写不了 mcp 条目 | `mcp-client` 的 Config 是 `z.union([...])`，无 `volatile` 标记；`settings.describe()` 对这些条目直接返回 `[]`，`mutate` 抛 `Plugin entry "x" has no volatile fields` | 不能走 model-test 那条 settings 通道 |
| C3 | `configEditor.edit(entry, change)` 只能改**已存在**条目 | 源码里没有新增/删除 entry 的路径 | 增删必须自己改 YAML |
| C4 | `parseDocument` 能字节级保真 | 实测 36493 字节真实 patch：`parseDocument(before, {customTags:[{tag:'tag:yaml.org,2002:js', resolve:v=>v}]})` → `String(doc)` 与原文完全一致 | 自己改 YAML 是安全的，前提是必须带这个 customTag |
| C5 | `hmr.reconcileProfile([MCP_CLIENT_MODULE])` 必须在 `runExclusive()` 内调用 | 否则抛 `HMR profile reconciliation must run inside runExclusive` | 热更封装成 `hmr.runExclusive(() => hmr.reconcileProfile([MCP_CLIENT_MODULE]))` |
| C6 | HMR 本身 watch 这个 patch 文件 | hmr 构造函数把 `[profile.patchPath, join(profile.home, 'cordis.patch.yml')]` 都挂了 watcher | 写文件后即使不显式 reconcile 也会生效；显式调用只是为了拿 warnings 与确定性 |
| C7 | 新增条目 = 往 patch 序列 append | `applyEntryPatches` 语义：有 `insert` 无 `id` → `data.push(...insert)`；有 `insert` 带 `id` → 往该 group 的 config 里 push | 找第一个 `{insert: [...]}` 顶层项尾部 push；没有就新建一个 |
| C8 | 启停 = 一条纯 `{id, disabled}` 覆盖行 | 无 insert 的 patch 项按 id 匹配目标后直接覆盖 `target[key]` | 没有覆盖行时默认启用 |

### 3.1 文件构成

| 文件 | 作用 |
|---|---|
| `host.js` | HTTP 路由 + YAML 读写（`parseDocument` 保真）+ 表单校验 + 一次性探活；无第三方裸 import，依赖走 `createRequire` 锚点 |
| `client.js` | 浏览器面板源码，由根目录 `node build.mjs` 包装进统一入口 |
| `README.md` | 组件说明，与本功能案同步维护 |

## 4. 数据模型

### 4.1 读：从 patch 提取 server 列表

```
for each topItem in doc.contents.items:
    if topItem 有 'insert' 且是 seq:
        for each item in insert.items:
            if item.get('name') === '@deepseek-ai/dsh-mcp-client':
                记录 { insertIndex, itemIndex, id, config }
    else if topItem.get('id') 不以 insert 开头:
        记录 override[topItem.get('id')] = { disabled, ...其它键 }
```

合并后每个 server 形如：

```ts
type McpServer = {
  entryId: string          // patch 里的 id，如 'mcp-mastergo'
  serverName: string       // config.serverName，MCP 工具名前缀来源
  transport: 'stdio' | 'streamable-http'
  enabled: boolean         // override.disabled 取反；无 override 视为 true
  hasOverride: boolean     // 是否存在显式 {id, disabled} 行
  config: {                // 规范化 + 脱敏后的完整 config
    toolCallTimeoutMs: number      // 默认值已补齐
    failOnStartupError: boolean
    maxInstructionBytes: number
    reconnect: { enabled: boolean, initialDelayMs: number, maxDelayMs: number, maxAttempts: number }
    toolPrefix: string             // `mcp__<serverName>__`
    secretKeys: ('env' | 'headers')[]   // 哪一组字典算密钥
    // stdio: command / args / env / cwd
    // streamable-http: url / headers
  }
}
```

- 读出来的条目按 `entryId` 升序排序（`localeCompare`），不是按 patch 里的书写顺序。
- `publicConfig()` 会把官方默认值补齐后再输出；`secretKeys` 由 transport 决定：
  `streamable-http` 为 `['headers']`，其余为 `['env']`。列表里没有单独的 `envKeys` /
  `headerKeys` / 顶层 `toolPrefix` 字段——都在 `config` 里。
- `config` 里的密钥值默认已脱敏；只有 `reveal=1` 时 `publicConfig()` 才给原文。

### 4.2 写：三种操作对应的 YAML 变更

| 操作 | YAML 变更 | 细节 |
|---|---|---|
| 新增 | 往首个 `{insert:[...]}` 尾部 `insert.items.push(doc.createNode(...))`；再补一条 `{ id, disabled:false }` 覆盖行 | 没有 insert 项则 `doc.contents.items.push(doc.createNode({insert:[...]}))`。`id` 默认 `mcp-<serverName>`；与已有条目或覆盖行撞车返回 409 `mcp/id-exists`，不覆盖 |
| 更新 | `item.set('config', doc.createNode(next))` | 原地改，只替换 `config`，保留该 item 其它键（如 `disabled`）。带 `preserveSecrets:true` 时先从旧 config 搬运真实 `env`/`headers` 再写 |
| 删除 | 从 `insert.items` 里 splice；再从顶层删掉对应 `{id, disabled}` 行 | **删完必须与原文逐字节一致**（Lead 已实测可行）；覆盖行不能留成孤儿 |
| 启停 | 找到 `{id}` 覆盖行 → `row.set('disabled', !enabled)`；没有则 append `{id, disabled}` | 不动 insert 里的条目；效果等同 `pluginManager.setPluginEnabled` |

## 5. 接口契约

所有路由前缀 `/api/mcp/`。响应统一 `{ ok: true, ... }` 或 `{ ok: false, code: 'mcp/<reason>', message }`。

| Method | Path | 请求 | 响应要点 |
|---|---|---|---|
| GET | `/api/mcp/meta` | — | `{ ok, patchPath, profileDir, yamlAvailable, atomicAvailable, mcpClientAvailable, hmrAvailable, mcpEntryCount, patchExists, defaults, limits, dependencyError }` |
| GET | `/api/mcp/servers` | `?reveal=1` 可选 | `{ ok, servers: McpServer[] }`，config 默认脱敏，按 entryId 升序 |
| GET | `/api/mcp/server` | `?id=<entryId>&reveal=1` | `{ ok, server: McpServer }`；`reveal` 缺省时密钥脱敏 |
| POST | `/api/mcp/server` | `{ entryId?, config, enabled?, preserveSecrets? }` | 无 `entryId` 新增 / 有则更新；返回 `{ ok, applied, warnings, note, created, entryId, servers }` |
| DELETE | `/api/mcp/server` | `?id=<entryId>` | 删除条目 + 覆盖行，返回写入后的 `servers` |
| POST | `/api/mcp/server/enabled` | `{ id, enabled }` | 只翻转 disabled，返回写入后的 `servers` |
| POST | `/api/mcp/test` | `{ config }` 或 `{ id }` | 一次性探活，见 5.3 |
| POST | `/api/mcp/reload` | — | 显式 `hmr.runExclusive(() => hmr.reconcileProfile([...]))`，返回 `{ warnings, applied?, note? }` |

写操作的成功响应都带 `{ applied, warnings, note }`：`applied:false` + `note` 表示「配置已写入磁盘，
但 hmr 不可用，需要重启 DSH 生效」，不会假装热更。

### 5.1 表单校验（照抄 mcp-client 的 schema，写错就整轮激活失败）

公共字段：

| 字段 | 类型 | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `serverName` | string | ✅ | — | `/^[A-Za-z0-9_-]{1,32}$/` |
| `transport` | `'stdio' \| 'streamable-http'` | ✅ | — | 决定后半段字段 |
| `toolCallTimeoutMs` | number | | 60000 | 正整数 |
| `failOnStartupError` | boolean | | false | |
| `maxInstructionBytes` | number | | 32768 | 正整数 |
| `reconnect.enabled` | boolean | | true | |
| `reconnect.initialDelayMs` | number | | 500 | 1–2147483647 |
| `reconnect.maxDelayMs` | number | | 30000 | 1–2147483647 |
| `reconnect.maxAttempts` | number | | 10 | 整数 ≥ 1 |

stdio 专属：`command`（必填）、`args`（string[]，默认 `[]`）、`env`（String→String，默认 `{}`，
**算密钥**）、`cwd`（string，默认 `''`，空串 = 继承父进程）。

streamable-http 专属：`url`（必填）、`headers`（String→String，默认 `{}`，**算密钥**）。

校验失败走 `400 mcp/invalid-config`，`message` 里逐条列出所有 issue；不是只报第一个。

### 5.2 工具命名约定（面板要展示给用户）

运行时工具公开名 = `mcp__<serverName>__<rawName>`。DeepSeek 的 function name 限制 64 字符 + 仅
`[A-Za-z0-9_-]`；规范化后若被改动或截断，追加 `_` + 12 位 SHA-256 十六进制：

```js
normalized.slice(0, 64 - 12 - 1) + '_' + hash
```

所以面板里显示的 `toolPrefix` 只是前缀，真实名字可能带哈希后缀。改 `serverName` 会让整批工具名
一起改变；`entryId` 与 `serverName` 是两回事。

### 5.3 探活结果与错误码

探活成功：

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

探活失败**不算路由失败**：HTTP 仍是 200，`probe.ok === false` 且 `probe.error` 给原因（连不上 /
超时 / 依赖不可用）。只有 `id` 不存在才是 404。

| HTTP | code | 触发条件 |
|---|---|---|
| 400 | `mcp/missing-id` | 需要 `id` 的接口没给 |
| 400 | `mcp/invalid-config` | 表单校验不过（serverName 非法 / stdio 缺 command / http 缺 url / 数值非法） |
| 404 | `mcp/not-found` | 该 id 在 patch 里不存在 |
| 404 | `mcp/patch-missing` | profile 的 `cordis.patch.yml` 不存在 |
| 409 | `mcp/id-exists` | 新增时 id 已被占用（含与覆盖行撞车） |
| 409 | `mcp/patch-empty` | patch 为空或顶层不是 YAML 序列 |
| 503 | `mcp/dependency-unavailable` | 解析不到 `yaml` 或 `@deepseek-ai/dsh-atomic-write` |
| 500 | `mcp/meta-failed` / `list-failed` / `read-failed` / `write-failed` / `test-failed` / `reload-failed` | 未预期异常 |

`GET /api/mcp/meta` 是唯一在依赖缺失时不报错的接口：照常 200，只是 `yamlAvailable:false` +
`dependencyError`，面板据此禁用「保存」并显示原因。

### 5.4 面板布局

- **顶部 meta 条**：配置路径 / 条目数 / 能力灯（`✓ yaml ✓ atomic ✓ mcpClient ✓ hmr`）/
  「刷新」/「重新加载插件」。能力缺失显示 `✕`，悬停看 `dependencyError`。
- **左列**：`+ 新增 server` 按钮 + server 列表。每项显示 serverName、已启用 / 已停用徽标、
  transport、entryId、`toolPrefix*`。空态提示条目会写进 profile 的 `cordis.patch.yml`。
- **右列**：详情表单。serverName、transport 下拉、stdio 的 command / args（一行一个）/ cwd，
  或 http 的 url；密钥区默认显示前 4 位 + 「显示密钥」；高级区 `toolCallTimeoutMs` /
  `maxInstructionBytes` / reconnect 三个数值 + 「断线自动重连」「启动失败即报错」两个开关；
  底部「保存 / 测试连接 / 停用·启用 / 删除」。有未保存改动时显示「有未保存改动」，切换条目、
  删除前都会 `confirm`。
- **探活结果**：一张工具表（原始名 / 公开名 / 描述）+ 服务端信息与耗时；失败时显示原因。
- 新增态与编辑态共用一个表单，新增态的路径行显示「保存后写入 …（id 默认为 `mcp-<serverName>`）」。

## 6. 安全设计

1. **密钥默认脱敏。** 列表与详情默认返回脱敏后的 `config`：`env`（stdio）或 `headers`
   （streamable-http）的值按 `前 4 位 + …` 显示，长度 ≤ 8 时只显示 `…`；哪些键算密钥由
   `config.secretKeys` 标出。要看原文必须显式 `reveal=1`。
2. **只写当前 profile。** `patchPath` 来自 `ctx.get('profileContext').patchPath`，不接受任何
   路径参数。用户传 `id` 而非路径。
3. **文件锁 + 原子写 + 权限收紧。**
   `withFileLock(join(profile.dir, 'package.json'))`（照抄官方 config-editor 的锁文件）
   → `writeFileAtomic(patchPath, String(doc), { mode: 0o600 })`。
4. **写后重新解析校验。** 写出前 `parseDocument(String(doc))` 的 `errors.length` 必须为 0，
   否则不落盘并报错。
5. **不做通用文件接口。** 没有任何「读/写任意路径」的路由。
6. **探活禁止泄漏子进程。** `finally` 里必须 `client.close()` + `transport.close()`；
   超时 20s 硬上限。
7. **脱敏值绝不回写磁盘。** 面板默认拿的是脱敏后的字典；用户没点「显示密钥」就保存时，客户端带
   `preserveSecrets:true`，服务端从**旧 config** 搬运真实 `env` / `headers`，不会把 `"abcd…"`
   写进 `cordis.patch.yml`。这条是 `[3b]` 自检里专门断言的核心项。

## 7. 热更与降级

```
写入 patch
  → parseDocument 校验（errors === 0）
  → withFileLock(<profile>/package.json) + writeFileAtomic(patchPath, String(doc), { mode:0o600 })
  → hmr 可用 ? await hmr.runExclusive(() => hmr.reconcileProfile([MCP_CLIENT_MODULE]))
             : 返回 { ok:true, applied:false, note:'需要重启 DSH 生效' }
```

`reconcileProfile` 的参数是 `[MCP_CLIENT_MODULE]`（`'@deepseek-ai/dsh-mcp-client'`），不是无参调用；
且**必须在 `runExclusive` 内**，否则官方抛 `HMR profile reconciliation must run inside runExclusive`。

`ctx.get('hmr')` 可能返回 undefined（精简部署）；`yaml` / `@deepseek-ai/dsh-atomic-write` /
`@modelcontextprotocol/client` 也可能解析不到。三种依赖各自独立降级，互不牵连：

| 依赖 | 用途 | 缺失时 |
|---|---|---|
| `yaml` | patch 读写（`parseDocument` + `!!js` 标签） | 列表 / 写入全部 503；`meta` 报 `yamlAvailable:false` |
| `@deepseek-ai/dsh-atomic-write` | `withFileLock` + `writeFileAtomic` | 写入 503；读取仍可用 |
| `@modelcontextprotocol/client`（+ `/stdio`） | 一次性探活 | 只有 `/api/mcp/test` 报依赖不可用，其余照常 |

依赖解析用 `createRequire` 锚到 profile 的 `package.json`，三个锚点依次尝试：
`ctx.get('profileContext').dir/package.json` → `$DSH_HOME/profiles/desktop/package.json` →
`~/.dsh/profiles/desktop/package.json`。惰性解析 + 缓存，失败只把 `dependencyError` 带进 `meta`，
不会让 host 崩掉；`host.js` 零第三方 / `@deepseek-ai` 裸 import。

> `@modelcontextprotocol/client` 的 stdio transport 在**子路径** `/stdio`（根导出里没有
> `StdioClientTransport`），官方 mcp-client 也这么导入。

面板顶部 meta 条会显示哪个能力缺席（`✓ yaml ✓ atomic ✓ mcpClient ✓ hmr`），缺失的按钮置灰并给出
`dependencyError`。

## 8. 里程碑（对应分析报告里的 P2–P5）

- **P2 只读 + 启停**：`GET /servers`、`GET /server`、`POST /server/enabled`、`POST /reload`。
  最小可用闭环：能看见、能开关。
- **P3 编辑已有条目**：`POST /server`（更新分支）+ 表单校验。
- **P4 新增 / 删除**：`POST /server`（新增分支）、`DELETE /server`。
- **P5 测试连接**：`POST /test` + 结果区。
- **P1 之前已确定的基线**：脱敏、环境 meta、错误码规范。

## 9. 验收标准

1. `node --check components/mcp/host.js`、`node --check components/mcp/client.js` 通过。
2. 在 patch 副本上跑通往返：读取 → 新增 → 读回确认 → 翻转 enabled → 读回确认 → 删除 →
   **与原始文件字节完全一致**。
3. 用 `command: /bin/echo` 的假 server 验证探活：连接失败时返回结构化错误、不卡死、不泄漏子进程。
4. 面板在「工具集」壳里作为第 4 个分页出现（图片生成 → 模型测试 → 通知 → MCP → Skill → 设置），
   order 53，glyph `C`。
5. 根 `node build.mjs` + `node tools/check-client.mjs` 全绿；MCP 的写路径断言在 **`[3b]`** 段：
   - 假 patch 混入 `!!js`、块标量、注释，增删改后原有行一字不动；
   - `meta` 的 `yamlAvailable` / `atomicAvailable` / `mcpEntryCount` 与 patch 一致；
   - 列表按 `entryId` 排序，非 MCP 条目（如 `skill-filesystem`）不算进来；
   - `env` 默认脱敏、`reveal=1` 才给原文；
   - 新增 http 条目落盘；id 撞车 409；删除后 insert 元素与覆盖行都不留；
   - `preserveSecrets:true` 更新后磁盘上的真 token 仍在、其它字段已换新；
   - 启停写 / 翻 `disabled`，不产生孤儿行；
   - 错误分支全部覆盖：409 `id-exists`、404 `not-found` × 3、400 `invalid-config` × 3、400 `missing-id`；
   - hmr 缺席时 `applied:false` + `note`，不假装热更。
6. 自检**绝不触碰**真实 profile 文件：`check-client.mjs` 把 `DSH_TOOLKIT_DATA` 等指到沙箱，`[3b]`
   在沙箱里造假 patch 完成真实增删改启停，跑完清理临时目录。

## 10. 已知限制

- 不改 home 级 `~/.dsh/cordis.patch.yml`（本机不存在）；若用户手工创建了它，会盖过 profile 写入，
  此时官方 config-editor 会抛 `overridden by a home patch or command-line overlay`，本组件透传该错误。
  本组件只做文件级写入，这类冲突最终要看 `hmr` 的 `warnings`。
- **hmr 不可用时不会自动重启**：`applied:false` + `note` 是明确提示，需要用户手动重启 DSH。
- **探活会真的启动子进程**（stdio）或打网络（http）：不要把不可信的 `command` / `url` 粘进面板。
- 不支持 `mcp-resources` 相关的 server 注册表（那是另一个服务的运行时状态）。
- 探活是**独立连接**，不是复用运行中实例——所以它能验证「这个配置能不能连上」，
  但验证不了「当前进程里这个实例是不是活着」。后者要看 `pluginInventory` 的 `fiberPhase`。
- **`!!js` 标签只做原样透传**：本组件从不求值它们，也不会新增 `!!js` 值。
- **条目 id 与 serverName 是两回事**：id 是 patch 里的 Loader entry id（可任意，默认
  `mcp-<serverName>`），serverName 才是工具名前缀的来源；改 serverName 会让工具名整批改变。
- 删除操作不做回收站；删除即从 patch 移除（git 可恢复，前提是用户把 profile 纳入了版本管理）。
