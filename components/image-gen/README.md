# 组件一：image-gen（图片生成工具 + 侧边栏面板）

注册 `generate_image` 工具，走**标准 OpenAI Images 接口**：
`POST {baseURL}/images/generations`，请求体为

```json
{ "model": "<模型 id>", "prompt": "<提示词>", "n": 1, "size": "1024x1024" }
```

图生图时追加 `"image": [<https URL / data URL>…]`。**不走 chat/completions，也没有厂商私有协议。**

**不内置任何厂商模型**：模型目录完全由用户添加，插件本身不绑定任何服务商。

侧边栏「图片生成」：左列收纳（最近生成 / 收藏库 / 提示词库）· 右列文生图 / 图生图 / 设置。

## 能力

### generate_image 工具（Agent 可调用）

- **文生图**：`prompt` 必填 + `size`（像素尺寸，默认 `1024x1024`）+ `count`（1-4）
- **图生图 / 编辑**：`image` 数组（本地路径、https URL 或 data URL，≤9 张），prompt 里描述改动要求
- 返回图片 URL（约 24 小时有效）+ 落盘本地路径（默认 `~/image-gen`）
- 目录为空、或默认模型没有可用密钥时**快速失败**并给出可操作提示，不触网

### 侧边栏面板（order 49）

- **左：收纳** — 最近生成 / 收藏库 / 提示词库三个标签、缩略图墙、收藏 / 删除 / 放大 / 下载
- **右：文生图** — 五段式提示词（主体 / 风格 / 构图与视角 / 光线与氛围 / 负面）+ 尺寸 / 张数
- **右：图生图** — 上传参考图、从左侧拖入缩略图、或填 URL / 本机路径，再写编辑指令
- **右：设置** — 模型目录：添加 / 编辑 / 删除模型、设为默认、逐条测试连通性、探测上游模型列表

### 提示词库

- 库文件：`IMAGE_GEN_LIBRARY` → `~/.dsh/image-gen-library.json`
- 每条记录：`{ id, title, text, size, images: [图片名…], createdAt, updatedAt }`
- `images` 记录该条生成过的图片名，按名从统一目录回显；「加为风格」「替换主体」直接填入右栏表单

## 文件

| 文件 | 作用 |
| --- | --- |
| `config.js` | 模型目录读写 + 密钥解析与来源标注（纯 helper，无路由） |
| `generate.js` | 生成链路：generateOnce / saveImage / generateMany / resolveReferenceImage（纯 helper） |
| `library.js` | 提示词库读写 / 增删改 / 图片归档（纯 helper，无路由） |
| `host.js` | 注册 `generate_image` 工具（用 config + generate） |
| `gallery-page.js` | `GET /api/image-gen`（分页 + 状态）、`GET /api/image-gen/file?name=` |
| `gallery-actions.js` | `POST /api/image-gen/delete` |
| `gallery-favorites.js` | `GET /api/image-gen/favorites`、`/favorites/file`、`POST /api/image-gen/favorite`、`/unfavorite` |
| `settings-routes.js` | `GET/POST /api/image-gen/config`、`POST /api/image-gen/config/test`、`/config/models` |
| `generate-route.js` | `POST /api/image-gen/generate`（面板右栏直接触发生成） |
| `library-routes.js` | `GET/POST /api/image-gen/library`（提示词库增删改与图片归档） |
| `client.js` | 浏览器面板源码（由根目录 `node build.mjs` 包装进统一入口） |

所有按名字取文件的接口都先 `basename()` 再比对白名单
`/^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/i`，用于阻断目录穿越。

## 配置与数据

模型目录统一在面板「设置」Tab 管理，落盘到本机配置文件（权限 0600）：

| 用途 | 环境变量 | 默认路径 |
| --- | --- | --- |
| 模型目录 | `IMAGE_GEN_CONFIG` | `~/.dsh/image-gen.json` |
| 生成图目录 | `IMAGE_GEN_DIR` | `~/image-gen` |
| 收藏目录 | 随生成图目录 | `~/image-gen-favorites` |
| 提示词库 | `IMAGE_GEN_LIBRARY` | `~/.dsh/image-gen-library.json` |

- **密钥解析顺序**：该条目的 `keyEnv`（默认 `CUSTOM_API_KEY`）→ 配置文件 `keys[keyEnv]` →
  DSH 凭据库 → 环境变量 `$keyEnv`。保存时优先写凭据库，凭据服务不可写才回落配置文件。
- **尺寸**：`1024x1024`（默认）、`1536x1024`、`1024x1536`、`1792x1024`、`1024x1792`，
  即 OpenAI Images API 的标准取值。
- 面板「测试连通性」只做 `/models` 可达性检查，**不触发扣费生成**。