# 组件四：notifications（通知中心）

会话跑完、需要你批准、模型报错、子智能体挂掉……这些事发生时你通常不在看那个标签页。
本组件把 DSH 的 Host 事件汇总成一条通知队列，**只用操作系统通知中心提醒你**：
通知会停在屏幕上不自动消失，点它会跳回那条会话。

> **DSH 应用内部不做任何提醒。** 没有浮层 toast、不注册 `shell.overlay`、不弹站内横幅。
> 「通知」面板（侧边栏「工具集」→ 分页「通知」）是**历史记录**，打开才看得见，自己不会弹任何东西。

## 能力

- **16 类通知场景**，可逐个开关（面板「场景设置」）
- 提醒只有一条通道：**操作系统通知中心**（渲染进程 `Notification`，Electron 里署名是 DSH 本体）
- **通知停留不消失**：`requireInteraction: true` + `timeoutType: 'never'`，一直停在屏幕上等你处理
- **点击跳回会话**：`onclick` 里 `uiWorkspace.openSession(sessionId)` 打开对应会话，然后关闭通知；
  没有 `sessionId`（会话已删、或条目本身没有归属）时退化成「只关闭」
- **信息顺序（用户指定）**：标题是「谁」——工作区 / 会话；正文第一段是「为什么」——哪个场景触发的（会话完成、
  需要权限…），之后才是明细。面板列表同样：`工作区 / 会话` + 场景徽章 + `×N` 去重计数
- **没收到通知时的引导**：权限被拒/未授予时面板顶部出横幅（重新申请 + 打开系统设置），
  并提供「系统通知设置」按钮直达系统那页（macOS 上要把提醒样式从「横幅」改成「提醒」才会停留）
- 站内**零提醒**：不注册 `shell.overlay`、没有 toast；「通知」面板纯历史记录
  （位置：侧边栏「工具集」order 48 → 分页「通知」；合并前是独立的侧边栏入口 order 52，
  面板 key 仍是 `notifications`，`ctx.layout.selectPanel('notifications')` 照样能直接打开）
- 兜底通道默认关闭：Host 侧 `osascript` / `notify-send`，只在「页面根本加载不起来」时才值得打开
- 去重：同一件事（同一会话同一轮 / 同一 turn+step / 同一子智能体 run）在 45 秒窗口内只留一条，重复的累加 `×N`，不刷屏
- 队列落盘，重启 DSH 后仍在；未读计数持久化
- 8 秒轮询（`POLL_MS`），只读快照，不打扰会话

## 通知标题写的是「谁」，不是「什么东西挂掉了」

系统通知的标题永远是**拥有这件事的那个会话**：`工作区 / 会话标题`。
场景（会话完成、需要权限、子智能体失败…）是**副标题**，正文第一段才是明细。

子智能体是个例外，也是唯一需要特别处理的地方：子会话自己有个内部 label
（如 `Mnemon idle checkpoint review`），它**不是**标题该写的东西——用户看不出
这是谁派出来的、属于哪个项目。所以子会话的事件一律把主语**上提到父会话**：

```
标题   demo-app / 修复登录问题        ← 父会话的工作区 + 父会话标题
副标题  子智能体完成
正文   子智能体「Mnemon idle checkpoint review」已完成：审查完了，两处问题
```

身份从哪来（每条都有独立回退链，任一环缺失都不影响其余）：

| 信息 | 回退顺序 |
| --- | --- |
| 会话标题 | `session/title` 事件缓存 → `header.cwd` 末段 → `会话 <id 前 6 位>` |
| 工作区 | 拥有者会话的 `header.cwd` → `session/event` 记下的身份 → 子会话自己的 `cwd` → 空 |
| 父会话 | live `header.parentSession` → `session/event` 记下的身份 |

**为什么需要 `state.hosts` 这份缓存**：`subagent/end` 只给一个裸 id，而那时子会话
往往已经落盘退出、`sessions.get()` 返回 `undefined`。只靠 live session 查不到
「哪个工作区哪个会话」。所以 `session/event` 里每条事件都顺手把
`{ workspace, parentSession, origin }` 记进 `state.hosts`（上限 500，与标题缓存同寿命）。
子智能体请求审批、模型失败这些 agent 级事件也只给 `sessionId`，走同一套逻辑。

## 覆盖的场景（为什么是这 16 个）

用户点名的三类在表里标 ★，其余是按「这件事发生时人不在电脑前、事后必须知道」的标准补的。

| 场景 id | 面板文案 | 默认 | 事件源 | 说明 |
| --- | --- | --- | --- | --- |
| ★ `approval-required` | 需要权限确认 | 开 | `approval/request`（waterfall）**+** `session/event` → `approval/asked` | 工具调用在等你批准。最紧急的一类，面板里标「待处理」。双来源，见下一节 |
| ★ `question-required` | 需要你回答 | 开 | `user-questions/request`（waterfall）**+** `session/event` → `tool/call`（`ask_user_question`） | 模型提问在等答案（多问题合并成一条，正文写「共 N 项」）。双来源，见下一节 |
| `plan-review` | 计划待审批 | 开 | 同 `question-required`，靠 `intent.kind === 'plan-review'` 区分 | 计划模式提交待确认计划，和普通提问分开，因为它是「放行/打回」的决策 |
| ★ `turn-completed` | 会话完成 | 开 | `session/event` → `turn/end`（`reason.kind === 'completed'`） | 一轮对话正常结束 |
| ★ `turn-error` | 会话出错 | 开 | `turn/end`（`reason.kind === 'error'`） | 回合以错误结束，`detail` 带错误码 / HTTP 状态。若同轮已有 `model-error` 则跳过（模型失败的明细已由它承载） |
| `turn-max-tokens` | 输出被截断 | 开 | `turn/end`（`max-tokens`） | 达到最大输出长度，回复没写完 |
| `turn-blocked` | 回合被阻断 | **关** | `turn/end`（`blocked`） | 审批被拒或工具把这一轮拦下。默认关：多半是你自己刚点的拒绝，通知反而多余 |
| `turn-aborted` | 会话被中断 | **关** | `turn/end`（`aborted` / `interrupted`） | 你 / 父会话 / 钩子取消了这一轮，正文点明是谁取消的。默认关：主动停止不需要事后提醒 |
| ★ `model-error` | 模型请求失败 | 开 | `agent/request-error`（waterfall） | 一次模型请求失败，带 provider、错误码、HTTP 状态、是否会重试 |
| `agent-error` | 步骤异常 | **关** | `agent/error` | 步骤级异常。默认关：它几乎总和 `turn-error` 同时发生，开着就是两条重复通知 |
| ★ `subagent-completed` | 子智能体完成 | 开 | `subagent/end`（`stopReason === 'completed'`） | 子会话正常结束，正文带它最后说的话（截断） |
| ★ `subagent-failed` | 子智能体失败 | 开 | `subagent/end`（`error` / `refusal` / `max-tokens`） | 子会话报错 / 拒答 / 输出超长 |
| `subagent-stopped` | 子智能体中断 | **关** | `subagent/end`（`aborted`） | 子会话被中断。默认关：主动打断通常不需要回头再看 |
| `compaction-error` | 压缩失败 | 开 | `compaction/summary-error`（waterfall） | 上下文压缩没完成，长会话后续可能受影响 |
| `config-error` | 会话启动失败 | 开 | `agent-loop/config-start-failed` | 会话配置解析失败，模型根本没跑起来（最容易一头雾水的一类） |
| `account-expired` | 账号凭据失效 | 开 | `deepseek-account/session-expired` | 服务端拒掉了当前登录状态，需要重新登录 |

### 审批和提问为什么要有两个来源

这三类（`approval-required` / `question-required` / `plan-review`）最初只监听 waterfall，
结果在真机上一**条**都没出现过——审批卡片、选项卡片明明弹在屏幕上，通知面板里却是空的。
查下来是两条独立的坑，任意一条都足以让通知彻底消失：

1. **转发桥会把我们的监听器短路。** `dsh-api-remotes` 的 `API_REMOTE_FORWARDED_EVENTS`
   白名单里只有两个 waterfall：`approval/request` 和 `user-questions/request`。
   它的转发监听器拿到浏览器答复后执行 `settled.resolve(outcome.value)` 就结束，
   **不再调用 `next()`**。cordis 的 waterfall 是一条链表（注册顺序 = 执行顺序，
   先注册者在外层先跑），所以只要转发桥排在我们前面，我们后注册的监听器一次都不会执行。
   这也解释了为什么同样走 waterfall 的 `agent/request-error`（不在白名单里）一直正常。
2. **策略是 `never` 时连 waterfall 都不发。** `ApprovalService.decide()` 里
   `if (this.effectivePolicy(session) === 'never') return 'rejected'` —— 直接返回，
   根本不 dispatch `approval/request`。`danger-full-access` 这个权限预设本身就是
   `approval: 'never'`，所以在这类会话里靠 waterfall 抓审批必然抓不到。

所以现在两条路都走，互为保险：

| 来源 | 覆盖什么 | 正文质量 |
| --- | --- | --- |
| `approval/request` waterfall | 策略为 `ask` 且转发桥没先应答时 | 好：有 `displayReason`（「允许本次操作使用 danger-full-access 权限：…」） |
| `session/event` → `approval/asked` | 全部情况（`session.append` 必定派发） | 糙：只有原始 `reason`（`escalate sandbox to danger-full-access: …`） |

- waterfall 那两个监听器加 `{ prepend: true }`，unshift 到链表最外层，抢在转发桥之前跑，
  处理完照常 `return next()`（`safeNext` 保证），浏览器那边照旧作答，行为不变。
- 两条来源用**同一个** `dedupeKey`（`approval:<sessionId>:<toolName>`），
  同一次审批后到的那条只会合并计数、把正文换成更漂亮的版本，不会弹两遍。
- 提问**没有**专属的持久化事件（`KNOWN_SESSION_EVENT_TYPES` 里没有任何 `user-question*`），
  兜底只能从 `tool/call` 里认 `ask_user_question`：`data.arguments` 是 JSON 字符串，
  自己 `JSON.parse` 取 `questions`；计划审批走同一个工具，靠
  `questions[0].intent.kind === 'plan-review'` 区分。同一个 `callId` 用
  `alreadyNotified('question-call:<sessionId>:<callId>')` 挡掉重放，避免续传 / 重放时重复弹。

> 记一条教训：**`ctx.on` 注册 waterfall 时，只要那条事件在 `API_REMOTE_FORWARDED_EVENTS`
> 白名单里，就必须 `prepend`，并且要有不依赖 waterfall 的持久事件兜底。**



调研过但**故意不做**的，写在这里免得以后重复讨论：

- **`agent/status`（idle ⇄ running）**：看着最像「会话完成」，实际不能直接用——`maintenance` 阶段
  （compaction 等后台维护）的 `status` 也是 `idle`，会在一次真实回复后额外制造一次假的 running→idle。
  真正权威的「这一轮结束了」是 `session/event` 的 `turn/end`，所以完成类全部走它。
- **`agent/created` / `agent/disposed` / `api-session/added|removed`**：纯生命周期噪音，通知没有信息量。
- **`workflow/*`（start/phase/agent-start/agent-end/end）**：workflow 只是子智能体的一种编排形态，
  它的成员完成已经由 `subagent/end` 覆盖；单独再报一遍就是重复。
- **`goal/changed`、`schedule/changed`**：状态变更，不是「需要你知道」的事件。
- **`plugin-manager/*`、`authorization/settled`**：面向内核自身的运维事件。
- **每条 `session/title`**：标题变更太频繁，且不影响你是否要回来处理。
- **工具执行成功**：量太大，通知会失去信噪比。

## 文件

- `host.js` — 事件订阅 + 通知队列 + `ctx.connection.fetch.register` 注册 `GET|POST /api/notifications`
- `native.js` — **兜底**系统通知通道：`execFile` 直调 `osascript` / `notify-send`，无 ctx 依赖，可单独测试
- `client.js` — 浏览器面板源码。**不直接部署**：由根目录 `node build.mjs` 包装进统一入口 `client.js`

## 严格的三条红线（改动前必读）

这三条写错就不是「没通知」，而是**改变 DSH 的行为**：

1. **waterfall 事件必须 `return next()`**
   `approval/request` 的默认落点是 `'unavailable'`，请求被吞掉等于悄悄替用户拒绝了工具调用。
   `agent/request-error` 不调 `next()` 就是「我来接管恢复」，会让重试逻辑走偏。
   本组件用 `safeNext()` 统一包装：先通知，**无论如何**都 `return next()`。
2. **监听器绝不能抛异常**
   cordis 的 emit 不捕获单条 listener 的错，抛出去会把会话打挂。所有回调都套了 `try/catch`，失败只打日志。
3. **同一件事只通知一次**
   去重键 + 时间窗。模型一次失败重试 3 次不能变成 3 条通知；子会话的 `turn/end` 会和
   `subagent/end` 撞车，所以 `header.origin === 'subagent'` 的 `turn/end` 直接跳过，交给 `subagent/end`。
   模型一次失败还会同时触发 `agent/request-error`（→ `model-error`）和 `turn/end` error（→ `turn-error`），
   后者的 error 分支先查同 session+turn 有没有 `model-error`，有就跳过——模型失败的明细已由它承载。

另外：所有 `ctx.on(...)` 都显式带 `{ global: true }`。DSH 的事件分发会按 scope 过滤，
子智能体事件是通过 `carrier(parent)` 做 scope 分发的；不写 `global` 就只能收到当前 agent 自己的事件，
子会话的通知全都会漏。

## 为什么必须在 Host 侧收集

Client 的 `ctx.remote.$on` 只转发 `dsh-api-remotes` 白名单里的一张事件表，
`agent/error`、`agent/request-error`、`subagent/start|end`、`session/event`、
`compaction/summary-error` 全都不在里面——浏览器里的插件根本收不到「会话完成了」这件事。
所以：Host 订阅事件 → 落队列 → 暴露路由 → Client 轮询，Client 只负责「怎么显示」。

## 面板「通知」

面板是**历史记录**，不是提醒通道：它不会主动弹出、不会打断你，只有你自己点侧边栏图标打开时才看得见。

- 顶部三张卡片：**未读** / **记录总数** / **已启用场景**（`12 / 16`）
- 第一排按钮：「全部已读」「清空已读」「清空全部」「测试系统通知」「系统通知设置」，
  外加通知权限按钮（文案随状态变：`系统通知已开` / `系统通知被拒绝` / `开启系统通知` / `此环境不支持系统通知`）
- 第二排按钮：「通知总开关：开/关」「全部 / 仅未读」「场景设置（16）」「刷新」
- 第三排按钮（兜底通道）：「兜底通道：开/关」「提示音：开/关」，右侧显示兜底状态
  （`macOS 通知中心，已投递 N 条` / `不可用（reason）`）
- 列表：按时间倒序，每条带级别色点（信息 / 警告 / 错误 / 待处理）、**标题（工作区 / 会话）**、
  **场景徽章**、正文、明细、`跳到会话`按钮、相对时间；未读加粗并有未读点；
  重复累加显示 `×N`；点一条即标记已读（整条点击是标记已读，所以跳会话是独立按钮；
  没有 `sessionId` 的条目——如账号失效——不画这个按钮）
- 权限为 `denied` / `default` 时，列表上方出现醒目横幅 + 「重新申请通知权限」「打开系统设置」两个按钮
- 「仅未读」筛选
- 展开「场景设置」后 16 个场景各一个开关，下面标着落盘路径（`NOTIFICATIONS_CONFIG` 可改）

面板上**只剩「测试系统通知」一个测试按钮**（原来还有「发条测试」和「测试兜底通道」，用户嫌多，已删）。
它走的是**主通道**（不经过 Host、不写队列），用来确认「停留」在你当前环境里成立。
想验证兜底通道，用 `POST { "action": "native-test" }`（面板不提供入口）。

## 提醒是怎么发出去的

### 一、主通道：渲染进程 `Notification`（默认，唯一在用的）

```js
new Notification(title, {
  body, tag,
  requireInteraction: true,   // Web 标准：保持可见直到用户交互
  timeoutType: 'never',       // Electron 专有（macOS / Windows）：不自动消失
  silent: !sound,
})
note.onclick = () => {
  markItemRead()                      // 标已读（只发一次，readSent 防重复）
  uiWorkspace.openSession(sessionId)  // 跳回那条会话
  note.close()                        // 再关掉通知本身（会触发 onclose，但 readSent 挡住了）
}
note.onclose = () => {
  markItemRead()                      // 手动关闭（点 ×、从通知中心清除）也算已读
}
```

四个点值得记下来：

- **`requireInteraction` 单独写不够。** 某些 Chromium 版本仍会按系统通知样式把它降级成几秒就走的横幅，
  必须同时写 Electron 的 `timeoutType: 'never'`。两个都写，通知才真正停在屏幕上等用户点掉。
- **标题是「谁」，正文第一段是「为什么」。** `title` 取 `item.title`（`工作区 / 会话`），`body` 拼成
  `item.status + ' · ' + item.body`（场景文案 + 明细）。这个顺序是用户指定的，反了就没用——
  通知中心里一眼只能看到标题和一行正文。
- **`onclick` 做「标已读 + 跳会话 + 关闭」**，`onclose` 做「标已读」。两个入口都会标已读，
  用 `readSent` 标志位防重复发请求。`openSession` 不可用（服务没装、会话已删）时静默失败，
  通知照样关闭——最差就是「只关闭」。
- **提示音由面板「提示音」开关控制**（`silent: !sound`），和兜底通道共用同一个配置项。

在 DSH desktop（Electron）里，渲染进程发的通知由主进程转交给操作系统，**署名就是 DSH 应用本体**；
在普通浏览器里就是标准 Web Notification，署名是浏览器。两条路都不需要插件方做任何平台判断。

**「没收到通知」的排查顺序**（面板上三排按钮就是照这个顺序排的）：

1. 面板顶部有横幅 → 权限被拒（`Notification.permission === 'denied'` 之后浏览器不会再问），
   点「重新申请通知权限」或「打开系统设置」。
2. 权限正常但通知一闪就没 → macOS 里 DSH 的提醒样式是「横幅」。点「系统通知设置」直达那一页，
   改成「提醒」。**这一步插件改不了**，只有用户能改。
3. 上面都对还是没有 → 查「通知总开关」和对应场景开关（16 个里默认关 4 个）。

`POST { "action": "open-settings" }` 走 `native.js` 的 `openSettings()`：
macOS 是 `open x-apple.systempreferences:com.apple.Notifications-Settings.extension`，
Linux 是 `gnome-control-center notifications`；打不开返回 502 `notifications/settings-unavailable`。
`NOTIFICATIONS_NATIVE=off` 时它同样被按住——自检不会突然在用户脸上打开系统设置窗口。

### 二、兜底通道（默认关闭）：Host 侧 `osascript` / `notify-send`

由 Host 进程直接调操作系统通知中心，**不经过浏览器**。理论上它比主通道更「底层」，
但它有两个绕不过去的缺点，所以默认关闭：

1. **macOS 上署名是 Script Editor**，不是 DSH——`osascript` 只能以自己进程的身份发，第三方无法冒充已签名的 app bundle id；
2. **无法控制停留、无法拦截点击**——`display notification` 的停留时长由系统设置里「脚本编辑器」的提醒样式决定，
   点击默认会激活 Script Editor。用户要的「停留 + 点击只关闭」它做不到。

只有一种情况值得打开它：页面根本加载不起来（Host 在跑、Web UI 没跑），此时主通道不存在。

兜底通道的措辞和主通道严格一致（标题 = 工作区 / 会话、开头 = 场景文案、副标题 = 工作区名），
两条通道同时开着也不会让人以为是两件事。

| 平台 | 通道 | 说明 |
| --- | --- | --- |
| macOS | `/usr/bin/osascript` + `display notification` | 通知中心应用名显示为 Script Editor / osascript |
| Linux | `notify-send` | `--app-name=DeepSeek Harness`，`error`/`action` 用 `critical` urgency |
| Windows | 暂不支持 | `probe()` 返回 `unsupported-platform`，面板按钮显示「不可用」 |

实现要点（`native.js`）：

- **`execFile` 直传 argv，不经过 shell**：标题/正文里出现引号、反斜杠、`$()`、反引号都不会变成命令
- 单次投递 5 秒硬超时；子进程 `unref()`，不会拖住 Host 退出
- `probe()` 结果缓存（失败也缓存），避免每条通知都去 spawn 一个必然失败的进程
- 投递失败只 `ctx.logger.warn` 一次（`nativeWarned` 只翻一次），**绝不影响会话**
- `NOTIFICATIONS_NATIVE=off` 整条关掉。自检就靠它，避免 CI 真的往用户屏幕上弹通知
- **只有新条目推，去重合并（`count+1`）不推**：模型重试 4 次只该响一次

### 三、为什么站内什么都不做

站内 toast 曾经实现过（`shell.overlay` + `react-dom` 的 `createPortal` 到 `body`，`z-index: 10000`），
后来**整个删掉**，原因三条：

1. 用户明确要求「DSH 应用内部不要提醒，只要系统通知」；
2. 站内提醒只在 DSH 窗口看得见时存在，切到别的 app 就等于没提醒——而这恰恰是最需要提醒的时候；
3. `shell.overlay` 的容器是 `position:absolute; inset:0; z-index:20; overflow:hidden`，聊天区内部用到
   `z-index:1100`，toast 很容易被盖住。为一条本来就不该存在的提醒去调层级，不值得。

`tools/check-client.mjs` 里有一条**反向断言**：`shell.overlay` 上不允许出现任何本插件的注册。
谁要是手滑把 toast 加回来，自检立刻红。

## 路由

`GET /api/notifications`

查询参数：`since`（只要 `createdAt` 大于它的）、`limit`（默认 300，上限 1000）、`unread=1`（只要未读）。

```json
{
  "ok": true,
  "now": 1760000000000,
  "unread": 3,
  "total": 42,
  "items": [
    {
      "id": "n42", "kind": "approval-required", "level": "action",
      "title": "demo / 重构构建脚本", "status": "需要权限确认", "workspace": "demo",
      "body": "工具 bash 在等你批准：删除构建目录",
      "detail": "调用 call_7f3a", "sessionId": "s-1", "sessionTitle": "重构构建脚本",
      "dedupeKey": "approval:s-1:bash", "count": 1, "createdAt": 1759999990000, "read": false
    }
  ],
  "kinds": [{ "id": "approval-required", "label": "需要权限确认", "level": "action", "enabled": true, "hint": "…" }],
  "config": { "version": 1, "enabled": true, "maxItems": 300, "maxAgeMs": 604800000, "dedupeMs": 45000, "kinds": { "…": true }, "native": { "enabled": false, "sound": true } },
  "files": { "config": "…/notifications/config.json", "queue": "…/notifications/queue.json" },
  "focused": true,
  "native": { "supported": true, "platform": "darwin", "channel": "osascript", "reason": "", "enabled": false, "sound": true, "sent": 0 }
}
```

`native` 描述的是**兜底通道**：`channel` 是 `osascript`（macOS）、`notify-send`（Linux）或 `none`；
`enabled` 默认 `false`；`sent` 是本次进程内成功投递的条数（重启归零）。
`focused` 保留但**已不参与任何投递决策**——系统通知一律直接弹，不再做「人在看屏幕就不打扰」的取舍。

`POST /api/notifications`，请求体 `{ "action": "…" }`：

| action | 额外字段 | 作用 |
| --- | --- | --- |
| `read` | `ids: string[]` | 按 id 标记已读，返回 `changed` |
| `readAll` | — | 全部标记已读 |
| `clear` | — | 只删**已读**条目，返回 `removed` |
| `clearAll` | — | 清空全部 |
| `config` | `config: { enabled?, maxItems?, maxAgeMs?, dedupeMs?, kinds?, native? }` | 写配置（`kinds` 按场景 id 合并，`native` 同样按字段合并），返回归一化后的 `config` |
| `test` | — | 塞一条「会话完成」测试通知；和真实通知走同一条链路，前端下一轮轮询就会弹系统通知 |
| `focus` | `focused: boolean` | 保留动作（兼容旧前端 / 自检），前台状态已不影响任何投递决策 |
| `native-test` | — | 用**兜底通道**立刻发一条（与主通道无关；面板不提供入口） |
| `open-settings` | — | 打开操作系统的通知设置页（macOS `x-apple.systempreferences:com.apple.Notifications-Settings.extension`、Linux `gnome-control-center notifications`），返回 `channel` |

错误码：`notifications/bad-json`（400）、`notifications/unknown-action`（400）、
`notifications/disabled`（409，总开关或「会话完成」关掉时 `test` 被拒）、
`notifications/native-unavailable`（409，当前平台没有系统通知通道）、
`notifications/native-failed`（502，通道在但投递失败，`message` 带 stderr）、
`notifications/settings-unavailable`（502，打不开系统设置页）、
`notifications/list-failed`（500，GET 读快照失败）、`notifications/action-failed`（500，写动作执行失败）。

`GET` 的响应里另有 `native` 与 `focused`：

```json
{
  "native": { "supported": true, "platform": "darwin", "channel": "osascript",
              "reason": "", "enabled": true, "sound": true, "sent": 3 },
  "focused": true
}
```

`supported` 是**启动时后台探测一次**的缓存结果（GET 不会去 spawn 子进程），
所以服务刚起来那一瞬间可能还是 `false`。

## 配置

`$DSH_HOME/dsh-toolkit/notifications/config.json`（`NOTIFICATIONS_CONFIG` 可改）：

```json
{
  "version": 1,
  "enabled": true,
  "maxItems": 300,
  "maxAgeMs": 604800000,
  "dedupeMs": 45000,
  "kinds": { "turn-blocked": false, "turn-aborted": false, "agent-error": false, "subagent-stopped": false },
  "native": { "enabled": false, "sound": true }
}
```

`native.enabled` 是**兜底通道**开关（默认 `false`），不是系统通知总开关——主通道（渲染进程 Notification）
一直开着，没有开关，因为它就是提醒本身。`native.sound` 是提示音，主通道也读它（`silent: !sound`）。
关掉 `native` 只影响 Host 侧的兜底投递，站内记录和主通道一条不少。

- `maxItems` 夹在 `20–2000`，`maxAgeMs` 夹在 `1 小时–30 天`，`dedupeMs` 夹在 `0–600000`
- 越界值不会报错，直接夹到区间端点（配置写坏不至于让通知系统整个停摆）

队列：`$DSH_HOME/dsh-toolkit/notifications/queue.json`（`NOTIFICATIONS_QUEUE` 可改），
`{ version, seq, items }`，写盘是 800ms 防抖 + 同目录 `.tmp` 原子重命名。

## 自检覆盖

`node tools/check-client.mjs` 的 `[2] notifications` 与 `[3b]` 两段：

- 面板 / sidebar 两处注册是否齐全，`order` 是否正确
- **`shell.overlay` 上没有任何本插件注册**（站内零提醒的反向断言）
- 16 个场景开关与 `host.js` 的 `KINDS` 逐条对齐（漏一个用户就关不掉它）
- 每个事件的监听器是否存在、是否带 `{ global: true }`
- **`approval/request` 与 `user-questions/request` 是否带 `{ prepend: true }`**（不带就会被
  api-remotes 的转发桥短路，真机上表现为「卡片弹了但没通知」）
- **兜底来源是否独立成立**：只发 `approval/asked` 持久事件（不经过 waterfall）也能产出审批通知；
  只发 `ask_user_question` 的 `tool/call` 也能产出提问通知；两条来源同时命中同一次审批时只有一条
- 16 类场景逐一触发 → 队列里出现的 kind 是否正确
- **waterfall 的 `next()` 是否被调用**（这条挂了就是功能性 bug，不是显示问题）
- 去重计数、默认关闭的场景不入库、子会话 `turn/end` 被跳过
- 恶劣入参（`null`）下监听器不抛
- `read` / `readAll` / `clear` / `clearAll` / `config` / `test` / `focus` / `native-test` / `open-settings` 九个动作 + 坏 JSON + 未知动作
- 重启后能从磁盘读回队列
- 兜底通道：`native` 状态回报、默认关闭、`NOTIFICATIONS_NATIVE=off` 时 `native-test` 返回 409
- 信息排版：条目 `title` 里有工作区名、`status` 等于场景 label，`title` 里**不再重复**场景文案
- 面板精简：只剩一个「测试系统通知」按钮（反向断言，防止测试按钮再长回来）、有「系统通知设置」入口、
  权限被拒时出现引导横幅

> 自检全程设 `NOTIFICATIONS_NATIVE=off`，**不会真的往你屏幕上弹通知**；
> 要验证真实投递，跑 `node -e "import('./components/notifications/native.js').then(m=>m.send({title:'t',body:'b'}))"`。

## 已知边界

- **轮询而非推送**：8 秒一次。通知本身不丢——它落在 Host 队列里，下一次轮询就能拿到。
- **主通道需要页面活着**：渲染进程的 `Notification` 只在 Web UI 页面存在时有效（后台标签页可以，整个窗口关掉不行）。
  这是「署名是 DSH 本体」的代价；要窗口关掉也收到，只能用署名不是 DSH 的兜底通道。
- **通知样式受系统设置影响（这才是「没收到通知」的头号原因）**：即使写了 `timeoutType: 'never'`，
  如果 macOS 通知中心里把 DSH 的提醒样式设成了「横幅」，通知还是会几秒后自己滑走。
  面板上的「系统通知设置」按钮可以直接打开那一页（`POST { "action": "open-settings" }`）——
  这一步只能用户自己改，插件改不了系统设置。
- **权限被拒时是静默的**：`Notification.permission === 'denied'` 之后浏览器不会再弹询问框，
  所以面板顶部专门留了横幅 + 「重新申请通知权限」按钮，否则用户只会以为「这功能坏了」。
- **点击跳会话依赖 `uiWorkspace` 客户端服务**：拿不到（旧版 DSH / 服务没注册）时会退化成「只关闭」。
- **Windows 上兜底通道不可用**：`probe()` 返回 `unsupported-platform`。主通道在 Windows 的 Electron 里照常工作。
- **子智能体的 `turn/end` 不单独通知**：按设计交给 `subagent/end`，所以子智能体内部跑了几轮
  不会逐轮提醒，只在它整体结束时报一次。
- **审批通知可能比卡片晚/早一点点**：`approval/asked` 是 `session.append` 时同步派发的，
  waterfall 那条要等请求真正开始决定才触发。两条谁先到都行——去重键相同，最终只有一条。
- **兜底来源的正文更糙**：`approval/asked` 只有原始 `reason`（`escalate sandbox to …`），
  没有 `displayReason` 那句人话。两条都到时会自动换成 waterfall 的版本；只到了兜底那条，
  就显示原始 `reason`——**宁可糙，也不能漏**。
