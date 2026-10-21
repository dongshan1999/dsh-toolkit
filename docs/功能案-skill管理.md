# 功能案：Skill 管理（components/skill）

> 状态：已实现
> 关联组件：`components/skill/`（host.js + client.js + README.md）
> 面板位置：侧边栏「工具集」（order 48）→ 分页「Skill」（order 54）
> 同步维护：本文与 `components/skill/README.md` 保持一致，改动时请同时更新。

## 1. 要解决的问题

DSH 的 skill 是磁盘上的 Markdown 文件（`SKILL.md` 或 `<name>.md`），由
`@deepseek-ai/dsh-skill-filesystem` 扫描六个根、按 rank 合并。官方**没有任何管理界面**：
新建要手写 frontmatter，改错一个字就被静默丢弃，且**看不到为什么被丢**。

现状痛点：

1. **静默失败。** `parseSkillFile` 解析失败只 `ctx.logger.warn` 然后跳过，用户在会话里
   只感觉「这个 skill 好像没生效」，日志里也未必看得到。
2. **frontmatter 规则不直观。** `name` 必须 kebab-case；旧键 `modelInvocable` /
   `disableModelInvocation` / `userInvocable` 会被**明确拒绝**（报
   `frontmatter field "X" is unsupported; use "Y"`），但从错误里爬回来需要翻源码。
3. **优先级看不见。** 六个根 rank 不同，同名 skill 只认 rank 最小的那个。用户在自己项目里
   写了一个同名 skill，发现改了不生效，实际是被 `~/.dsh/skills` 或 bundled 挡住了。
4. **启停靠改两个布尔。** 想让某个 skill 不再被模型自动调用，得记住是
   `disable-model-invocation: true`（不是 `modelInvocable: false`）。
5. **bundled 与 user 混在一起。** 看不出哪个能改、哪个只能看。

## 2. 目标与非目标

### 目标

- **列出**所有 skill（跨六个根），按 root 分组，显示 name / 来源 / 有效性 / 两个 invocation 开关 /
  被遮蔽情况。
- **坏文件也要列出来**，并给出**具体原因**（缺 frontmatter、name 缺失、name 非法含实际值、
  description 缺失、用了旧键……）。
- **查看与编辑**原文（保留 frontmatter 注释与键顺序）。
- **新建**（目录型 `SKILL.md` 或文件型 `<name>.md`）。
- **删除**（目录里有资源文件时要二次确认）。
- **切换** `disable-model-invocation` / `user-invocable`，只动这两个键。
- **只读根明确标注**（bundled / user-agents / custom），不提供写按钮。
- **交叉校验**：磁盘扫描是真相，再用 `ctx.get('skills').snapshot()` 的官方计数做旁证；官方认到、
  磁盘没有的条目进 `discrepancies.missingOnDisk`。

### 非目标

- 不实现 skill 运行时。注册与解析永远走官方 `skills` 服务 + `skill-filesystem` provider。
- 不改 agent preset 里的 skill 引用。
- 不做 skill 内容生成 / AI 改写（那是另一个功能）。
- 不动 `~/.dsh/skills` 以外的用户数据。

## 3. 根与优先级（照抄官方 `roots(cwd)`）

| rank | rootId | 路径 | source | 可写 | 说明 |
|---|---|---|---|---|---|
| 100 | `project-dsh` | `<projectRoot>/.dsh/skills` | `project-dsh` | ✅ | 项目级，随仓库走 |
| 200 | `project-agents` | `<projectRoot>/.agents/skills` | `project-agents` | ✅ | 项目级，给其它 agent 工具共用 |
| 300 | `custom` / `custom-2`… | profile 里的 `customSkillDirs`（同时容忍 `skillDirs`、数组或逗号串） | `custom` | ❌ 只读 | 自定义根，多值时依次编号 |
| 400 | `user-dsh` | `<dshHome>/skills`（默认 `~/.dsh/skills`） | `user-dsh` | ✅ | 用户级 |
| 500 | `user-agents` | `~/.agents/skills` | `user-agents` | ❌ 只读 | 用户级给其它 agent 工具 |
| 600 | `bundled` | app.asar 内 `@deepseek-ai/dsh-agent-preset/skills` | `bundled` | ❌ 只读 | 应用内置 |

- **rank 小者优先**，同名 skill 只认 rank 最小那个；被遮蔽的在列表里标 `shadowedBy: { rootId, path }`。
- `projectRoot`：从 cwd 向上找最近的含 `.git` 或 `.dsh` 的目录，**找不到就用 cwd 本身**。
  cwd 取 `profileContext.cwd`（或 `.dir`），再回退 `process.cwd()`。
- `dshHome`：环境变量 `DSH_HOME`（**空白视为未设**，支持 `~`）→ `~/.dsh`。
- 缺失的根不报错，标 `exists:false`，面板显示「这里还没有」；`user-dsh` 不存在时面板提供「创建」入口。
- bundled 根路径可用环境变量 `DSH_BUNDLED_SKILLS` 显式指定（测试用）；找不到时 `path` 为空串、
  `exists:false`。
- 根下一层跳过 `.system` 目录；目录型 skill 的资源文件照扫进 `resources` 清单。

### 3.1 文件构成

| 文件 | 作用 |
|---|---|
| `host.js` | HTTP 路由 + 磁盘扫描 + frontmatter 校验 + 原子写（无第三方裸 import，依赖走 `createRequire` 锚点） |
| `client.js` | 浏览器面板源码（由根目录 `node build.mjs` 包装进统一入口） |
| `README.md` | 组件说明，与本功能案同步维护 |

## 4. 目录与文件布局

```
<root>/<skill-name>/SKILL.md          ← 目录型（推荐，可带资源文件）
<root>/<skill-name>.md                ← 文件型（仅根下一层）
```

资源文件放在 skill 目录里，官方把它们挂到 `resourceBase: { kind:'directory', path }`。

## 5. frontmatter 规则（必须与官方逐条一致）

文件必须以独立一行 `---` 起始（**容忍 BOM 与 CRLF**），YAML 后独立一行 `---` 结束，之后是正文。

| 键 | 必填 | 类型 | 规则 |
|---|---|---|---|
| `name` | ✅ | string | `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`（kebab-case） |
| `description` | ✅ | string | 非空 |
| `whenToUse` | | string | **非字符串直接报错** |
| `metadata` | | object | **数组或标量报错** |
| `disable-model-invocation` | | boolean | `modelInvocable = (值 !== true)` |
| `user-invocable` | | boolean | `userInvocable = (值 !== false)` |

任何一条不过，官方就静默丢弃整个 skill；面板把它显示为「未生效」并列出原因。

**拒绝的旧键**（出现即文件被丢弃）：

| 旧键 | 应改为 | 语义差异 |
|---|---|---|
| `modelInvocable` | `disable-model-invocation` | **布尔语义相反**：`true` 表示允许模型调用，等价于省略 `disable-model-invocation` |
| `disableModelInvocation` | `disable-model-invocation` | 改成 kebab-case |
| `userInvocable` | `user-invocable` | 改成 kebab-case |

官方读取时对布尔还容忍真布尔、`1` / `0`、以及大小写不敏感的 `true` / `false` / `yes` /
`no` / `on` / `off`；**认不出来的一律判「必须是布尔（true / false）」，整条失效**。面板写入时
一律写真布尔，并在校验时给出「应写真布尔」的提示。

最终 invocation：

```js
modelInvocable = disableModelInvocation !== true
userInvocable   = userInvocable !== false
```

`disabled` = 两个都是 false（模型不调用、用户也不调用）。

结构化保存用 `schema: 'yaml-1.1'` 序列化，所以 `description: "no"`、`whenToUse: "yes"` 这类值
会被加引号，读回来仍是字符串，不会退化成布尔。

只写需要的键：`modelInvocable:false` → `disable-model-invocation: true`；
`userInvocable:false` → `user-invocable: false`；两者为 `true` 时省略对应键，保持文件干净。

## 6. 接口契约

所有路由前缀 `/api/skill/`。响应统一 `{ ok: true, ... }` / `{ ok: false, code: 'skill/<reason>', message }`。
**同 path 的 GET / DELETE 必须合并成一条注册**（同 path 注册两次会判 `already registered`），
handler 内按 `request.method` 分流。

| Method | Path | 请求 | 响应要点 |
|---|---|---|---|
| GET | `/api/skill/meta` | — | `{ ok, dshHome, cwd, projectRoot, roots:[{ id, path, source, rank, writable, exists, label }], yamlAvailable, atomicAvailable, officialAvailable, dependencyError }` |
| GET | `/api/skill/list` | — | `{ ok, dshHome, cwd, projectRoot, roots, skills:[…], counts:{ total, valid, invalid, shadowed }, official:{ available, complete, count, names }, discrepancies:{ missingOnDisk } }` |
| GET | `/api/skill/one` | `?root=<rootId>&name=<skill>` | `{ ok, name, rootId, source, path, relativePath, kind, writable, raw, parsed:{ name, description, whenToUse, metadata, modelInvocable, userInvocable }, body, frontmatterText, valid, issues, legacy:[{ key, replacement }], resources, size, mtimeMs }` |
| DELETE | `/api/skill/one` | `?root=&name=[&force=1]` | 目录型删整个目录；有资源文件且无 `force` 时 409 `skill/has-resources` 并回 `resources` 清单 |
| POST | `/api/skill/save` | `{ root, name, mode:'raw'\|'structured', raw?, fields?:{ name, description, whenToUse, metadata, modelInvocable, userInvocable }, body? }` | → `{ ok, path, rootId, name, mode, bytes }`；校验失败**不落盘** |
| POST | `/api/skill/create` | `{ root, name, description, whenToUse?, body?, kind:'directory'\|'file' }` | → `{ ok, path, rootId, name, kind }` |
| POST | `/api/skill/toggle` | `{ root, name, modelInvocable?, userInvocable? }` | → `{ ok, path, rootId, name, parsed, valid, issues }`；只改两个布尔 |
| POST | `/api/skill/sync` | — | 调官方 `skills.snapshot()`，返回 `{ ok, official:{ available, complete, count, names, error } }` |

### 6.1 结构化写入生成的文本

```markdown
---
name: my-skill
description: 一句话说明
whenToUse: 可选的触发场景
metadata:
  owner: me
disable-model-invocation: true
---

正文（trim 后）
```

键顺序固定：`name, description, whenToUse, metadata, disable-model-invocation, user-invocable`。

### 6.2 列表项与面板布局

`skills[]` 每一项：

```jsonc
{
  "name": "interview-me",
  "path": "~/.dsh/skills/interview-me/SKILL.md",
  "rootId": "user-dsh",
  "source": "user-dsh",
  "rank": 400,
  "relativePath": "interview-me/SKILL.md",
  "kind": "directory",            // directory | file | broken
  "writable": true,
  "valid": true,
  "description": "…",
  "whenToUse": null,
  "modelInvocable": true,
  "userInvocable": true,
  "disabled": false,
  "shadowedBy": null,             // { rootId, path }
  "error": null,
  "issues": [],
  "size": 1234,
  "mtimeMs": 1700000000000,
  "resources": []                 // 目录型：SKILL.md 之外的资源文件
}
```

- **顶部 meta 条**：`dshHome` / `projectRoot` / 官方识别数量 / 磁盘扫描计数 / 「重新扫描」。
- **左列**：按 root 分组的 skill 列表。每项显示 name、来源 root、有效或错误标记、模型 / 用户两个
  可调用徽章、被遮蔽提示；无效项的错误首句直接挂在条目下。底部可展开新建表单（name /
  description / whenToUse / 目录型或文件型）。
- **右列**：原文编辑框 + 结构化表单（Tab 切换）、保存、放弃改动、两个调用开关、删除、只读提示、
  `issues` 列表与资源文件清单。有未保存改动时显示「有未保存改动」，切换 skill 前 `confirm` 确认。

### 6.3 错误码

| HTTP | code | 触发条件 |
|---|---|---|
| 400 | `skill/unknown-root` | `root` 不在本次会话的扫描根里 |
| 400 | `skill/invalid-name` | `name` 缺失或不是 kebab-case |
| 400 | `skill/invalid-mode` | `mode` 不是 `raw` / `structured` |
| 400 | `skill/invalid-body` | `toggle` 的布尔字段不是 boolean |
| 400 | `skill/invalid-request` | 请求 URL 解析失败 |
| 400 | `skill/invalid-frontmatter` | 原文 / 结构化字段不合法，**不落盘**；`issues` 给逐条原因 |
| 403 | `skill/forbidden` | 目标是只读根，或真实位置落在可写根之外（符号链接逃逸） |
| 404 | `skill/not-found` | 该 root 下没有这个 skill |
| 409 | `skill/exists` | `create` 时已存在（目录型或文件型任一） |
| 409 | `skill/has-resources` | 删除的目录里有资源文件，需 `force=1` 确认 |
| 500 | `skill/yaml-unavailable` / `skill/atomic-unavailable` | profile 的 `node_modules` 里解析不到 `yaml` / `@deepseek-ai/dsh-atomic-write` |
| 500 | `skill/meta-failed` / `list-failed` / `read-failed` / `save-failed` / `create-failed` / `toggle-failed` / `delete-failed` / `sync-failed` | 未预期异常 |

## 7. 安全设计

这是本组件最关键的部分——**写错就是任意文件读写漏洞**。

1. **可写根白名单，且只有三个**：
   `<dshHome>/skills`、`<projectRoot>/.dsh/skills`、`<projectRoot>/.agents/skills`。
   其余（custom / user-agents / bundled）一律只读。
2. **路径不接受任意字符串。** 接口只接受 `root`（白名单 id）+ `name`（kebab-case），
   服务端拼路径。没有任何「读/写任意 path」的路由。
3. **resolve + realpath 各校验一次。** 先 `resolve()` 拦 `..`，再 `realpath()`（对还不存在的文件
   逐级向上找最近的已存在祖先）比对可写根集合，结果必须 `=== 可写根` 或以 `可写根 + path.sep`
   开头。这样同时挡住 `..` 与符号链接逃逸；后者报
   「目标路径的真实位置落在可写根之外（可能是符号链接逃逸）」。
4. **文件名即 skill 名。** 名字必须通过 kebab-case 正则，且不能含 `..`、`/`、`\`、`\0`；
   名字已受限也仍**显式校验一次**，不靠名字反推路径安全。
5. **原子写 + 锁。** `withFileLock(目标文件)` + `writeFileAtomic(path, content, { mode: 0o644 })`，
   不自己 `writeFile`（半截文件会被扫描器读成坏 skill）。`withFileLock` 的锁文件用 `wx` 创建，
   所以父目录先 `mkdir` 再上锁。
6. **结构化保存落盘前再解析一遍。** 服务端生成 frontmatter 后会重新解析，`valid === false` 就
   拒绝写入——不写出自己都不认的文件。
7. **删除前清点。** 目录里除 `SKILL.md` 外还有文件时，`DELETE` 返回 409 +
   `{ code:'skill/has-resources', resources:[...] }`，必须带 `force=1` 再请求一次。
8. **不碰真实用户目录做测试。** 自检与开发验收一律把 `DSH_HOME` 指到 `/tmp` 沙箱。

## 8. 一致性：磁盘是真相，官方服务是旁证

- **列表以磁盘扫描为准**：因为官方 `skills.list()` 会丢掉解析失败的条目，而本组件的核心价值
  正是让用户看见「哪些文件没生效、为什么」。
- **官方服务做交叉校验**：`POST /sync` 调 `ctx.get('skills').snapshot({})`，面板顶部显示
  「官方识别到 N 个」，与磁盘上的有效条目数对比；官方认到但磁盘没有的进
  `discrepancies.missingOnDisk`，数量不一致时提示可能存在的遮蔽或竞态。
- **不需要手动清缓存**：官方 `skill-filesystem` 开了 chokidar watcher（`watch:true`），
  写完文件自动失效缓存并重新发现，无需重启、无需额外 API。

## 9. 里程碑

- **P1-a 只读**：`/meta`、`/list`、`/one`。能看见全部 skill（含坏文件与被遮蔽项）。
- **P1-b 编辑**：`/save`（raw + structured 双模式）+ 前端校验。
- **P1-c 增删**：`/create`、`/one` DELETE（含资源文件保护）。
- **P1-d 启停**：`/toggle`，用 parseDocument 原地改，保住注释与键顺序。
- **P1-e 旁证**：`/sync` 显示官方识别数量。

## 10. 验收标准

1. `node --check components/skill/host.js`、`node --check components/skill/client.js` 通过。
2. 把 `DSH_HOME` 指到 `/tmp` 沙箱，造五种样本（正常目录型、正常文件型、缺 description、
   含旧键 `modelInvocable`、无 frontmatter），验证：
   - `/list` 把五个都返回，后三个 `valid:false` 且 `error` 说明具体原因；
   - `/create` → `/one` → `/save`(structured) → `/toggle` → `/save`(raw 非法应被拒) →
     `/one` DELETE（带资源文件应拒，`force` 才过）全链路通过。
3. 面板在「工具集」壳里作为**第 5 个分页**出现（图片生成 → 模型测试 → 通知 → MCP → Skill →
   设置），order 54，glyph `S`。
4. 根 `node build.mjs` + `node tools/check-client.mjs` 全绿。
5. 所有测试**不触碰** `~/.dsh/skills`。

### 10.1 已验证过的点

- 五个坏样本在 `list` 里全部带**具体** error，不是「解析失败」这种废话：缺 description 报
  「缺少必填字段 description」；旧键报
  `frontmatter field "modelInvocable" is unsupported; use "disable-model-invocation"`；
  无 frontmatter 报「文件没有以 `---` 行开头…」。
- `save` 原文模式校验不合法时**磁盘一个字节都不动**（先校验后落盘）。
- `toggle` 后 `modelInvocable:true` 会**删掉** `disable-model-invocation` 键而不是写成 `false`；
  原有的 `user-invocable:false`、`metadata`、注释、正文顺序全部保留。
- 六个路径穿越名（`../evil`、`a/../b`、`..`、`a b`、`.hidden`、`ok-name/../..`）全部 400
  `skill/invalid-name`。
- 符号链接指向可写根之外的写入被 403 拦下，读取也不泄露目标内容。
- 只读根（`user-agents`）上的写入 403 `skill/forbidden`。
- `description: "no"` / `whenToUse: "yes"` 经 yaml-1.1 引号化后读回仍是字符串。

## 11. 已知限制

- 项目级根依赖 `projectRoot` 推断（向上找 `.git`/`.dsh`）。多根工作区（monorepo）里只看离 cwd
  最近的那一个，不做全仓聚合。
- `customSkillDirs` 里配了 `!!js` 表达式的根，只能标为只读——它的真实路径要在运行时求值，
  本组件不重复实现那套求值。
- skill 内容编辑是纯文本，不做 Markdown 渲染预览（避免引入新依赖）。
- 删除不做回收站。
- 官方 watcher 的稳定性阈值是 200ms，保存后立刻刷新列表可能读到旧内容；面板在保存后
  短暂延迟再拉一次列表来规避。
- **bundled 根可能列不出来**：app.asar 内的路径在部分安装形态下不可见，此时 `path` 为空串、
  `exists:false`；可用 `DSH_BUNDLED_SKILLS` 显式指定，但该根永远只读。
- `customSkillDirs` 的官方字段名没有公开文档，这里同时容忍 `customSkillDirs` / `skillDirs`
  两种拼写与数组 / 逗号串两种形态；取不到就当没有自定义根（不猜）。
- **没有版本历史**：保存是原地覆盖（原子写），改动前的版本不会保留；重要的 skill 建议自行纳入
  版本管理。
- `list` 每次全量重扫，skill 数量上千时会有可见延迟；官方 watcher 只负责失效缓存，不做增量推送。
- 结构化表单的 `metadata` 只接受普通对象（数组、函数、循环引用一律拒绝），避免写出扫描器不认的
  YAML。
- 面板是「管理界面」不是「IDE」：没有 diff、没有多选、没有拖拽排序。
