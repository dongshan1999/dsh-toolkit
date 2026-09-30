// ⚠️ 本文件由 build.mjs 生成 —— 不要直接手改；改 components/<id>/client.js 后重新 node build.mjs
// dsh-toolkit — Client 入口：各组件面板合并到一个浏览器模块，作用域互相独立。

// ─── 组件：image-gen ───
function imageGenClientFactory(require) {
    const React = require('react')

    const CSS = [
      '.ag-root{display:flex;flex-direction:column;gap:12px;padding:16px 18px;overflow:auto;height:100%;min-height:0;box-sizing:border-box;background:var(--dsw-alias-bg-layer-0)}',
      '/* 模型目录：与 DSH 设置页同风格（参考 ui-settings-models：卡片 + 圆点 + grid 行 + 虚线添加钮） */',
      '.agx-card{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:12px;display:flex;flex-direction:column;gap:10px;padding:12px 14px}',
      '.agx-head{display:flex;align-items:center;gap:8px;min-width:0}',
      '.agx-title{font-size:14px;font-weight:500;color:var(--dsw-alias-label-primary);flex:none}',
      '.agx-sub{font-size:12px;color:var(--dsw-alias-label-tertiary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.agx-head-right{margin-left:auto;flex:none;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.agx-dot{width:8px;height:8px;border-radius:50%;flex:none;display:inline-block}',
      '.agx-dot-ok{background:var(--dsw-alias-state-success-primary)}',
      '.agx-dot-miss{background:var(--dsw-alias-state-error-primary)}',
      '.agx-rows{display:flex;flex-direction:column;gap:6px}',
      '.agx-row{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) auto;gap:6px 10px;align-items:center;border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;padding:8px 10px}',
      '.agx-row-name{font-size:13px;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:wrap}',
      '.agx-tag{border:.5px solid var(--dsw-alias-border-l3);border-radius:5px;color:var(--dsw-alias-label-secondary);padding:1px 6px;font-size:11px;flex:none}',
      '.agx-tag-ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}',
      '.agx-tag-miss{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}',
      '.agx-row-id{font-size:12px;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.agx-row-actions{display:inline-flex;gap:4px}',
      '.agx-btn-sm{border:.5px solid var(--dsw-alias-border-l3);background:none;border-radius:6px;height:26px;padding:0 9px;font-size:12px;color:var(--dsw-alias-label-primary);cursor:pointer;font-family:inherit;white-space:nowrap}',
      '.agx-btn-sm:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.agx-btn-sm:disabled{opacity:.45;cursor:not-allowed}',
      '.agx-btn-sm-danger{color:var(--dsw-alias-state-error-primary)}',
      '.agx-btn-sm-danger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}',
      '.agx-add-btn{border:1px dashed var(--dsw-alias-border-l3);border-radius:10px;min-width:180px;height:40px;width:100%;background:none;color:var(--dsw-alias-label-primary);cursor:pointer;font-size:13px;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px}',
      '.agx-add-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.agx-editor{background:var(--dsw-alias-bg-module-platform,var(--dsw-alias-bg-layer-1));border-radius:10px;display:flex;flex-direction:column;gap:12px;padding:14px 16px}',
      '.agx-editor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px}',
      '.agx-editor-grid .ag-field{min-width:0}',
      '.agx-actions{display:flex;justify-content:flex-end;gap:8px}',
      '.agx-editor-header{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}',
      '.agx-editor-title{font-size:14px;font-weight:500;color:var(--dsw-alias-label-primary)}',
      '.agx-editor-route{font-size:12px;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace)}',
      '/* 单行卡片 + 分段 tab + 折叠（对照官方设置页截图） */',
      '.agx-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:10px;padding:10px 14px}',
      '.agx-item-name{display:inline-flex;align-items:center;gap:6px;min-width:0;font-size:14px;color:var(--dsw-alias-label-primary);flex-wrap:wrap}',
      '.agx-item-actions{display:inline-flex;gap:6px;align-items:center}',
      '.agx-btn-edit{border:.5px solid var(--dsw-alias-border-l3);background:none;border-radius:7px;height:28px;padding:0 12px;font-size:12px;color:var(--dsw-alias-label-primary);cursor:pointer;font-family:inherit;white-space:nowrap}',
      '.agx-btn-edit:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.agx-btn-edit:disabled{opacity:.45;cursor:not-allowed}',
      '.agx-btn-text{border:none;background:none;height:28px;padding:0 8px;font-size:12px;color:var(--dsw-alias-state-error-primary);cursor:pointer;font-family:inherit}',
      '.agx-btn-text:hover{background:var(--dsw-alias-interactive-bg-hover-danger)}',
      '.agx-tabs{display:inline-flex;gap:4px;background:var(--dsw-alias-bg-layer-2);border-radius:9px;padding:3px;align-self:flex-start}',
      '.agx-tab{border:none;border-radius:7px;background:none;color:var(--dsw-alias-label-secondary);height:30px;padding:0 14px;font-size:13px;cursor:pointer;font-family:inherit}',
      '.agx-tab-on{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-weight:500}',
      '.agx-collapse{border-top:.5px solid var(--dsw-alias-border-l2);padding-top:10px;display:flex;flex-direction:column;gap:10px}',
      '.agx-collapse>summary{list-style:none;cursor:pointer;width:fit-content;font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;gap:6px}',
      '.agx-collapse>summary::-webkit-details-marker{display:none}',
      '.agx-collapse>summary::before{content:"";border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;width:5px;height:5px;transform:rotate(-45deg);transition:transform .12s}',
      '.agx-collapse[open]>summary::before{transform:rotate(45deg)}',
      '.agx-fetch{display:flex;justify-content:space-between;align-items:baseline;gap:8px}',
      '.agx-link{border:none;background:none;height:24px;padding:0 4px;font-size:12px;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-family:inherit}',
      '.agx-link:hover:not(:disabled){color:var(--dsw-alias-label-primary)}',
      '.agx-link:disabled{opacity:.5;cursor:not-allowed}',
      '.ag-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}',
      '.ag-title{font-size:17px;font-weight:650;color:var(--dsw-alias-label-primary);margin:0 0 4px}',
      '.ag-sub{font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.ag-btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:6px 11px;font-size:12px;cursor:pointer}',
      '.ag-btn:hover{border-color:#8b8b95}',
      '.ag-btn:disabled{opacity:1;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1);cursor:not-allowed}',
      '.ag-btn-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600}',
      '.ag-btn-primary:disabled{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1)}',
      '.ag-btn-danger{color:#ff6b6b;border-color:#ff6b6b55}',
      '.ag-btn-on{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary);font-weight:600}',
      '.ag-tabs{display:flex;gap:6px;flex-wrap:wrap}',
      '.ag-cols{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}',
      '.ag-col{min-width:300px;display:flex;flex-direction:column;gap:10px}',
      '.ag-col-left{flex:1 1 440px}',
      '.ag-col-right{flex:1 1 360px}',
      '.ag-stats{display:flex;gap:10px;flex-wrap:wrap}',
      '.ag-stat{flex:1;min-width:130px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:10px 13px;display:flex;flex-direction:column;gap:4px}',
      '.ag-stat-label{font-size:11px;color:var(--dsw-alias-label-secondary)}',
      '.ag-stat-value{font-size:18px;font-weight:650;color:var(--dsw-alias-label-primary);word-break:break-all}',
      '.ag-ok{color:var(--dsw-alias-state-success-primary)}',
      '.ag-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;min-width:0}',
      '.ag-section{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);margin:2px 0 0}',
      '.ag-hint{font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary)}',
      '.ag-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}',
      '.ag-tile{position:relative;cursor:pointer}',
      '.ag-thumb{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}',
      '.ag-tile:hover .ag-thumb{border-color:#8b8b95}',
      '.ag-tile-del{position:absolute;top:6px;right:6px;opacity:0;border:0;border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;background:#000c;color:#fff}',
      '.ag-tile:hover .ag-tile-del{opacity:1}',
      '.ag-star{position:absolute;top:6px;left:6px;border:0;border-radius:6px;padding:3px 6px;font-size:13px;cursor:pointer;background:#000c;color:#ffd166;line-height:1}',
      '.ag-star.off{color:#fff;opacity:.7}',
      '.ag-caption{font-size:10px;color:var(--dsw-alias-label-secondary);word-break:break-all;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ag-empty{padding:18px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px}',
      '.ag-field{display:flex;flex-direction:column;gap:5px}',
      '.ag-field label,.ag-label{font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.ag-input,.ag-select,.ag-textarea{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:7px 9px;font-size:13px;font-family:inherit}',
      '.ag-textarea{min-height:104px;resize:vertical;line-height:1.5}',
      '.ag-input:focus,.ag-select:focus,.ag-textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}',
      '.ag-row{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}',
      '.ag-row .ag-field{flex:1;min-width:110px}',
      '.ag-modelbar{display:grid;grid-template-columns:minmax(100px,.28fr) minmax(0,1fr);gap:6px 10px;align-items:center}',
      '.ag-modelbar label{font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.ag-modelbar .ag-model-detail{grid-column:2;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ag-generate-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;align-items:end}',
      '.ag-generate-options .ag-field{min-width:0}',
      '.ag-ref-section{display:flex;flex-direction:column;gap:7px}',
      '.ag-ref-heading{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.ag-ref-drop{display:flex;flex-direction:column;gap:7px;border:1px dashed var(--dsw-alias-border-l2);border-radius:7px;padding:8px;transition:border-color .15s,background .15s}',
      '.ag-ref-drop:hover{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 5%,transparent)}',
      '.ag-ref-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}',
      '.ag-ref-url{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center}',
      '.ag-ref-url .ag-input{min-width:0}',
      '.ag-ref-hint{font-size:11px;line-height:1.4;color:var(--dsw-alias-label-secondary)}',
      '.ag-ref-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(82px,1fr));gap:7px}',
      '.ag-ref-tile{position:relative;min-width:0;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:4px;background:var(--dsw-alias-bg-layer-1)}',
      '.ag-ref-preview{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;background:var(--dsw-alias-bg-layer-2)}',
      '.ag-ref-placeholder{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:1;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px;text-align:center}',
      '.ag-ref-name{margin-top:4px;font-size:10px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ag-ref-remove{position:absolute;top:6px;right:6px;width:22px;height:22px;border:0;border-radius:50%;background:#000c;color:#fff;cursor:pointer;line-height:1}',
      '@media(max-width:560px){.ag-modelbar{grid-template-columns:1fr}.ag-modelbar .ag-model-detail{grid-column:1}.ag-generate-options{gap:6px}.ag-ref-grid{grid-template-columns:repeat(auto-fill,minmax(68px,1fr))}}',
      '.ag-styles{display:flex;flex-direction:column;gap:5px}',
      '.ag-preview{border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:7px 9px;background:var(--dsw-alias-bg-layer-1)}',
      '.ag-preview summary{cursor:pointer;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.ag-preview-text{margin-top:7px;max-height:180px;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary)}',
      '.ag-chips{display:flex;flex-wrap:wrap;gap:6px}',
      '.ag-chip{display:flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:3px 7px;font-size:11px;max-width:100%}',
      '.ag-chip img{width:34px;height:34px;object-fit:cover;border-radius:5px}',
      '.ag-chip-x{border:0;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:13px;line-height:1;padding:0 2px}',
      '.ag-msg{padding:8px 10px;border-radius:7px;font-size:12px;line-height:1.5;word-break:break-all}',
      '.ag-msg-ok{background:var(--dsw-alias-state-success-bg, #0a2a18);color:var(--dsw-alias-state-success-primary,#4ade80)}',
      '.ag-msg-err{background:#2a1010;color:#ff8a8a}',
      '.ag-generation{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--dsw-alias-brand-primary);border-radius:7px;color:var(--dsw-alias-label-primary);font-size:12px}',
      '.ag-spinner{width:13px;height:13px;flex:0 0 13px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:ag-spin .8s linear infinite}',
      '@keyframes ag-spin{to{transform:rotate(360deg)}}',
      '.ag-result{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}',
      '.ag-result .ag-thumb{border-radius:8px}',
      '.ag-note{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.5}',
      '.ag-lib-item{border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}',
      '.ag-lib-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}',
      '.ag-lib-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.ag-lib-meta{font-size:11px;color:var(--dsw-alias-label-secondary)}',
      '.ag-lib-text{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.5;white-space:pre-wrap;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.ag-lib-actions{display:flex;gap:6px;flex-wrap:wrap}',
      '.ag-lib-imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px}',
      '.ag-lib-imgs .ag-thumb{border-radius:6px}',
      '.ag-glyph{border-radius:5px;background:var(--dsw-alias-brand-primary);color:#fff;font-weight:600;display:flex;align-items:center;justify-content:center}',
      '.ag-lb{position:fixed;inset:0;z-index:80;background:#000c;display:flex;align-items:center;justify-content:center;padding:24px}',
      '.ag-lb-img{max-width:min(92vw,1400px);max-height:82vh;object-fit:contain;border-radius:10px;box-shadow:0 16px 60px #0008}',
      '.ag-lb-bar{position:absolute;left:0;right:0;bottom:18px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap}',
      '.ag-lb-nav{position:absolute;top:50%;transform:translateY(-50%);border:0;background:#000a;color:#fff;width:44px;height:44px;border-radius:99px;font-size:22px;cursor:pointer}',
      '.ag-lb-nav.prev{left:18px}',
      '.ag-lb-nav.next{right:18px}',
      '.ag-lb-name{position:absolute;top:18px;left:50%;transform:translateX(-50%);color:#fff;font-size:12px;opacity:.85;max-width:70vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    ].join('')

    const PANEL_KEY = 'image-gen'
    const srcRecent = (name) => '/api/image-gen/file?name=' + encodeURIComponent(name)
    const srcFav = (name) => '/api/image-gen/favorites/file?name=' + encodeURIComponent(name)
    const FETCH_OPTS = { headers: { accept: 'application/json', 'content-type': 'application/json' } }
    const FALLBACK_SIZES = ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792']
    const COUNT_OPTIONS = [1, 2, 3, 4]
    const MAX_REF_COUNT = 9
    // 与 host.js 里 generate_image 的 TOOL_TIMEOUT_MS 对齐：面板请求同样设上限，
    // 上游挂住时计时器不会永远转下去（此前出现过「生成中 00:16:57」卡死）。
    const GENERATION_TIMEOUT_MS = 360000
    const LIB_KINDS = ['prompt']
    const LIB_LABEL = { prompt: '提示词库' }
    // 标签 id 是单数（面板路由用它当 kind），库文件里的字段是复数，取值时要映射。
    const LIB_KEY = { prompt: 'prompts' }
    // 模型条目密钥来源的中文标签（keySource → 显示名）。
    const KEY_SOURCE_LABEL = { credentials: '凭据库', config: '配置文件', env: '环境变量' }

    const PANEL_STATE_KEY = 'dsh.image-gen.panel.v1'
    let generationInFlight = false

    function readPanelMemory() {
      try {
        const raw = window.localStorage && window.localStorage.getItem(PANEL_STATE_KEY)
        const parsed = raw ? JSON.parse(raw) : {}
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch {
        return {}
      }
    }

    let panelMemory = readPanelMemory()
    if (panelMemory.gen?.busy === true && !generationInFlight) {
      panelMemory = {
        ...panelMemory,
        gen: { ...panelMemory.gen, busy: false, error: '页面关闭前的生成已中断，请重新生成。' },
      }
    }

    function writePanelMemory(patch) {
      panelMemory = { ...panelMemory, ...patch }
      try { window.localStorage?.setItem(PANEL_STATE_KEY, JSON.stringify(panelMemory)) } catch { /* storage may be unavailable or full */ }
    }

    function persistentRefs(refs) {
      return (Array.isArray(refs) ? refs : [])
        .filter((ref) => ref && ref.kind !== 'data' && typeof ref.value === 'string')
        .slice(0, 9)
    }

    function formatElapsed(milliseconds) {
      const total = Math.max(0, Math.floor(milliseconds / 1000))
      const minutes = Math.floor(total / 60)
      const seconds = total % 60
      return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
    }

    /**
     * 五段组装（全中文结构）：主体 → 风格片段（可多条，按叠加顺序）
     * → 构图与视角 → 光线与氛围 → 负面。
     * 生成请求与归档都用这一份结果，面板同时给出预览，避免"发了什么看不见"。
     */
    function composePrompt(form) {
      const parts = []
      const subject = String((form && form.prompt) || '').trim()
      if (subject !== '') parts.push(subject)
      const styles = Array.isArray(form && form.styles) ? form.styles : []
      for (const style of styles) {
        const text = String((style && style.text) || '').trim()
        if (text !== '') parts.push(text)
      }
      const composition = String((form && form.composition) || '').trim()
      if (composition !== '') parts.push('构图与视角：' + composition)
      const lighting = String((form && form.lighting) || '').trim()
      if (lighting !== '') parts.push('光线与氛围：' + lighting)
      const negative = String((form && form.negative) || '').trim()
      if (negative !== '') {
        // 已用「不要 / 避免 / Avoid」开头就原样保留，否则统一拼「不要：」前缀。
        parts.push(/^(不要|避免|avoid)/i.test(negative) ? negative : '不要：' + negative)
      }
      return parts.join('\n\n')
    }

    function GenerationClock({ startedAt, count, model }) {
      const [now, setNow] = React.useState(() => Date.now())
      React.useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(timer)
      }, [])
      return React.createElement('div', { className: 'ag-generation', role: 'status', 'aria-live': 'polite' },
        React.createElement('span', { className: 'ag-spinner', 'aria-hidden': true }),
        React.createElement('span', null, '生成中 · ' + count + ' 张 · 已用时 ' + formatElapsed(now - startedAt)),
        model ? React.createElement('span', { className: 'ag-note' }, '模型：' + model) : null)
    }

    return {
      inject: ['slots', 'layout', 'timer'],
      apply(ctx) {
        ctx.effect(() => {
          const el = document.createElement('style')
          el.textContent = CSS
          document.head.appendChild(el)
          return () => el.remove()
        }, 'image-gen: styles')

        const slots = ctx.slots
        const fetchJson = (url, options) =>
          fetch(url, { ...FETCH_OPTS, ...options }).then(async (response) => {
            if (!response.ok) {
              const text = await response.text().catch(() => '')
              let detail = ''
              try {
                const body = JSON.parse(text)
                const error = body && body.error
                detail = typeof body?.message === 'string'
                  ? body.message
                  : typeof error === 'string'
                    ? error
                    : typeof error?.message === 'string'
                      ? error.message
                      : ''
              } catch { /* use raw body below */ }
              if (detail === '') detail = text.slice(0, 500)
              throw new Error('HTTP ' + response.status + (detail ? ': ' + detail : ''))
            }
            return response.json()
          })
        const postJson = (url, body) => fetchJson(url, { method: 'POST', body: JSON.stringify(body) })

        function usePaged(endpoint) {
          const PAGE = 48
          const [state, setState] = React.useState({ loading: true, data: null, files: [], total: 0, hasMore: false, names: [], error: null })
          const [pending, setPending] = React.useState(false)
          const loadingMore = React.useRef(false)
          const filesRef = React.useRef([])
          const hasMoreRef = React.useRef(false)
          const load = React.useCallback((reset) => {
            if (loadingMore.current) return Promise.resolve()
            if (!reset && !hasMoreRef.current) return Promise.resolve()
            loadingMore.current = true
            if (reset) setPending(true)
            const offset = reset ? 0 : filesRef.current.length
            const join = endpoint.includes('?') ? '&' : '?'
            return fetchJson(endpoint + join + 'offset=' + offset + '&limit=' + PAGE)
              .then((data) => {
                const incoming = Array.isArray(data.files) ? data.files : []
                setState((prev) => {
                  const files = reset ? incoming : prev.files.concat(incoming.filter((file) => !prev.files.some((item) => item.name === file.name)))
                  filesRef.current = files
                  const hasMore = data.hasMore === true
                  hasMoreRef.current = hasMore
                  return {
                    loading: false,
                    data,
                    files,
                    total: Number(data.total) || files.length,
                    hasMore,
                    names: Array.isArray(data.names) ? data.names : prev.names,
                    error: null,
                  }
                })
              })
              .catch((error) => {
                setState((prev) => ({ ...prev, loading: false, error: String(error && error.message ? error.message : error) }))
              })
              .finally(() => {
                loadingMore.current = false
                setPending(false)
              })
          }, [endpoint])
          React.useEffect(() => { load(true) }, [load])
          return { state, pending, refresh: () => load(true), loadMore: () => load(false) }
        }

        function Lightbox({ files, index, srcOf, starred, onClose, onIndex, onDelete, onStar }) {
          const file = files[index]
          React.useEffect(() => {
            const onKey = (event) => {
              if (event.key === 'Escape') onClose()
              if (event.key === 'ArrowLeft') onIndex((index + files.length - 1) % files.length)
              if (event.key === 'ArrowRight') onIndex((index + 1) % files.length)
            }
            window.addEventListener('keydown', onKey)
            return () => window.removeEventListener('keydown', onKey)
          }, [index, files.length, onClose, onIndex])
          if (!file) return null
          const isStar = starred.has(file.name)
          return React.createElement('div', { className: 'ag-lb', onClick: onClose },
            React.createElement('div', { className: 'ag-lb-name' }, file.name + '  ·  ' + (index + 1) + '/' + files.length),
            React.createElement('button', { className: 'ag-lb-nav prev', onClick: (e) => { e.stopPropagation(); onIndex((index + files.length - 1) % files.length) } }, '‹'),
            React.createElement('img', { className: 'ag-lb-img', src: srcOf(file.name), alt: file.name, onClick: (e) => e.stopPropagation() }),
            React.createElement('button', { className: 'ag-lb-nav next', onClick: (e) => { e.stopPropagation(); onIndex((index + 1) % files.length) } }, '›'),
            React.createElement('div', { className: 'ag-lb-bar', onClick: (e) => e.stopPropagation() },
              React.createElement('button', { className: 'ag-btn', onClick: () => onStar(file.name) }, isStar ? '★ 已收藏' : '☆ 收藏'),
              React.createElement('a', { className: 'ag-btn', href: srcOf(file.name), download: file.name }, '下载'),
              React.createElement('button', { className: 'ag-btn ag-btn-danger', onClick: () => onDelete(file.name) }, '删除'),
              React.createElement('button', { className: 'ag-btn', onClick: onClose }, '关闭')))
        }

        // 纯渲染函数（不持 hook）：右栏生成表单
        function GenerateForm(props) {
          const { mode, form, setForm, refs, removeRef, onUpload, urlInput, setUrlInput, onAddUrl, onGenerate, gen, saveTarget, onDropRef, catalog, onSetDefault } = props
          const sizes = props.sizes && props.sizes.length > 0 ? props.sizes : FALLBACK_SIZES
          const isImg = mode === 'img'
          const field = (key) => (event) => setForm({ ...form, [key]: event.target.value })
          const styles = Array.isArray(form.styles) ? form.styles : []
          const subjectNode = React.createElement('div', { className: 'ag-field' },
            React.createElement('label', null, isImg ? '改动要求（描述怎么改这张参考图）' : '主体（描述要生成的画面）'),
            React.createElement('textarea', {
              className: 'ag-textarea',
              placeholder: isImg ? '例如：把背景换成冬日雪景，保持人物与构图不变…' : '想画什么：人物、动作、场景……越详细越好',
              value: form.prompt,
              onChange: field('prompt'),
            }))
          const stylesNode = React.createElement('div', { className: 'ag-styles' },
            React.createElement('label', null, '风格（可叠加，来自左侧提示词库）'),
            styles.length > 0
              ? React.createElement('div', { className: 'ag-chips' },
                styles.map((style, index) => React.createElement('span', { className: 'ag-chip', key: style.id || index },
                  React.createElement('span', null, style.title || style.id || '风格'),
                  React.createElement('button', {
                    className: 'ag-chip-x', title: '移除这条风格',
                    onClick: () => { if (typeof props.onRemoveStyle === 'function') props.onRemoveStyle(style.id) },
                  }, '×'))))
              : React.createElement('div', { className: 'ag-ref-hint' }, '在左侧「提示词库」点「加为风格」叠加画风；主体和风格分开组装，互不覆盖。'))
          const compositionNode = React.createElement('div', { className: 'ag-field' },
            React.createElement('label', null, '构图与视角（可选）'),
            React.createElement('textarea', {
              className: 'ag-textarea', style: { minHeight: 52 },
              placeholder: '例如：半身特写、正面平视、居中构图、背景留白',
              value: form.composition || '',
              onChange: field('composition'),
            }))
          const lightingNode = React.createElement('div', { className: 'ag-field' },
            React.createElement('label', null, '光线与氛围（可选）'),
            React.createElement('textarea', {
              className: 'ag-textarea', style: { minHeight: 52 },
              placeholder: '例如：黄昏侧逆光、暖色调、柔和光线、浅景深',
              value: form.lighting || '',
              onChange: field('lighting'),
            }))
          const negativeNode = React.createElement('div', { className: 'ag-field' },
            React.createElement('label', null, '负面（可选，会拼成「不要：…」追加到末尾）'),
            React.createElement('textarea', {
              className: 'ag-textarea', style: { minHeight: 56 },
              placeholder: '例如：多余手指、文字水印、写实风格、3D 渲染',
              value: form.negative || '',
              onChange: field('negative'),
            }))
          const composed = composePrompt(form)
          const previewNode = React.createElement('details', { className: 'ag-preview' },
            React.createElement('summary', null, '最终提示词（' + composed.length + ' 字符，点开预览）'),
            React.createElement('div', { className: 'ag-preview-text' }, composed === '' ? '（还没有内容）' : composed))
          const sizeNode = React.createElement('div', { className: 'ag-field' },
            React.createElement('label', null, '尺寸'),
            React.createElement('select', { className: 'ag-select', value: form.size, onChange: field('size') },
              sizes.map((s) => React.createElement('option', { key: s, value: s }, s))))
          const countNode = React.createElement('div', { className: 'ag-field' },
            React.createElement('label', null, '张数'),
            React.createElement('select', { className: 'ag-select', value: String(form.count), onChange: (e) => setForm({ ...form, count: Number(e.target.value) }) },
              COUNT_OPTIONS.map((n) => React.createElement('option', { key: n, value: String(n) }, String(n)))))

          const refNodes = []
          if (isImg) {
            const previewOf = (ref) => {
              if (ref.kind === 'saved') return srcRecent(ref.value)
              if (ref.kind === 'data' && /^data:image\//i.test(ref.value)) return ref.value
              if (/^https:\/\//i.test(ref.value)) return ref.value
              return null
            }
            refNodes.push(React.createElement('div', { className: 'ag-ref-section' },
              React.createElement('div', { className: 'ag-ref-heading' },
                React.createElement('label', null, '参考图片'),
                React.createElement('span', null, refs.length + ' / 9')),
              refs.length > 0
                ? React.createElement('div', { className: 'ag-ref-grid' },
                  refs.map((ref, index) => {
                    const preview = previewOf(ref)
                    return React.createElement('div', { className: 'ag-ref-tile', key: ref.key },
                      preview
                        ? React.createElement('img', { className: 'ag-ref-preview', src: preview, alt: ref.label, loading: 'lazy', decoding: 'async' })
                        : React.createElement('div', { className: 'ag-ref-placeholder' }, ref.kind === 'path' ? '本机路径' : '参考图'),
                      React.createElement('div', { className: 'ag-ref-name', title: ref.label }, ref.label),
                      React.createElement('button', { className: 'ag-ref-remove', title: '移除参考图', 'aria-label': '移除参考图', onClick: () => removeRef(index) }, '×'))
                  }))
                : null,
              React.createElement('div', { className: 'ag-ref-drop',
                onDragOver: (event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' },
                onDrop: (event) => { event.preventDefault(); if (typeof onDropRef === 'function') onDropRef(event) },
              },
                refs.length === 0 ? React.createElement('div', { className: 'ag-ref-hint' }, '拖入左侧图片，或从本机上传；支持最多 9 张参考图。') : null,
                React.createElement('div', { className: 'ag-ref-actions' },
                  React.createElement('label', { className: 'ag-btn', style: { cursor: 'pointer', display: 'inline-block' } },
                    '上传图片',
                    React.createElement('input', {
                      type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' },
                      onChange: onUpload,
                    }))),
                React.createElement('div', { className: 'ag-ref-url' },
                  React.createElement('input', {
                    className: 'ag-input', value: urlInput, placeholder: '图片 URL 或本机路径',
                    onChange: (event) => setUrlInput(event.target.value),
                    onKeyDown: (event) => { if (event.key === 'Enter') onAddUrl() },
                  }),
                  React.createElement('button', { className: 'ag-btn', onClick: onAddUrl }, '添加')),
                React.createElement('div', { className: 'ag-ref-hint' }, refs.length === 0 ? '拖入左侧图片，或从本机上传；最多 9 张参考图。' : '可继续拖入左侧图片或上传，最多 9 张。'))))
          }

          const saveNode = React.createElement('div', { className: 'ag-field' },
            React.createElement('label', null, '生成后归档到'),
            React.createElement('div', { className: 'ag-row' },
              React.createElement('button', { className: 'ag-btn' + (saveTarget === 'prompt' ? ' ag-btn-on' : ''), onClick: () => props.onSaveTarget(saveTarget === 'prompt' ? '' : 'prompt') }, '提示词库'),
              React.createElement('button', { className: 'ag-btn', onClick: props.onFillFromActive }, '从左侧库填入')))

          const msgNode = gen.error
            ? React.createElement('div', { className: 'ag-msg ag-msg-err' }, gen.error)
            : null
          const resultNode = gen.result
            ? React.createElement('div', { className: 'ag-field' },
              React.createElement('div', { className: 'ag-msg ag-msg-ok' }, '已生成 ' + gen.result.count + ' 张' + (gen.result.partial ? '（' + gen.result.partial + '）' : '')),
              React.createElement('div', { className: 'ag-result' },
                gen.result.images.map((img) => React.createElement('div', { key: img.name, className: 'ag-card' },
                  React.createElement('img', { className: 'ag-thumb', src: srcRecent(img.name), alt: img.name }),
                  React.createElement('div', { className: 'ag-caption' }, img.name)))),
              React.createElement('div', { className: 'ag-note' }, '已保存到插件目录 data/images/（环境变量 IMAGE_GEN_DIR 可改；点击左侧「最近生成」查看）'))
            : null

          const catalogEntries = catalog && Array.isArray(catalog.entries) ? catalog.entries : []
          const activeEntry = catalogEntries.find((entry) => entry.id === catalog.defaultId) || null
          const modelNode = catalogEntries.length === 0
            ? null
            : React.createElement('div', { className: 'ag-modelbar' },
              React.createElement('label', null, '默认模型'),
              React.createElement('select', {
                className: 'ag-select',
                value: catalog.defaultId || '',
                onChange: (event) => { if (typeof onSetDefault === 'function') onSetDefault(event.target.value) },
              }, catalogEntries.map((entry) => React.createElement('option', { key: entry.id, value: entry.id },
                (entry.groupLabel || entry.group) + ' · ' + entry.name))),
              activeEntry
                ? React.createElement('div', { className: 'ag-model-detail ag-note' }, activeEntry.model + ' · ' + activeEntry.baseURL)
                : null)
          return React.createElement('div', { className: 'ag-card' },
            modelNode,
            refNodes,
            subjectNode,
            stylesNode,
            compositionNode,
            lightingNode,
            negativeNode,
            previewNode,
            React.createElement('div', { className: 'ag-generate-options' }, sizeNode, countNode),
            saveNode,
            React.createElement('button', {
              className: 'ag-btn ag-btn-primary',
              disabled: gen.busy || (isImg && refs.length === 0),
              onClick: onGenerate,
            }, gen.busy ? '生成中…' : (isImg ? (refs.length === 0 ? '添加参考图后生成' : '生成 / 编辑') : '生成图片')),
            gen.busy
              ? React.createElement(GenerationClock, {
                  startedAt: Number(gen.startedAt) || Date.now(),
                  count: Number(gen.requestedCount) || form.count,
                  model: gen.model || '',
                })
              : null,
            msgNode,
            resultNode,
            React.createElement('div', { className: 'ag-hint' }, '生成走图片专用端点，模型与接口在「设置」里配置；一次生成 ' + form.count + ' 张。'))
        }

        // 纯渲染函数（不持 hook）：右栏设置表单
        function SettingsForm(props) {
          const { settings, draft, setDraft, onTest, test, onReload, models, onLoadModels, settingsError, entryTest, onTestEntry, addOpen, onToggleAdd, addMode, onSetAddMode, editing, editDraft, setEditDraft, onEditModel, onSaveEdit } = props
          const field = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })
          if (settings === null) {
            return React.createElement('div', { className: 'ag-card' },
              React.createElement('h3', { className: 'ag-section' }, '生图模型接入'),
              settingsError
                ? React.createElement('div', { className: 'ag-msg ag-msg-err' }, '设置读取失败：' + settingsError)
                : React.createElement('div', { className: 'ag-empty' }, '正在读取设置…'),
              React.createElement('button', { className: 'ag-btn', onClick: onReload }, '重新读取'))
          }
          const statusRow = React.createElement('div', { className: 'ag-stats' },
            React.createElement('div', { className: 'ag-stat' },
              React.createElement('span', { className: 'ag-stat-label' }, 'API Key'),
              React.createElement('span', { className: 'ag-stat-value ' + (settings.hasKey ? 'ag-ok' : '') }, settings.hasKey ? '已配置' : '未配置')),
            React.createElement('div', { className: 'ag-stat' },
              React.createElement('span', { className: 'ag-stat-label' }, '接口地址来源'),
              React.createElement('span', { className: 'ag-stat-value', style: { fontSize: 12 } }, settings.baseURLSource)),
            React.createElement('div', { className: 'ag-stat' },
              React.createElement('span', { className: 'ag-stat-label' }, '模型来源'),
              React.createElement('span', { className: 'ag-stat-value', style: { fontSize: 12 } }, settings.modelSource)))
          const catalog = settings.catalog && Array.isArray(settings.catalog.entries) ? settings.catalog : null
          if (catalog) {
            const groups = []
            for (const entry of catalog.entries) {
              let bucket = groups.find((item) => item.id === entry.group)
              if (!bucket) {
                bucket = { id: entry.group, label: entry.groupLabel || entry.group, entries: [] }
                groups.push(bucket)
              }
              bucket.entries.push(entry)
            }
            // 编辑卡：与该行同位置展开（官方 editor 风格：标题 + 路由 + 字段 + 右对齐操作）。
            function editCardNode(entry) {
              const entryTesting = entryTest != null && entryTest.busy && entryTest.id === entry.id
              return React.createElement('div', { key: entry.id, className: 'agx-editor' },
                React.createElement('div', { className: 'agx-editor-header' },
                  React.createElement('span', { className: 'agx-editor-title' }, '编辑 · ' + entry.name),
                  React.createElement('span', { className: 'agx-editor-route' }, (entry.groupLabel || entry.group) + ' · ' + entry.model)),
                React.createElement('div', { className: 'agx-editor-grid' },
                  React.createElement('div', { className: 'ag-field' },
                    React.createElement('label', null, '显示名'),
                    React.createElement('input', { className: 'ag-input', value: editDraft.name || '', onChange: (e) => setEditDraft({ ...editDraft, name: e.target.value }) })),
                  React.createElement('div', { className: 'ag-field' },
                    React.createElement('label', null, '模型 id'),
                    React.createElement('input', { className: 'ag-input', value: editDraft.model || '', onChange: (e) => setEditDraft({ ...editDraft, model: e.target.value }) })),
                  React.createElement('div', { className: 'ag-field' },
                    React.createElement('label', null, '分组（不可改）'),
                    React.createElement('input', { className: 'ag-input', value: entry.groupLabel || entry.group, disabled: true }))),
                React.createElement('div', { className: 'ag-field' },
                  React.createElement('label', null, 'API 地址'),
                  React.createElement('input', { className: 'ag-input', value: editDraft.baseURL || '', onChange: (e) => setEditDraft({ ...editDraft, baseURL: e.target.value }) })),
                React.createElement('div', { className: 'ag-field' },
                  React.createElement('label', null, 'API 密钥（留空不修改）'),
                  React.createElement('input', {
                    className: 'ag-input', type: 'password', value: editDraft.key || '',
                    placeholder: entry.hasKey === false ? '未配置，填入后保存' : '已配置，留空不修改',
                    onChange: (e) => setEditDraft({ ...editDraft, key: e.target.value }),
                  })),
                entryTest != null && entryTest.id === entry.id && entryTest.message
                  ? React.createElement('div', { className: 'ag-msg ' + (entryTest.ok ? 'ag-msg-ok' : 'ag-msg-err') }, entryTest.message)
                  : null,
                React.createElement('div', { className: 'agx-actions' },
                  React.createElement('button', { className: 'agx-btn-text', style: { marginRight: 'auto' }, onClick: () => props.onRemoveModel && props.onRemoveModel(entry) }, '删除'),
                  React.createElement('button', { className: 'agx-btn-edit', disabled: entryTest != null && entryTest.busy, onClick: () => props.onTestEntry && props.onTestEntry(entry.id) }, entryTesting ? '测试中…' : '测试连通性'),
                  entry.isDefault ? null : React.createElement('button', { className: 'agx-btn-edit', onClick: () => props.onSetDefault && props.onSetDefault(entry.id) }, '设为默认'),
                  React.createElement('button', { className: 'ag-btn', onClick: () => props.onEditModel && props.onEditModel(null) }, '取消'),
                  React.createElement('button', { className: 'ag-btn ag-btn-primary', onClick: () => props.onSaveEdit && props.onSaveEdit(entry) }, '保存')))
            }

            // 单条模型：收起为单行卡片（名称+标签+密钥圆点 | 测试/编辑/删除）；编辑时该行整体变成编辑卡。
            function modelItemNode(entry) {
              if (editing === entry.id) return editCardNode(entry)
              const entryTesting = entryTest != null && entryTest.busy && entryTest.id === entry.id
              const isCustom = entry.builtin !== true
              return React.createElement('div', { key: entry.id, className: 'agx-item' },
                React.createElement('div', { className: 'agx-item-name' },
                  React.createElement('span', null, entry.name),
                  entry.isDefault ? React.createElement('span', { className: 'agx-tag agx-tag-ok' }, '默认') : null,
                  isCustom ? React.createElement('span', { className: 'agx-tag' }, '自定义') : null,
                  React.createElement('span', {
                    className: 'agx-dot ' + (entry.hasKey === false ? 'agx-dot-miss' : 'agx-dot-ok'),
                    title: entry.hasKey === false ? 'API 密钥缺失（' + (entry.keyEnv || '') + '）' : 'API 密钥已配置',
                  }),
                  entry.hasKey === false ? React.createElement('span', { className: 'agx-tag agx-tag-miss' }, '未配置 ' + (entry.keyEnv || 'Key')) : null),
                React.createElement('div', { className: 'agx-item-actions' },
                  React.createElement('button', {
                    className: 'agx-btn-edit',
                    disabled: entryTest != null && entryTest.busy,
                    title: '只测这一条的连通性（打 /models，不扣费）',
                    onClick: () => props.onTestEntry && props.onTestEntry(entry.id),
                  }, entryTesting ? '测试中…' : '测试'),
                  React.createElement('button', { className: 'agx-btn-edit', onClick: () => props.onEditModel && props.onEditModel(entry) }, '编辑'),
                  React.createElement('button', { className: 'agx-btn-text', onClick: () => props.onRemoveModel && props.onRemoveModel(entry) }, '删除')))
            }
            // 预设分组（除「自定义」外）为空时没有「按分组添加」这条路径，直接走自定义表单。
            const presetGroups = Array.isArray(catalog.groups) ? catalog.groups.filter((group) => group.id !== 'custom') : []
            const mode = addMode === 'group' && presetGroups.length === 0 ? 'custom' : addMode
            return React.createElement('div', { className: 'ag-card' },
              React.createElement('h3', { className: 'ag-section' }, '生图模型'),
              settings.empty === true
                ? React.createElement('div', { className: 'agx-hint' }, '模型目录为空：用下方「+ 添加模型」加一个模型（接口地址 + 模型 id）。')
                : null,
              React.createElement('div', { className: 'ag-field' },
                React.createElement('label', null, '默认模型（文生图、图生图和 Agent 都先用这个）'),
                React.createElement('select', {
                  className: 'ag-select',
                  value: catalog.defaultId || '',
                  onChange: (event) => { if (typeof props.onSetDefault === 'function') props.onSetDefault(event.target.value) },
                }, catalog.entries.map((entry) => React.createElement('option', { key: entry.id, value: entry.id },
                  (entry.groupLabel || entry.group) + ' · ' + entry.name)))),
              React.createElement('div', { className: 'agx-rows' },
                catalog.entries.map((entry) => modelItemNode(entry))),
              addOpen
                ? React.createElement('div', { className: 'agx-editor' },
                  presetGroups.length > 0
                    ? React.createElement('div', { className: 'agx-tabs' },
                    React.createElement('button', { className: 'agx-tab' + (mode !== 'custom' ? ' agx-tab-on' : ''), onClick: () => props.onSetAddMode && props.onSetAddMode('group') }, '按分组添加'),
                    React.createElement('button', { className: 'agx-tab' + (mode === 'custom' ? ' agx-tab-on' : ''), onClick: () => props.onSetAddMode && props.onSetAddMode('custom') }, '自定义模型 API'))
                    : null,
                  React.createElement('p', { className: 'agx-hint' }, mode === 'custom'
                    ? '填写图片接口地址（标准 OpenAI Images 接口）与模型 id。'
                    : '使用所选分组的 API 地址与密钥，只需填模型 id 即可。'),
                  React.createElement('div', { className: 'ag-field' },
                    React.createElement('label', null, '分组'),
                    presetGroups.length === 0 || mode === 'custom'
                      ? React.createElement('input', { className: 'ag-input', value: '自定义（CUSTOM_API_KEY）', disabled: true })
                      : React.createElement('select', { className: 'ag-select', value: draft.group || presetGroups[0].id, onChange: field('group') },
                        presetGroups.map((group) => React.createElement('option', { key: group.id, value: group.id }, group.label)))),
                  React.createElement('div', { className: 'ag-field' },
                    React.createElement('label', null, 'API 密钥（可选）'),
                    React.createElement('input', {
                      className: 'ag-input', type: 'password', value: draft.newKey || '',
                      placeholder: mode === 'custom' ? '将存为该模型专属的 CUSTOM_API_KEY' : '留空使用分组密钥',
                      onChange: field('newKey'),
                    })),
                  React.createElement('details', { className: 'agx-collapse', open: mode === 'custom' },
                    React.createElement('summary', null, '自定义设置'),
                    React.createElement('div', { className: 'ag-field' },
                      React.createElement('label', null, 'API 地址'),
                      React.createElement('input', { className: 'ag-input', value: draft.newBase || '', placeholder: 'https://…/v1', onChange: field('newBase') }))),
                  React.createElement('div', { className: 'agx-fetch' },
                    React.createElement('label', { className: 'ag-label' }, '模型 id 与显示名（只列生图模型）'),
                    React.createElement('button', { className: 'agx-link', onClick: onLoadModels, disabled: !models || models.busy },
                      models && models.busy ? '正在询问提供商…' : '获取可用模型')),
                  models && models.error ? React.createElement('div', { className: 'ag-msg ag-msg-err' }, models.error) : null,
                  models && !models.error && models.message ? React.createElement('div', { className: 'agx-hint' }, models.message) : null,
                  models && models.items && models.items.length > 0
                    ? React.createElement('div', { className: 'ag-chips' },
                      models.items.map((id) => React.createElement('button', {
                        key: id, className: 'ag-chip', style: { cursor: 'pointer' }, title: '点击填入模型 id',
                        onClick: () => setDraft({ ...draft, newModel: id, newName: draft.newName || id }),
                      }, '+ ' + id)))
                    : (models && !models.error && models.items && models.items.length === 0
                      ? React.createElement('div', { className: 'agx-hint' }, '没有识别到生图模型，可直接手动填写模型 id。')
                      : null),
                  React.createElement('div', { className: 'agx-editor-grid' },
                    React.createElement('div', { className: 'ag-field' },
                      React.createElement('label', null, '模型 id'),
                      React.createElement('input', { className: 'ag-input', value: draft.newModel || '', placeholder: '上游 model id', onChange: field('newModel') })),
                    React.createElement('div', { className: 'ag-field' },
                      React.createElement('label', null, '显示名（留空用模型 id）'),
                      React.createElement('input', { className: 'ag-input', value: draft.newName || '', placeholder: '例如 GPT Image 2', onChange: field('newName') }))),
                  React.createElement('div', { className: 'agx-actions' },
                    React.createElement('button', { className: 'ag-btn', onClick: () => props.onToggleAdd && props.onToggleAdd(false) }, '取消'),
                    React.createElement('button', { className: 'ag-btn ag-btn-primary', onClick: () => props.onAddModel && props.onAddModel(draft) }, '加入目录')))
                : React.createElement('button', { className: 'agx-add-btn', onClick: () => props.onToggleAdd && props.onToggleAdd(true) }, '+ 添加模型'),
              React.createElement('div', { className: 'ag-row' },
                React.createElement('button', { className: 'ag-btn', onClick: onTest, disabled: test.busy }, test.busy ? '测试中…' : '测试默认模型'),
                React.createElement('button', { className: 'ag-btn', onClick: onReload }, '刷新')),
              test.message
                ? React.createElement('div', { className: 'ag-msg ' + (test.ok ? 'ag-msg-ok' : 'ag-msg-err') }, test.message)
                : null,
              React.createElement('div', { className: 'ag-note' }, '默认模型可随时切换，下一次生成立刻生效。配置文件：' + settings.path))
          }
          // 兜底：正常路径下 configView 一定带 catalog；异常时给明确提示而不是空白。
          return React.createElement('div', { className: 'ag-card' },
            React.createElement('div', { className: 'ag-empty' }, '设置读取异常：未拿到模型目录。点上方「刷新」重试。'))
        }

        // 纯渲染函数（不持 hook）：左栏「提示词库」
        function LibraryPanel(props) {
          const { kind, entries, expanded, onToggle, onUse, onDelete, onOpenCreate, form, setForm, onCreate, activeId, onToggleStyle, styledIds } = props
          const label = LIB_LABEL[kind] || ''
          const expandedList = Object.keys(expanded).filter((key) => expanded[key])
          const formNode = form.open && form.kind === kind
            ? React.createElement('div', { className: 'ag-lib-item' },
              React.createElement('div', { className: 'ag-field' },
                React.createElement('label', null, '标题（可选，缺省用正文前 24 字）'),
                React.createElement('input', { className: 'ag-input', value: form.title, onChange: (e) => setForm({ ...form, title: e.target.value }) })),
              React.createElement('div', { className: 'ag-field' },
                React.createElement('label', null, '提示词内容'),
                React.createElement('textarea', { className: 'ag-textarea', value: form.text, onChange: (e) => setForm({ ...form, text: e.target.value }) })),
              React.createElement('div', { className: 'ag-lib-actions' },
                React.createElement('button', { className: 'ag-btn ag-btn-primary', onClick: onCreate }, '保存'),
                React.createElement('button', { className: 'ag-btn', onClick: () => setForm({ ...form, open: false }) }, '取消')))
            : null
          return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            React.createElement('div', { className: 'ag-row', style: { alignItems: 'center' } },
              React.createElement('span', { className: 'ag-section' }, label + '（' + entries.length + ' 条）'),
              React.createElement('button', { className: 'ag-btn', onClick: onOpenCreate }, '＋ 新建')),
            formNode,
            entries.length === 0
              ? React.createElement('div', { className: 'ag-empty' }, '还没有条目，点「＋ 新建」，或在右侧生成后一键归档。')
              : entries.map((entry) => {
                const isOpen = expanded[entry.id] === true
                const isStyled = Array.isArray(styledIds) && styledIds.includes(entry.id)
                const images = Array.isArray(entry.images) ? entry.images.filter((n) => typeof n === 'string' && n !== '') : []
                return React.createElement('div', { className: 'ag-lib-item', key: entry.id },
                  React.createElement('div', { className: 'ag-lib-head' },
                    React.createElement('div', { style: { minWidth: 0 } },
                      React.createElement('div', { className: 'ag-lib-title' }, entry.title),
                      React.createElement('div', { className: 'ag-lib-meta' }, (entry.size || '1024x1024') + ' · ' + images.length + ' 张图')),
                    React.createElement('div', { className: 'ag-lib-actions' },
                      React.createElement('button', { className: 'ag-btn ag-btn-primary' + (isStyled ? ' ag-btn-on' : ''), onClick: () => onToggleStyle(entry) }, isStyled ? '已加为风格' : '加为风格'),
                      React.createElement('button', { className: 'ag-btn', onClick: () => onUse(entry) }, '替换主体'),
                      React.createElement('button', { className: 'ag-btn', onClick: () => onToggle(entry.id) }, isOpen ? '收起' : '看图'),
                      React.createElement('button', { className: 'ag-btn ag-btn-danger', onClick: () => onDelete(entry.id) }, '删除'))),
                  isStyled
                    ? React.createElement('div', { className: 'ag-hint' }, '已在右侧「风格」里叠加，点「已加为风格」可移除。')
                    : null,
                  activeId === entry.id
                    ? React.createElement('div', { className: 'ag-hint' }, '已填入右侧主体框。')
                    : null,
                  React.createElement('div', { className: 'ag-lib-text' }, entry.text),
                  isOpen
                    ? React.createElement('div', { className: 'ag-lib-imgs' },
                      images.length === 0
                        ? React.createElement('div', { className: 'ag-empty', style: { gridColumn: '1 / -1' } }, '这条还没生成过图片。')
                        : images.map((name) => React.createElement('div', { key: name, className: 'ag-card', style: { padding: 6 } },
                          React.createElement('img', { className: 'ag-thumb', src: srcRecent(name), alt: name, loading: 'lazy' }),
                          React.createElement('div', { className: 'ag-caption' }, name))))
                    : null)
              }))
        }

        function Panel() {
          const [sideTab, setSideTab] = React.useState(() => ['recent', 'fav', 'prompt'].includes(panelMemory.sideTab) ? panelMemory.sideTab : 'recent') // 0
          const recent = usePaged('/api/image-gen')                       // 1(state) 2(pending)
          const fav = usePaged('/api/image-gen/favorites')               // 3(state) 4(pending)
          const [open, setOpen] = React.useState(null)                      // 5
          const [busy, setBusy] = React.useState(false)                     // 6
          const [mode, setMode] = React.useState(() => ['txt', 'img', 'set'].includes(panelMemory.mode) ? panelMemory.mode : 'txt') // 7
          const [form, setForm] = React.useState(() => ({ prompt: '', size: '1024x1024', count: 1, ...(panelMemory.form && typeof panelMemory.form === 'object' ? panelMemory.form : {}) })) // 8
          const [refs, setRefs] = React.useState(() => persistentRefs(panelMemory.refs)) // 9
          const [gen, setGenState] = React.useState(() => panelMemory.gen && typeof panelMemory.gen === 'object' ? panelMemory.gen : { busy: false, error: null, result: null }) // 10
          const [settings, setSettings] = React.useState(null)              // 12
          const [draft, setDraft] = React.useState({ baseURL: '', model: '', apiKey: '' }) // 13
          const [test, setTest] = React.useState({ busy: false, ok: null, message: null }) // 14
          const [models, setModels] = React.useState({ busy: false, items: null, message: null, error: null }) // 15
          const [urlInput, setUrlInput] = React.useState('')                // 16
          const [libs, setLibs] = React.useState(null)                      // 17
          const [libForm, setLibForm] = React.useState({ open: false, kind: 'prompt', title: '', text: '' }) // 18
          const [libBusy, setLibBusy] = React.useState(false)               // 19
          const [activePrompt, setActivePrompt] = React.useState(() => panelMemory.activePrompt || null) // 20
          const [expanded, setExpanded] = React.useState({})                // 21
          const [saveTarget, setSaveTarget] = React.useState(() => panelMemory.saveTarget || '') // 22

          const updateGen = (next) => {
            generationInFlight = next.busy === true
            setGenState(next)
            writePanelMemory({ gen: next })
          }
          React.useEffect(() => {
            writePanelMemory({
              sideTab,
              mode,
              form,
              refs: persistentRefs(refs),
              gen,
              activePrompt,
              saveTarget,
            })
          }, [sideTab, mode, form, refs, gen, activePrompt, saveTarget])

          const active = sideTab === 'fav' ? fav : recent
          const files = active.state.files || []
          const starred = new Set(fav.state.names || [])
          const srcOf = sideTab === 'fav' ? srcFav : srcRecent
          const sizes = (recent.state.data && recent.state.data.sizes) || FALLBACK_SIZES
          const isLibTab = LIB_KINDS.includes(sideTab)

          const sentinelRef = React.useRef(null)                            // 22（无限滚动哨兵）
          const sentinelTabRef = React.useRef('')                           // 23（哨兵绑定时的 tab，防止跨 tab 误触发）
          React.useEffect(() => {
            const node = sentinelRef.current
            const tab = sideTab
            if (node === null || isLibTab || !active.state.hasMore) return
            if (typeof IntersectionObserver !== 'function') return
            const observer = new IntersectionObserver((entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting && sentinelTabRef.current === tab && active.state.hasMore) active.loadMore()
              }
            }, { rootMargin: '320px 0px' })
            sentinelTabRef.current = tab
            observer.observe(node)
            return () => { observer.disconnect(); if (sentinelTabRef.current === tab) sentinelTabRef.current = '' }
          }, [sideTab, isLibTab, active.state.hasMore, active.state.files.length])

          // 设置加载：挂载时预取一次，之后缓存不重复请求（修「点设置很慢」）。
          const settingsLoadedRef = React.useRef(false)
          const [settingsError, setSettingsError] = React.useState(null)    // 24（设置读取失败提示）
          const [entryTest, setEntryTest] = React.useState({ id: '', busy: false, ok: null, message: null }) // 25（目录单条模型测试）
          const [addOpen, setAddOpen] = React.useState(false)                // 26（「添加模型」展开态）
          const [addMode, setAddMode] = React.useState('group')              // 27（添加方式：按分组 / 自定义）
          const [editing, setEditing] = React.useState(null)                 // 28（正在编辑的模型 id）
          const [editDraft, setEditDraft] = React.useState(null)             // 29（编辑表单草稿）
          const loadSettings = () => {
            if (settingsLoadedRef.current) return
            settingsLoadedRef.current = true
            setSettingsError(null)
            fetchJson('/api/image-gen/config')
              .then((res) => {
                if (res && res.ok && res.config) {
                  setSettings(res.config)
                  setDraft({ baseURL: res.config.baseURL, model: res.config.model, apiKey: '' })
                } else {
                  throw new Error((res && res.message) || '设置接口返回异常')
                }
              })
              .catch((error) => {
                settingsLoadedRef.current = false
                setSettingsError(String(error && error.message ? error.message : error))
              })
          }
          const forceSettings = () => { settingsLoadedRef.current = false; loadSettings() }
          React.useEffect(() => { loadSettings(); loadLibrary() }, [])

          const loadLibrary = () => {
            fetchJson('/api/image-gen/library')
              .then((res) => { if (res && res.ok && res.library) setLibs(res.library) })
              .catch(() => {})
          }

          const onScroll = (event) => {
            if (isLibTab) return
            const el = event.currentTarget
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) active.loadMore()
          }
          const toggleStar = (name) => {
            const url = starred.has(name) ? '/api/image-gen/unfavorite' : '/api/image-gen/favorite'
            setBusy(true)
            fetchJson(url, { method: 'POST', body: JSON.stringify({ name }) })
              .then((result) => {
                if (result.ok === false) throw new Error(result.message || '收藏失败')
                return fav.refresh()
              })
              .catch((error) => window.alert(String(error && error.message ? error.message : error)))
              .finally(() => setBusy(false))
          }
          const remove = (name) => {
            if (sideTab === 'fav') {
              if (!window.confirm('从收藏库移除？\n' + name)) return
              toggleStar(name)
              return
            }
            if (!window.confirm('删除这张图片？\n' + name)) return
            setBusy(true)
            fetchJson('/api/image-gen/delete', { method: 'POST', body: JSON.stringify({ name }) })
              .then((result) => {
                if (result.ok === false) throw new Error(result.message || '删除失败')
                return recent.refresh()
              })
              .catch((error) => window.alert(String(error && error.message ? error.message : error)))
              .finally(() => setBusy(false))
          }
          const onTileClick = (name) => setOpen(files.findIndex((file) => file.name === name))
          const onUpload = (event) => {
            const list = Array.from(event.target.files || [])
            const accepted = list.slice(0, Math.max(0, MAX_REF_COUNT - refs.length))
            if (accepted.length < list.length) window.alert('参考图最多 ' + MAX_REF_COUNT + ' 张')
            accepted.forEach((file) => {
              const reader = new FileReader()
              reader.onload = () => {
                const value = String(reader.result)
                setRefs((prev) => {
                  if (prev.length >= MAX_REF_COUNT || prev.some((ref) => ref.key === 'data:' + file.name + value.length)) return prev
                  return prev.concat({ key: 'data:' + file.name + value.length, kind: 'data', value, label: file.name })
                })
              }
              reader.readAsDataURL(file)
            })
            event.target.value = ''
          }
          const addUrlRef = () => {
            const text = urlInput.trim()
            if (text === '') return
            if (refs.some((ref) => ref.key === 'url:' + text)) { setUrlInput(''); return }
            if (refs.length >= MAX_REF_COUNT) { window.alert('参考图最多 ' + MAX_REF_COUNT + ' 张'); return }
            setRefs(refs.concat({ key: 'url:' + text, kind: 'path', value: text, label: text }))
            setUrlInput('')
          }
          const removeRef = (index) => setRefs(refs.slice(0, index).concat(refs.slice(index + 1)))
          const onDropRef = (event) => {
            const text = String(event.dataTransfer && event.dataTransfer.getData('text/plain') || '')
            const match = /^image-gen-saved:(.+)$/.exec(text)
            if (match === null) return
            const name = match[1]
            if (name === '' || refs.some((ref) => ref.key === 'saved:' + name)) return
            if (refs.length >= MAX_REF_COUNT) { window.alert('参考图最多 ' + MAX_REF_COUNT + ' 张'); return }
            setRefs(refs.concat({ key: 'saved:' + name, kind: 'saved', value: name, label: name }))
          }
          const tagGeneratedImages = (kind, id, names) => {
            if (!id || names.length === 0) return Promise.resolve()
            return postJson('/api/image-gen/library', { action: 'tag', kind, id, names })
          }
          const onGenerate = () => {
            if (mode === 'img' && refs.length === 0) {
              updateGen({ busy: false, error: '请先添加一张参考图', result: null, startedAt: null })
              return
            }
            // 发出去的就是预览里这份组装结果：主体 + 风格片段 + 负面。
            const composed = composePrompt(form)
            if (composed === '') {
              updateGen({ busy: false, error: '请先填写主体，或选择一条风格', result: null, startedAt: null })
              return
            }
            const startedAt = Date.now()
            generationInFlight = true
            updateGen({ busy: true, error: null, result: null, startedAt, requestedCount: form.count, model: (settings && settings.name) || (settings && settings.model) || (recent.state.data && recent.state.data.model) || '' })
            const controller = typeof AbortController === 'function' ? new AbortController() : null
            const timeoutId = controller ? window.setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS) : null
            fetchJson('/api/image-gen/generate', {
              method: 'POST',
              body: JSON.stringify({
                prompt: composed,
                size: form.size,
                count: form.count,
                images: refs.map((ref) => ({ kind: ref.kind, value: ref.value })),
              }),
              ...(controller ? { signal: controller.signal } : {}),
            })
              .finally(() => { if (timeoutId !== null) window.clearTimeout(timeoutId) })
              .then((result) => {
                if (result.ok === false) throw new Error(result.message || '生成失败')
                const names = Array.isArray(result.files) ? result.files : []
                generationInFlight = false
                updateGen({ busy: false, error: null, result, startedAt, completedAt: Date.now(), requestedCount: form.count, model: result.model || (settings && settings.model) || '' })

                // 归档：优先挂到正在使用的库条目；否则按「保存到」新建并归档。
                const target = activePrompt && activePrompt.id ? activePrompt : null
                const promise = target
                  ? tagGeneratedImages(target.kind, target.id, names)
                  : saveTarget
                    ? postJson('/api/image-gen/library', {
                        action: 'upsert', kind: saveTarget, title: '', text: composed, size: form.size,
                      }).then((res) => (res.ok ? tagGeneratedImages(saveTarget, res.id, names) : null))
                    : Promise.resolve()

                promise.then(loadLibrary).then(() => {
                  recent.refresh()
                  setActivePrompt(null)
                  setSaveTarget('')
                })
              })
              .catch((error) => {
                generationInFlight = false
                const aborted = controller !== null && controller.signal.aborted === true
                const message = aborted
                  ? '生成超时（' + Math.round(GENERATION_TIMEOUT_MS / 60000) + ' 分钟）：上游一直没响应，已取消。请稍后重试，或在设置里换个模型。'
                  : String(error && error.message ? error.message : error)
                updateGen({ busy: false, error: message, result: null, startedAt, completedAt: Date.now(), requestedCount: form.count, model: (settings && settings.model) || '' })
              })
          }
          const styles = Array.isArray(form.styles) ? form.styles : []
          // 风格 chips：来自提示词库条目的「加为风格」，可叠加、可移除。
          const toggleStyle = (entry) => {
            const exists = styles.some((style) => style.id === entry.id)
            setForm({
              ...form,
              styles: exists
                ? styles.filter((style) => style.id !== entry.id)
                : styles.concat({ id: entry.id, title: entry.title, text: entry.text }),
            })
          }
          const removeStyle = (id) => setForm({ ...form, styles: styles.filter((style) => style.id !== id) })
          const onFillFromActive = () => {
            if (activePrompt && activePrompt.entry) {
              const entry = activePrompt.entry
              setForm({ ...form, prompt: entry.text, size: entry.size || form.size })
              return
            }
            window.alert('先在左侧「提示词库」点某条的按钮')
          }
          const onUseEntry = (entry, kind) => {
            // 「替换主体」：提示词条目用 text 覆盖主体框并带入尺寸比例。
            setActivePrompt({ kind, id: entry.id, entry })
            setForm({ ...form, prompt: entry.text, size: entry.size || form.size })
            setMode('txt')
          }
          const onDeleteEntry = (kind, id) => {
            if (!window.confirm('删除这条记录？\n（只删库内记录，不删已生成的图片）')) return
            setLibBusy(true)
            postJson('/api/image-gen/library', { action: 'delete', kind, id })
              .then((result) => {
                if (result.ok === false) throw new Error(result.message || '删除失败')
                setLibs(result.library)
              })
              .catch((error) => window.alert(String(error && error.message ? error.message : error)))
              .finally(() => setLibBusy(false))
          }
          const onCreateEntry = () => {
            if (libForm.text.trim() === '') { window.alert('请填写提示词内容'); return }
            setLibBusy(true)
            postJson('/api/image-gen/library', {
              action: 'upsert', kind: libForm.kind, title: libForm.title, text: libForm.text,
            })
              .then((result) => {
                if (result.ok === false) throw new Error(result.message || '保存失败')
                setLibs(result.library)
                setLibForm({ open: false, kind: libForm.kind, title: '', text: '' })
              })
              .catch((error) => window.alert(String(error && error.message ? error.message : error)))
              .finally(() => setLibBusy(false))
          }
          const applyConfig = (result) => {
            if (!result || result.ok === false) throw new Error((result && result.message) || '保存失败')
            setSettings(result.config)
            setDraft((prev) => ({ ...prev, baseURL: result.config.baseURL, model: result.config.model, apiKey: '', newName: '', newModel: '', newBase: '' }))
            recent.refresh()
            return result
          }
          const onSetDefault = (id) => {
            postJson('/api/image-gen/config', { action: 'setDefault', id })
              .then(applyConfig)
              .catch((error) => window.alert(String(error && error.message ? error.message : error)))
          }
          const onAddModel = (input) => {
            const modelId = String((input && (input.newModel || input.model)) || '').trim()
            if (modelId === '') { window.alert('请填写模型 id'); return }
            postJson('/api/image-gen/config', {
              action: 'add',
              group: (input && input.group) || 'custom',
              name: (input && (input.newName || input.name)) || modelId,
              model: modelId,
              baseURL: (input && (input.newBase || input.baseURL)) || '',
              apiKey: input && typeof input.newKey === 'string' && input.newKey.trim() !== '' ? input.newKey.trim() : undefined,
              makeDefault: false,
            })
              .then((result) => {
                applyConfig(result)
                setDraft((prev) => ({ ...prev, newName: '', newModel: '', newBase: '', newKey: '' }))
                setAddOpen(false)
                window.alert(result.message || '已加入模型目录')
              })
              .catch((error) => window.alert(String(error && error.message ? error.message : error)))
          }
          const onTestEntry = (id) => {
            setEntryTest({ id, busy: true, ok: null, message: null })
            postJson('/api/image-gen/config/test', { id })
              .then((result) => setEntryTest({ id, busy: false, ok: result.ok === true, message: result.message }))
              .catch((error) => setEntryTest({ id, busy: false, ok: false, message: String(error && error.message ? error.message : error) }))
          }
          const onSetAddMode = (mode) => {
            setAddMode(mode)
            // 自定义 tab 固定写入自定义分组；切回按分组时保留原有分组。
            setDraft((prev) => ({ ...prev, group: mode === 'custom' ? 'custom' : prev.group }))
          }
          const onEditModel = (entry) => {
            if (entry === null) { setEditing(null); setEditDraft(null); return }
            setAddOpen(false)
            setEditing(entry.id)
            setEditDraft({ name: entry.name || '', model: entry.model || '', baseURL: entry.baseURL || '', key: '' })
          }
          const onSaveEdit = (entry) => {
            const model = String(editDraft?.model || '').trim()
            if (model === '') { window.alert('模型 id 不能为空'); return }
            postJson('/api/image-gen/config', {
              action: 'add',
              id: entry.id,
              group: entry.group,
              name: String(editDraft?.name || '').trim() || model,
              model,
              baseURL: String(editDraft?.baseURL || '').trim(),
              apiKey: editDraft && typeof editDraft.key === 'string' && editDraft.key.trim() !== '' ? editDraft.key.trim() : undefined,
            })
              .then((result) => {
                applyConfig(result)
                setEditing(null)
                setEditDraft(null)
                window.alert(result.message || '已保存')
              })
              .catch((error) => window.alert(String(error && error.message ? error.message : error)))
          }
          const onRemoveModel = (entry) => {
            const target = entry !== null && typeof entry === 'object' ? entry : { id: String(entry ?? ''), name: String(entry ?? '') }
            if (target.id === '') return
            if (!window.confirm('从目录移除「' + (target.name || target.id) + '」？')) return
            postJson('/api/image-gen/config', { action: 'remove', id: target.id })
              .then(applyConfig)
              .catch((error) => window.alert(String(error && error.message ? error.message : error)))
          }
          const onTest = () => {
            setTest({ busy: true, ok: null, message: null })
            postJson('/api/image-gen/config/test', {})
              .then((result) => setTest({ busy: false, ok: result.ok === true, message: result.message }))
              .catch((error) => setTest({ busy: false, ok: false, message: String(error && error.message ? error.message : error) }))
          }
          const loadModels = () => {
            if (models.busy) return
            setModels({ busy: true, items: null, message: null, error: null })
            postJson('/api/image-gen/config/models', {})
              .then((result) => {
                if (result.ok === false) throw new Error(result.message || '加载模型列表失败')
                setModels({ busy: false, items: Array.isArray(result.models) ? result.models : [], message: result.message, error: null })
              })
              .catch((error) => setModels({ busy: false, items: null, message: null, error: String(error && error.message ? error.message : error) }))
          }

          const storagePanel = React.createElement('div', { className: 'ag-col ag-col-left' },
            React.createElement('div', { className: 'ag-tabs' },
              React.createElement('button', { className: 'ag-btn' + (sideTab === 'recent' ? ' ag-btn-on' : ''), onClick: () => { setSideTab('recent'); setOpen(null) } }, '最近生成'),
              React.createElement('button', { className: 'ag-btn' + (sideTab === 'fav' ? ' ag-btn-on' : ''), onClick: () => { setSideTab('fav'); setOpen(null) } }, '收藏库'),
              React.createElement('button', { className: 'ag-btn' + (sideTab === 'prompt' ? ' ag-btn-on' : ''), onClick: () => setSideTab('prompt') }, '提示词库'),
              React.createElement('button', { className: 'ag-btn', onClick: () => active.refresh(), disabled: busy }, active.pending ? '刷新中…' : '刷新')),
            isLibTab
              ? React.createElement(LibraryPanel, {
                  kind: sideTab,
                  entries: (libs && libs[LIB_KEY[sideTab]]) || [],
                  activeId: activePrompt && activePrompt.kind === sideTab ? activePrompt.id : null,
                  styledIds: styles.map((style) => style.id),
                  onToggleStyle: toggleStyle,
                  expanded,
                  onToggle: (id) => setExpanded({ ...expanded, [id]: expanded[id] !== true }),
                  onUse: (entry) => onUseEntry(entry, sideTab),
                  onDelete: (id) => onDeleteEntry(sideTab, id),
                  onOpenCreate: () => { setLibForm({ open: true, kind: sideTab, title: '', text: '' }); setExpanded({}) },
                  form: libForm,
                  setForm: setLibForm,
                  onCreate: onCreateEntry,
                })
              : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                React.createElement('div', { className: 'ag-stats' },
                  React.createElement('div', { className: 'ag-stat' },
                    React.createElement('span', { className: 'ag-stat-label' }, sideTab === 'fav' ? '收藏' : '已保存图片'),
                    React.createElement('span', { className: 'ag-stat-value' }, String(active.state.total || files.length))),
                  React.createElement('div', { className: 'ag-stat' },
                    React.createElement('span', { className: 'ag-stat-label' }, '端点 / 模型'),
                    React.createElement('span', { className: 'ag-stat-value', style: { fontSize: 11 } },
                      String((recent.state.data && recent.state.data.baseURL) || '-') + ' · ' + String((recent.state.data && recent.state.data.model) || '-'))),
                  false
                    ? React.createElement('div', { className: 'ag-pickbar', style: { flex: '1 1 100%' } },
                      React.createElement('span', null, '点选参考图（可连选多张）'),
                      React.createElement('button', { className: 'ag-btn', onClick: () => null }, '完成'))
                    : null),
                React.createElement('h3', { className: 'ag-section' }, (sideTab === 'fav' ? '收藏库' : '最近生成') + '（已加载 ' + files.length + ' / ' + (active.state.total || files.length) + '）'),
                files.length === 0
                  ? React.createElement('div', { className: 'ag-empty' }, sideTab === 'fav' ? '收藏库还是空的，点左侧星星即可收入。' : '还没有保存的图片，去右侧生成一张吧。')
                  : React.createElement('div', { className: 'ag-grid' },
                    files.map((file) => React.createElement('div', {
                      className: 'ag-tile',
                      key: file.name,
                      onClick: () => onTileClick(file.name),
                      draggable: true,
                      title: mode === 'img' ? '拖到右侧参考图区域' : file.name,
                      onDragStart: (event) => {
                        event.dataTransfer.setData('text/plain', 'image-gen-saved:' + file.name)
                        event.dataTransfer.effectAllowed = 'copy'
                      },
                    },
                      React.createElement('img', { className: 'ag-thumb', alt: file.name, src: srcOf(file.name), loading: 'lazy', decoding: 'async' }),
                      React.createElement('button', {
                        className: 'ag-star' + (starred.has(file.name) ? '' : ' off'),
                        title: starred.has(file.name) ? '取消收藏' : '收藏',
                        onClick: (event) => { event.stopPropagation(); toggleStar(file.name) },
                      }, starred.has(file.name) ? '★' : '☆'),
                      React.createElement('button', {
                        className: 'ag-tile-del',
                        onClick: (event) => { event.stopPropagation(); remove(file.name) },
                      }, sideTab === 'fav' ? '移除' : '删除'),
                      React.createElement('div', { className: 'ag-caption' }, file.name)))),
                active.state.hasMore
                  ? React.createElement('div', { className: 'ag-empty' },
                    React.createElement('div', { ref: sentinelRef, style: { height: 1 } }),
                    React.createElement('button', { className: 'ag-btn', onClick: () => active.loadMore(), disabled: active.pending },
                      active.pending ? '加载中…' : '加载更多（' + files.length + ' / ' + (active.state.total || files.length) + '）'))
                  : null))

          const makePanel = React.createElement('div', { className: 'ag-col ag-col-right' },
            React.createElement('div', { className: 'ag-tabs' },
              React.createElement('button', { className: 'ag-btn' + (mode === 'txt' ? ' ag-btn-on' : ''), onClick: () => setMode('txt') }, '文生图'),
              React.createElement('button', { className: 'ag-btn' + (mode === 'img' ? ' ag-btn-on' : ''), onClick: () => setMode('img') }, '图生图'),
              React.createElement('button', { className: 'ag-btn' + (mode === 'set' ? ' ag-btn-on' : ''), onClick: () => { setMode('set'); loadSettings() } }, '设置')),
            mode === 'set'
              ? React.createElement(SettingsForm, {
                  settings, draft, setDraft, test,
                  onTest,
                  onReload: forceSettings,
                  models, onLoadModels: loadModels,
                  settingsError,
                  onSetDefault, onAddModel, onRemoveModel,
                  entryTest, onTestEntry, addOpen, onToggleAdd: setAddOpen,
                  addMode, onSetAddMode, editing, editDraft, setEditDraft, onEditModel, onSaveEdit,
                })
              : React.createElement(GenerateForm, {
                  mode, form, setForm, refs, removeRef,
                  onUpload, urlInput, setUrlInput, onAddUrl: addUrlRef, onGenerate, gen,
                  sizes, saveTarget, onSaveTarget: setSaveTarget, onFillFromActive,
                  onDropRef, onRemoveStyle: removeStyle,
                  catalog: settings && settings.catalog, onSetDefault,
                }))

          const openIndex = open === null ? null : Math.min(open, Math.max(0, files.length - 1))
          return React.createElement('div', { className: 'ag-root', onScroll },
            React.createElement('div', { className: 'ag-head' },
              React.createElement('div', null,
                React.createElement('h2', { className: 'ag-title' }, '图片生成'),
                React.createElement('div', { className: 'ag-sub' }, '左栏收纳 / 提示词库 / 收藏库 · 右栏文生图 / 图生图 · 设置接入生图模型'))),
            React.createElement('div', { className: 'ag-cols' }, storagePanel, makePanel),
            openIndex !== null && files.length > 0
              ? React.createElement(Lightbox, {
                  files,
                  index: openIndex,
                  srcOf,
                  starred,
                  onClose: () => setOpen(null),
                  onIndex: (next) => {
                    setOpen(next)
                    if (next >= files.length - 3) active.loadMore()
                  },
                  onDelete: remove,
                  onStar: toggleStar,
                })
              : null)
        }

        function panelGlyph(props) {
          const size = props !== null && typeof props === 'object' && typeof props.size === 'number' && props.size > 0 ? props.size : 16
          return React.createElement('span', {
            className: 'ag-glyph',
            style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.62) + 'px' },
          }, 'A')
        }

        if (slots === undefined) return
        slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, Panel))
        slots.inject('sidebar.panellist', () => slots.register(
          { name: 'sidebar.panellist', id: PANEL_KEY, label: '图片生成', order: 49 },
          (props) => panelGlyph(props)))
      },
    }
}

// ─── 组件：token-usage ───
function tokenUsageClientFactory(require) {
    const React = require("react")
const CSS = '.tk-root{display:flex;flex-direction:column;gap:14px;padding:18px 20px;overflow:auto;height:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-0)}.tk-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}.tk-title{font-size:13px;color:var(--dsw-alias-label-secondary);margin:0 0 6px}.tk-total{font-size:34px;font-weight:650;color:var(--dsw-alias-label-primary);line-height:1.05}.tk-sub{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:6px}.tk-actions,.tk-flex,.tk-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.tk-summary{display:flex;align-items:center;gap:12px;min-width:320px}.tk-summary-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#34343a;color:#fff;font-size:21px}.tk-summary-side{display:flex;align-items:stretch;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}.tk-summary-stat{padding:9px 15px;min-width:98px}.tk-summary-stat+.tk-summary-stat{border-left:1px solid var(--dsw-alias-border-l1)}.tk-summary-label{font-size:11px;color:var(--dsw-alias-label-secondary);margin-bottom:3px}.tk-summary-value{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}.tk-summary-cost{color:var(--dsw-alias-state-success-primary)}.tk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tk-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:14px 16px}.tk-metric{display:flex;flex-direction:column;gap:6px;min-height:72px;box-sizing:border-box}.tk-metric-label{font-size:12px;color:var(--dsw-alias-label-secondary)}.tk-metric-value{font-size:20px;font-weight:600;color:var(--dsw-alias-label-primary)}.tk-bar{height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin-top:2px}.tk-bar>div{height:100%;background:var(--dsw-alias-state-success-primary)}.tk-section-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);margin:0 0 10px}.tk-table{width:100%;border-collapse:collapse;font-size:12px}.tk-table th{text-align:right;font-weight:500;color:var(--dsw-alias-label-secondary);padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);white-space:nowrap}.tk-table th:first-child,.tk-table td:first-child{text-align:left}.tk-table td{text-align:right;padding:7px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);white-space:nowrap}.tk-row{cursor:pointer}.tk-row:hover td{background:var(--dsw-alias-bg-layer-2)}.tk-name{font-weight:500}.tk-tag{font-size:11px;padding:1px 6px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);margin-left:6px}.tk-btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:6px 11px;font-size:12px;cursor:pointer}.tk-btn:hover{border-color:#8b8b95}.tk-btn-active{background:#34343a!important;color:#f5f5f5!important;border-color:#686873!important}.tk-input,.tk-select{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:6px 9px;font-size:12px;color:var(--dsw-alias-label-primary)}.tk-input{min-width:150px}.tk-detail{padding:10px 12px;background:var(--dsw-alias-bg-layer-2);border-radius:7px;margin-top:4px;overflow:auto}.tk-price-toggle{width:100%;display:flex;justify-content:space-between;align-items:center;background:transparent;border:0;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;font-weight:600;padding:0;cursor:pointer;text-align:left}.tk-price-toggle span:last-child{color:var(--dsw-alias-label-secondary);font-size:16px}.tk-chart{width:100%;height:clamp(250px,30vw,360px);min-height:250px;max-height:360px}.tk-chart svg{display:block;width:100%;height:100%;overflow:visible}.tk-grid-line{stroke:var(--dsw-alias-border-l1);stroke-width:1}.tk-axis-text{fill:var(--dsw-alias-label-secondary);font-size:11px}.tk-area{fill:url(#tk-cache-fill);opacity:.88}.tk-line{fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.tk-point{stroke:var(--dsw-alias-bg-layer-1);stroke-width:1.5}.tk-hover-line{stroke:rgba(255,255,255,.55);stroke-width:1}.tk-tooltip{fill:#25252a;stroke:#8b8b95;stroke-width:1}.tk-tooltip-text{font-size:11px}.tk-axis{position:relative;height:18px;margin-top:6px;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden}.tk-axis span{position:absolute;top:0;line-height:16px}.tk-legend{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:var(--dsw-alias-label-secondary)}.tk-legend-item{display:flex;align-items:center;gap:5px}.tk-legend-dot{width:18px;height:2px;border-radius:2px}.tk-empty{padding:22px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px}.tk-entry{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);border-radius:7px;padding:6px 8px;font:inherit;font-size:13px;cursor:pointer;text-align:left}.tk-entry-dot{width:20px;height:20px;flex:0 0 20px;border-radius:5px;background:var(--dsw-alias-brand-primary);color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center}.tk-entry-label{flex:1;min-width:0}@media(max-width:720px){.tk-grid{grid-template-columns:1fr}.tk-summary{min-width:0;flex-wrap:wrap}.tk-summary-side{width:100%}.tk-summary-stat{flex:1}.tk-total{font-size:30px}}.tk-switching{position:fixed;top:14px;right:18px;z-index:60;display:inline-flex;align-items:center;gap:7px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:99px;padding:5px 12px;font-size:12px;color:var(--dsw-alias-label-primary);box-shadow:0 4px 16px rgba(0,0,0,.22)}.tk-switching::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:tk-pulse 1s ease-in-out infinite}@keyframes tk-pulse{0%,100%{opacity:.25}50%{opacity:1}}.tk-heat{padding-bottom:4px}.tk-heat-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.tk-heat-legend{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--dsw-alias-label-secondary)}.tk-heat-swatch{width:11px;height:11px;border-radius:2px;display:inline-block}.tk-heat-body{display:flex;gap:8px;align-items:stretch;margin-top:12px}.tk-heat-wd{display:grid;grid-template-rows:repeat(7,1fr);gap:3px;width:26px;margin-top:24px;font-size:10px;color:var(--dsw-alias-label-secondary)}.tk-heat-wd span{display:flex;align-items:center;justify-content:flex-end}.tk-heat-main{flex:1;min-width:0}.tk-heat-months{height:18px;margin-bottom:6px;font-size:10px;color:var(--dsw-alias-label-secondary)}.tk-heat-month{white-space:nowrap;overflow:hidden}.tk-heat-cell{width:100%;aspect-ratio:1/1;border-radius:2px;background:#2f2f35}.tk-heat-l1{background:#14532d}.tk-heat-l2{background:#15803d}.tk-heat-l3{background:#22c55e}.tk-heat-l4{background:#4ade80}.tk-heat-tip{position:fixed;z-index:40;pointer-events:none;background:#25252a;border:1px solid #8b8b95;border-radius:8px;padding:8px 10px;font-size:11px;color:#fff;white-space:nowrap}.tk-range{position:relative}.tk-range-btn{display:inline-flex;align-items:center;gap:6px}.tk-range-caret{font-size:9px;opacity:.7}.tk-pop-backdrop{position:fixed;inset:0;z-index:60}.tk-pop{position:absolute;top:calc(100% + 6px);right:0;z-index:61;min-width:246px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:2px;box-shadow:0 12px 32px #0009}.tk-pop-item{border:0;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;font-size:12px;padding:6px 9px;border-radius:6px;cursor:pointer}.tk-pop-item:hover{background:var(--dsw-alias-bg-layer-1)}.tk-pop-item-on{color:var(--dsw-alias-brand-primary);font-weight:600}.tk-pop-sep{height:1px;background:var(--dsw-alias-border-l1);margin:6px 2px}.tk-pop-title{font-size:11px;color:var(--dsw-alias-label-secondary);padding:0 9px 4px}.tk-pop-row{display:flex;align-items:center;gap:6px;padding:0 9px 4px}.tk-pop-label{font-size:11px;color:var(--dsw-alias-label-secondary);flex:0 0 18px}.tk-range-input{flex:1;min-width:0;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:4px 6px;font-size:11px;color:var(--dsw-alias-label-primary);color-scheme:dark}.tk-pop-apply{margin:4px 9px 2px;text-align:center;justify-content:center}.tk-pop-apply:disabled{opacity:.5;cursor:not-allowed}.tk-price-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 2px}.tk-price-form{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin:8px 0}.tk-price-form label{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--dsw-alias-label-secondary)}.tk-price-form label input{width:96px}.tk-price-form label.tk-price-form-wide input{width:170px}.tk-mini-btn{padding:2px 8px;font-size:11px}.tk-price-notice{font-size:12px;margin:6px 0}.tk-price-notice-bad{color:var(--dsw-alias-state-danger-primary,#f43f5e)}.tk-price-syncmeta{font-size:11px;color:var(--dsw-alias-label-secondary)}.tk-price-rate{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--dsw-alias-label-secondary)}'
const PANEL_KEY = 'token-usage'
return {
  inject: ['slots', 'layout', 'timer'],
  apply(ctx) {
    ctx.effect(() => {
      const el = document.createElement("style")
      el.textContent = CSS
      document.head.appendChild(el)
      return () => el.remove()
    }, "token-usage: styles")
    const slots = ctx.slots
    const layout = ctx.layout
    const fetchJson = (url) => fetch(url, { headers: { accept: "application/json" } }).then((response) => {
      if (!response.ok) throw new Error("HTTP " + response.status)
      return response.json()
    })
    const host = {
      call(method, args) {
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(args && typeof args === "object" ? args : {})) {
          if (value !== undefined && value !== null) params.set(key, String(value))
        }
        const suffix = method === "token-usage-pricing" ? "/pricing" : method === "token-usage-summary" ? "/summary" : ""
        const query = params.toString()
        return fetchJson("/api/token-usage" + suffix + (query ? "?" + query : ""))
      },
    }
    const fmtInt = (value) => Number(value || 0).toLocaleString('en-US')
    // ── 货币显示：数据一律美元存储，这里只做显示层换算（¥ = $ × 汇率）──
    const CURRENCY = { mode: 'USD', rate: 7.2 }
    const currencyListeners = new Set()
    const setCurrency = (next) => {
      let changed = false
      if (next.mode !== undefined && next.mode !== CURRENCY.mode) { CURRENCY.mode = next.mode; changed = true }
      if (next.rate !== undefined && Number.isFinite(next.rate) && next.rate > 0 && next.rate !== CURRENCY.rate) { CURRENCY.rate = next.rate; changed = true }
      if (changed) for (const listener of currencyListeners) listener()
    }
    const fmtCost = (value) => {
      const n = Number(value || 0)
      if (CURRENCY.mode === 'CNY') {
        const cny = n * CURRENCY.rate
        if (cny === 0) return '¥0'
        return '¥' + (cny < 0.01 ? cny.toFixed(6) : cny < 0.1 ? cny.toFixed(4) : cny.toFixed(2))
      }
      return n === 0 ? '$0' : '$' + (n < 0.01 ? n.toFixed(6) : n.toFixed(4))
    }
    // 单价显示（计价明细表格）：跟从当前货币换算；录入仍为美元。
    const fmtUnitPrice = (usd) => {
      const n = Number(usd || 0)
      if (CURRENCY.mode === 'CNY') {
        const cny = n * CURRENCY.rate
        return '¥' + (cny === 0 ? '0' : String(Number(cny.toFixed(6))))
      }
      return '$' + (n === 0 ? '0' : String(Number(n.toFixed(6))))
    }
    const fmtTokens = (value) => { const n = Number(value || 0); return n >= 1e8 ? (n / 1e8).toFixed(2) + ' 亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + ' 万' : fmtInt(n) }
    const toLocalInput = (date) => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') + 'T' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0')
    const fmtTime = (value) => { if (!value) return '-'; const d = new Date(value); const p = (n) => String(n).padStart(2, '0'); return p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) }
    const axisTime = (value, range) => { const d = new Date(value); const p = (n) => String(n).padStart(2, '0'); return range === 'today' ? p(d.getHours()) + ':' + p(d.getMinutes()) : p(d.getMonth() + 1) + '/' + p(d.getDate()) }
    const openPanel = () => { if (layout !== undefined) try { layout.selectPanel(PANEL_KEY) } catch (error) {} }
    function useHostCall(method, args, intervalMs) { const [value, setValue] = React.useState(null); React.useEffect(() => { let alive = true; const load = () => host.call(method, args || {}).then((next) => { if (alive) setValue(next) }).catch(() => {}); load(); const stop = ctx.interval(load, intervalMs); return () => { alive = false; stop() } }, [JSON.stringify(args), intervalMs]); return value }
    function metric(label, value, extra) { return React.createElement('div', { className: 'tk-card tk-metric' }, React.createElement('span', { className: 'tk-metric-label' }, label), React.createElement('span', { className: 'tk-metric-value' }, value), extra || null) }
    function modelTable(models) { const labels = ['模型', '请求', '输入', '输出', '缓存读', '缓存写', '总量', '成本', '占比']; const total = models.reduce((sum, item) => sum + (item.cost || 0), 0); const body = models.map((item) => React.createElement('tr', { key: item.model }, React.createElement('td', null, item.displayName || item.model), React.createElement('td', null, fmtInt(item.requests)), React.createElement('td', null, fmtInt(item.input)), React.createElement('td', null, fmtInt(item.output)), React.createElement('td', null, fmtInt(item.cacheRead)), React.createElement('td', null, fmtInt(item.cacheWrite)), React.createElement('td', null, fmtInt(item.loop)), React.createElement('td', null, fmtCost(item.cost)), React.createElement('td', null, total > 0 ? (item.cost / total * 100).toFixed(1) + '%' : '-'))); return React.createElement('div', { className: 'tk-card' }, React.createElement('h3', { className: 'tk-section-title' }, '模型分布'), models.length === 0 ? React.createElement('div', { className: 'tk-empty' }, '暂无记录') : React.createElement('table', { className: 'tk-table' }, React.createElement('thead', null, React.createElement('tr', null, labels.map((label) => React.createElement('th', { key: label }, label)))), React.createElement('tbody', null, body))) }
    function RequestDetail(session) { const rows = (session.calls || []).map((call, index) => React.createElement('tr', { key: index }, React.createElement('td', null, fmtTime(call.time)), React.createElement('td', null, call.model || '-'), React.createElement('td', null, fmtInt(call.input)), React.createElement('td', null, fmtInt(call.output)), React.createElement('td', null, fmtInt(call.cacheRead)), React.createElement('td', null, fmtInt(call.cacheWrite)), React.createElement('td', null, call.priced ? fmtCost(call.cost) : '未配价'))); const labels = ['时间', '模型', '输入', '输出', '缓存命中', '缓存创建', '成本']; return React.createElement('div', { className: 'tk-detail' }, React.createElement('div', { className: 'tk-sub' }, session.cwd || session.id), React.createElement('table', { className: 'tk-table' }, React.createElement('thead', null, React.createElement('tr', null, labels.map((label) => React.createElement('th', { key: label }, label)))), React.createElement('tbody', null, rows))) }
    function RequestTable(sessions, filter, setFilter, origin, setOrigin, expanded, setExpanded) { const needle = filter.trim().toLowerCase(); const visible = sessions.filter((session) => (origin === 'all' || (origin === 'subagent' ? session.origin === 'subagent' : session.origin !== 'subagent')) && (needle.length === 0 || String(session.title || '').toLowerCase().includes(needle) || String(session.id || '').toLowerCase().includes(needle) || String(session.cwd || '').toLowerCase().includes(needle))); const rows = []; for (const session of visible) { rows.push(React.createElement('tr', { className: 'tk-row', key: session.id, onClick: () => setExpanded(expanded === session.id ? null : session.id) }, React.createElement('td', null, React.createElement('span', { className: 'tk-name' }, session.title || session.id), session.origin === 'subagent' ? React.createElement('span', { className: 'tk-tag' }, 'subagent') : null), React.createElement('td', null, fmtInt(session.requests)), React.createElement('td', null, fmtInt(session.input)), React.createElement('td', null, fmtInt(session.output)), React.createElement('td', null, fmtInt(session.cacheRead)), React.createElement('td', null, fmtInt(session.loop)), React.createElement('td', null, fmtCost(session.cost)), React.createElement('td', null, fmtTime(session.updatedAt)))); if (expanded === session.id) rows.push(React.createElement('tr', { key: session.id + '-detail' }, React.createElement('td', { colSpan: 8 }, RequestDetail(session)))) } const labels = ['会话', '请求', '输入', '输出', '缓存命中', '总量', '成本', '最后活动']; return React.createElement('div', { className: 'tk-card' }, React.createElement('div', { className: 'tk-toolbar', style: { justifyContent: 'space-between', marginBottom: '10px' } }, React.createElement('h3', { className: 'tk-section-title', style: { margin: 0 } }, '请求查看'), React.createElement('div', { className: 'tk-toolbar' }, React.createElement('select', { className: 'tk-select', value: origin, onChange: (event) => setOrigin(event.target.value) }, React.createElement('option', { value: 'all' }, '全部来源'), React.createElement('option', { value: 'main' }, '主会话'), React.createElement('option', { value: 'subagent' }, '子会话')), React.createElement('input', { className: 'tk-input', placeholder: '搜索会话 / ID / 路径', value: filter, onChange: (event) => setFilter(event.target.value) }))), visible.length === 0 ? React.createElement('div', { className: 'tk-empty' }, '没有符合条件的请求') : React.createElement('table', { className: 'tk-table' }, React.createElement('thead', null, React.createElement('tr', null, labels.map((label) => React.createElement('th', { key: label }, label)))), React.createElement('tbody', null, rows))) }
    function PriceTable() {
      const [pricing, setPricing] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [form, setForm] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [notice, setNotice] = React.useState(null)
      const [rateDraft, setRateDraft] = React.useState('')
      React.useEffect(() => {
        let alive = true
        const load = () => host.call('token-usage-pricing', {}).then((next) => {
          if (!alive) return
          setPricing(next)
          if (next !== null && typeof next === 'object') setCurrency({ rate: Number(next.exchangeRate) })
        }).catch(() => {})
        load()
        const stop = ctx.interval(load, 60000)
        return () => { alive = false; stop() }
      }, [])
      if (pricing === null || pricing.available !== true) return null
      const post = (body) => {
        setBusy(true)
        setNotice(null)
        fetch('/api/token-usage/pricing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
          .then((response) => response.json())
          .then((result) => {
            setNotice(result !== null && typeof result === 'object' ? result : { ok: false, message: String(result) })
            if (result !== null && typeof result === 'object' && result.ok) setForm(null)
            return host.call('token-usage-pricing', {})
          })
          .then((next) => setPricing(next))
          .catch((error) => setNotice({ ok: false, message: String(error && error.message ? error.message : error) }))
          .finally(() => setBusy(false))
      }
      const syncInfo = pricing.sync || {}
      const syncMeta = syncInfo.lastSyncAt > 0
        ? 'models.dev 上次同步 ' + fmtTime(syncInfo.lastSyncAt) + '（' + fmtInt(syncInfo.lastCount) + ' 条）'
        : '尚未从 models.dev 同步过'
      const sourceText = pricing.source === 'builtin+user'
        ? '来源：内置 ' + fmtInt(pricing.builtin) + ' 条 + 自定义/同步 ' + fmtInt(pricing.overrides) + ' 条'
        : '来源：' + (pricing.sourceLabel || '内置价目')
      const errorText = pricing.error ? '（价目文件读取失败：' + pricing.error + '）' : ''
      const labels = ['模型', '输入', '输出', '缓存命中', '缓存创建', '操作']
      const body = (pricing.entries || []).map((item) => React.createElement('tr', { key: item.modelId },
        React.createElement('td', null, item.displayName || item.modelId),
        React.createElement('td', null, fmtUnitPrice(item.input)),
        React.createElement('td', null, fmtUnitPrice(item.output)),
        React.createElement('td', null, fmtUnitPrice(item.cacheRead)),
        React.createElement('td', null, fmtUnitPrice(item.cacheWrite)),
        React.createElement('td', null,
          React.createElement('span', { className: 'tk-toolbar' },
            React.createElement('button', { className: 'tk-btn tk-mini-btn', disabled: busy, onClick: () => setForm({ modelId: item.modelId, displayName: item.displayName || item.modelId, input: String(item.input ?? 0), output: String(item.output ?? 0), cacheRead: String(item.cacheRead ?? 0), cacheWrite: String(item.cacheWrite ?? 0) }) }, '改'),
            React.createElement('button', { className: 'tk-btn tk-mini-btn', disabled: busy, onClick: () => post({ action: 'delete', modelId: item.modelId }) }, '删')))))
      const saveRate = () => {
        const raw = String(rateDraft).trim()
        const value = Number(raw === '' ? pricing.exchangeRate : raw)
        if (!Number.isFinite(value) || value <= 0) {
          setNotice({ ok: false, message: '汇率无效：需为正数（1 美元兑换的人民币）' })
          return
        }
        setCurrency({ rate: value })
        post({ action: 'rate', usdToCny: value })
      }
      const formField = (label, key, wide) => React.createElement('label', { key, className: wide ? 'tk-price-form-wide' : '' },
        label,
        React.createElement('input', { className: 'tk-input', value: String(form[key] ?? ''), disabled: busy, onChange: (event) => setForm({ ...form, [key]: event.target.value }) }))
      const tools = React.createElement('div', { className: 'tk-price-tools' },
        React.createElement('button', { className: 'tk-btn', disabled: busy, onClick: () => setForm({ modelId: '', displayName: '', input: '0', output: '0', cacheRead: '0', cacheWrite: '0' }) }, '＋ 添加 / 覆盖价格'),
        React.createElement('button', { className: 'tk-btn', disabled: busy, onClick: () => post({ action: 'sync' }) }, busy ? '处理中…' : '⟳ 同步 models.dev'),
        React.createElement('label', { className: 'tk-price-rate' }, '汇率 $→¥',
          React.createElement('input', { className: 'tk-input', value: rateDraft, placeholder: String(pricing.exchangeRate ?? 7.2), disabled: busy, style: { width: '72px' }, onChange: (event) => setRateDraft(event.target.value) })),
        React.createElement('button', { className: 'tk-btn tk-mini-btn', disabled: busy, onClick: saveRate }, '存汇率'),
        React.createElement('span', { className: 'tk-price-syncmeta' }, syncMeta + (syncInfo.lastSyncError ? ' · 上次同步失败：' + syncInfo.lastSyncError : '')))
      const editor = form === null ? null : React.createElement('div', { className: 'tk-price-form' },
        formField('模型 ID', 'modelId', true),
        formField('显示名', 'displayName', true),
        formField('输入 $/M', 'input'),
        formField('输出 $/M', 'output'),
        formField('缓存读 $/M', 'cacheRead'),
        formField('缓存写 $/M', 'cacheWrite'),
        React.createElement('button', { className: 'tk-btn tk-pop-apply', disabled: busy || String(form.modelId).trim() === '', onClick: () => post({ action: 'upsert', entry: form }) }, '保存'),
        React.createElement('button', { className: 'tk-btn', disabled: busy, onClick: () => setForm(null) }, '取消'))
      const noticeBar = notice === null ? null : React.createElement('div', { className: 'tk-price-notice' + (notice.ok ? '' : ' tk-price-notice-bad') }, notice.message)
      return React.createElement('div', { className: 'tk-card' },
        React.createElement('button', { className: 'tk-price-toggle', onClick: () => setOpen(!open), 'aria-expanded': open },
          React.createElement('span', null, '计价明细（每百万 Token）· 共 ' + fmtInt((pricing.entries || []).length) + ' 个模型 · ' + sourceText + errorText),
          React.createElement('span', null, open ? '−' : '+')),
        open ? React.createElement('div', null, tools, editor, noticeBar, React.createElement('table', { className: 'tk-table', style: { marginTop: '12px' } },
          React.createElement('thead', null, React.createElement('tr', null, labels.map((label) => React.createElement('th', { key: label }, label)))),
          React.createElement('tbody', null, body))) : null)
    }
    function smooth(points) { if (points.length === 0) return ''; if (points.length === 1) return 'M ' + points[0].x.toFixed(1) + ' ' + points[0].y.toFixed(1); let d = 'M ' + points[0].x.toFixed(1) + ' ' + points[0].y.toFixed(1); for (let i = 0; i < points.length - 1; i += 1) { const a = points[i]; const b = points[i + 1]; const mid = ((a.x + b.x) / 2).toFixed(1); d += ' C ' + mid + ' ' + a.y.toFixed(1) + ', ' + mid + ' ' + b.y.toFixed(1) + ', ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) } return d }
    function Trend(props) {
      props = props || {}
      const [hover, setHover] = React.useState(null)
      const sessions = props.sessions || []
      const range = props.range || 'today'
      const headerLabel = props.label !== undefined && props.label !== '' ? props.label : (range === 'today' ? '今天' : range === 'all' ? '全部时间' : range)
      const windowEnd = Number(props.end) || Date.now()
      const windowStart = Number(props.start) || 0
      const calls = []
      for (const session of sessions) {
        for (const call of session.calls || []) {
          const time = Number(call.time) || 0
          if (time <= 0) continue
          if (windowStart > 0 && time < windowStart) continue
          if (time > windowEnd) continue
          calls.push(call)
        }
      }
      if (calls.length === 0) {
        return React.createElement('div', { className: 'tk-card' },
          React.createElement('div', { className: 'tk-flex', style: { justifyContent: 'space-between' } },
            React.createElement('h3', { className: 'tk-section-title', style: { margin: 0 } }, '使用趋势'),
            React.createElement('span', { className: 'tk-sub' }, headerLabel)),
          React.createElement('div', { className: 'tk-empty' }, '这段时间还没有用量'))
      }
      let activityFirst = Infinity
      let activityLast = 0
      for (const call of calls) {
        if (call.time < activityFirst) activityFirst = call.time
        if (call.time > activityLast) activityLast = call.time
      }
      const first = activityFirst
      const last = activityLast <= activityFirst ? activityFirst + 60 * 1000 : activityLast
      const duration = Math.max(1, last - first)
      const axisRange = duration <= 36 * 3600 * 1000 ? 'today' : range
      const targetBucket = range === 'today' ? 60 * 1000 : range === '7d' ? 6 * 3600 * 1000 : range === '30d' ? 24 * 3600 * 1000 : range === '90d' ? 3 * 24 * 3600 * 1000 : 12 * 3600 * 1000
      const count = Math.min(96, Math.max(8, Math.round(duration / targetBucket) || 8))
      const span = duration / count
      const buckets = []
      for (let i = 0; i < count; i += 1) buckets.push({ start: first + i * span, end: first + (i + 1) * span, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 })
      for (const call of calls) {
        const index = Math.min(count - 1, Math.max(0, Math.floor((call.time - first) / span)))
        buckets[index].input += call.input || 0
        buckets[index].output += call.output || 0
        buckets[index].cacheRead += call.cacheRead || 0
        buckets[index].cacheWrite += call.cacheWrite || 0
        buckets[index].cost += call.cost || 0
      }
      const used = (bucket) => (bucket.input + bucket.output + bucket.cacheRead + bucket.cacheWrite + bucket.cost) > 0
      let from = 0
      let to = buckets.length - 1
      while (from < to && !used(buckets[from])) from += 1
      while (to > from && !used(buckets[to])) to -= 1
      const view = buckets.slice(from, to + 1)
      if (view.length > 0) {
        const step = view[0].end - view[0].start || span
        view.unshift({ start: view[0].start - step, end: view[0].start, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 })
      }
      const n = view.length
      const width = 760
      const height = 228
      const padLeft = 52
      const padRight = 52
      const padTop = 20
      const padBottom = 28
      const plotWidth = width - padLeft - padRight
      const plotHeight = height - padTop - padBottom
      const tokenMax = Math.max(1, ...view.map((item) => Math.max(item.input, item.output, item.cacheRead, item.cacheWrite))) * 1.12
      const costMax = Math.max(0.000001, ...view.map((item) => item.cost)) * 1.12
      const niceToken = (value) => {
        if (value >= 1e8) return (value / 1e8).toFixed(value >= 1e9 ? 1 : 2) + '亿'
        if (value >= 1e4) return (value / 1e4).toFixed(value >= 1e5 ? 0 : 1) + '万'
        return String(Math.round(value))
      }
      const x = (index) => padLeft + index / Math.max(1, n - 1) * plotWidth
      const clampY = (value) => Math.max(padTop, Math.min(height - padBottom, value))
      const tokenY = (value) => clampY(height - padBottom - value / tokenMax * plotHeight)
      const costY = (value) => clampY(height - padBottom - value / costMax * plotHeight)
      const baseY = height - padBottom
      const spec = [
        { key: 'cacheRead', label: '缓存命中', color: '#c084fc', mapper: tokenY, width: 2.2 },
        { key: 'cacheWrite', label: '缓存创建', color: '#f59e0b', mapper: tokenY },
        { key: 'input', label: '输入', color: '#60a5fa', mapper: tokenY },
        { key: 'output', label: '输出', color: '#4ade80', mapper: tokenY },
        { key: 'cost', label: '成本', color: '#f43f5e', mapper: costY, dash: '5 4' },
      ]
      const seriesPoints = (key, mapper) => {
        const pts = view.map((bucket, index) => ({ x: x(index), y: mapper(bucket[key] || 0), v: bucket[key] || 0 }))
        let b = pts.length - 1
        while (b > 0 && pts[b].v === 0) b -= 1
        return pts.slice(0, b + 1)
      }
      const paths = spec.map((item) => React.createElement('path', {
        key: item.key,
        className: 'tk-line',
        d: smooth(seriesPoints(item.key, item.mapper)),
        stroke: item.color,
        strokeWidth: item.width || 1.6,
        strokeDasharray: item.dash || undefined,
      }))
      const cachePts = seriesPoints('cacheRead', tokenY)
      const area = cachePts.length === 0 ? '' : smooth(cachePts) + ' L ' + cachePts[cachePts.length - 1].x.toFixed(1) + ' ' + baseY.toFixed(1) + ' L ' + cachePts[0].x.toFixed(1) + ' ' + baseY.toFixed(1) + ' Z'
      const ticks = 4
      const grid = []
      const yLabels = []
      const costLabels = []
      for (let i = 0; i <= ticks; i += 1) {
        const gy = padTop + plotHeight * i / ticks
        grid.push(React.createElement('line', { key: 'g' + i, className: 'tk-grid-line', x1: padLeft, x2: width - padRight, y1: gy, y2: gy }))
        yLabels.push(React.createElement('text', { key: 'yl' + i, className: 'tk-axis-text', x: padLeft - 8, y: gy + 3, textAnchor: 'end' }, niceToken(tokenMax * (1 - i / ticks))))
        costLabels.push(React.createElement('text', { key: 'cl' + i, className: 'tk-axis-text', x: width - padRight + 8, y: gy + 3, textAnchor: 'start' }, fmtCost(costMax * (1 - i / ticks))))
      }
      const axisCount = Math.min(12, Math.max(6, Math.round(n / 6)))
      const xLabels = []
      for (let i = 0; i < axisCount; i += 1) {
        const index = axisCount === 1 ? 0 : Math.round(i * (n - 1) / (axisCount - 1))
        const anchor = i === 0 ? 'start' : i === axisCount - 1 ? 'end' : 'middle'
        xLabels.push(React.createElement('text', { key: 'x' + i, className: 'tk-axis-text', x: x(index), y: height - 8, textAnchor: anchor }, axisTime(view[index].start, axisRange)))
      }
      const clip = React.createElement('clipPath', { id: 'tk-trend-clip' }, React.createElement('rect', { x: padLeft, y: padTop, width: plotWidth, height: plotHeight }))
      const activeHover = hover === null || hover < 0 || hover >= n ? null : hover
      let hoverGroup = null
      let tooltip = null
      if (activeHover !== null) {
        const bucket = view[activeHover]
        const hx = x(activeHover)
        hoverGroup = React.createElement('g', { key: 'hover' },
          React.createElement('line', { x1: hx, x2: hx, y1: padTop, y2: height - padBottom, stroke: '#8b8b95', strokeWidth: 1 }),
          spec.map((item) => React.createElement('circle', { key: item.key, className: 'tk-point', cx: hx, cy: item.mapper(view[activeHover][item.key] || 0), r: 3.2, fill: item.color })))
        const boxW = 168
        const boxX = Math.min(width - padRight - boxW, Math.max(padLeft, hx + 10))
        const boxY = padTop + 6
        const rows = [
          ['成本', fmtCost(bucket.cost), '#f43f5e'],
          ['缓存创建', fmtTokens(bucket.cacheWrite), '#f59e0b'],
          ['缓存命中', fmtTokens(bucket.cacheRead), '#a855f7'],
          ['输入', fmtTokens(bucket.input), '#3b82f6'],
          ['输出', fmtTokens(bucket.output), '#22c55e'],
        ]
        tooltip = React.createElement('g', { key: 'tip' },
          React.createElement('rect', { className: 'tk-tooltip', x: boxX, y: boxY, width: boxW, height: 108, rx: 8 }),
          React.createElement('text', { className: 'tk-tooltip-text', fill: '#fff', x: boxX + 12, y: boxY + 18, fontSize: 11 }, fmtTime(bucket.start)),
          rows.map((row, index) => React.createElement('g', { key: row[0] },
            React.createElement('circle', { cx: boxX + 16, cy: boxY + 36 + index * 14, r: 3.5, fill: row[2] }),
            React.createElement('text', { className: 'tk-tooltip-text', fill: '#ddd', x: boxX + 26, y: boxY + 40 + index * 14 }, row[0] + ': ' + row[1]))))
      }
      const legend = spec.map((item) => React.createElement('span', { className: 'tk-legend-item', key: item.key },
        React.createElement('span', { style: { width: 8, height: 8, borderRadius: 99, background: item.color, display: 'inline-block' } }),
        item.label))
      const move = (event) => {
        const node = event.currentTarget
        const rect = node.getBoundingClientRect()
        const plotStart = rect.left + padLeft / width * rect.width
        const plotSize = plotWidth / width * rect.width
        const ratio = plotSize > 0 ? (event.clientX - plotStart) / plotSize : 0
        const index = Math.min(n - 1, Math.max(0, Math.round(Math.max(0, Math.min(1, ratio)) * (n - 1))))
        setHover(index)
      }
      return React.createElement('div', { className: 'tk-card' },
        React.createElement('div', { className: 'tk-flex', style: { justifyContent: 'space-between' } },
          React.createElement('h3', { className: 'tk-section-title', style: { margin: 0 } }, '使用趋势'),
          React.createElement('span', { className: 'tk-sub' }, headerLabel)),
        React.createElement('div', { className: 'tk-chart' },
          React.createElement('svg', { viewBox: '0 0 760 228', preserveAspectRatio: 'none', role: 'img', 'aria-label': 'Token 与成本趋势图', onMouseMove: move, onMouseLeave: () => setHover(null) },
            React.createElement('defs', null,
              React.createElement('linearGradient', { id: 'tk-cache-fill', x1: '0', y1: '0', x2: '0', y2: '1' },
                React.createElement('stop', { offset: '0%', stopColor: '#a855f7', stopOpacity: '.22' }),
                React.createElement('stop', { offset: '100%', stopColor: '#a855f7', stopOpacity: '0' })),
              clip),
            React.createElement('g', { clipPath: 'url(#tk-trend-clip)' }, grid, React.createElement('path', { className: 'tk-area', d: area }), paths),
            hoverGroup, yLabels, costLabels, xLabels, tooltip)),
        React.createElement('div', { className: 'tk-legend' }, legend))
    }
    

    function ActivityHeatmap() {
      const [data, setData] = React.useState(null)
      const [tip, setTip] = React.useState(null)
      React.useEffect(() => {
        let alive = true
        fetch('/api/token-usage/activity', { headers: { accept: 'application/json' } })
          .then((response) => { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json() })
          .then((next) => { if (alive) setData(next) })
          .catch(() => { if (alive) setData({ days: [], activeDays: 0, error: true }) })
        return () => { alive = false }
      }, [])
      if (data === null) {
        return React.createElement('div', { className: 'tk-card' }, React.createElement('div', { className: 'tk-empty' }, '正在统计近一年活跃度…'))
      }
      const days = Array.isArray(data.days) ? data.days : []
      const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
      const levelOf = (requests) => requests <= 0 ? 0 : requests === 1 ? 1 : requests <= 4 ? 2 : requests <= 9 ? 3 : 4
      const cols = []
      for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7))
      const total = cols.length
      if (total === 0) {
        return React.createElement('div', { className: 'tk-card' },
          React.createElement('h3', { className: 'tk-section-title', style: { margin: 0 } }, '活跃度'),
          React.createElement('div', { className: 'tk-empty' }, '暂无活跃度数据'))
      }
      const marks = []
      let last = -1
      cols.forEach((col, index) => {
        const first = col.find((day) => day && day.date)
        if (!first) return
        const month = Number(first.date.slice(5, 7))
        if (month === last) return
        last = month
        marks.push({ start: index, label: months[month - 1] })
      })
      const monthStyle = { display: 'grid', gap: '3px', gridTemplateColumns: 'repeat(' + total + ', minmax(0, 1fr))' }
      const gridStyle = { display: 'grid', gap: '3px', gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, auto)', gridAutoColumns: 'minmax(0, 1fr)' }
      const monthCells = marks.map((mark, index) => React.createElement('span', {
        key: mark.start,
        className: 'tk-heat-month',
        style: { gridColumn: (mark.start + 1) + ' / ' + ((index + 1 < marks.length ? marks[index + 1].start : total) + 1) },
      }, mark.label))
      const cells = []
      cols.forEach((col, c) => {
        for (let r = 0; r < 7; r += 1) {
          const day = col[r]
          const key = 'c' + c + 'r' + r
          if (!day || !day.date) {
            cells.push(React.createElement('div', { key, className: 'tk-heat-cell', style: { visibility: 'hidden' } }))
            continue
          }
          const level = levelOf(day.requests)
          cells.push(React.createElement('div', {
            key,
            className: 'tk-heat-cell' + (level ? ' tk-heat-l' + level : ''),
            onMouseEnter: (event) => setTip({ x: event.clientX, y: event.clientY, day }),
            onMouseMove: (event) => setTip({ x: event.clientX, y: event.clientY, day }),
            onMouseLeave: () => setTip(null),
          }))
        }
      })
      const swatches = [0, 1, 2, 3, 4].map((level) => React.createElement('span', {
        key: level,
        className: 'tk-heat-swatch' + (level ? ' tk-heat-l' + level : ''),
        style: level ? undefined : { background: '#2f2f35' },
      }))
      const rangeLabel = days.length >= 2 && days[0].date && days[days.length - 1].date
        ? days[0].date + ' – ' + days[days.length - 1].date
        : ''
      const tooltip = tip ? React.createElement('div', { className: 'tk-heat-tip', style: { left: tip.x + 12, top: tip.y + 12 } },
        React.createElement('div', null, tip.day.date),
        React.createElement('div', null, (tip.day.requests || 0) + ' 次请求 · ' + fmtTokens(tip.day.tokens || 0) + ' tokens')) : null
      return React.createElement('div', { className: 'tk-card' },
        React.createElement('div', { className: 'tk-heat-top' },
          React.createElement('div', null,
            React.createElement('h3', { className: 'tk-section-title', style: { margin: 0 } }, '活跃度'),
            React.createElement('div', { className: 'tk-sub' }, '近1年 · ' + (data.activeDays || 0) + ' 个活跃日')),
          React.createElement('div', { className: 'tk-heat-legend' },
            React.createElement('span', null, rangeLabel),
            React.createElement('span', null, '少'), swatches, React.createElement('span', null, '多'))),
        React.createElement('div', { className: 'tk-heat' },
          React.createElement('div', { className: 'tk-heat-body' },
            React.createElement('div', { className: 'tk-heat-wd' },
              React.createElement('span', { style: { gridRow: 1 } }, '周一'),
              React.createElement('span', { style: { gridRow: 3 } }, '周三'),
              React.createElement('span', { style: { gridRow: 5 } }, '周五')),
            React.createElement('div', { className: 'tk-heat-main' },
              React.createElement('div', { className: 'tk-heat-months', style: monthStyle }, monthCells),
              React.createElement('div', { className: 'tk-heat-cols', style: gridStyle }, cells)))),
        tooltip)
    }
    
function Panel() { const [state, setState] = React.useState({ loading: true, data: null, error: null }); const [range, setRange] = React.useState('today'); const [filter, setFilter] = React.useState(''); const [origin, setOrigin] = React.useState('all'); const [expanded, setExpanded] = React.useState(null); const [pending, setPending] = React.useState(false); const requestSeq = React.useRef(0); const ranges = { today: '今天', '7d': '7 天', '30d': '30 天', '90d': '90 天', all: '全部' }; const [customStart, setCustomStart] = React.useState(() => toLocalInput(new Date(new Date().setHours(0, 0, 0, 0)))); const [customEnd, setCustomEnd] = React.useState(() => toLocalInput(new Date())); const [rangeOpen, setRangeOpen] = React.useState(false); const [currencyTick, setCurrencyTick] = React.useState(0); React.useEffect(() => { const listener = () => setCurrencyTick((tick) => tick + 1); currencyListeners.add(listener); return () => { currencyListeners.delete(listener) } }, []); const currencyLabel = CURRENCY.mode === 'CNY' ? '¥ 人民币' : '$ 美元'; const customValid = customStart !== '' && customEnd !== '' && new Date(customEnd).getTime() > new Date(customStart).getTime(); const query = range === 'custom' ? { range: 'custom', start: new Date(customStart).getTime(), end: new Date(customEnd).getTime() } : { range }; const rangeText = range === 'custom' ? (customStart.slice(5, 10).replace('-', '/') + ' ' + customStart.slice(11, 16) + ' – ' + customEnd.slice(5, 10).replace('-', '/') + ' ' + customEnd.slice(11, 16)) : ranges[range]; const rangeKey = JSON.stringify(query); React.useEffect(() => { let alive = true; const load = (force, showPending) => { if (showPending) setPending(true); const seq = ++requestSeq.current; return host.call('token-usage', { ...query, force: force === true }).then((data) => { if (alive && seq === requestSeq.current) setState({ loading: false, data, error: null }) }).catch((error) => { if (alive && seq === requestSeq.current) setState({ loading: false, data: null, error: String(error && error.message ? error.message : error) }) }).finally(() => { if (alive && seq === requestSeq.current) setPending(false) }) }; load(false, true); const stop = ctx.interval(() => load(false), 15000); return () => { alive = false; stop() } }, [rangeKey]); if (state.loading && state.data === null) return React.createElement('div', { className: 'tk-root' }, React.createElement('div', { className: 'tk-empty' }, '正在统计今天的会话用量…')); if (state.data === null) return React.createElement('div', { className: 'tk-root' }, React.createElement('div', { className: 'tk-card' }, React.createElement('div', { className: 'tk-empty' }, '读取失败：' + (state.error || 'unknown')))); const data = state.data; const totals = data.totals || {}; const base = (totals.input || 0) + (totals.cacheRead || 0) + (totals.cacheWrite || 0); const hit = base > 0 ? (totals.cacheRead || 0) / base * 100 : 0; const buttons = React.createElement('div', { className: 'tk-range' }, React.createElement('button', { className: 'tk-btn tk-range-btn', onClick: () => setRangeOpen(!rangeOpen), 'aria-expanded': rangeOpen, 'aria-haspopup': 'true' }, rangeText, React.createElement('span', { className: 'tk-range-caret' }, '▾')), rangeOpen ? React.createElement('div', { className: 'tk-pop-backdrop', onClick: () => setRangeOpen(false) }) : null, rangeOpen ? React.createElement('div', { className: 'tk-pop' }, ['today', '7d', '30d', '90d', 'all'].map((key) => React.createElement('button', { key, className: range === key ? 'tk-pop-item tk-pop-item-on' : 'tk-pop-item', onClick: () => { setRange(key); setRangeOpen(false) } }, ranges[key])), React.createElement('div', { className: 'tk-pop-sep' }), React.createElement('div', { className: 'tk-pop-title' }, '自定义时间段'), React.createElement('div', { className: 'tk-pop-row' }, React.createElement('span', { className: 'tk-pop-label' }, '从'), React.createElement('input', { className: 'tk-range-input', type: 'datetime-local', value: customStart, onChange: (event) => setCustomStart(event.target.value) })), React.createElement('div', { className: 'tk-pop-row' }, React.createElement('span', { className: 'tk-pop-label' }, '到'), React.createElement('input', { className: 'tk-range-input', type: 'datetime-local', value: customEnd, onChange: (event) => setCustomEnd(event.target.value) })), React.createElement('button', { className: 'tk-btn tk-pop-apply', disabled: !customValid, onClick: () => { setRange('custom'); setRangeOpen(false) } }, '应用自定义范围')) : null); const summary = React.createElement('div', { className: 'tk-summary' }, React.createElement('div', { className: 'tk-summary-icon' }, 'ϟ'), React.createElement('div', null, React.createElement('div', { className: 'tk-title' }, '真实消耗 Tokens'), React.createElement('div', { className: 'tk-total' }, fmtInt(totals.loop)), React.createElement('div', { className: 'tk-sub' }, '≈ ' + fmtTokens(totals.loop))), React.createElement('div', { className: 'tk-summary-side' }, React.createElement('div', { className: 'tk-summary-stat' }, React.createElement('div', { className: 'tk-summary-label' }, '总请求数'), React.createElement('div', { className: 'tk-summary-value' }, fmtInt(totals.requests))), React.createElement('div', { className: 'tk-summary-stat' }, React.createElement('div', { className: 'tk-summary-label' }, '总成本'), React.createElement('div', { className: 'tk-summary-value tk-summary-cost' }, fmtCost(totals.cost))))); const header = React.createElement('div', { className: 'tk-head' }, summary, React.createElement('div', { className: 'tk-actions' }, buttons, React.createElement('button', { className: 'tk-btn', title: '切换成本显示货币（数据仍按美元存储）', onClick: () => setCurrency({ mode: CURRENCY.mode === 'CNY' ? 'USD' : 'CNY' }) }, currencyLabel), React.createElement('button', { className: 'tk-btn', onClick: () => host.call('token-usage', { ...query, force: true }).then((next) => setState({ loading: false, data: next, error: null })).catch(() => {}) }, '刷新'))); const metrics = React.createElement('div', { className: 'tk-grid' }, metric('新增输入', fmtInt(totals.input)), metric('输出', fmtInt(totals.output)), metric('缓存创建', fmtInt(totals.cacheWrite)), metric('缓存命中', fmtInt(totals.cacheRead)), metric('推理', fmtInt(totals.reasoning)), metric('缓存命中率', hit.toFixed(1) + '%', React.createElement('div', { className: 'tk-bar' }, React.createElement('div', { style: { width: Math.min(100, hit).toFixed(1) + '%' } })))); return React.createElement('div', { className: 'tk-root' }, pending && React.createElement('div', { className: 'tk-switching' }, '切换中…'), header, metrics, React.createElement(ActivityHeatmap), modelTable(data.models || []), React.createElement(Trend, { sessions: data.sessions || [], range: data.range || range, label: range === 'custom' ? rangeText : '', start: data.start, end: data.end }), RequestTable(data.sessions || [], filter, setFilter, origin, setOrigin, expanded, setExpanded), React.createElement(PriceTable)) }
    function panelGlyph(size) { const edge = typeof size === 'number' && size > 0 ? size : 16; return React.createElement('span', { className: 'tk-entry-dot', style: { width: edge + 'px', height: edge + 'px' } }, 'T') }
    if (slots === undefined) return
    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, Panel))
    slots.inject('sidebar.panellist', () => slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, label: 'Token 用量', order: 50 }, (props) => panelGlyph(props !== null && typeof props === 'object' ? props.size : 16)))
  },
}
}

window.__ModuleLoader__.load({
  id: 'dsh-toolkit',
  factory(require) {
    const components = [imageGenClientFactory, tokenUsageClientFactory]
    const plugins = components.map((component) => component(require))
    return {
      inject: [...new Set(plugins.flatMap((plugin) => (Array.isArray(plugin.inject) ? plugin.inject : [])))],
      apply(ctx) {
        for (const plugin of plugins) plugin.apply(ctx)
      },
    }
  },
})
