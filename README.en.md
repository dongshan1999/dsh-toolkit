# dsh-toolkit

[简体中文](./README.md) | **English**

A DSH (DeepSeek Harness) Web bundle that packs six independent concerns into one package, and folds five of the panels behind a
single "Toolkit" sidebar entry.

| Component | Panel | Agent tool | In one line |
| --- | --- | --- | --- |
| **image-gen** | Toolkit → Image generation | `generate_image` | Generate / edit images through any OpenAI-compatible endpoint; manages gallery, prompts and favorites |
| **token-usage** | "Token usage" (order 50, standalone panel) | — | Token spend and cost across every session, plus a one-year activity heatmap |
| **model-test** | Toolkit → Model test | — | Connectivity, first-token latency and output speed for models DSH already routes; fills their parameters |
| **notifications** | Toolkit → Notifications | — | Alert hub for 16 event types; alerts go to the OS notification center only, never inside the app |
| **mcp** | Toolkit → MCP | — | List / add / edit / delete / enable / probe the MCP servers in the profile's `cordis.patch.yml` |
| **skill** | Toolkit → Skill | — | Browse, edit, create, delete and toggle skills across six scan roots |
| **toolkit** | Toolkit (order 48) | — | Collects the five panels above into one shell, plus a built-in read-only Settings tab |

Each business component can be enabled on its own: panel keys (`image-gen` / `token-usage` / `model-test` / `notifications` /
`mcp` / `skill`) and route prefixes differ. The Toolkit is a shell: the browser side owns the sidebar entry and the tab switch, while the Host side
has one read-only settings route.

> **Design principle: no vendor lock-in.** The plugin ships no vendor models, no default endpoint, no private gateway —
> you add the catalog yourself, and any service implementing `POST /images/generations` works. `model-test` follows the same
> rule: it only tests models **DSH already routes**, and never introduces a second set of credentials or endpoints.

| Item | Requirement |
| --- | --- |
| DSH | **0.1.7 or newer** (verified against `0.1.7-rc.2`) |
| Runtime | DSH Web (`client.platform: web`), Node.js 18+ |
| License | [MIT](./LICENSE) |

The UI ships in Simplified Chinese; UI strings, file names, routes and identifiers are kept verbatim throughout these docs.

Documentation has two layers: this README is the **onboarding and index**; each component's requirements, constraints, API
contract and acceptance criteria live in its feature spec under [`docs/`](./docs/), and implementation notes live in that
component's own `README.md`.

---

## Installation

DSH **0.1.7+** with a Web profile (by default under `~/.dsh/profiles/<profile>/`).

### Option 1 — install as a dependency (recommended)

1. Declare the dependency and the bundle in the profile's `package.json`:

   ```jsonc
   // ~/.dsh/profiles/<profile>/package.json
   {
     "dependencies": {
       "dsh-toolkit": "^0.2.0"
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

2. Let DSH load it: call `plugin_manager`'s `install_bundle` (target `dsh-toolkit`), or restart DSH.
   If it returns `application: restart-required`, it takes effect after the restart.

### Option 2 — local link (development)

```jsonc
"dependencies": { "dsh-toolkit": "link:/absolute/path/to/dsh-toolkit" }
```

> ⚠️ `remove_bundle` deletes **both** declarations above from the profile's `package.json`. Add them back before reinstalling,
> otherwise the package manager looks for the `link:` package in the registry and fails.

---

## Components at a glance

One starting point per component; details live in the feature spec and the component README.

### Image generation (image-gen)

Toolkit → Image generation → Settings → **"+ Add model group"** (group name / API key / base URL) → **"Fetch models"**, tick the
ones you want and save → pick a default model, then go back to "Text to image". Favorites are not a second directory: images
exist once in `image-gen/images/`, and `favorites.json` only stores marks.

Contract, data model, error codes: [功能案-图片生成](./docs/功能案-图片生成.md) · implementation:
[components/image-gen/README.md](./components/image-gen/README.md)

### Token usage and activity (token-usage)

A standalone panel (order 50), not one of the Toolkit tabs. Counts tokens and cost across all sessions; pricing merges three
layers (built-in table → user overrides → models.dev sync) and image generation is billed per image. The one-year heatmap
aggregates per day.

Contract: [功能案-token用量](./docs/功能案-token用量.md) · implementation:
[components/token-usage/README.md](./components/token-usage/README.md)

### Model test (model-test)

The catalog comes from DSH's own routing (no second set of credentials). Test everything, one group, or a single model, and
read first-token latency / total time / tokens per second; parameters (`temperature / maxTokens / reasoningEffort`) are filled
in from the model name, and can be written into the real DSH config (`fill` or `replace`, with revision CAS).
Groups start collapsed — click a group header (name / arrow / empty space) to expand it, and "Test this group"
expands the group first.

Contract: [功能案-模型测试](./docs/功能案-模型测试.md) · implementation:
[components/model-test/README.md](./components/model-test/README.md)

### Notifications (notifications)

Subscribes to 16 event types (session finished, approval needed, model failure, sub-agent outcome, …). Alerts go through the
**OS notification center** only (they persist and click back into the session); nothing pops up inside the app. The panel is
history plus per-scenario switches. Unread state and dedupe counters live in `notifications/queue.json` and survive restarts.

Contract: [功能案-通知](./docs/功能案-通知.md) · implementation:
[components/notifications/README.md](./components/notifications/README.md)

### MCP management (mcp)

Lists every MCP server in the current profile's `cordis.patch.yml` (including disabled ones) and supports add / edit / delete /
toggle / one-shot probe. YAML edits preserve `!!js` tags and comments byte for byte; secrets are masked by default and only
returned in plaintext with `reveal=1`.

Contract and error codes: [功能案-mcp管理](./docs/功能案-mcp管理.md) · implementation:
[components/mcp/README.md](./components/mcp/README.md)

### Skill management (skill)

Lists every skill across six scan roots (broken files are listed with a reason) and supports create / edit / delete / toggle
inside writable roots. Frontmatter is validated against the official rules before saving; disk is the source of truth and the
official service is only a cross-check.

Contract: [功能案-skill管理](./docs/功能案-skill管理.md) · implementation:
[components/skill/README.md](./components/skill/README.md)

### Toolkit shell (toolkit)

The sidebar carries a single "Toolkit" entry; inside, tabs switch between Image generation / Model test / Notifications /
MCP / Skill / Settings. A tab you leave is unmounted (unsaved forms reset). Settings is a built-in read-only page showing
where each component's data lands, whether it exists, how large it is and when it last changed.

Contract: [功能案-工具集壳](./docs/功能案-工具集壳.md) · implementation:
[components/toolkit/README.md](./components/toolkit/README.md)

---

## Configuration and environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `DSH_TOOLKIT_DATA` | Move the whole data directory (absolute path, `~` expanded) | `$DSH_HOME/dsh-toolkit` |
| `IMAGE_GEN_DIR` | Where generated images land | `$DSH_HOME/dsh-toolkit/image-gen/images` |
| `IMAGE_GEN_CONFIG` | Model catalog file | `$DSH_HOME/dsh-toolkit/image-gen/config.json` |
| `IMAGE_GEN_LIBRARY` | Prompt library file | `$DSH_HOME/dsh-toolkit/image-gen/library.json` |
| `IMAGE_GEN_USAGE` | Generation billing log | `$DSH_HOME/dsh-toolkit/image-gen/usage.jsonl` |
| `IMAGE_GEN_PROMPTS` | Image → prompt index | `$DSH_HOME/dsh-toolkit/image-gen/image-prompts.json` |
| `IMAGE_GEN_FAVORITES` | Favorites index | `$DSH_HOME/dsh-toolkit/image-gen/favorites.json` |
| `IMAGE_GEN_KEY_<group id>` | Per-group API key (groups never overwrite each other) | — |
| `TOKEN_USAGE_PRICING` | token-usage's own price file | `$DSH_HOME/dsh-toolkit/token-usage/pricing.json` |
| `MODEL_TEST_PARAMS` | Per-model parameter overrides | `$DSH_HOME/dsh-toolkit/model-test/params.json` |
| `MODEL_TEST_PRESETS` | models.dev presets (sync result) | `$DSH_HOME/dsh-toolkit/model-test/presets.json` |
| `MODELS_DEV_API_URL` | models.dev sync source (self-check) | `https://models.dev/api.json` |
| `TOKEN_USAGE_DIAG` | `1` enables token-usage diagnostics | off |
| `NOTIFICATIONS_CONFIG` | Notification config (master switch / thresholds / 16 scenario switches) | `$DSH_HOME/dsh-toolkit/notifications/config.json` |
| `NOTIFICATIONS_QUEUE` | Notification queue (unread state, dedupe counters) | `$DSH_HOME/dsh-toolkit/notifications/queue.json` |
| `NOTIFICATIONS_NATIVE` | `off` disables the OS notification channel, keeping in-app history only (self-check) | on |
| `DSH_HOME` | DSH home (determines the default data directory) | `~/.dsh` |

`DSH_TOOLKIT_DATA` relocates the whole data directory; the other variables override one path each. `$DSH_HOME` is read from the
environment first (blank counts as unset, `~` is expanded), falling back to `~/.dsh`. Key resolution order: config
`keys[keyEnv]` → DSH credential store → environment variable `keyEnv`.

---

## Files on disk

Runtime data is split **per component** under `$DSH_HOME/dsh-toolkit/` (here: `~/.dsh/dsh-toolkit/`); components never share a file:

| Path | Contents |
| --- | --- |
| `image-gen/images/` | The only image directory (`image-gen-<UTC timestamp>-<seq>.png`) |
| `image-gen/favorites.json` | Favorites index (`{ version: 1, images: { name: { favoritedAt } } }`), mode 0600 |
| `image-gen/config.json` | Model catalog v2 (`version` / `providers` / `models` / `defaultId` / `keys`), 0600 |
| `image-gen/library.json` | Prompt library, 0600 |
| `image-gen/usage.jsonl` | Generation billing log (one line per successful generation) |
| `image-gen/image-prompts.json` | Image → prompt index, 0600 |
| `token-usage/pricing.json` | User prices + models.dev sync result + exchange rate + tombstones |
| `model-test/params.json` | Per-model parameter overrides |
| `model-test/presets.json` | models.dev presets (sync result) |
| `notifications/config.json` | Notification config, 0600 |
| `notifications/queue.json` | Notification queue, survives restarts, 0600 |
| `<system temp>/dsh-token-usage-host.log` | token-usage diagnostics (only with `TOKEN_USAGE_DIAG=1`) |

`mcp` and `skill` occupy **no data directory**: they read and write the current profile's `cordis.patch.yml` and `skills/` directly.

### No automatic migration

The plugin **never** moves old data at startup. Coming from the old flat layout, move what you want to keep by hand:

```bash
mkdir -p ~/.dsh/dsh-toolkit/image-gen
mv ~/.dsh/dsh-toolkit/images/*            ~/.dsh/dsh-toolkit/image-gen/images/ 2>/dev/null
mv ~/.dsh/dsh-toolkit/config.json         ~/.dsh/dsh-toolkit/image-gen/ 2>/dev/null
mv ~/.dsh/dsh-toolkit/library.json        ~/.dsh/dsh-toolkit/image-gen/ 2>/dev/null
mv ~/.dsh/dsh-toolkit/usage.jsonl         ~/.dsh/dsh-toolkit/image-gen/ 2>/dev/null
mv ~/.dsh/dsh-toolkit/image-prompts.json  ~/.dsh/dsh-toolkit/image-gen/ 2>/dev/null
```

The old `favorites/` directory need not be moved: put the images back under `image-gen/images/` and star them again.
Afterwards, refresh Toolkit → Settings to confirm where everything landed.

---

## HTTP endpoints

Panels and anything outside the agent can call these routes directly (registered through `ctx.connection.fetch.register`).
Inputs, response fields and error codes are documented in each feature spec's "API contract" section.

| Prefix | Component | Contract |
| --- | --- | --- |
| `/api/image-gen` | image-gen | [功能案-图片生成](./docs/功能案-图片生成.md) |
| `/api/token-usage` | token-usage | [功能案-token用量](./docs/功能案-token用量.md) |
| `/api/model-test` | model-test | [功能案-模型测试](./docs/功能案-模型测试.md) |
| `/api/notifications` | notifications | [功能案-通知](./docs/功能案-通知.md) |
| `/api/mcp` | mcp | [功能案-mcp管理](./docs/功能案-mcp管理.md) |
| `/api/skill` | skill | [功能案-skill管理](./docs/功能案-skill管理.md) |
| `/api/toolkit` | toolkit | [功能案-工具集壳](./docs/功能案-工具集壳.md) |

Every file-by-name endpoint runs `basename()` and then matches `/^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/i`, which blocks path traversal.

---

## Development and self-check

```bash
npm run build     # node build.mjs — required after editing any components/*/client.js
npm run check     # node tools/check-client.mjs — required after any change
npm run scrub     # node tools/scrub-check.mjs — pre-upload secret/PII scan (worktree + git history)
npm test          # build + check
```

The self-check has five stages; the command output carries the detail:

1. **Static**: self-referencing `const X = … X …` (TDZ) in `components/*/client.js`, and hard-coded `#fff` on brand backgrounds.
2. **Client render smoke**: renders all seven panels with a minimal React stub across loading / empty / error / interaction branches.
3. **Host smoke**: runs each component's `apply()` on a stub ctx — `generate_image` schema, every route and status code, model-test's
   three verdicts, token-usage stats and pricing merge; notifications has its own stage (`[3b]`) firing all 16 event types.
4. **MCP real read/write (`[3b]`)**: drives add/edit/delete/toggle against a sandboxed fake patch; asserts byte-level preservation of
   `!!js` tags, block scalars and comments, masked secrets by default, error branches and `applied:false`; **only touches temp dirs**.
5. **Data directory (`[4]`)**: default paths and env overrides, favorites index behaviour, `migrate.js` gone, and the `toolkit`
   `GET /api/toolkit/settings` component list and existence flags.

The check never touches the network and never fires an OS notification (`NOTIFICATIONS_NATIVE=off`); artifacts go to
`.selfcheck-*.json` in the repo root (git-ignored).

### Layout

```
dsh-toolkit/
├── index.js               # Host entry
├── client.js              # ⚠️ generated by build.mjs — do not edit
├── build.mjs              # concatenates components/*/client.js into the client artifact
├── cordis.patch.yml       # single Loader source, points at the current live-entry
├── live-entry-N.js        # active Host entry (N increments to bypass the module cache)
├── docs/                  # per-component feature specs (requirements / contract / acceptance)
├── tools/check-client.mjs # self-check
├── tools/scrub-check.mjs  # pre-upload secret/PII scan
└── components/            # image-gen / mcp / model-test / notifications / skill / toolkit / token-usage
```

### Hot reload (without restarting DSH)

Node's module cache will not invalidate a Host change, so switch to a new entry and bump the `?v=N` on shared imports:

```js
// live-entry-N.js
import { apply } from './components/token-usage/host.js?v=N'   // the ?v=N is the point
```

- Point the repository's `cordis.patch.yml` at `./live-entry-N.js` and update the `.gitignore` exception to the same N
  (the self-check asserts they agree).
- **Don't leave the old entry on disk**: the Loader's composition tree may still be pinned to it, and once that old entry
  imports a module you deleted, the whole plugin fails to activate and every `/api/*` turns into a 404. The self-check
  `import()`s every entry on disk to catch this early.
- To make a running process pick up the new entry: restart DSH, or append a comment line to
  `~/.dsh/profiles/<profile>/cordis.patch.yml` to force the composition to be re-resolved.
- Client-only changes: run `node build.mjs`; `dsh-client-hmr` pushes `rebuilt` and the page swaps the module. Refresh when the
  HMR channel is not connected.

---

## License

[MIT](./LICENSE) © 2026 dsh-toolkit contributors
