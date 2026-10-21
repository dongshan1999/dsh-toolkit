# 组件一：image-gen（图片生成工具 + 面板）

注册 `generate_image` 工具，走**标准 OpenAI Images 接口**：
`POST {baseURL}/images/generations`，请求体为

```json
{ "model": "<模型 id>", "prompt": "<提示词>", "n": 1, "size": "1024x1024" }
```

图生图时追加 `"image": [<https URL / data URL>…]`。**不走 chat/completions，也没有厂商私有协议。**

**不内置任何厂商模型**：模型目录完全由用户添加，插件本身不绑定任何服务商。

面板「图片生成」（侧边栏「工具集」→ 分页「图片生成」）：左列收纳（最近生成 / 收藏库 / 提示词库）· 右列文生图 / 图生图 / 设置。

## 能力

### generate_image 工具（Agent 可调用）

- **文生图**：`prompt` 必填 + `size`（像素尺寸，默认 `1024x1024`）+ `count`（1-4）
- **图生图 / 编辑**：`image` 数组（本地路径、https URL 或 data URL，≤9 张），prompt 里描述改动要求
- 返回图片 URL（约 24 小时有效）+ 落盘本地路径（默认 `$DSH_HOME/dsh-toolkit/image-gen/images/`）
- 目录为空、或默认模型没有可用密钥时**快速失败**并给出可操作提示，不触网

### 面板「图片生成」

> 位置：侧边栏「工具集」（order 48）→ 分页「图片生成」。合并前是独立的侧边栏入口（order 49），
> 面板 key 仍是 `image-gen`，`ctx.layout.selectPanel('image-gen')` 照样能直接打开。

- **左：收纳** — 最近生成 / 收藏库 / 提示词库三个标签、缩略图墙、收藏 / 删除 / 放大 / 下载；
  每张图下面是**生成它用的提示词旁注**（两行截断，悬停看全文；灯箱右侧独立一栏显示完整文本，按空行分段，且灯箱只铺满面板本身（不盖左侧会话栏））
- **右：文生图** — 五段式提示词（主体 / 风格 / 构图与视角 / 光线与氛围 / 负面）+ 尺寸 / 张数
- **右：图生图** — 上传参考图、从左侧拖入缩略图、或填 URL / 本机路径，再写编辑指令
- **右：设置** — 模型组（**一个网关一组**：组名 + 链接 + 该组自己的密钥）
  - 顶部：默认模型下拉（按组分组）+「测试」+「刷新」，一行状态「N 个组 · M 个模型 · 密钥状态」
  - 组卡片**可折叠**：组头一行是折叠箭头（▾ 展开 / ▸ 收起）+ 状态圆点 + 组名 + 链接 +「N 个模型」+
    右侧「编辑 / 删除」；折叠时只显示组头，展开后显示组内模型。默认只有 1 个组时展开、多个组时收起，
    手动开合在当前会话内记住
  - 展开后组内：模型逐条一行（显示名 +「默认」/「$x.xx/张」标签 + 上游 model id，右侧「编辑 / 删除」），
    行下方一个虚线按钮「+ 添加模型」
  - 「+ 添加模型组」与组头「编辑」/ 组内「+ 添加模型」打开的是**同一个组表单**：组名 / API Key / 链接
    （新建时三者都填，组名留空取域名、API Key 该组专用；编辑已有组时链接与组名预填，API Key 留空表示不改，
    占位符「留空不改」）
  - 「获取模型」用**表单里当前的链接与 API Key** 拉该网关的模型列表（编辑已有组时 Key 留空自动用该组已存的
    那把，链接以表单里改过的为准，不必先保存），只列识别出的生图模型
  - 勾选区：拉到的生图模型逐个可点选 / 取消（支持「全选 / 清空」），**已在该组里的模型置灰、不参与勾选**；
    网关不提供 `/models` 时可手填模型 id 后「加入」
  - 底部按钮：「保存」（新建时可只建组不勾模型），编辑时左侧还有「删除组」（连组带模型一起删，有确认框）；
    保存语义：新建 = 建组 + 写入勾选的模型（目录为空时第一条自动成为默认），
    编辑 = 先把组名 / 链接 / 密钥的改动落盘，再把勾选的模型补进组（**只增不删**）

### 图片旁注提示词

生成的图片旁边直接标注生成它时用的提示词，不用回头翻对话记录。

- 索引文件：`IMAGE_GEN_PROMPTS` → `$DSH_HOME/dsh-toolkit/image-gen/image-prompts.json`
- 结构：`{ version: 1, images: { "<图片名>": { prompt, model, size, mode, createdAt } } }`，权限 0600
- 记录时机：`generateMany` 每张成功落盘后，一次生成的多张**统一写一遍**
  （原子写 = 临时文件 + rename；写失败静默，绝不影响生成结果）
- `mode`：`text`（文生图）/ `image`（图生图，带参考图）
- **老图回退**：索引里没有的图片，按 `library.json` 的 `prompts[].images` 反查，
  `promptSource` 标 `library`，面板注明「提示词（按提示词库反查）」；两边都没有则显示「无提示词记录」
- 展示：左栏图块下方两行截断（悬停全文）、灯箱右侧独立一栏（分段 + 可复制 + 模型/尺寸事实条）、生成结果卡片旁注；无记录的老图退化成弱化文件名
- 列表接口的 `files` 项直接带 `prompt` / `promptSource` / `promptTitle`，面板零额外请求
- 删除图片时同步清掉索引条目；`POST /api/image-gen/generate` 回传真正发给上游的 `prompt`
- 存量回填：`node tools/backfill-prompts.mjs [--write]` 把旧版 `$DSH_HOME/dsh-imagegen/index.json`
  里的提示词搬进新索引（幂等，新记录优先，对不上的不臆造）
- 会话回填：`node tools/backfill-from-session.mjs --session <session.v4.jsonl.zstd> [--usage usage.jsonl] [--write]`
  从会话日志里捞 `generate_image` 的调用参数，按「落盘时间在调用后 150 秒内 + 张数不超 count」配对回填
  （同样幂等、新记录优先；窗口内图多于 count 视为有并发任务，拒绝配对）。会话日志是**追加式多帧 zstd**，
  脚本内部逐帧解压；`--usage` 就近取模型名（间隔超 `--usage-window` 毫秒则不补）

### 提示词库

- 库文件：`IMAGE_GEN_LIBRARY` → `$DSH_HOME/dsh-toolkit/image-gen/library.json`
- 每条记录：`{ id, title, text, size, images: [图片名…], createdAt, updatedAt }`
- `images` 记录该条生成过的图片名，按名从统一目录回显；「加为风格」「替换主体」直接填入右栏表单

### 参考图校验（本地路径）

参考图会**原样作为请求体的一部分**发给设置里配置的第三方生图接口，所以本地路径分支不放行任意文件：

- 扩展名白名单：`png` / `jpg` / `jpeg` / `webp` / `gif`
- 文件头嗅探：扩展名对但内容不是图片（`.png` 里装着 JSON、密钥文件…）一律拒绝
- 单张上限 10 MB（`MAX_REFERENCE_BYTES`），超限拒绝
- MIME 以**文件头**为准，不看扩展名（`.png` 里的 webp 按 `image/webp` 发）
- `https://` URL 与 data URL 走各自分支，校验不适用，语义不变
- 拒绝时返回可读原因（如「参考图不是支持的图片格式（.txt）：…」），不静默降级

## 文件

| 文件 | 作用 |
| --- | --- |
| `paths.js` | 统一数据目录：`$DSH_HOME/dsh-toolkit/image-gen/` 下 images / config.json / library.json / usage.jsonl / image-prompts.json / favorites.json，价目文件在 `$DSH_HOME/dsh-toolkit/token-usage/pricing.json`（按调用时的环境变量解析，不缓存）；`cleanText` 也在这里，全组件共用 |
| `favorites.js` | 收藏索引 `favorites.json`（`{ version: 1, images: { 文件名: { favoritedAt } } }`，0600）：打标记 / 清标记 / 读写名列表；收藏只是索引字段，**不复制图片** |
| `config.js` | 模型目录（组 + 组内模型）读写 + 密钥解析与来源标注 + 旧结构懒迁移（纯 helper，无路由） |
| `generate.js` | 生成链路：generateOnce / saveImage / generateMany / resolveReferenceImage（纯 helper；参考图本地路径做扩展名 + 文件头 + 体积校验） |
| `library.js` | 提示词库读写 / 增删改 / 图片归档（纯 helper，无路由） |
| `usage.js` | 生成计费记录读写（`IMAGE_GEN_USAGE` → 数据目录 `usage.jsonl`） |
| `prompts.js` | 图片 → 提示词索引读写（`IMAGE_GEN_PROMPTS` → 数据目录 `image-prompts.json`）+ 老图按提示词库反查（纯 helper，无路由） |
| `host.js` | 注册 `generate_image` 工具（用 config + generate） |
| `gallery-page.js` | `GET /api/image-gen`（分页 + 状态）、`GET /api/image-gen/file?name=` |
| `gallery-actions.js` | `POST /api/image-gen/delete` |
| `gallery-favorites.js` | `GET /api/image-gen/favorites`、`/favorites/file`、`POST /api/image-gen/favorite`、`/unfavorite`（全部走 `images/`，收藏只读写索引标记） |
| `settings-routes.js` | `GET/POST /api/image-gen/config`（组与组内模型增删改、设默认）、`POST /api/image-gen/config/test`、`/config/models` |
| `generate-route.js` | `POST /api/image-gen/generate`（面板右栏直接触发生成） |
| `library-routes.js` | `GET/POST /api/image-gen/library`（提示词库增删改与图片归档） |
| `client.js` | 浏览器面板源码（由根目录 `node build.mjs` 包装进统一入口） |

所有按名字取文件的接口都先 `basename()` 再比对白名单
`/^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/i`，用于阻断目录穿越。

## 配置与数据

模型目录统一在面板「设置」Tab 管理，落盘到本机配置文件（权限 0600）。`$DSH_HOME` 先读环境变量
`DSH_HOME`（空白字符串视为未设，值支持 `~` 展开），未设则回退 `~/.dsh`，本机默认数据目录即
`~/.dsh/dsh-toolkit/`：

| 用途 | 环境变量 | 默认路径 |
| --- | --- | --- |
| 数据目录 | `DSH_TOOLKIT_DATA` | `$DSH_HOME/dsh-toolkit` |
| 生成图目录 | `IMAGE_GEN_DIR` | `$DSH_HOME/dsh-toolkit/image-gen/images` |
| 模型目录 | `IMAGE_GEN_CONFIG` | `$DSH_HOME/dsh-toolkit/image-gen/config.json` |
| 提示词库 | `IMAGE_GEN_LIBRARY` | `$DSH_HOME/dsh-toolkit/image-gen/library.json` |
| 花费记录 | `IMAGE_GEN_USAGE` | `$DSH_HOME/dsh-toolkit/image-gen/usage.jsonl` |
| 提示词索引 | `IMAGE_GEN_PROMPTS` | `$DSH_HOME/dsh-toolkit/image-gen/image-prompts.json` |
| 收藏索引 | `IMAGE_GEN_FAVORITES` | `$DSH_HOME/dsh-toolkit/image-gen/favorites.json` |

目录按「**组**（一个网关一条）+ 组内模型」组织，配置文件结构为 v2：

```jsonc
{
  "version": 2,
  "providers": [
    { "id": "p…", "name": "组名（缺省取域名）", "baseURL": "https://…/v1", "keyEnv": "IMAGE_GEN_KEY_P…" }
  ],
  "models": [
    { "id": "<组 id>:<上游模型名>", "providerId": "p…", "name": "显示名", "model": "上游模型名", "pricePerImage": 0.04 }
  ],
  "defaultId": "<models[].id>",
  "keys": { "<keyEnv>": "明文密钥（凭据库不可写时才落这里）" }
}
```

- 模型 id 由「组 id + 上游模型名」推导，所以同一个模型挂到两个组不会撞车。
- **配置结构迁移（v1 → v2，懒迁移）**：读到老结构（平铺 `models[]` 带 `group` / `baseURL` / `keyEnv`，没有
  `version` / `providers`）即按 `(baseURL, keyEnv)` 归成组——组名取域名、组 id 用 `p1` / `p2`…（确定性，
  重复读取 id 不变）——`defaultId` 从旧 id 映射到新 id，`keys` 原样保留（老用户已存的密钥不丢）；
  首次写入才落盘，用户不需要做任何事。

- **收藏是索引字段，不是第二个目录**：收藏 / 取消收藏只动 `favorites.json` 里的标记，图片始终只有
  `image-gen/images/` 一份；删图时顺手清掉对应标记（`gallery-actions.js` 里的 `forgetFavorites`）。
  收藏库列表按 `favoritedAt` 倒序，只列文件仍存在的标记。

- **没有自动迁移**：插件不做老位置搬迁，也不写 `.migrated` 标记。升级后按根 README「没有自动迁移」
  一节的 `mv` 命令手工整理即可；旧 `favorites/` 目录不必搬（里面的副本可以删掉，在面板里重新点一次收藏
  就会重新打标记）。工具集 →「设置」分页能一眼核对每项的实际落点、是否存在、多大、什么时候改的。
- 插件目录的 `data/` 不再是运行时数据目录；`.gitignore` 仍然忽略它（历史遗留的空壳可以留着或删掉）。

- **每张单价**：**每条模型**自己的字段 `pricePerImage`（美元/张，模型编辑卡里填，不在组上）。
  配了价的模型会出现在「Token 用量 → 计价明细」（按张展示），每次成功生成
  记一条到 `$DSH_HOME/dsh-toolkit/image-gen/usage.jsonl`，由 token-usage 组件按「当前单价 × 张数」
  合并进成本统计（伪会话行「图片生成」）；没配价只记次数，成本记 0 并标「未配价」。

- **密钥解析顺序**：配置文件 `keys[keyEnv]` → DSH 凭据库 → 环境变量 `$keyEnv`；`keyEnv` 由所属组决定，
  面板新建的组用 `IMAGE_GEN_KEY_<组 id>`（组间互不覆盖），不再有一个共用的自定义模型密钥变量。
  保存时优先写凭据库，凭据服务不可写才回落配置文件；`CUSTOM_API_KEY` 只在旧配置迁移过来、或手工指定时
  作为某个组的 `keyEnv` 出现。
- **尺寸**：`1024x1024`（默认）、`1536x1024`、`1024x1536`、`1792x1024`、`1024x1792`，
  即 OpenAI Images API 的标准取值。
- 面板「测试」只做 `/models` 可达性检查，**不触发扣费生成**。