# dsh-toolkit

[简体中文](./README.md) | **English**

A DSH (DeepSeek Harness) Web bundle that ships two independent things in one package:

| Component | Sidebar panel | Tool exposed to the agent | What it solves |
| --- | --- | --- | --- |
| **image-gen** | 「图片生成」 (Image generation, order 49) | `generate_image` | Generate and edit images through any OpenAI-compatible image API, and manage the gallery and prompt library |
| **token-usage** | 「Token 用量」 (Token usage, order 50) | — | Token and cost accounting across every session, plus a one-year activity heatmap |

The two halves are independent: they use different panel keys (`image-gen` / `token-usage`) and different
route prefixes, and can be enabled separately.

> **Design principle: no vendor lock-in.** The plugin ships no vendor models, no default endpoint and no
> private gateway — the model catalog is entirely built by you. Anything that implements the standard
> `POST /images/generations` can be plugged in.

| Requirement | Value |
| --- | --- |
| DSH | **0.1.7 or newer** (verified on `0.1.7-rc.2`) |
| Runtime | DSH Web (`client.platform: web`), Node.js 18+ |
| License | [MIT](./LICENSE) |

The UI ships Chinese strings. In this document UI labels are quoted verbatim inside 「」 with a short English gloss.

---

## Installation

### Prerequisite

- DSH **0.1.7+** with a Web profile (by default under `~/.dsh/profiles/<profile>/`).

### Option 1 — install as a dependency (recommended)

1. Declare the dependency and the bundle in the profile's `package.json`:

   ```jsonc
   // ~/.dsh/profiles/<profile>/package.json
   {
     "dependencies": {
       "dsh-toolkit": "^1.3.0"
     },
     "dsh": {
       "profile": {
         "bundles": [
           // …
           "dsh-toolkit"
         ]
       }
     }
   }
   ```

2. Let DSH load it: call `plugin_manager` with `install_bundle` (target `dsh-toolkit`), or restart DSH.
   If it answers `application: restart-required`, restart and it will take effect.

### Option 2 — local link (development)

```jsonc
"dependencies": { "dsh-toolkit": "link:/absolute/path/to/dsh-toolkit" }
```

> ⚠️ `remove_bundle` also strips **both** declarations from the profile's `package.json`.
> Add them back before reinstalling, otherwise the package manager will look for a `link:` package
> on the registry and fail.

---

## Component 1: Image generation (image-gen)

### Set up in three steps

1. Open the sidebar panel **「图片生成」 → 「设置」** (Image generation → Settings).
2. Click **「+ 添加模型」** (Add model) and fill in:
   - **API 地址** (API address): e.g. `https://your-gateway.example.com/v1`
   - **模型 id** (Model id): the upstream model name; use **「获取可用模型」** to probe `/models` and pick one
   - **API 密钥** (API key): stored in the DSH credential store (preferred) or the config file
3. Click **「加入目录」** (Add to catalog), pick it in the **「默认模型」** dropdown, and generate.

The catalog holds any number of models: add, edit, delete, set default, and test each one's connectivity
(only hits `/models` — **never billed**).

### API contract

Generation always uses the **standard OpenAI Images API** — no vendor-specific protocol:

```http
POST {api base URL}/images/generations
Authorization: Bearer {api key}
Content-Type: application/json

{ "model": "<model id>", "prompt": "<prompt>", "n": 1, "size": "1024x1024" }
```

- For img2img / editing, add `"image": [<https URL or data URL>…]` (up to 9).
- The response is read from `data[].url`, or `data[].b64_json` (converted to a local file automatically).
- It **never calls `chat/completions`** and never sends non-standard fields.

### Agent tool: `generate_image`

| Parameter | Meaning |
| --- | --- |
| `prompt` | Required. Detailed prompt (subject, style, scene, composition, lighting) |
| `size` | Output pixel size: `1024x1024` (default), `1536x1024`, `1024x1536`, `1792x1024`, `1024x1792` |
| `count` | Number of images, 1–4 (default 1) |
| `image` | Optional reference images (img2img / edit / composition), up to 9; each is a local path, an `https://` URL, or a data URL |

The result carries `ok`, `model`, `count`, `size`, `imageUrls` (valid ~24 hours), `imageUrl`,
`files` (saved paths) and `partial` when some images failed.

- An empty catalog, or a default model without a usable key, **fails fast** with an actionable message
  instead of hammering the upstream API.
- Tool timeout: 6 minutes.

### Sidebar panel

| Area | Contents |
| --- | --- |
| Left · 「最近生成」 (recent) | Thumbnail wall, 48 per page, auto-continues near the bottom; click to enlarge, favorite, delete, download |
| Left · 「收藏库」 (favorites) | Same shape, backed by a separate directory |
| Left · 「提示词库」 (prompt library) | Reusable prompts with the images they produced; can feed the form via 「加为风格」 or 「替换主体」 |
| Right · 「文生图」 (text2img) | A five-part form plus size / count, generating without the agent |
| Right · 「图生图」 (img2img) | Upload references, drag thumbnails in from the left column, or paste a URL / local path |
| Right · 「设置」 (settings) | The model catalog: entries, keys, connectivity checks |

The generation form has five parts (the last two optional):

```
subject → style (stackable) → 构图与视角: … → 光线与氛围: … → 不要: …
```

- The negative part is appended as `不要：…` ("do not: …"); input already starting with
  `不要` / `避免` / `Avoid` is kept as-is.
- The lightbox supports `←` / `→` and closes with `Esc`.

### Files and storage

- Generated images go to the **plugin directory**, `data/images/` (favorites to `data/favorites/`) —
  **never into a project directory**. `IMAGE_GEN_DIR` relocates them (a leading `~` is expanded).
- Generation is serial (the APIs dislike concurrency); one failure does not abort the rest, and a failed
  disk write is skipped while the image URL is still returned.

### Prompt library

- File: plugin directory `data/library.json` (`IMAGE_GEN_LIBRARY` overrides it).
- Each record: `{ id, title, text, size, images: [names…], createdAt, updatedAt }`;
  `title` defaults to the first 24 characters.

---

## Component 2: Token usage and activity (token-usage)

Counts Token usage and cost across **all DSH sessions** (subagents included), straight from the session
event streams — no extra instrumentation. Live, persisted and subagent sessions are merged; persisted
sessions are cached incrementally by revision and invalidated as soon as an event arrives.

### Panel 「Token 用量」

- Header: `真实消耗 Tokens` total, `总请求数`, `总成本`; range presets `今天` (default) / `7 天` / `30 天` /
  `90 天` / `全部` / a custom range; costs switch between `$ 美元` and `¥ 人民币`; polls every 15 seconds.
- Metric cards: `新增输入`, `输出`, `缓存创建`, `缓存命中`, `推理`, `缓存命中率`.
- **活跃度 (activity)**: a one-year daily heatmap colored by request count.
- **模型分布 (model breakdown)**: `模型 / 请求 / 输入 / 输出 / 缓存读 / 缓存写 / 总量 / 成本 / 占比`.
- **使用趋势 (usage trend)**: dual-axis lines (tokens left, cost right), each series starting at its own
  first non-zero point.
- **请求查看 (requests)**: aggregated per session, filterable by source (all / main / subagent) and
  searchable; expanding a row shows individual requests.
- **计价明细 (pricing)**: a collapsed section to add / edit / delete prices, sync models.dev, and set the
  exchange rate.

### Pricing: three layers, ships with a table

1. **Built-in table**: `components/token-usage/pricing-defaults.mjs` (79 entries, USD per million tokens),
   always available.
2. **The plugin's own price file** `~/.dsh/token-usage/pricing.json` (`TOKEN_USAGE_PRICING` overrides the
   path) overrides the built-in table. Entries carry a source:
   - `source: 'user'` — added or edited in the panel; **never overwritten by a sync**;
   - `source: 'models-dev'` — written by a models.dev sync; replaced wholesale by the next sync.
3. **Deletion tombstones** `deletedModelIds` — anything you deleted is not resurrected by a sync.

A missing or corrupt file degrades to the built-in table and flags the error, instead of zeroing all costs.

- **models.dev sync**: 「⟳ 同步 models.dev」 fetches `https://models.dev/api.json` (15-second timeout),
  filters non-text models, normalizes ids, and writes **only models you have actually used**.
- **Exchange rate**: defaults to `7.2`, editable in the pricing section. All data is **stored and computed
  in USD**; conversion happens only in the display layer.
- To align gateway names with models.dev names, register them in `MODEL_ALIASES` in
  `components/token-usage/host.js`.

### Accounting rules

- `总量` (`loop`) = input + output + cache read + cache write.
- Cost = (input × rate + output × rate + cache read × rate + cache write × rate) ÷ 1,000,000.
- A model with no matching price costs 0 and its requests are marked `未配价` (unpriced).

---

## Configuration and environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `IMAGE_GEN_DIR` | Unified output directory (favorites live in the sibling dir) | `<plugin>/data/images` |
| `IMAGE_GEN_CONFIG` | Model catalog config file | `<plugin>/data/config.json` |
| `IMAGE_GEN_LIBRARY` | Prompt library file | `<plugin>/data/library.json` |
| `CUSTOM_API_KEY` | Default key source (an entry may define its own `keyEnv`) | — |
| `TOKEN_USAGE_PRICING` | Price file for token-usage | `~/.dsh/token-usage/pricing.json` |
| `MODELS_DEV_API_URL` | models.dev sync source (used by self-checks) | `https://models.dev/api.json` |
| `TOKEN_USAGE_DIAG` | Set to `1` to write token-usage diagnostics | off |

## Files on disk

| Path | Contents |
| --- | --- |
| `<plugin>/data/images/` | Unified output directory (`image-gen-<UTC stamp>-<index>.png`) |
| `<plugin>/data/favorites/` | Favorited images (favoriting copies; unfavoriting only deletes here) |
| `<plugin>/data/config.json` | Model catalog (`models` / `defaultId` / `keys`), mode 0600 |
| `<plugin>/data/library.json` | Prompt library, mode 0600 |
| `~/.dsh/token-usage/pricing.json` | User prices + models.dev sync results + exchange rate + tombstones |
| `<system temp>/dsh-token-usage-host.log` | token-usage diagnostics (only when `TOKEN_USAGE_DIAG=1`) |

---

## HTTP endpoints

Integrations beyond the panel and the agent can call these routes directly (registered through
`ctx.connection.fetch.register`).

### image-gen

| Method and path | Purpose |
| --- | --- |
| `GET /api/image-gen` | Paged list of saved images (`offset` / `limit`, default 24, max 60) |
| `GET /api/image-gen/file?name=` | Read a single image |
| `POST /api/image-gen/delete` | `{ name }` — delete an image |
| `GET /api/image-gen/favorites` | Paged favorites list |
| `GET /api/image-gen/favorites/file?name=` | Read a favorited image |
| `POST /api/image-gen/favorite` | `{ name }` — favorite |
| `POST /api/image-gen/unfavorite` | `{ name }` — unfavorite |
| `GET /api/image-gen/config` | Redacted catalog view (key status and source, never plaintext) |
| `POST /api/image-gen/config` | `action: setDefault` / `add` / `remove` |
| `POST /api/image-gen/config/test` | Connectivity check (only `/models`, never billed); pass `id` to test one entry |
| `POST /api/image-gen/config/models` | Probe the provider's model list, keeping only image models |
| `POST /api/image-gen/generate` | Panel text2img / img2img (shares one code path with `generate_image`) |
| `GET` / `POST` `/api/image-gen/library` | Prompt library (`action: upsert` / `delete` / `tag`) |

Every endpoint that reads a file by name runs `basename()` first and matches the allowlist
`/^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/i`, which blocks directory traversal.

### token-usage

| Method and path | Purpose |
| --- | --- |
| `GET /api/token-usage` | Full statistics; `range=today\|7d\|30d\|90d\|all\|custom` with `start` / `end`, `force=true` to skip the cache |
| `GET /api/token-usage/summary` | Summary numbers only |
| `GET /api/token-usage/pricing` | Price table and provenance (`builtin` / `overrides` / `sync` / `exchangeRate` / `error`) |
| `POST /api/token-usage/pricing` | `{ action: 'upsert' \| 'delete' \| 'sync' \| 'rate' }` |
| `GET /api/token-usage/activity` | Per-day activity for the last year |

---

## For developers

### Layout

```
dsh-toolkit/
├── index.js               # Host entry
├── client.js              # ⚠️ generated by build.mjs — do not edit by hand
├── build.mjs              # concatenates components/*/client.js into the client artifact
├── cordis.patch.yml       # the single Loader source, pointing at the active live-entry
├── live-entry-N.js        # the active Host entry (N increments to dodge the module cache)
├── tools/check-client.mjs # self-check: static + render smoke + host smoke
└── components/
    ├── image-gen/         # generation: config / generate / library / routes / client / host
    └── token-usage/       # usage: host (accounting + pricing) / activity / client / pricing-defaults.mjs
```

### Build and self-check

```bash
npm run build     # node build.mjs — required after touching any components/*/client.js
npm run check     # node tools/check-client.mjs — required after any change
npm test          # both, in order
```

The self-check has three stages:

1. **Static**: scans `components/*/client.js` for `const X = … X …` self-references (a TDZ bug that takes
   the whole panel down at runtime).
2. **Client render smoke**: renders both real Panels with a minimal React stub across loading / loaded /
   custom range / read failure / empty data / lightbox / empty gallery, and **asserts the key components
   were actually rendered**.
3. **Host smoke**: runs `apply()` of every host module against a stub ctx, asserting the `generate_image`
   schemas, every route and its status codes (traversal protection included), catalog add/edit/remove and
   empty-catalog behaviour, and prompt-library reads and writes; then runs token-usage's scan and price
   merging against a local server standing in for models.dev. **Nothing touches the network**, and the
   self-check writes only `.selfcheck-*.json` in the repo root (git-ignored).

### Hot reload (without restarting DSH)

After a Host-side change, Node's module cache will not invalidate, so switch to a new entry file:

```js
// live-entry-N.js
import { apply } from './components/token-usage/host.js?v=N'   // the ?v=N is the point
```

Point `cordis.patch.yml` at `./live-entry-N.js`, then run `plugin_manager` `remove_bundle` →
`install_bundle`. Client-only changes just need `node build.mjs` and a page refresh.

Two rules that are not negotiable:

1. **Once an entry URL fails to import, ESM remembers it** (module records are cached by resolved URL,
   failures included): after fixing the code you must use a **brand-new file name**.
2. **Shared modules' import lines need `?v=N` too**: `?v=N` only gives a fresh instance to modules that
   carry the query; a component's internal `import './generate.js'` (no query) hits the old instance.

---

## License

[MIT](./LICENSE) © 2026 dsh-toolkit contributors