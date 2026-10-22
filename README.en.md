# dsh-toolkit

[简体中文](./README.md) | **English**

A DSH desktop (DeepSeek Harness App) bundle that packs seven independent concerns into one package, and folds six of the panels behind a
single "Toolkit" sidebar entry.

| Component | Panel | Agent tool | In one line |
| --- | --- | --- | --- |
| **image-gen** | Toolkit → Image generation | `generate_image` | Generate / edit images through any OpenAI-compatible endpoint; manages gallery, prompts and favorites |
| **token-usage** | "Token usage" (order 50, standalone panel) | — | Token spend and cost across every session, plus a one-year activity heatmap |
| **model-test** | Toolkit → Model test | — | Connectivity, first-token latency and output speed for models DSH already routes; fills their parameters |
| **notifications** | Toolkit → Notifications | — | Alert hub for 16 event types; alerts go to the OS notification center only, never inside the app |
| **mcp** | Toolkit → MCP | — | List / add / edit / delete / enable / probe the MCP servers in the profile's `cordis.patch.yml` |
| **skill** | Toolkit → Skill | — | Browse, edit, create, delete and toggle skills across six scan roots |
| **clipboard** | Toolkit → Clipboard | — | Turns very long pasted text into a file and leaves a single `@"path"` reference in the composer |
| **toolkit** | Toolkit (order 48) | — | Collects the six panels above into one shell, plus a built-in read-only Settings tab |

Each business component can be enabled on its own: panel keys (`image-gen` / `token-usage` / `model-test` / `notifications` /
`mcp` / `skill` / `clipboard`) and route prefixes differ. The Toolkit is a shell: the client UI owns the sidebar entry and the tab switch, while the Host side
has one read-only settings route.

> **Design principle: no vendor lock-in.** The plugin ships no vendor models, no default endpoint, no private gateway —
> you add the catalog yourself, and any service implementing `POST /images/generations` works. `model-test` follows the same
> rule: it only tests models **DSH already routes**, and never introduces a second set of credentials or endpoints.

| Item | Requirement |
| --- | --- |
| DSH | **0.2.1 or newer** (developed and verified against `0.2.1-rc.2`) |
| Runtime | DSH desktop (DeepSeek Harness App; client plugins are still loaded with `client.platform: web`), Node.js 18+ (needed when installing the plugin from a command line) |
| License | [MIT](./LICENSE) |

The UI ships in Simplified Chinese; UI strings, file names, routes and identifiers are kept verbatim throughout these docs.

This README is the onboarding index; each component's requirements, constraints, API contract and acceptance criteria live in its feature spec under [`docs/`](./docs/).

---

## Installation

DSH desktop **0.2.1+** with a profile (by default under `~/.dsh/profiles/<profile>/`).

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

### Option 2 — local link install

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

See: [功能案-图片生成](./docs/功能案-图片生成.md)

### Token usage and activity (token-usage)

A standalone panel (order 50), not one of the Toolkit tabs. Counts tokens and cost across all sessions; pricing merges three
layers (built-in table → user overrides → models.dev sync) and image generation is billed per image. The one-year heatmap
aggregates per day.

See: [功能案-token用量](./docs/功能案-token用量.md)

### Model test (model-test)

The catalog comes from DSH's own routing (no second set of credentials). Test everything, one group, or a single model, and
read first-token latency / total time / tokens per second; parameters (`temperature / maxTokens / reasoningEffort`) are filled
in from the model name, and can be written into the real DSH config (`fill` or `replace`, with revision CAS).
Groups start collapsed — click a group header (name / arrow / empty space) to expand it, and "Test this group"
expands the group first.

See: [功能案-模型测试](./docs/功能案-模型测试.md)

### Notifications (notifications)

Subscribes to 16 event types (session finished, approval needed, model failure, sub-agent outcome, …). Alerts go through the
**OS notification center** only (they persist and click back into the session); nothing pops up inside the app. The panel is
history plus per-scenario switches. Unread state and dedupe counters live in `notifications/queue.json` and survive restarts.

See: [功能案-通知](./docs/功能案-通知.md)

### MCP management (mcp)

Lists every MCP server in the current profile's `cordis.patch.yml` (including disabled ones) and supports add / edit / delete /
toggle / one-shot probe. YAML edits preserve `!!js` tags and comments byte for byte; secrets are masked by default and only
returned in plaintext with `reveal=1`.

See: [功能案-mcp管理](./docs/功能案-mcp管理.md)

### Skill management (skill)

Lists every skill across six scan roots (broken files are listed with a reason) and supports create / edit / delete / toggle
inside writable roots. Frontmatter is validated against the official rules before saving; disk is the source of truth and the
official service is only a cross-check.

See: [功能案-skill管理](./docs/功能案-skill管理.md)

### Clipboard (clipboard)

Pasting long text copied from a terminal, CI log or editor would otherwise fill the whole composer. This component
intercepts the paste: text beyond the threshold (2000 characters / 30 lines by default) is written to
`$DSH_HOME/dsh-toolkit/clipboard/<date>/<HHmmss>-<sha1 8 chars>.<ext>` and the composer only receives one
`@"absolute path"` line (`@path` when there is no whitespace), so the agent reads a file reference instead of thousands
of characters. The extension follows the text formats the clipboard actually offers (a single one keeps its format —
`.txt` / `.html` / `.csv` / `.md`; two or more fall back to `.txt`); nothing is guessed from content, and image or file
pastes are left alone. The body is written in full — never truncated by size — and the panel edits thresholds, toggles
auto-conversion, previews and deletes entries, and can enable automatic cleanup (off by default; prunes by age or
total size and only ever touches its own date folders).

See: [功能案-剪贴板](./docs/功能案-剪贴板.md)

### Toolkit shell (toolkit)

The sidebar carries a single "Toolkit" entry; inside, tabs switch between Image generation / Model test / Notifications /
MCP / Skill / Clipboard / Settings. A tab you leave is unmounted (unsaved forms reset). Settings is a built-in read-only page showing
where each component's data lands, whether it exists, how large it is and when it last changed.

See: [功能案-工具集壳](./docs/功能案-工具集壳.md)

---

## License

[MIT](./LICENSE) © 2026 dsh-toolkit contributors
