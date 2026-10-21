# 组件六：skill（Skill 管理面板）

解决一个具体问题：DSH 的 skill 就是磁盘上的 Markdown 文件，由 `@deepseek-ai/dsh-skill-filesystem`
扫描，**官方没有任何管理界面**。文件写坏了、字段名用错了、被同名的另一个根盖住了，扫描器只会
**静默丢弃**——用户在界面上看不到「我这个 skill 为什么没生效」。

本组件把三件事补上：

1. **摊开服务端到底认到哪些 skill**：磁盘扫描（真相）+ `ctx.get('skills')` 快照（交叉校验）。
2. **把「为什么没生效」说清楚**：缺 frontmatter、frontmatter 不是对象、`name` 缺失或非法、
   `description` 缺失、用了已废弃的旧键名——逐条列出来，而不是丢进垃圾桶。
3. **允许在白名单根里直接改**：原文编辑 / 结构化表单 / 两个调用开关 / 新建 / 删除。

面板「Skill」（侧边栏「工具集」→ 分页「Skill」）。

## 能力

| 能力 | 说明 |
| --- | --- |
| 磁盘扫描 | 六个扫描根全量扫，目录型 `<name>/SKILL.md` 与文件型 `<name>.md` 都认；**解析失败的也返回**，`error` + `issues` 写具体原因 |
| 遮蔽提示 | 同名 skill 只认 rank 最小的那个；被盖住的项标 `shadowedBy: { rootId, path }`，专治「我改了怎么不生效」 |
| 原文编辑 | 右侧编辑器直接改整份 Markdown，保存前按官方规则逐条校验，**不合法就不落盘** |
| 结构化表单 | `name` / `description` / `whenToUse` / `metadata` / 正文，服务端生成 frontmatter；布尔只在需要时写，文件保持干净 |
| 两个调用开关 | 模型可调用（`disable-model-invocation`）、用户可调用（`user-invocable`）；**只改这两个键**，正文、其它键、原有顺序与注释全保留 |
| 新建 | 目录型或文件型，默认正文 `# <name>` + description |
| 删除 | 目录型删整个目录；目录里除 `SKILL.md` 外还有资源文件时**先拒**并返回清单，确认后才带 `force` 重删 |
| 只读根 | bundled / user-agents / custom 根在列表里标出来，编辑、保存、删除全部禁用并说明原因 |
| 交叉校验 | 面板顶部「官方识别到 N 个」来自 `ctx.get('skills').snapshot()`；官方认到但磁盘没有的进 `discrepancies.missingOnDisk` |
| 热更 | 官方有 chokidar watcher，改完文件自动失效缓存，**不需要重启也不需要手动清缓存** |

## 文件

| 文件 | 作用 |
| --- | --- |
| `host.js` | HTTP 路由 + 磁盘扫描 + frontmatter 解析校验 + 原子写（无第三方裸 import，依赖走 `createRequire` 锚点） |
| `client.js` | 浏览器面板源码（由根目录 `node build.mjs` 包装进统一入口） |
| `README.md` | 本文件 |

## 扫描根与优先级

`rank` 小者优先，**同名 skill 只认 rank 最小那个**。可写白名单只有前三项里带 ✓ 的两个 + `user-dsh`，
共三个；其余一律只读。

| rank | rootId | source | 路径 | 可写 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 100 | `project-dsh` | `project-dsh` | `<projectRoot>/.dsh/skills` | ✓ | 项目级，随仓库走 |
| 200 | `project-agents` | `project-agents` | `<projectRoot>/.agents/skills` | ✓ | 项目级，给其它 agent 工具共用 |
| 300 | `custom` / `custom-2`… | `custom` | profile 里的 `customSkillDirs`（同时容忍 `skillDirs`、数组或逗号串） | — | 自定义，**只读** |
| 400 | `user-dsh` | `user-dsh` | `$DSH_HOME/skills`（默认 `~/.dsh/skills`） | ✓ | 用户级，本机现有 `constraint-driven-development`、`interview-me` |
| 500 | `user-agents` | `user-agents` | `~/.agents/skills` | — | 用户级给其它 agent 工具，**只读** |
| 600 | `bundled` | `bundled` | app.asar 内 `@deepseek-ai/dsh-agent-preset/skills` | — | 应用内置，**只读**；路径找不到时 `path` 为空串、`exists:false` |

- `projectRoot`：从会话 cwd 向上找最近的含 `.dsh` 或 `.git` 的目录（官方 `findProjectRoot` 的简化版），
  找不到就用 cwd 本身。cwd 取 `profileContext.cwd`（或 `.dir`），再回退 `process.cwd()`。
- `dshHome`：环境变量 `DSH_HOME`（空白视为未设，支持 `~`）→ `~/.dsh`。
- 根目录本身可以不存在：`exists:false` 照样返回，面板显示「这里还没有」。
- bundled 根路径可用环境变量 `DSH_BUNDLED_SKILLS` 显式指定（测试用）。

### 目录布局

- **目录型**：`<root>/<skill-name>/SKILL.md`
- **文件型**（仅限根下一层）：`<root>/<skill-name>.md`
- 根下的 `.system` 目录跳过；目录型 skill 里的资源文件照扫（`resources` 清单），删除前给用户看。

## frontmatter 规则

文件必须以 `---` **行**开头（容忍 BOM 与 CRLF），随后是 YAML，再一行 `---` 结束，之后是正文。
逐条校验如下——**任何一条不过，官方就会静默丢弃整个 skill**，面板把它显示为「未生效」并列出原因。

| 字段 | 必填 | 类型 | 规则 |
| --- | --- | --- | --- |
| `name` | 是 | string | 必须匹配 `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`（kebab-case） |
| `description` | 是 | string | 非空 |
| `whenToUse` | 否 | string | 非字符串报错 |
| `metadata` | 否 | object | 数组或标量报错 |
| `disable-model-invocation` | 否 | boolean | `modelInvocable = (disable-model-invocation !== true)`；省略 = 模型可见 |
| `user-invocable` | 否 | boolean | `userInvocable = (user-invocable !== false)`；省略 = 用户可调用 |

`disabled` = 两个都是 false（模型不调用、用户也不调用）。

### 旧键（出现即整个 skill 失效）

官方报 `frontmatter field "X" is unsupported; use "Y"`，本组件报同一语义，并在面板上给出迁移提示：

| 旧键 | 换成 | 语义差异 |
| --- | --- | --- |
| `modelInvocable` | `disable-model-invocation` | **布尔语义相反**：`true` 表示允许模型调用，等价于省略 `disable-model-invocation` |
| `disableModelInvocation` | `disable-model-invocation` | 改成 kebab-case |
| `userInvocable` | `user-invocable` | 改成 kebab-case |

### 布尔值

- **写入**一律写真布尔 `true` / `false`。
- **读取**按官方宽容规则归一化：真布尔、`1` / `0`、以及大小写不敏感的 `true` / `false` /
  `yes` / `no` / `on` / `off`；认不出来的一律判为「必须是布尔（true / false）」，整条失效。
- 结构化保存用 `schema: 'yaml-1.1'` 序列化，所以 `description: "no"` 这类值会被加引号，
  读回来还是字符串，不会退化成布尔。

## 路由

统一前缀 `/api/skill/`，与既有的 `/api/toolkit/*`、`/api/model-test/*` 不冲突。
同 path 的 GET / DELETE 合并成一条注册，handler 内按 `request.method` 分流
（同 path 注册两次会判 `already registered`）。

成功响应 `{ ok: true, ... }`；失败统一 `{ ok: false, code: 'skill/<reason>', message }` + 4xx/5xx。

| 方法与路径 | 说明 |
| --- | --- |
| `GET /api/skill/meta` | `{ ok, dshHome, cwd, projectRoot, roots:[{ id, path, source, rank, writable, exists, label }], yamlAvailable, atomicAvailable, officialAvailable, dependencyError }` |
| `GET /api/skill/list` | 磁盘真相：`{ ok, dshHome, cwd, projectRoot, roots, skills:[…], counts:{ total, valid, invalid, shadowed }, official:{ available, complete, count, names }, discrepancies:{ missingOnDisk } }` |
| `GET /api/skill/one?root=<rootId>&name=<skill>` | 单条原文：`{ ok, name, rootId, source, path, relativePath, kind, writable, raw, parsed:{ name, description, whenToUse, metadata, modelInvocable, userInvocable }, body, frontmatterText, valid, issues, legacy:[{ key, replacement }], resources, size, mtimeMs }` |
| `DELETE /api/skill/one?root=<rootId>&name=<skill>[&force=1]` | 删除。目录型删整个目录；有资源文件且未带 `force` 时 409 并回 `resources` 清单 |
| `POST /api/skill/save` | `{ root, name, mode:'raw'｜structured', raw?, fields?:{ name, description, whenToUse, metadata, modelInvocable, userInvocable }, body? }` → `{ ok, path, rootId, name, mode, bytes }` |
| `POST /api/skill/create` | `{ root, name, description, whenToUse?, body?, kind:'directory'｜'file' }` → `{ ok, path, rootId, name, kind }` |
| `POST /api/skill/toggle` | `{ root, name, modelInvocable?, userInvocable? }` → `{ ok, path, rootId, name, parsed, valid, issues }`；只改两个布尔 |
| `POST /api/skill/sync` | 官方快照交叉校验 → `{ ok, official:{ available, complete, count, names, error } }` |

`skills[]` 每一项：

```jsonc
{
  "name": "interview-me",
  "path": "~/.dsh/skills/interview-me/SKILL.md",
  "rootId": "user-dsh",
  "source": "user-dsh",
  "rank": 400,
  "relativePath": "interview-me/SKILL.md",
  "kind": "directory",            // directory | file | broken（根目录都读不了）
  "writable": true,
  "valid": true,                  // false 时下面 error / issues 一定有内容
  "description": "…",
  "whenToUse": null,
  "modelInvocable": true,
  "userInvocable": true,
  "disabled": false,
  "shadowedBy": null,             // { rootId, path }：被更高优先级根盖住
  "error": null,                  // 一句话说明为什么没生效
  "issues": [],                   // 逐条问题（含非致命的警告）
  "size": 1234,
  "mtimeMs": 1700000000000,
  "resources": []                 // 目录型：SKILL.md 之外的资源文件
}
```

### 错误码

| HTTP | code | 触发条件 |
| --- | --- | --- |
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
| 500 | `skill/yaml-unavailable` / `skill/atomic-unavailable` | profile 的 node_modules 里解析不到 `yaml` / `@deepseek-ai/dsh-atomic-write` |
| 500 | `skill/meta-failed` / `skill/list-failed` / `skill/read-failed` / `skill/save-failed` / `skill/create-failed` / `skill/toggle-failed` / `skill/delete-failed` / `skill/sync-failed` | 未预期异常 |

## 安全设计

- **可写根白名单只有三个**：`$DSH_HOME/skills`、`<projectRoot>/.dsh/skills`、`<projectRoot>/.agents/skills`。
  bundled / user-agents / custom 一律只读——列表里标出来，前端据此禁用编辑、保存、删除。
- **路由只接受 `rootId + skillName`，不接受任意路径**。没有「读任意文件」这种通用接口。
- 名字虽已被 kebab-case 限死，仍然**显式校验一次**，不靠名字反推路径安全。
- 每次读写前：先 `resolve()` 拦 `..`，再 `realpath()`（对还不存在的文件逐级向上找最近的已存在祖先）
  比对可写根集合，**resolve 与 realpath 各校验一次**——符号链接逃逸在这一关被挡掉
  （`目标路径的真实位置落在可写根之外（可能是符号链接逃逸）`）。
- 写入统一 `withFileLock(目标文件)` + `writeFileAtomic(path, content, { mode: 0o644 })`；
  不自己 `writeFile`（半截文件会被扫描器读成坏 skill）。`withFileLock` 的锁文件用 `wx` 创建，
  所以父目录先 `mkdir` 再上锁。
- 结构化保存落盘前会**再把生成的内容解析一遍**，`valid === false` 就拒绝写入——服务端不会写出自己都不认的文件。

## 依赖解析（为什么没有 `import 'yaml'`）

本仓库被 link 安装到 `~/.dsh/profiles/desktop/node_modules/dsh-toolkit`，ESM 从**真实路径**向上解析依赖，
仓库自身没有 `node_modules`，裸 `import 'yaml'` 直接 `ERR_MODULE_NOT_FOUND`。

所以 `host.js` 里用 `createRequire` 锚到 profile 的 `package.json` 再 `req()`：

1. `ctx.get('profileContext').dir` + `/package.json`
2. `$DSH_HOME/profiles/desktop/package.json`
3. `~/.dsh/profiles/desktop/package.json`

惰性解析 + 每个锚点 try/catch，解析失败只把 `dependencyError` 带到 `meta` 接口里（面板显示
「yaml 不可用」），**不会让 host 崩掉**。整个 `host.js` 零 `@deepseek-ai` / 第三方裸 import。

## 面板

- **顶部 meta 条**：`dshHome` / `projectRoot` / 官方识别数量 / 磁盘扫描计数 / 「重新扫描」。
- **左列**：按 root 分组的 skill 列表。每项显示 name、来源 root、有效或错误标记、
  模型 / 用户两个可调用小徽章、被遮蔽提示；无效项的错误首句直接挂在条目下。
- **右列**：原文编辑框 + 结构化表单（Tab 切换）、保存、放弃改动、两个调用开关、删除、只读提示、
  该 skill 的 `issues` 列表与资源文件清单。有未保存改动时显示「有未保存改动」，
  切换 skill 前 `confirm` 确认。
- **新建**：左列底部展开表单（name / description / whenToUse / 目录型或文件型）。

## 验收方式

组件自身不带测试脚本，用下面的手工流程验（**不要碰 `~/.dsh/skills` 真实数据**，全部在 /tmp 沙箱里做）：

```bash
# 1) 语法
node --check components/skill/host.js
node --check components/skill/client.js

# 2) 沙箱：把 DSH_HOME 指到临时目录，造五个样本 skill
#    - 正常目录型 <name>/SKILL.md
#    - 正常文件型 <name>.md
#    - 缺 description 的坏 skill        → list 里 valid:false，error「缺少必填字段 description」
#    - 含旧键 modelInvocable 的坏 skill → error「frontmatter field "modelInvocable" is unsupported; use "disable-model-invocation"」
#    - 没有 frontmatter 的文件          → error「文件没有以 `---` 行开头…」
#    然后依次跑：list → create → one → save(structured) → toggle
#    → save(raw 带非法 frontmatter，应 400 skill/invalid-frontmatter 且磁盘不变)
#    → delete（带资源文件应 409 skill/has-resources，force=1 才过）

# 3) 真实渲染与接线（Lead 统一跑）
node build.mjs && node tools/check-client.mjs
```

### 已验证过的点

- 上述五个坏样本在 `list` 里全部带**具体** error，不是「解析失败」这种废话。
- `save` 原文模式校验不合法时**磁盘一个字节都不动**（先校验后落盘）。
- `toggle` 后：`modelInvocable: true` 会**删掉** `disable-model-invocation` 键而不是写成 `false`；
  原有的 `user-invocable: false`、`metadata`、注释、正文顺序全部保留。
- 六个路径穿越名（`../evil`、`a/../b`、`..`、`a b`、`.hidden`、`ok-name/../..`）全部 400 `skill/invalid-name`。
- 符号链接指向可写根之外的写入被 403 拦下，读取也不泄露目标内容。
- 只读根（`user-agents`）上的写入 403 `skill/forbidden`。
- `description: "no"` / `whenToUse: "yes"` 经 yaml-1.1 引号化后读回仍是字符串。

## 已知限制

- **bundled 根可能列不出来**：app.asar 内的路径在部分安装形态下不可见，此时 `path` 为空串、
  `exists:false`。可用 `DSH_BUNDLED_SKILLS` 显式指定，但该根永远只读。
- `customSkillDirs` 的官方字段名没有公开文档，这里同时容忍 `customSkillDirs` / `skillDirs`
  两种拼写与数组 / 逗号串两种形态；取不到就当没有自定义根（不猜）。
- **没有版本历史**：保存是原地覆盖（原子写），改动前的版本不会保留。重要的 skill 建议自行
  纳入版本管理。
- `list` 每次全量重扫，skill 数量上千时会有可见延迟；官方 watcher 只负责失效缓存，不做增量推送。
- 结构化表单的 `metadata` 只接受普通对象（数组、函数、循环引用一律拒绝），避免写出扫描器不认的 YAML。
- 面板是「管理界面」不是「IDE」：没有 diff、没有多选、没有拖拽排序。
