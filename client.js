// ⚠️ 本文件由 build.mjs 生成 —— 不要直接手改；改 components/<id>/client.js 后重新 node build.mjs
// dsh-toolkit — Client 入口：各组件面板合并到一个浏览器模块，作用域互相独立。

window.__ModuleLoader__.load({
  id: 'dsh-toolkit',
  factory(require) {
// ─── 跨组件注册表（toolkit 壳读它来拼分页）───
const __dshToolkitRegistry = {
  panels: new Map(),
  register(entry) {
    if (entry === null || typeof entry !== "object") return
    if (typeof entry.id !== "string" || entry.id === "" || typeof entry.Panel !== "function") return
    this.panels.set(entry.id, entry)
  },
  /** 按 order 升序返回已登记的面板（toolkit 分页就按这个顺序排）。 */
  entries() {
    return Array.from(this.panels.values()).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
  },
}

// ─── 组件：image-gen ───
function imageGenClientFactory(require) {
    const React = require('react')

    const CSS = [
      // 面板外壳：给灯箱一个定位参考与裁剪边界，灯箱不再盖住 DSH 左侧边栏。
      '.ag-shell{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;box-sizing:border-box;container-type:inline-size;container-name:agshell}',
      '.ag-root{display:flex;flex-direction:column;gap:12px;padding:16px 18px;overflow:auto;flex:1 1 auto;min-height:0;box-sizing:border-box;background:var(--dsw-alias-bg-layer-0)}',
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
      '.agx-model{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:10px;padding:9px 12px}',
      '.agx-model-name{display:inline-flex;align-items:center;gap:6px;min-width:0;font-size:14px;color:var(--dsw-alias-label-primary);flex-wrap:wrap}',
      '.agx-model-meta{min-width:0;font-size:11px;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.agx-model .agx-item-actions{grid-column:2;grid-row:1 / span 2}',
      '.agx-groups{display:flex;flex-direction:column;gap:8px}',
      '.agx-group{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}',
      '.agx-group-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.agx-group-name{font-size:14px;font-weight:500;color:var(--dsw-alias-label-primary);flex:none}',
      '.agx-group-url{font-size:11px;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 150px}',
      '.agx-group .agx-item-actions{margin-left:auto;flex:none}',
      '.agx-group .agx-model{background:none}',
      '.agx-group-toggle{display:inline-flex;align-items:center;gap:6px;border:none;background:none;padding:0;cursor:pointer;font-family:inherit;color:inherit}',
      '.agx-caret{font-size:10px;color:var(--dsw-alias-label-tertiary);width:10px;text-align:center}',
      '.agx-group-count{font-size:11px;color:var(--dsw-alias-label-tertiary);flex:none}',
      '.agx-add-sm{height:30px;min-width:0;font-size:12px;border-radius:8px;margin-top:8px}',
      '.agx-picker{border-top:.5px solid var(--dsw-alias-border-l2);padding-top:10px;display:flex;flex-direction:column;gap:8px}',
      '.agx-manual{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}',
      '.agx-pick:disabled{opacity:.55;cursor:default}',
      '.agx-pick-added{border-style:dashed}',
      '.agx-picks{display:flex;flex-wrap:wrap;gap:6px;max-height:180px;overflow:auto}',
      '.agx-pick{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:7px;height:28px;padding:0 10px;font-size:12px;color:var(--dsw-alias-label-primary);cursor:pointer;font-family:inherit;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.agx-pick:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.agx-pick-on{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-base);font-weight:600}',
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
      '.ag-caption.ag-dim{opacity:.55;font-size:10px}',
      '.ag-tile-prompt{margin-top:5px;font-size:10px;line-height:1.45;color:var(--dsw-alias-label-secondary);word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.ag-tile-prompt.ag-tile-prompt-3{-webkit-line-clamp:3}',
      '.ag-tile-prompt.ag-noprompt{opacity:.45;font-style:italic}',
      '.ag-prompt{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;border-left:2px solid var(--dsw-alias-border-l2);padding-left:7px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical}',
      '.ag-prompt-meta{font-size:10px;color:var(--dsw-alias-label-secondary);opacity:.75;margin-bottom:2px;display:block}',
      '.ag-lb-para{margin:0;font-size:12px;line-height:1.72;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary);opacity:.92}',
      '.ag-lb-segs{display:flex;flex-direction:column;gap:11px}',
      '.ag-lb-seg{display:flex;flex-direction:column;gap:3px;padding-left:9px;border-left:2px solid var(--dsw-alias-border-l2)}',
      '.ag-lb-seg:first-child{border-left-color:var(--dsw-alias-brand-primary)}',
      '.ag-lb-seg-label{font-size:10px;font-weight:600;letter-spacing:.04em;color:var(--dsw-alias-label-secondary);text-transform:none}',
      '.ag-lb-seg-body{margin:0;font-size:12px;line-height:1.7;white-space:pre-wrap;word-break:break-word}',
      '.ag-lb-meta{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary)}',
      '.ag-lb-facts{display:flex;flex-wrap:wrap;gap:6px;padding-top:9px;border-top:1px solid var(--dsw-alias-border-l1)}',
      '.ag-lb-fact{font-size:10px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-radius:5px;padding:2px 7px;line-height:1.6}',
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
      '.ag-glyph{border-radius:5px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600;display:flex;align-items:center;justify-content:center}',
      // 灯箱：左边看图、右边独立一栏放提示词，提示词不再压在画面上挡图。
      '.ag-lb{position:absolute;inset:0;z-index:80;background:#000d;display:flex;align-items:stretch;justify-content:center}',
      '.ag-lb-stage{position:relative;flex:1 1 auto;min-width:0;min-height:0;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:28px}',
      '.ag-lb-img{max-width:100%;max-height:100%;object-fit:contain;border-radius:10px;box-shadow:0 16px 60px #0008}',
      '.ag-lb-bar{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;justify-content:center;gap:8px;flex-wrap:wrap}',
      '.ag-lb-nav{position:absolute;top:50%;transform:translateY(-50%);border:0;background:#000a;color:#fff;width:44px;height:44px;border-radius:99px;font-size:22px;cursor:pointer;z-index:2}',
      '.ag-lb-nav.prev{left:18px}',
      '.ag-lb-nav.next{right:18px}',
      '.ag-lb-name{position:absolute;top:14px;left:50%;transform:translateX(-50%);color:#fff;font-size:12px;opacity:.8;max-width:calc(100% - 96px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ag-lb-side{flex:0 0 clamp(220px,30%,360px);width:clamp(220px,30%,360px);display:flex;flex-direction:column;min-height:0;background:var(--dsw-alias-bg-layer-1);border-left:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}',
      '.ag-lb-side.ag-side-off{flex:0 0 40px;width:40px}',
      '.ag-lb-side-head{display:flex;align-items:center;gap:8px;padding:11px 13px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.ag-lb-side-title{font-size:12px;font-weight:600;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ag-lb-side-body{flex:1 1 auto;min-height:0;overflow:auto;padding:13px;display:flex;flex-direction:column;gap:10px}',
      '.ag-lb-side-empty{font-size:12px;color:var(--dsw-alias-label-secondary);font-style:italic;line-height:1.6}',
      '.ag-lb-toggle{border:0;background:transparent;color:inherit;cursor:pointer;font-size:13px;opacity:.6;padding:2px 6px;border-radius:5px;line-height:1}',
      '.ag-lb-toggle:hover{opacity:1;background:var(--dsw-alias-bg-layer-2)}',
      '.ag-lb-spine{writing-mode:vertical-rl;letter-spacing:.1em;font-size:12px;color:var(--dsw-alias-label-secondary);align-self:center;padding:14px 0;user-select:none}',
      '@container agshell (max-width:820px){.ag-lb{flex-direction:column}.ag-lb-stage{padding:14px}.ag-lb-side{flex:0 0 auto;width:100%;max-height:44%;border-left:0;border-top:1px solid var(--dsw-alias-border-l1)}.ag-lb-side.ag-side-off{flex:0 0 auto;width:100%;max-height:38px}}',
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

    /**
     * 把提示词拆成可读的分段：五段式组装出来的提示词用空行分隔，
     * 逐段带上小标签，长提示词在灯箱里才不是一整片文字。
     * 认不出的段落（例如工具直接传入的英文整段）不硬套标签，原样显示。
     */
    const SEGMENT_LABELS = [
      { test: /^(构图与视角|构图|视角)\s*[：:]/, label: '构图与视角' },
      { test: /^(光线与氛围|光线|氛围|光影)\s*[：:]/, label: '光线与氛围' },
      { test: /^(不要|避免|negative|avoid)\s*[：:]/i, label: '负面' },
    ]

    function splitPromptSegments(text) {
      const raw = typeof text === 'string' ? text.trim() : ''
      if (raw === '') return []
      const blocks = raw.split(/\n\s*\n/).map((block) => block.trim()).filter((block) => block !== '')
      return blocks.map((body, index) => {
        for (const rule of SEGMENT_LABELS) {
          if (rule.test.test(body)) return { label: rule.label, body }
        }
        // 第一段是主体；其余无标签段落是叠加的风格片段，不硬套标签。
        return { label: index === 0 ? '主体' : '', body }
      })
    }

    /**
     * 图片旁注：把生成这张图时用的提示词显示在图片旁边。
     * source === 'library' 表示老图按提示词库反查出来的（当年没记逐图提示词）。
     */
    function PromptNote({ prompt, source, clamp }) {
      const text = typeof prompt === 'string' ? prompt.trim() : ''
      if (text === '') {
        return React.createElement('div', { className: 'ag-tile-prompt ag-noprompt', title: '这张图没有提示词记录' }, '无提示词记录')
      }
      return React.createElement('div', {
        className: clamp === 2 ? 'ag-tile-prompt' : 'ag-prompt',
        title: text,
      },
      source === 'library'
        ? React.createElement('span', { className: 'ag-prompt-meta' }, '提示词（按提示词库反查）')
        : null,
      text)
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

        /** 复制到剪贴板；环境不支持（自检 / 非安全上下文）时静默失败，不弹错。 */
        function copyText(text) {
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
              navigator.clipboard.writeText(text).catch(() => {})
            }
          } catch { /* 复制失败不影响看图 */ }
        }

        function Lightbox({ files, index, srcOf, starred, onClose, onIndex, onDelete, onStar }) {
          const file = files[index]
          // 提示词栏默认展开；图很长时用户可收起，把舞台让给画面。
          const [sideOpen, setSideOpen] = React.useState(true)
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
          const promptText = typeof file.prompt === 'string' ? file.prompt.trim() : ''
          const side = sideOpen
            ? React.createElement('div', { className: 'ag-lb-side', onClick: (e) => e.stopPropagation() },
              React.createElement('div', { className: 'ag-lb-side-head' },
                React.createElement('span', { className: 'ag-lb-side-title' }, '提示词'),
                promptText !== ''
                  ? React.createElement('button', {
                      className: 'ag-lb-toggle',
                      title: '复制提示词',
                      onClick: () => copyText(promptText),
                    }, '复制')
                  : null,
                React.createElement('button', {
                  className: 'ag-lb-toggle',
                  title: '收起提示词栏',
                  onClick: () => setSideOpen(false),
                }, '›')),
              React.createElement('div', { className: 'ag-lb-side-body' },
                promptText !== ''
                  // 长提示词按空行拆段，每段给个小标签，不是一整片文字。
                  ? React.createElement('div', { className: 'ag-lb-segs' },
                    splitPromptSegments(promptText).map((seg, i) => React.createElement('div', { className: 'ag-lb-seg', key: i },
                      seg.label !== ''
                        ? React.createElement('div', { className: 'ag-lb-seg-label' }, seg.label)
                        : null,
                      React.createElement('p', { className: 'ag-lb-seg-body' }, seg.body))))
                  : React.createElement('div', { className: 'ag-lb-side-empty' }, '这张图没有提示词记录。'),
                file.promptSource === 'library'
                  ? React.createElement('div', { className: 'ag-lb-meta' }, '这张老图没有逐图记录，提示词是按提示词库里的归档反查出来的。')
                  : null,
                file.promptTitle
                  ? React.createElement('div', { className: 'ag-lb-meta' }, '来自：' + file.promptTitle)
                  : null,
                // 事实条：模型 / 尺寸 / 文件名等，弱化放在底部，不抢提示词的注意力。
                React.createElement('div', { className: 'ag-lb-facts' },
                  file.promptModel ? React.createElement('span', { className: 'ag-lb-fact' }, file.promptModel) : null,
                  file.promptSize ? React.createElement('span', { className: 'ag-lb-fact' }, file.promptSize) : null,
                  React.createElement('span', { className: 'ag-lb-fact' }, file.name))))
            : React.createElement('div', { className: 'ag-lb-side ag-side-off', onClick: (e) => e.stopPropagation() },
              React.createElement('button', {
                className: 'ag-lb-toggle',
                title: '展开提示词栏',
                onClick: () => setSideOpen(true),
                style: { margin: '8px auto 0' },
              }, '‹'),
              React.createElement('div', { className: 'ag-lb-spine' }, '提示词'))

          return React.createElement('div', { className: 'ag-lb', onClick: onClose },
            React.createElement('div', { className: 'ag-lb-stage', onClick: (e) => e.stopPropagation() },
              React.createElement('div', { className: 'ag-lb-name' }, file.name + '  ·  ' + (index + 1) + '/' + files.length),
              React.createElement('button', { className: 'ag-lb-nav prev', onClick: () => onIndex((index + files.length - 1) % files.length) }, '‹'),
              React.createElement('img', { className: 'ag-lb-img', src: srcOf(file.name), alt: file.name }),
              React.createElement('button', { className: 'ag-lb-nav next', onClick: () => onIndex((index + 1) % files.length) }, '›'),
              React.createElement('div', { className: 'ag-lb-bar' },
                React.createElement('button', { className: 'ag-btn', onClick: () => onStar(file.name) }, isStar ? '★ 已收藏' : '☆ 收藏'),
                React.createElement('a', { className: 'ag-btn', href: srcOf(file.name), download: file.name }, '下载'),
                React.createElement('button', { className: 'ag-btn ag-btn-danger', onClick: () => onDelete(file.name) }, '删除'),
                React.createElement('button', { className: 'ag-btn', onClick: onClose }, '关闭'))),
            side)
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
          // 优先用后端回传的「真正发给上游那份提示词」，生成完再改表单也不会串。
          const resultPrompt = gen.result && typeof gen.result.prompt === 'string' ? gen.result.prompt.trim() : ''
          const resultNode = gen.result
            ? React.createElement('div', { className: 'ag-field' },
              React.createElement('div', { className: 'ag-msg ag-msg-ok' }, '已生成 ' + gen.result.count + ' 张' + (gen.result.partial ? '（' + gen.result.partial + '）' : '')),
              React.createElement('div', { className: 'ag-result' },
                gen.result.images.map((img) => React.createElement('div', { key: img.name, className: 'ag-card' },
                  React.createElement('img', { className: 'ag-thumb', src: srcRecent(img.name), alt: img.name }),
                  // 刚生成的图：提示词就是这次发出去的那份，直接标在图片下面。
                  React.createElement(PromptNote, { prompt: resultPrompt !== '' ? resultPrompt : img.prompt, source: resultPrompt !== '' ? null : img.promptSource }),
                  React.createElement('div', { className: 'ag-caption ag-dim', title: img.name }, img.name)))),
              React.createElement('div', { className: 'ag-note' }, '已保存到数据目录 dsh-toolkit/image-gen/images/（环境变量 IMAGE_GEN_DIR 可改；点击左侧「最近生成」查看）'))
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
        // 布局：默认模型 → 可折叠的组卡片（组内模型逐条可编辑/删除）→「+ 添加模型组」。
        // 「加模型」与「编辑组」是同一个表单：组名 / API Key / 链接 → 获取模型 → 勾选 → 保存。
        function SettingsForm(props) {
          const { settings, flow, flowDraft, setFlowDraft, models, test, settingsError, openGroups, act } = props
          const field = (key) => (event) => setFlowDraft({ ...flowDraft, [key]: event.target.value })
          if (settings === null) {
            return React.createElement('div', { className: 'ag-card' },
              React.createElement('h3', { className: 'ag-section' }, '生图模型接入'),
              settingsError
                ? React.createElement('div', { className: 'ag-msg ag-msg-err' }, '设置读取失败：' + settingsError)
                : React.createElement('div', { className: 'ag-empty' }, '正在读取设置…'),
              React.createElement('button', { className: 'ag-btn', onClick: act.reload }, '重新读取'))
          }
          const catalog = settings.catalog && Array.isArray(settings.catalog.entries) ? settings.catalog : null
          if (!catalog) {
            // 兜底：正常路径下 configView 一定带 catalog；异常时给明确提示而不是空白。
            return React.createElement('div', { className: 'ag-card' },
              React.createElement('div', { className: 'ag-empty' }, '设置读取异常：未拿到模型目录。点上方「刷新」重试。'))
          }
          const providers = Array.isArray(settings.providers) ? settings.providers : []
          const entries = catalog.entries
          const picks = flow.picks || {}
          const pickedList = Object.keys(picks).filter((key) => picks[key] === true)
          const fetched = models != null && Array.isArray(models.items) ? models.items : null
          const addedSet = new Set(models != null && Array.isArray(models.added) ? models.added : [])
          // 折叠态：手动开合记在 openGroups；没记过的按「单组默认展开、多组默认收起」。
          const isOpen = (id) => {
            const stored = openGroups != null ? openGroups[id] : undefined
            return stored === undefined ? providers.length <= 1 : stored === true
          }

          // 勾选区：用表单里的链接与 Key 拉列表，点选要加进这个组的模型（已在该组里的置灰）。
          function pickerNode(saveLabel, onSave, leftAction) {
            const picked = pickedList.length
            return React.createElement('div', { className: 'agx-picker' },
              React.createElement('div', { className: 'agx-fetch' },
                React.createElement('label', { className: 'ag-label' }, '可用模型'),
                React.createElement('div', { className: 'agx-item-actions' },
                  React.createElement('button', {
                    className: 'agx-link', onClick: () => act.loadModels(), disabled: models != null && models.busy,
                  }, models != null && models.busy ? '正在询问提供商…' : (fetched === null ? '获取模型' : '重新获取')),
                  fetched !== null && fetched.length > 0
                    ? React.createElement('button', { className: 'agx-link', onClick: () => act.pickAll(fetched, true) }, '全选')
                    : null,
                  picked > 0 ? React.createElement('button', { className: 'agx-link', onClick: () => act.pickAll(fetched || [], false) }, '清空') : null)),
              models != null && models.error ? React.createElement('div', { className: 'ag-msg ag-msg-err' }, models.error) : null,
              models != null && !models.error && models.message ? React.createElement('div', { className: 'agx-hint' }, models.message) : null,
              fetched !== null && fetched.length > 0
                ? React.createElement('div', { className: 'agx-picks' },
                  fetched.map((id) => {
                    const already = addedSet.has(id)
                    const on = already || picks[id] === true
                    return React.createElement('button', {
                      key: id,
                      disabled: already,
                      className: 'agx-pick' + (on ? ' agx-pick-on' : '') + (already ? ' agx-pick-added' : ''),
                      title: already ? '已在该组里' : (on ? '已勾选，再点取消' : '点击勾选'),
                      onClick: () => act.togglePick(id),
                    }, id)
                  }))
                : fetched !== null
                  ? React.createElement('div', { className: 'agx-hint' }, '没识别到生图模型，可手填 id')
                  : React.createElement('div', { className: 'agx-hint' }, '点「获取模型」拉取列表'),
              React.createElement('div', { className: 'agx-manual' },
                React.createElement('input', {
                  className: 'ag-input', value: flowDraft.model || '',
                  placeholder: '手填模型 id', onChange: field('model'),
                }),
                React.createElement('button', {
                  className: 'agx-btn-edit',
                  disabled: String(flowDraft.model || '').trim() === '',
                  onClick: () => act.addManual(),
                }, '加入')),
              React.createElement('div', { className: 'agx-actions' },
                leftAction || null,
                React.createElement('button', { className: 'ag-btn', onClick: () => act.close() }, '取消'),
                React.createElement('button', {
                  className: 'ag-btn ag-btn-primary', onClick: onSave,
                }, saveLabel + (picked > 0 ? '（' + picked + ' 个）' : ''))))
          }

          // 组表单：新建组、改组的名字 / 链接 / 密钥、给组补模型，都在这里。
          function groupFormNode(provider) {
            const creating = provider === null
            return React.createElement('div', { className: 'agx-editor' },
              React.createElement('div', { className: 'agx-editor-header' },
                React.createElement('span', { className: 'agx-editor-title' }, creating ? '添加模型组' : '编辑模型组 · ' + provider.name)),
              React.createElement('div', { className: 'agx-editor-grid' },
                React.createElement('div', { className: 'ag-field' },
                  React.createElement('label', null, '组名'),
                  React.createElement('input', { className: 'ag-input', value: flowDraft.name || '', placeholder: '例如 DL 网关', onChange: field('name') })),
                React.createElement('div', { className: 'ag-field' },
                  React.createElement('label', null, 'API Key'),
                  React.createElement('input', {
                    className: 'ag-input', type: 'password', value: flowDraft.apiKey || '',
                    placeholder: creating ? '该组专用' : (provider.hasKey === false ? '未配置' : '留空不改'),
                    onChange: field('apiKey'),
                  }))),
              React.createElement('div', { className: 'ag-field' },
                React.createElement('label', null, '链接'),
                React.createElement('input', {
                  className: 'ag-input', value: flowDraft.baseURL || '',
                  placeholder: 'https://…/v1', onChange: field('baseURL'),
                })),
              pickerNode('保存', () => act.saveGroup(provider),
                creating
                  ? null
                  : React.createElement('button', {
                    className: 'agx-btn-text', style: { marginRight: 'auto' },
                    onClick: () => act.removeProvider(provider),
                  }, '删除组')))
          }

          // 编辑模型：显示名 / 上游模型 id / 每张单价。
          function editModelNode(model) {
            return React.createElement('div', { className: 'agx-editor' },
              React.createElement('div', { className: 'agx-editor-header' },
                React.createElement('span', { className: 'agx-editor-title' }, '编辑模型 · ' + model.name),
                React.createElement('span', { className: 'agx-editor-route' }, model.model)),
              React.createElement('div', { className: 'agx-editor-grid' },
                React.createElement('div', { className: 'ag-field' },
                  React.createElement('label', null, '显示名'),
                  React.createElement('input', { className: 'ag-input', value: flowDraft.displayName || '', onChange: field('displayName') })),
                React.createElement('div', { className: 'ag-field' },
                  React.createElement('label', null, '模型 id'),
                  React.createElement('input', { className: 'ag-input', value: flowDraft.model || '', onChange: field('model') }))),
              React.createElement('div', { className: 'ag-field' },
                React.createElement('label', null, '每张单价（美元/张，选填）'),
                React.createElement('input', {
                  className: 'ag-input', inputMode: 'decimal', value: flowDraft.pricePerImage || '',
                  placeholder: '例如 0.04', onChange: field('pricePerImage'),
                })),
              React.createElement('div', { className: 'agx-actions' },
                React.createElement('button', { className: 'agx-btn-text', style: { marginRight: 'auto' }, onClick: () => act.removeModel(model) }, '删除'),
                React.createElement('button', { className: 'ag-btn', onClick: () => act.close() }, '取消'),
                React.createElement('button', { className: 'ag-btn ag-btn-primary', onClick: () => act.saveEditModel(model) }, '保存')))
          }

          // 组内一条模型：显示名 + 标签 / 第二行上游 model id + 编辑 / 删除。
          function modelRowNode(model, provider) {
            if (flow.kind === 'editModel' && flow.modelId === model.id) return editModelNode(model)
            return React.createElement('div', { key: model.id, className: 'agx-model' },
              React.createElement('div', { className: 'agx-model-name' },
                React.createElement('span', null, model.name),
                model.isDefault ? React.createElement('span', { className: 'agx-tag agx-tag-ok' }, '默认') : null,
                model.pricePerImage ? React.createElement('span', { className: 'agx-tag' }, '$' + model.pricePerImage + '/张') : null),
              React.createElement('div', { className: 'agx-model-meta' }, model.model),
              React.createElement('div', { className: 'agx-item-actions' },
                React.createElement('button', { className: 'agx-btn-edit', onClick: () => act.openEditModel(model, provider) }, '编辑'),
                React.createElement('button', { className: 'agx-btn-text', onClick: () => act.removeModel(model) }, '删除')))
          }

          // 一个组：可折叠的组头（圆点 + 组名 + 链接 + 模型数 + 编辑 / 删除）+ 展开后的模型行与表单。
          function providerNode(provider) {
            // 正在编辑组里的某条模型时，这个组必须展开（否则编辑卡没地方显示）。
            const open = isOpen(provider.id) || (flow.kind === 'editModel' && flow.providerId === provider.id)
            const editing = flow.kind === 'group' && flow.providerId === provider.id
            return React.createElement('div', { key: provider.id, className: 'agx-group' },
              React.createElement('div', { className: 'agx-group-head' },
                React.createElement('button', {
                  className: 'agx-group-toggle',
                  title: open ? '收起这个组' : '展开这个组',
                  onClick: () => act.toggleGroup(provider.id, !open),
                },
                React.createElement('span', { className: 'agx-caret' }, open ? '▾' : '▸'),
                React.createElement('span', {
                  className: 'agx-dot ' + (provider.hasKey === false ? 'agx-dot-miss' : 'agx-dot-ok'),
                  title: provider.hasKey === false ? '这个组还没有 API Key' : 'API Key 来源：' + provider.keySource,
                }),
                React.createElement('span', { className: 'agx-group-name' }, provider.name)),
                React.createElement('span', { className: 'agx-group-url' }, provider.baseURL),
                React.createElement('span', { className: 'agx-group-count' }, String(provider.models.length) + ' 个模型'),
                React.createElement('div', { className: 'agx-item-actions' },
                  React.createElement('button', { className: 'agx-btn-edit', onClick: () => (editing ? act.close() : act.openGroup(provider)) }, '编辑'),
                  React.createElement('button', { className: 'agx-btn-text', onClick: () => act.removeProvider(provider) }, '删除'))),
              provider.hasKey === false && (open || editing)
                ? React.createElement('div', { className: 'agx-hint' }, '缺 API Key（' + provider.keyEnv + '）')
                : null,
              editing
                ? groupFormNode(provider)
                : open
                  ? React.createElement('div', null,
                    provider.models.length === 0
                      ? React.createElement('div', { className: 'agx-hint' }, '还没有模型')
                      : React.createElement('div', { className: 'agx-rows' }, provider.models.map((model) => modelRowNode(model, provider))),
                    React.createElement('button', { className: 'agx-add-btn agx-add-sm', onClick: () => act.openGroup(provider) }, '+ 添加模型'))
                  : null)
          }

          const adding = flow.kind === 'group' && flow.providerId === ''
          const addNode = adding
            ? groupFormNode(null)
            : React.createElement('button', { className: 'agx-add-btn', onClick: () => act.openGroup(null) }, '+ 添加模型组')

          const hasModels = entries.length > 0
          return React.createElement('div', { className: 'ag-card' },
            React.createElement('div', { className: 'agx-head' },
              React.createElement('h3', { className: 'ag-section' }, '生图模型'),
              React.createElement('span', { className: 'agx-sub' },
                providers.length + ' 组 · ' + entries.length + ' 模型'),
              React.createElement('div', { className: 'agx-head-right' },
                React.createElement('button', { className: 'agx-link', title: '测默认模型连通性（只打 /models，不扣费）', onClick: act.test, disabled: test.busy }, test.busy ? '测试中…' : '测试'),
                React.createElement('button', { className: 'agx-link', onClick: act.reload }, '刷新'))),
            hasModels
              ? React.createElement('div', { className: 'ag-field' },
                React.createElement('label', null, '默认模型'),
                React.createElement('select', {
                  className: 'ag-select',
                  value: catalog.defaultId || '',
                  onChange: (event) => act.setDefault(event.target.value),
                }, providers.map((provider) => React.createElement('optgroup', { key: provider.id, label: provider.name },
                  provider.models.map((model) => React.createElement('option', { key: model.id, value: model.id },
                    model.name + '（' + model.model + '）'))))))
              : null,
            providers.length > 0
              ? React.createElement('div', { className: 'agx-groups' }, providers.map((provider) => providerNode(provider)))
              : null,
            addNode,
            test.message
              ? React.createElement('div', { className: 'ag-msg ' + (test.ok ? 'ag-msg-ok' : 'ag-msg-err') }, test.message)
              : null,
            React.createElement('div', { className: 'ag-note' }, '配置：' + settings.path))
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
                          React.createElement('div', { className: 'ag-caption ag-dim', title: name }, name))))
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
          const [flow, setFlow] = React.useState({ kind: null, providerId: '', modelId: '', picks: {} }) // 13（设置页流程：add / update / editProvider / editModel + 勾选）
          const [test, setTest] = React.useState({ busy: false, ok: null, message: null }) // 14
          const [models, setModels] = React.useState({ busy: false, items: null, message: null, error: null, added: [] }) // 15（获取模型结果）
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
          const [openGroups, setOpenGroups] = React.useState({})             // 25（组卡片展开态，未记录的单组默认展开）
          const [flowDraft, setFlowDraft] = React.useState({ name: '', apiKey: '', baseURL: '', model: '', displayName: '', pricePerImage: '' }) // 26（设置页表单草稿）
          const loadSettings = () => {
            if (settingsLoadedRef.current) return
            settingsLoadedRef.current = true
            setSettingsError(null)
            fetchJson('/api/image-gen/config')
              .then((res) => {
                if (res && res.ok && res.config) {
                  setSettings(res.config)
                  setFlowDraft({ name: '', apiKey: '', baseURL: '', model: '', displayName: '', pricePerImage: '' })
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
            recent.refresh()
            return result
          }
          const onSetDefault = (id) => {
            postJson('/api/image-gen/config', { action: 'setDefault', id })
              .then(applyConfig)
              .catch((error) => window.alert(String(error && error.message ? error.message : error)))
          }
          // ── 设置页动作：组与组内模型的增删改 + 获取模型勾选 ──
          const EMPTY_FETCHED = { busy: false, items: null, message: null, error: null, added: [] }
          const EMPTY_DRAFT = { name: '', apiKey: '', baseURL: '', model: '', displayName: '', pricePerImage: '' }
          const closeFlow = () => { setFlow({ kind: null, providerId: '', modelId: '', picks: {} }); setModels(EMPTY_FETCHED) }
          const pickedIds = (picks) => Object.keys(picks || {}).filter((key) => picks[key] === true)
          // 所有写操作都回传完整目录视图，applyConfig 一把替换。
          const writeConfig = (body, done) => postJson('/api/image-gen/config', body)
            .then((result) => {
              applyConfig(result)
              if (typeof done === 'function') done(result)
              return result
            })
            .catch((error) => window.alert(String(error && error.message ? error.message : error)))
          // 获取模型：用表单里刚填的链接与 Key；改已有组时带上组 id（Key 留空就用该组已存的那把）。
          const getModels = () => {
            if (models.busy) return
            const body = {}
            if (flow.providerId !== '') body.id = flow.providerId
            const baseURL = String(flowDraft.baseURL || '').trim()
            const apiKey = String(flowDraft.apiKey || '').trim()
            if (baseURL !== '') body.baseURL = baseURL
            if (apiKey !== '') body.apiKey = apiKey
            setModels({ busy: true, items: null, message: null, error: null, added: [] })
            postJson('/api/image-gen/config/models', body)
              .then((result) => {
                if (result.ok === false) throw new Error(result.message || '获取模型失败')
                setModels({
                  busy: false,
                  items: Array.isArray(result.models) ? result.models : [],
                  message: result.message,
                  error: null,
                  added: Array.isArray(result.added) ? result.added : [],
                })
              })
              .catch((error) => setModels({ busy: false, items: null, message: null, error: String(error && error.message ? error.message : error), added: [] }))
          }
          const openGroup = (provider) => {
            const editing = provider !== null && provider !== undefined
            setFlow({ kind: 'group', providerId: editing ? provider.id : '', modelId: '', picks: {} })
            setFlowDraft(editing
              ? { ...EMPTY_DRAFT, name: provider.name || '', baseURL: provider.baseURL || '' }
              : EMPTY_DRAFT)
            setModels(EMPTY_FETCHED)
          }
          const toggleGroup = (id, next) => setOpenGroups((prev) => ({ ...prev, [id]: next }))
          const openEditModel = (model, provider) => {
            setFlow({ kind: 'editModel', providerId: provider === undefined ? '' : provider.id, modelId: model.id, picks: {} })
            setFlowDraft({
              ...EMPTY_DRAFT,
              displayName: model.name || '',
              model: model.model || '',
              pricePerImage: model.pricePerImage != null ? String(model.pricePerImage) : '',
            })
          }
          const togglePick = (id) => setFlow((prev) => ({ ...prev, picks: { ...prev.picks, [id]: prev.picks[id] !== true } }))
          const pickAll = (ids, on) => setFlow((prev) => {
            const picks = { ...prev.picks }
            for (const id of Array.isArray(ids) ? ids : []) {
              if (models.added.includes(id)) continue
              if (on) picks[id] = true
              else delete picks[id]
            }
            return { ...prev, picks }
          })
          const addManual = () => {
            const id = String(flowDraft.model || '').trim()
            if (id === '') return
            setFlow((prev) => ({ ...prev, picks: { ...prev.picks, [id]: true } }))
            setFlowDraft((prev) => ({ ...prev, model: '' }))
          }
          // 保存组表单：新建 → addProvider（含勾选的模型）；编辑 → 先 updateProvider 改名字/链接/密钥，
          // 再把勾选的模型补进去（只增不删；链接改动会先落盘，拉列表用的也是表单里的值）。
          const saveGroup = (provider) => {
            const baseURL = String(flowDraft.baseURL || '').trim()
            if (baseURL === '') { window.alert('请填写链接（接口地址，例如 https://…/v1）'); return }
            const name = String(flowDraft.name || '').trim()
            const apiKey = String(flowDraft.apiKey || '').trim() || undefined
            const models = pickedIds(flow.picks).map((id) => ({ model: id }))
            if (provider === null || provider === undefined) {
              writeConfig({ action: 'addProvider', name, baseURL, apiKey, models },
                (result) => { closeFlow(); window.alert(result.message || '已添加模型组') })
              return
            }
            writeConfig({ action: 'updateProvider', id: provider.id, name: name || provider.name, baseURL, apiKey }, (result) => {
              if (models.length === 0) { closeFlow(); window.alert(result.message || '已保存'); return }
              writeConfig({ action: 'addModels', providerId: provider.id, models }, (added) => {
                closeFlow()
                window.alert((result.message || '已保存') + '；' + (added.message || '模型已加入'))
              })
            })
          }
          const saveEditModel = (model) => {
            const upstream = String(flowDraft.model || '').trim()
            if (upstream === '') { window.alert('模型 id 不能为空'); return }
            writeConfig({
              action: 'updateModel',
              id: model.id,
              name: String(flowDraft.displayName || '').trim() || upstream,
              model: upstream,
              pricePerImage: String(flowDraft.pricePerImage || '').trim(),
            }, (result) => { closeFlow(); window.alert(result.message || '已保存') })
          }
          const removeProvider = (provider) => {
            const count = Array.isArray(provider.models) ? provider.models.length : 0
            if (!window.confirm('删除模型组「' + provider.name + '」' + (count > 0 ? '及其 ' + count + ' 个模型' : '') + '？')) return
            writeConfig({ action: 'removeProvider', id: provider.id }, () => closeFlow())
          }
          const removeModel = (model) => {
            if (!window.confirm('从组里删除模型「' + (model.name || model.model) + '」？')) return
            writeConfig({ action: 'removeModel', id: model.id }, () => closeFlow())
          }
          const onTest = () => {
            setTest({ busy: true, ok: null, message: null })
            postJson('/api/image-gen/config/test', {})
              .then((result) => setTest({ busy: false, ok: result.ok === true, message: result.message }))
              .catch((error) => setTest({ busy: false, ok: false, message: String(error && error.message ? error.message : error) }))
          }
          const settingsActions = {
            reload: forceSettings,
            test: onTest,
            loadModels: getModels,
            togglePick,
            pickAll,
            addManual,
            openGroup,
            toggleGroup,
            openEditModel,
            close: closeFlow,
            saveGroup,
            saveEditModel,
            removeProvider,
            removeModel,
            setDefault: onSetDefault,
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
                      title: (typeof file.prompt === 'string' && file.prompt.trim() !== '' ? file.prompt.trim() + '\n\n' : '') + file.name,
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
                      // 提示词当主文案：图下第一眼看的是「这张是怎么来的」；
                      // 没有提示词记录的老图退化成弱化文件名，不留一整片「无提示词记录」。
                      typeof file.prompt === 'string' && file.prompt.trim() !== ''
                        ? React.createElement(PromptNote, { prompt: file.prompt, source: file.promptSource, clamp: 2 })
                        : React.createElement('div', { className: 'ag-caption ag-dim' }, file.name)))),
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
                  settings, flow, flowDraft, setFlowDraft, models, test, settingsError, openGroups,
                  act: settingsActions,
                })
              : React.createElement(GenerateForm, {
                  mode, form, setForm, refs, removeRef,
                  onUpload, urlInput, setUrlInput, onAddUrl: addUrlRef, onGenerate, gen,
                  sizes, saveTarget, onSaveTarget: setSaveTarget, onFillFromActive,
                  onDropRef, onRemoveStyle: removeStyle,
                  catalog: settings && settings.catalog, onSetDefault,
                }))

          const openIndex = open === null ? null : Math.min(open, Math.max(0, files.length - 1))
          // 灯箱是 ag-shell 的直接子元素：ag-root 自带 overflow:auto，
          // 放进去会被它的滚动容器裁掉，所以要平级。
          return React.createElement('div', { className: 'ag-shell' },
            React.createElement('div', { className: 'ag-root', onScroll },
              React.createElement('div', { className: 'ag-head' },
                React.createElement('div', null,
                  React.createElement('h2', { className: 'ag-title' }, '图片生成'),
                  React.createElement('div', { className: 'ag-sub' }, '左栏收纳 / 提示词库 / 收藏库 · 右栏文生图 / 图生图 · 设置接入生图模型'))),
              React.createElement('div', { className: 'ag-cols' }, storagePanel, makePanel)),
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
        // 侧边栏入口：和 dsh-toolkit 其它组件一起加载时统一交给 toolkit 组件管理
        // （在共享注册表里登记一份，侧边栏只留「工具集」+ 一行并排小图标）；
        // 单独加载本文件时注册表不存在，退回自己注册一条入口，面板仍能从侧边栏点开。
        const registry = typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null
        if (registry !== null) {
          registry.register({ id: PANEL_KEY, Panel, label: '图片生成', order: 49, glyphText: 'A' })
        } else {
          slots.inject('sidebar.panellist', () => slots.register(
            { name: 'sidebar.panellist', id: PANEL_KEY, label: '图片生成', order: 49 },
            (props) => panelGlyph(props)))
        }
      },
    }
}

// ─── 组件：mcp ───
function mcpClientFactory(require) {
    const React = require("react")
const CSS = '.mc-root{position:relative;display:flex;flex-direction:column;gap:12px;padding:16px 18px 14px;box-sizing:border-box;min-height:0;height:100%;overflow:hidden;background:var(--dsw-alias-bg-layer-0);color:var(--dsw-alias-label-primary)}.mc-meta{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);font-size:12px}.mc-kv{display:flex;align-items:baseline;gap:6px;min-width:0}.mc-k{color:var(--dsw-alias-label-tertiary);flex:none}.mc-v{color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-family-mono,monospace);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:360px}.mc-spacer{flex:1 1 auto}.mc-body{flex:1 1 auto;display:flex;gap:12px;min-height:0}.mc-col-list{flex:0 0 300px;display:flex;flex-direction:column;gap:8px;min-height:0}.mc-col-detail{flex:1 1 auto;display:flex;flex-direction:column;gap:10px;min-height:0;min-width:0}.mc-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:10px;padding-right:2px}.mc-item{display:flex;flex-direction:column;gap:3px;padding:7px 9px;border:1px solid transparent;border-radius:8px;cursor:pointer;background:transparent;text-align:left;width:100%;box-sizing:border-box;font:inherit;color:inherit}.mc-item:hover{background:var(--dsw-alias-interactive-bg-hover)}.mc-item-on{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}.mc-item-name{font-size:12.5px;font-weight:600;word-break:break-all}.mc-item-meta{display:flex;flex-wrap:wrap;gap:4px;align-items:center}.mc-badge{display:inline-flex;align-items:center;gap:3px;padding:0 5px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}.mc-badge-ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}.mc-badge-bad{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}.mc-badge-warn{color:var(--dsw-alias-state-warning-primary);border-color:var(--dsw-alias-state-warning-primary)}.mc-detail-head{flex:none;display:flex;flex-direction:column;gap:4px;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}.mc-detail-title{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13.5px;font-weight:600}.mc-path{font-family:var(--dsw-font-family-mono,monospace);font-size:10.5px;color:var(--dsw-alias-label-tertiary);word-break:break-all}.mc-field{display:flex;flex-direction:column;gap:4px}.mc-label{font-size:11px;color:var(--dsw-alias-label-tertiary)}.mc-input,.mc-textarea,.mc-select{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:6px 8px;font-size:12px;font-family:inherit;outline:none}.mc-input:focus,.mc-textarea:focus,.mc-select:focus{border-color:var(--dsw-alias-brand-primary)}.mc-textarea{resize:vertical;line-height:1.5}.mc-mono{font-family:var(--dsw-font-family-mono,monospace);font-size:11.5px}.mc-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.mc-btn{appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:5px 12px;font-size:12px;cursor:pointer;white-space:nowrap}.mc-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.mc-btn:disabled{opacity:.45;cursor:not-allowed}.mc-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600}.mc-btn-danger{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);background:transparent}.mc-btn-sm{padding:2px 8px;font-size:11px}.mc-switch{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:4px 9px;font-size:11.5px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);cursor:pointer}.mc-switch-on{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}.mc-switch:disabled{opacity:.5;cursor:not-allowed}.mc-notice{flex:none;padding:7px 10px;border-radius:8px;font-size:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}.mc-notice-ok{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}.mc-notice-bad{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}.mc-notice-warn{border-color:var(--dsw-alias-state-warning-primary);color:var(--dsw-alias-state-warning-primary)}.mc-empty{padding:18px 12px;font-size:12px;color:var(--dsw-alias-label-tertiary);text-align:center;border:1px dashed var(--dsw-alias-border-l1);border-radius:9px}.mc-dirty{color:var(--dsw-alias-state-warning-primary);font-size:11px}.mc-glyph{display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:13px;font-weight:700;color:inherit}.mc-hint{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.5}.mc-tools{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}.mc-tool{display:flex;flex-direction:column;gap:2px}.mc-tool-name{font-family:var(--dsw-font-family-mono,monospace);font-size:11.5px;color:var(--dsw-alias-label-primary);word-break:break-all}.mc-tool-desc{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.45}'
const PANEL_KEY = 'mcp'
const LABEL = 'MCP'
const TRANSPORT_STDIO = 'stdio'
const TRANSPORT_HTTP = 'streamable-http'

const EMPTY_META = { loading: true, data: null, error: null }
const EMPTY_LIST = { loading: true, data: null, error: null }
const EMPTY_PROBE = { running: false, data: null, error: null }

/** 新建表单初值：字段名与 host 的 normalizeConfig 一一对应。 */
const EMPTY_DRAFT = {
  entryId: null,
  created: true,
  serverName: '',
  transport: TRANSPORT_STDIO,
  command: '',
  argsText: '',
  cwd: '',
  url: '',
  toolCallTimeoutMs: '',
  maxInstructionBytes: '',
  failOnStartupError: false,
  reconnectEnabled: true,
  reconnectInitial: '',
  reconnectMax: '',
  reconnectAttempts: '',
}

function errText(cause) {
  if (cause === null || cause === undefined) return '未知错误'
  if (typeof cause === 'string') return cause
  if (typeof cause.message === 'string' && cause.message !== '') return cause.message
  return String(cause)
}

function confirmLose() {
  if (typeof globalThis.confirm !== 'function') return true
  return globalThis.confirm('当前 MCP 条目有未保存的改动，继续操作会丢失，确定吗？')
}

/** dict ↔ 文本：每行 `KEY=VALUE`，空行与 # 开头忽略。env 与 headers 共用。 */
function dictToText(dict) {
  if (dict === null || dict === undefined || typeof dict !== 'object') return ''
  return Object.entries(dict).map(([key, value]) => key + '=' + String(value)).join('\n')
}

function textToDict(text) {
  const out = {}
  const lines = typeof text === 'string' ? text.split('\n') : []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const at = trimmed.indexOf('=')
    if (at <= 0) continue
    out[trimmed.slice(0, at).trim()] = trimmed.slice(at + 1)
  }
  return out
}

/** 数字输入框 → 数字 | undefined：留空表示「用官方默认值」。 */
function numberOrUndefined(text) {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (trimmed === '') return undefined
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : undefined
}

/** 从列表项（含 config）生成编辑草稿。 */
function draftFrom(server, revealSecretText) {
  const config = server !== null && server !== undefined && server.config !== null && typeof server.config === 'object' ? server.config : {}
  const reconnect = config.reconnect !== null && typeof config.reconnect === 'object' ? config.reconnect : {}
  return {
    entryId: server === null || server === undefined ? null : server.entryId,
    created: false,
    serverName: typeof config.serverName === 'string' ? config.serverName : '',
    transport: config.transport === TRANSPORT_HTTP ? TRANSPORT_HTTP : TRANSPORT_STDIO,
    command: typeof config.command === 'string' ? config.command : '',
    argsText: Array.isArray(config.args) ? config.args.join('\n') : '',
    cwd: typeof config.cwd === 'string' ? config.cwd : '',
    url: typeof config.url === 'string' ? config.url : '',
    secretText: revealSecretText === true ? dictToText(config.transport === TRANSPORT_HTTP ? config.headers : config.env) : '',
    toolCallTimeoutMs: typeof config.toolCallTimeoutMs === 'number' ? String(config.toolCallTimeoutMs) : '',
    maxInstructionBytes: typeof config.maxInstructionBytes === 'number' ? String(config.maxInstructionBytes) : '',
    failOnStartupError: config.failOnStartupError === true,
    reconnectEnabled: reconnect.enabled !== false,
    reconnectInitial: typeof reconnect.initialDelayMs === 'number' ? String(reconnect.initialDelayMs) : '',
    reconnectMax: typeof reconnect.maxDelayMs === 'number' ? String(reconnect.maxDelayMs) : '',
    reconnectAttempts: typeof reconnect.maxAttempts === 'number' ? String(reconnect.maxAttempts) : '',
  }
}

/** 草稿 → host 的 config。留空的数值字段不发送，交给 host 用官方默认值补齐。 */
function configFromDraft(draft) {
  const config = {
    transport: draft.transport,
    serverName: draft.serverName.trim(),
    failOnStartupError: draft.failOnStartupError === true,
  }
  if (draft.transport === TRANSPORT_STDIO) {
    config.command = draft.command.trim()
    config.args = draft.argsText.split('\n').map((line) => line.trim()).filter((line) => line !== '')
    config.cwd = draft.cwd.trim()
    config.env = textToDict(draft.secretText)
  } else {
    config.url = draft.url.trim()
    config.headers = textToDict(draft.secretText)
  }
  const timeout = numberOrUndefined(draft.toolCallTimeoutMs)
  if (timeout !== undefined) config.toolCallTimeoutMs = timeout
  const instructions = numberOrUndefined(draft.maxInstructionBytes)
  if (instructions !== undefined) config.maxInstructionBytes = instructions
  const reconnect = { enabled: draft.reconnectEnabled !== false }
  const initial = numberOrUndefined(draft.reconnectInitial)
  if (initial !== undefined) reconnect.initialDelayMs = initial
  const max = numberOrUndefined(draft.reconnectMax)
  if (max !== undefined) reconnect.maxDelayMs = max
  const attempts = numberOrUndefined(draft.reconnectAttempts)
  if (attempts !== undefined) reconnect.maxAttempts = attempts
  config.reconnect = reconnect
  return config
}

return {
  inject: ['slots'],
  apply(ctx) {
    ctx.effect(() => {
      const el = document.createElement("style")
      el.textContent = CSS
      document.head.appendChild(el)
      return () => el.remove()
    }, "mcp: styles")

    const slots = ctx.slots

    const fetchJson = (url, init) => fetch(url, {
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      ...init,
    }).then((response) => response.json().catch(() => null).then((body) => {
      const failure = body !== null && typeof body === 'object' && typeof body.message === 'string' && body.message !== '' ? body.message : 'HTTP ' + response.status
      if (!response.ok || body === null || typeof body !== 'object' || body.ok !== true) throw new Error(failure)
      return body
    }))
    const postJson = (url, body) => fetchJson(url, { method: 'POST', body: JSON.stringify(body) })

    /** 删除单独拿状态码，便于区分「不存在」和「写失败」。 */
    const deleteEntry = (entryId) => fetch('/api/mcp/server?id=' + encodeURIComponent(entryId), {
      method: 'DELETE',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
    }).then((response) => response.json().catch(() => null).then((body) => ({ status: response.status, body })))

    function Panel() {
      const [meta, setMeta] = React.useState(EMPTY_META)
      const [list, setList] = React.useState(EMPTY_LIST)
      const [selected, setSelected] = React.useState(null)
      const [draft, setDraft] = React.useState(null)
      const [secretRevealed, setSecretRevealed] = React.useState(false)
      const [dirty, setDirty] = React.useState(false)
      const [busy, setBusy] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [probe, setProbe] = React.useState(EMPTY_PROBE)

      const loadAll = () => {
        setMeta(EMPTY_META)
        setList(EMPTY_LIST)
        return Promise.all([
          fetchJson('/api/mcp/meta').catch((cause) => ({ __error: errText(cause) })),
          fetchJson('/api/mcp/servers').catch((cause) => ({ __error: errText(cause) })),
        ]).then(([metaResult, listResult]) => {
          setMeta(metaResult.__error === undefined ? { loading: false, data: metaResult, error: null } : { loading: false, data: null, error: metaResult.__error })
          setList(listResult.__error === undefined ? { loading: false, data: listResult, error: null } : { loading: false, data: null, error: listResult.__error })
        })
      }

      React.useEffect(() => { loadAll() }, [])

      /** 打开条目：有未保存改动先确认；reveal 决定密钥是否取原文。 */
      const openEntry = (entryId, reveal, skipConfirm) => {
        if (skipConfirm !== true && dirty === true && !confirmLose()) return
        setSelected(entryId)
        setBusy('read')
        setNotice(null)
        setProbe(EMPTY_PROBE)
        fetchJson('/api/mcp/server?id=' + encodeURIComponent(entryId) + (reveal === true ? '&reveal=1' : ''))
          .then((data) => {
            const server = data.server !== null && typeof data.server === 'object' ? data.server : null
            setDraft(server === null ? null : draftFrom(server, reveal === true))
            setSecretRevealed(reveal === true)
            setDirty(false)
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '读取失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const openCreate = () => {
        if (dirty === true && !confirmLose()) return
        setSelected(null)
        setDraft({ ...EMPTY_DRAFT })
        setSecretRevealed(true)
        setDirty(false)
        setNotice(null)
        setProbe(EMPTY_PROBE)
      }

      const reloadList = () => fetchJson('/api/mcp/servers')
        .then((data) => setList({ loading: false, data, error: null }))
        .catch((cause) => setNotice({ kind: 'bad', text: '刷新列表失败：' + errText(cause) }))

      const patch = (changes) => {
        setDraft((current) => current === null ? current : { ...current, ...changes })
        setDirty(true)
      }

      const save = () => {
        if (draft === null) return
        setBusy('save')
        setNotice(null)
        const body = { config: configFromDraft(draft) }
        if (draft.entryId !== null) body.entryId = draft.entryId
        // 密钥区没显示原文时，提交里的空 dict 不能覆盖磁盘上的真实密钥：
        // 让 host 从旧 config 搬运（见 host.js 的 preserveSecrets 分支）。
        if (draft.entryId !== null && secretRevealed !== true) body.preserveSecrets = true
        postJson('/api/mcp/server', body)
          .then((data) => {
            setNotice({
              kind: data.applied === true ? 'ok' : 'warn',
              text: (data.created === true ? '已新增：' : '已保存：') + data.entryId + (data.applied === true ? '' : '（' + String(data.note ?? '') + '）'),
            })
            setDirty(false)
            const entryId = data.entryId
            return reloadList().then(() => openEntry(entryId, secretRevealed === true, true))
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '保存失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const toggleEnabled = () => {
        if (draft === null || draft.entryId === null) return
        const server = servers.find((item) => item.entryId === draft.entryId)
        const next = server === undefined ? true : server.enabled !== true
        setBusy('toggle')
        setNotice(null)
        postJson('/api/mcp/server/enabled', { id: draft.entryId, enabled: next })
          .then((data) => {
            setNotice({
              kind: data.applied === true ? 'ok' : 'warn',
              text: (next ? '已启用：' : '已停用：') + draft.entryId + (data.applied === true ? '' : '（' + String(data.note ?? '') + '）'),
            })
            return reloadList()
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '切换失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const remove = () => {
        if (draft === null || draft.entryId === null) return
        if (typeof globalThis.confirm === 'function' && !globalThis.confirm('删除后这个 MCP server 的工具会立刻下线，确定吗？')) return
        setBusy('delete')
        setNotice(null)
        deleteEntry(draft.entryId)
          .then((result) => {
            if (result.status === 200 && result.body !== null && result.body.ok === true) {
              setNotice({ kind: 'ok', text: '已删除：' + draft.entryId })
              setDraft(null)
              setSelected(null)
              return reloadList()
            }
            const message = result.body !== null && typeof result.body.message === 'string' ? result.body.message : 'HTTP ' + result.status
            setNotice({ kind: 'bad', text: '删除失败：' + message })
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '删除失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const runProbe = () => {
        if (draft === null) return
        setBusy('probe')
        setProbe({ running: true, data: null, error: null })
        const body = draft.entryId !== null && dirty !== true
          ? { id: draft.entryId }
          : { config: configFromDraft(draft) }
        postJson('/api/mcp/test', body)
          .then((data) => {
            const result = data.probe !== null && typeof data.probe === 'object' ? data.probe : null
            setProbe({ running: false, data: result, error: null })
          })
          .catch((cause) => setProbe({ running: false, data: null, error: errText(cause) }))
          .then(() => setBusy(null))
      }

      const reloadProfile = () => {
        setBusy('reload')
        setNotice(null)
        postJson('/api/mcp/reload', {})
          .then((data) => {
            const warnings = Array.isArray(data.warnings) ? data.warnings : []
            setNotice({
              kind: data.applied === true ? 'ok' : 'warn',
              text: data.applied === true
                ? '已触发热更' + (warnings.length === 0 ? '' : '（' + warnings.length + ' 条警告）')
                : String(data.note ?? '需要重启 DSH 生效'),
            })
            return reloadList()
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '热更失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const revealSecrets = () => {
        if (draft === null || draft.entryId === null) {
          setSecretRevealed(true)
          return
        }
        // 重新读一遍带 reveal=1 的条目，同时保留用户尚未保存的其它字段。
        fetchJson('/api/mcp/server?id=' + encodeURIComponent(draft.entryId) + '&reveal=1')
          .then((data) => {
            const server = data.server !== null && typeof data.server === 'object' ? data.server : null
            const config = server === null ? {} : server.config
            setDraft((current) => current === null ? current : {
              ...current,
              secretText: dictToText(config.transport === TRANSPORT_HTTP ? config.headers : config.env),
            })
            setSecretRevealed(true)
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '读取密钥失败：' + errText(cause) }))
      }

      const metaData = meta.data
      const listData = list.data
      const servers = listData !== null && Array.isArray(listData.servers) ? listData.servers : []
      const working = busy !== null
      const isNew = draft !== null && draft.entryId === null
      const current = draft !== null && draft.entryId !== null ? servers.find((item) => item.entryId === draft.entryId) : undefined

      const metaBar = React.createElement('div', { className: 'mc-meta' },
        React.createElement('span', { className: 'mc-kv' },
          React.createElement('span', { className: 'mc-k' }, '配置'),
          React.createElement('span', { className: 'mc-v', title: metaData === null ? '' : String(metaData.patchPath ?? '') }, metaData === null ? '读取中…' : String(metaData.patchPath ?? '—'))),
        React.createElement('span', { className: 'mc-kv' },
          React.createElement('span', { className: 'mc-k' }, '条目'),
          React.createElement('span', { className: 'mc-v' }, metaData === null ? '—' : String(metaData.mcpEntryCount ?? 0))),
        React.createElement('span', { className: 'mc-kv' },
          React.createElement('span', { className: 'mc-k' }, '能力'),
          React.createElement('span', { className: 'mc-v' },
            metaData === null ? '—' : ['yaml', 'atomic', 'mcpClient', 'hmr'].map((key) => {
              const flag = key === 'yaml' ? metaData.yamlAvailable : key === 'atomic' ? metaData.atomicAvailable : key === 'mcpClient' ? metaData.mcpClientAvailable : metaData.hmrAvailable
              return (flag === true ? '✓' : '✕') + ' ' + key
            }).join('  '))),
        React.createElement('span', { className: 'mc-spacer' }),
        React.createElement('button', { className: 'mc-btn mc-btn-sm', disabled: working, onClick: () => { loadAll() } }, '刷新'),
        React.createElement('button', { className: 'mc-btn mc-btn-sm', disabled: working, onClick: reloadProfile }, busy === 'reload' ? '热更中…' : '重新加载插件'))

      // 列表区单独拼，避免一层套一层的三元把括号数数错（这里最容易漏一个 `)`）。
      const rowOf = (item) => React.createElement('button', {
        key: item.entryId,
        className: item.entryId === selected ? 'mc-item mc-item-on' : 'mc-item',
        onClick: () => { openEntry(item.entryId, secretRevealed) },
      },
      React.createElement('span', { className: 'mc-item-name' }, item.serverName === '' ? item.entryId : item.serverName),
      React.createElement('span', { className: 'mc-item-meta' },
        React.createElement('span', { className: item.enabled === true ? 'mc-badge mc-badge-ok' : 'mc-badge mc-badge-bad' }, item.enabled === true ? '已启用' : '已停用'),
        React.createElement('span', { className: 'mc-badge' }, item.transport),
        React.createElement('span', { className: 'mc-badge' }, item.entryId)),
      React.createElement('span', { className: 'mc-hint' },
        String(item.config !== null && typeof item.config === 'object' && item.config.toolPrefix !== undefined ? item.config.toolPrefix : '') + '*'))

      let listBody = null
      if (list.loading === true) {
        listBody = React.createElement('div', { className: 'mc-empty' }, '读取中…')
      } else if (list.error !== null) {
        listBody = React.createElement('div', { className: 'mc-notice mc-notice-bad' }, '列表读取失败：' + list.error)
      } else if (servers.length === 0) {
        listBody = React.createElement('div', { className: 'mc-empty' }, '还没有 MCP server。点「新增 server」填一条，写进 profile 的 cordis.patch.yml 后由官方 mcp-client 接管。')
      } else {
        listBody = servers.map(rowOf)
      }

      const leftColumn = React.createElement('div', { className: 'mc-col-list' },
        React.createElement('div', { className: 'mc-row' },
          React.createElement('button', { className: 'mc-btn mc-btn-primary mc-btn-sm', disabled: working, onClick: openCreate }, '+ 新增 server'),
          React.createElement('span', { className: 'mc-spacer' }),
          React.createElement('span', { className: 'mc-hint' }, servers.length + ' 条')),
        React.createElement('div', { className: 'mc-scroll' }, listBody))

      const detailNodes = []
      if (metaData !== null && metaData.dependencyError !== null && metaData.dependencyError !== undefined) {
        detailNodes.push(React.createElement('div', { className: 'mc-notice mc-notice-warn' }, '依赖不完整：' + String(metaData.dependencyError)))
      }

      if (draft === null) {
        detailNodes.push(React.createElement('div', { className: 'mc-empty' },
          '左侧选一条 server 查看与编辑，或点「新增 server」。',
          React.createElement('div', { className: 'mc-hint' },
            '这里改的是 profile 的 cordis.patch.yml：每条 MCP server 是一个 @deepseek-ai/dsh-mcp-client 实例。')))
      } else {
        detailNodes.push(React.createElement('div', { className: 'mc-detail-head' },
          React.createElement('div', { className: 'mc-detail-title' },
            React.createElement('span', {}, draft.serverName === '' ? (isNew ? '新增 MCP server' : String(draft.entryId)) : draft.serverName),
            isNew
              ? React.createElement('span', { className: 'mc-badge mc-badge-warn' }, '未保存')
              : React.createElement('span', { className: current !== undefined && current.enabled === true ? 'mc-badge mc-badge-ok' : 'mc-badge mc-badge-bad' }, current !== undefined && current.enabled === true ? '已启用' : '已停用'),
            React.createElement('span', { className: 'mc-badge' }, draft.transport),
            dirty === true ? React.createElement('span', { className: 'mc-dirty' }, '有未保存改动') : null),
          React.createElement('div', { className: 'mc-path' },
            isNew ? '保存后写入 ' + String(metaData === null ? 'profile' : metaData.patchPath ?? 'profile') + '（id 默认为 mcp-<serverName>）' : String(draft.entryId))))

        detailNodes.push(React.createElement('div', { className: 'mc-field' },
          React.createElement('span', { className: 'mc-label' }, 'serverName（字母/数字/-/_，1–32 字符；决定工具名前缀 mcp__<serverName>__）'),
          React.createElement('input', {
            className: 'mc-input mc-mono',
            value: draft.serverName,
            onChange: (event) => patch({ serverName: event.target.value }),
          })))
        detailNodes.push(React.createElement('div', { className: 'mc-field' },
          React.createElement('span', { className: 'mc-label' }, 'transport'),
          React.createElement('select', {
            className: 'mc-select',
            value: draft.transport,
            onChange: (event) => { patch({ transport: event.target.value }); setSecretRevealed(draft.entryId === null || secretRevealed === true) },
          },
          React.createElement('option', { value: TRANSPORT_STDIO }, 'stdio（本地子进程）'),
          React.createElement('option', { value: TRANSPORT_HTTP }, 'streamable-http（远程 URL）'))))

        if (draft.transport === TRANSPORT_STDIO) {
          detailNodes.push(React.createElement('div', { className: 'mc-field' },
            React.createElement('span', { className: 'mc-label' }, 'command（必填，可执行文件绝对路径或 PATH 上的名字）'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.command, onChange: (event) => patch({ command: event.target.value }) })))
          detailNodes.push(React.createElement('div', { className: 'mc-field' },
            React.createElement('span', { className: 'mc-label' }, 'args（一行一个）'),
            React.createElement('textarea', { className: 'mc-textarea mc-mono', rows: 4, value: draft.argsText, spellCheck: false, onChange: (event) => patch({ argsText: event.target.value }) })))
          detailNodes.push(React.createElement('div', { className: 'mc-field' },
            React.createElement('span', { className: 'mc-label' }, 'cwd（可选，子进程工作目录）'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.cwd, onChange: (event) => patch({ cwd: event.target.value }) })))
        } else {
          detailNodes.push(React.createElement('div', { className: 'mc-field' },
            React.createElement('span', { className: 'mc-label' }, 'url（必填，MCP 端点）'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.url, onChange: (event) => patch({ url: event.target.value }) })))
        }

        const secretLabel = draft.transport === TRANSPORT_STDIO ? 'env（一行一个 KEY=VALUE，子进程环境变量）' : 'headers（一行一个 KEY=VALUE）'
        detailNodes.push(React.createElement('div', { className: 'mc-field' },
          React.createElement('div', { className: 'mc-row' },
            React.createElement('span', { className: 'mc-label' }, secretLabel),
            React.createElement('span', { className: 'mc-spacer' }),
            draft.entryId !== null && secretRevealed !== true
              ? React.createElement('button', { className: 'mc-btn mc-btn-sm', onClick: revealSecrets }, '显示密钥')
              : React.createElement('span', { className: 'mc-hint' }, secretRevealed === true ? '内容会原样写入配置' : '新增条目直接编辑')),
          secretRevealed === true
            ? React.createElement('textarea', { className: 'mc-textarea mc-mono', rows: 4, value: draft.secretText, spellCheck: false, onChange: (event) => patch({ secretText: event.target.value }) })
            : React.createElement('div', { className: 'mc-notice' }, '密钥已隐藏（只显示前 4 位）。保存时保留磁盘上的原值；要改先点「显示密钥」。')))

        detailNodes.push(React.createElement('div', { className: 'mc-row' },
          React.createElement('span', { className: 'mc-label', style: { flex: '0 0 auto' } }, '高级'),
          React.createElement('span', { className: 'mc-hint' }, '留空 = 用官方默认值（toolCallTimeoutMs 60000 / maxInstructionBytes 32768 / 重连 500ms→30s × 10）')))
        detailNodes.push(React.createElement('div', { className: 'mc-row' },
          React.createElement('label', { className: 'mc-field', style: { flex: '1 1 150px' } },
            React.createElement('span', { className: 'mc-label' }, 'toolCallTimeoutMs'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.toolCallTimeoutMs, onChange: (event) => patch({ toolCallTimeoutMs: event.target.value }) })),
          React.createElement('label', { className: 'mc-field', style: { flex: '1 1 150px' } },
            React.createElement('span', { className: 'mc-label' }, 'maxInstructionBytes'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.maxInstructionBytes, onChange: (event) => patch({ maxInstructionBytes: event.target.value }) })),
          React.createElement('label', { className: 'mc-field', style: { flex: '1 1 120px' } },
            React.createElement('span', { className: 'mc-label' }, 'reconnect.initialDelayMs'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.reconnectInitial, onChange: (event) => patch({ reconnectInitial: event.target.value }) })),
          React.createElement('label', { className: 'mc-field', style: { flex: '1 1 120px' } },
            React.createElement('span', { className: 'mc-label' }, 'reconnect.maxDelayMs'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.reconnectMax, onChange: (event) => patch({ reconnectMax: event.target.value }) })),
          React.createElement('label', { className: 'mc-field', style: { flex: '1 1 120px' } },
            React.createElement('span', { className: 'mc-label' }, 'reconnect.maxAttempts'),
            React.createElement('input', { className: 'mc-input mc-mono', value: draft.reconnectAttempts, onChange: (event) => patch({ reconnectAttempts: event.target.value }) }))))
        detailNodes.push(React.createElement('div', { className: 'mc-row' },
          React.createElement('button', {
            className: 'mc-switch' + (draft.reconnectEnabled === true ? ' mc-switch-on' : ''),
            onClick: () => patch({ reconnectEnabled: draft.reconnectEnabled !== true }),
          }, (draft.reconnectEnabled === true ? '✓ ' : '✕ ') + '断线自动重连'),
          React.createElement('button', {
            className: 'mc-switch' + (draft.failOnStartupError === true ? ' mc-switch-on' : ''),
            onClick: () => patch({ failOnStartupError: draft.failOnStartupError !== true }),
          }, (draft.failOnStartupError === true ? '✓ ' : '✕ ') + '启动失败即报错'),
          React.createElement('span', { className: 'mc-hint' }, '关掉 failOnStartupError 时，server 连不上只是工具缺席，不影响 DSH 启动。')))

        const probeView = probe.running === true
          ? React.createElement('div', { className: 'mc-notice' }, '正在连接…（最多 20 秒）')
          : probe.error !== null
            ? React.createElement('div', { className: 'mc-notice mc-notice-bad' }, '测试失败：' + probe.error)
            : probe.data === null
              ? null
              : probe.data.ok === true
                ? React.createElement('div', { className: 'mc-tools' },
                  React.createElement('div', { className: 'mc-row' },
                    React.createElement('span', { className: 'mc-badge mc-badge-ok' }, '连接成功'),
                    React.createElement('span', { className: 'mc-badge' }, probe.data.transport),
                    React.createElement('span', { className: 'mc-badge' }, probe.data.toolCount + ' 个工具'),
                    React.createElement('span', { className: 'mc-badge' }, Number(probe.data.durationMs ?? 0) + ' ms')),
                  probe.data.serverInfo !== null && typeof probe.data.serverInfo === 'object'
                    ? React.createElement('div', { className: 'mc-hint' }, 'server：' + String(probe.data.serverInfo.name ?? '?') + ' ' + String(probe.data.serverInfo.version ?? ''))
                    : null,
                  probe.data.tools.length === 0
                    ? React.createElement('div', { className: 'mc-hint' }, '这条 server 没有提供任何工具。')
                    : probe.data.tools.map((tool, index) => React.createElement('div', { className: 'mc-tool', key: index },
                      React.createElement('span', { className: 'mc-tool-name' }, String(tool.publicName ?? tool.name ?? '')),
                      tool.description === '' ? null : React.createElement('span', { className: 'mc-tool-desc' }, String(tool.description)))))
                : React.createElement('div', { className: 'mc-notice mc-notice-bad' }, '连接失败：' + String(probe.data.error ?? '未知错误'))

        detailNodes.push(React.createElement('div', { className: 'mc-row' },
          React.createElement('button', { className: 'mc-btn mc-btn-primary', disabled: working || dirty !== true, onClick: save }, busy === 'save' ? '保存中…' : (isNew ? '新增' : '保存')),
          React.createElement('button', { className: 'mc-btn', disabled: working, onClick: runProbe }, busy === 'probe' ? '连接中…' : '测试连接'),
          isNew
            ? null
            : React.createElement('button', { className: 'mc-btn', disabled: working, onClick: toggleEnabled }, busy === 'toggle' ? '切换中…' : (current !== undefined && current.enabled === true ? '停用' : '启用')),
          React.createElement('span', { className: 'mc-spacer' }),
          isNew
            ? null
            : React.createElement('button', { className: 'mc-btn mc-btn-danger', disabled: working, onClick: remove }, busy === 'delete' ? '删除中…' : '删除')))
        detailNodes.push(React.createElement('div', { className: 'mc-hint' },
          '测试连接是另起一条一次性连接（连上即断开），不影响正在运行的实例，也不会改写配置。'))
        if (probeView !== null) detailNodes.push(probeView)
      }

      return React.createElement('div', { className: 'mc-root' },
        metaBar,
        notice === null ? null : React.createElement('div', { className: 'mc-notice mc-notice-' + notice.kind }, notice.text),
        React.createElement('div', { className: 'mc-body' },
          leftColumn,
          React.createElement('div', { className: 'mc-col-detail' }, React.createElement('div', { className: 'mc-scroll' }, detailNodes))))
    }

    if (slots === undefined) return
    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, Panel))
    const registry = typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null
    if (registry !== null) {
      registry.register({ id: PANEL_KEY, Panel, label: LABEL, order: 53, glyphText: 'C' })
    } else {
      slots.inject('sidebar.panellist', () => slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, label: LABEL, order: 53 }, function Glyph() { return React.createElement('span', { className: 'mc-glyph' }, 'C') }))
    }
  },
}
}

// ─── 组件：model-test ───
function modelTestClientFactory(require) {
    const React = require("react")
const CSS = '.mt-root{position:relative;inset:auto;display:flex;flex-direction:column;gap:14px;padding:18px 20px 12px;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;min-height:0;width:auto;background:var(--dsw-alias-bg-layer-0)}.mt-scroll{display:flex;flex-direction:column;gap:10px;padding-bottom:8px;flex:none}.mt-head,.mt-actions,.mt-stats,.mt-path,.mt-card{flex-shrink:0}.mt-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}.mt-title{margin:0;font-size:18px;font-weight:650;color:var(--dsw-alias-label-primary)}.mt-sub{margin-top:6px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);max-width:640px}.mt-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.mt-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;font-size:12px;line-height:1.6;border-radius:6px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.mt-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.mt-btn:disabled{opacity:.5;cursor:default}.mt-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600}.mt-btn-primary:hover:not(:disabled){opacity:.9;background:var(--dsw-alias-brand-primary)}.mt-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:12px 14px}.mt-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.mt-stat-label{font-size:11px;color:var(--dsw-alias-label-secondary)}.mt-stat-value{font-size:19px;font-weight:650;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;margin-top:3px}.mt-opt{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}.mt-select{padding:3px 6px;font-size:12px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.mt-group{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;overflow:hidden}.mt-group-head{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;user-select:none}.mt-group-head:hover{background:var(--dsw-alias-interactive-bg-hover)}.mt-caret{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:20px;height:20px;padding:0;font-size:11px;line-height:1;border-radius:5px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary)}.mt-group-name{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}.mt-group-id{font-size:11px;color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-family-mono,monospace)}.mt-count{margin-left:auto;font-size:12px;color:var(--dsw-alias-label-secondary)}.mt-models{border-top:1px solid var(--dsw-alias-border-l1)}.mt-model{display:flex;align-items:center;gap:10px;padding:8px 12px;min-width:0}.mt-model+.mt-model{border-top:1px solid var(--dsw-alias-border-l2)}.mt-model-main{display:flex;align-items:baseline;gap:8px;min-width:0;flex:1}.mt-model-name{font-size:13px;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mt-model-id{font-size:11px;color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-family-mono,monospace);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mt-state{font-size:12px;font-variant-numeric:tabular-nums;text-align:right;color:var(--dsw-alias-label-secondary);flex:0 1 52%;max-width:52%;white-space:normal;overflow-wrap:anywhere;line-height:1.45}.mt-ok{color:var(--dsw-alias-state-success-primary)}.mt-bad{color:var(--dsw-alias-state-error-primary)}.mt-empty{padding:14px;font-size:12px;color:var(--dsw-alias-label-secondary)}.mt-msg{margin-top:2px;font-size:12px;line-height:1.5;word-break:break-all}.mt-msg-ok{color:var(--dsw-alias-state-success-primary)}.mt-msg-err{color:var(--dsw-alias-state-error-primary)}.mt-path{font-size:11px;color:var(--dsw-alias-label-tertiary)}.mt-entry-dot{display:inline-flex;align-items:center;justify-content:center;border-radius:5px;font-size:10px;font-weight:700;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}.mt-dot{width:7px;height:7px;border-radius:50%;display:inline-block;background:var(--dsw-alias-label-tertiary)}.mt-dot-ok{background:var(--dsw-alias-state-success-primary)}.mt-dot-bad{background:var(--dsw-alias-state-error-primary)}.mt-row{display:flex;flex-direction:column;min-width:0}.mt-badge{display:inline-flex;align-items:center;gap:4px;padding:1px 6px;font-size:10px;line-height:1.7;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis}.mt-badge-synced{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}.mt-badge-mine{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}.mt-badge-muted{opacity:.7}.mt-params{display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px;border-top:1px dashed var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);font-size:12px;line-height:1.6}.mt-params-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}.mt-field{display:inline-flex;align-items:center;gap:4px;color:var(--dsw-alias-label-secondary);white-space:nowrap}.mt-input{width:76px;padding:3px 6px;font-size:12px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-sizing:border-box}.mt-meta{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.55;overflow-wrap:anywhere}.mt-code{margin:0;padding:8px 10px;font-size:11px;line-height:1.55;border-radius:6px;background:var(--dsw-alias-bg-layer-0);color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-family-mono,monospace);white-space:pre-wrap;word-break:break-all;max-height:200px;overflow:auto}.mt-loading{opacity:.65}.mt-dsh{display:flex;flex-direction:column;gap:6px;margin:6px 0 8px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}.mt-dsh-head{display:flex;align-items:center;flex-wrap:wrap;gap:6px}.mt-dsh-title{font-size:11px;font-weight:600;color:var(--dsw-alias-label-primary)}.mt-dsh-tag{display:inline-flex;align-items:center;padding:0 6px;font-size:10px;line-height:1.7;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap}.mt-dsh-tag-miss{color:var(--dsw-alias-state-warning-primary);border-color:var(--dsw-alias-state-warning-primary)}.mt-dsh-tag-same{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}.mt-dsh-tag-warn{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}.mt-dsh-row{display:grid;grid-template-columns:72px 1fr auto;align-items:baseline;gap:8px;font-size:11px;line-height:1.6}.mt-dsh-field{color:var(--dsw-alias-label-secondary);white-space:nowrap}.mt-dsh-val{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;font-family:var(--dsw-font-family-mono,monospace)}.mt-dsh-val-same{color:var(--dsw-alias-label-tertiary)}.mt-dsh-note{font-size:11px;line-height:1.55;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}.mt-dsh-warn{font-size:11px;line-height:1.55;color:var(--dsw-alias-state-warning-primary);overflow-wrap:anywhere}'
const PANEL_KEY = 'model-test'
const PENDING_LABEL = '测试中…'
const UNTESTED_LABEL = '未测试'
const STATUS_LABEL = { ok: '连接正常', error: '失败', timeout: '超时', aborted: '已中断' }
const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']
const LEVEL_LABEL = { off: '关闭', minimal: '最低', low: '低', medium: '中', high: '高', xhigh: '极高', max: '最高' }
const PRESET_FROM_LABEL = { builtin: '内置精选', 'models-dev': 'models.dev' }
return {
  inject: ['slots'],
  apply(ctx) {
    ctx.effect(() => {
      const el = document.createElement("style")
      el.textContent = CSS
      document.head.appendChild(el)
      return () => el.remove()
    }, "model-test: styles")
    const slots = ctx.slots
    const fetchJson = (url, init) => fetch(url, {
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      ...init,
    }).then((response) => response.json().catch(() => null).then((body) => {
      const failure = body !== null && typeof body === 'object' && typeof body.message === 'string' && body.message !== ''
        ? body.message
        : 'HTTP ' + response.status
      if (!response.ok || body === null || typeof body !== 'object' || body.ok !== true) throw new Error(failure)
      return body
    }))
    const postJson = (url, body) => fetchJson(url, { method: 'POST', body: JSON.stringify(body) })
    const keyOf = (provider, model) => provider + '\u0000' + model
    const fmtMs = (value) => {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0) return '-'
      return n < 1000 ? Math.round(n) + ' ms' : (n / 1000).toFixed(2) + ' s'
    }
    const fmtSpeed = (value) => {
      const n = Number(value)
      if (!Number.isFinite(n) || n <= 0) return '-'
      return (n >= 100 ? n.toFixed(0) : n.toFixed(1)) + ' tok/s'
    }
    const statusLabel = (status) => STATUS_LABEL[status] !== undefined ? STATUS_LABEL[status] : String(status)
    /** 只有一个模型时给完整读数；批量结果压缩成「成功 x/y」交给汇总卡片。 */
    const resultText = (result) => {
      if (result === null || result === undefined) return UNTESTED_LABEL
      if (result.ok !== true) return statusLabel(result.status) + '：' + (result.message || '无详细信息')
      const speed = typeof result.tokensPerSecond === 'number' && result.tokensPerSecond > 0
        ? '输出 ' + fmtSpeed(result.tokensPerSecond)
        : result.outputTokens > 0 ? '输出 —' : null
      const parts = ['连接正常', '首字 ' + fmtMs(result.ttftMs), '总 ' + fmtMs(result.totalMs)]
      if (speed !== null) parts.push(speed)
      if (result.outputTokens > 0) parts.push(result.outputTokens + ' tokens 输出')
      if (typeof result.speedNote === 'string' && result.speedNote !== '') parts.push(result.speedNote)
      return parts.join(' · ')
    }
    const resultClass = (result) => result === null || result === undefined ? 'mt-state' : result.ok === true ? 'mt-state mt-ok' : 'mt-state mt-bad'
    // ── 参数覆盖 ────────────────────────────────────────────────
    // 覆盖按 provider + '\u0000' + (model|'*') 存盘，所以整组默认和单模型设置能同时存在。
    const overrideOf = (overrides, provider, model) => {
      if (overrides === null || typeof overrides !== 'object') return null
      const key = provider + '\u0000' + (model || '*')
      return overrides[key] !== undefined ? overrides[key] : null
    }
    const paramsText = (params) => {
      if (params === null || params === undefined) return '自动'
      const parts = []
      if (params.temperature !== null && params.temperature !== undefined) parts.push('t=' + params.temperature)
      if (params.maxTokens !== null && params.maxTokens !== undefined) parts.push('max=' + params.maxTokens)
      if (params.reasoningEffort !== null && params.reasoningEffort !== undefined) parts.push(LEVEL_LABEL[params.reasoningEffort] || params.reasoningEffort)
      return parts.length === 0 ? '自动' : parts.join(' · ')
    }
    const presetText = (preset) => {
      if (preset === null || preset === undefined) return null
      const label = typeof preset.label === 'string' && preset.label !== '' ? preset.label : preset.id
      return (PRESET_FROM_LABEL[preset.from] || preset.from) + ' · ' + label
    }
    // 输入框文本就是「空 = 自动」，提交时再归一，避免在输入过程中打断用户。
    const textOf = (value) => value === null || value === undefined ? '' : String(value)
    const numberText = (value) => Number.isFinite(Number(value)) ? Number(value) : null
    const draftOf = (params) => ({
      temperature: textOf(params && params.temperature),
      maxTokens: textOf(params && params.maxTokens),
      reasoningEffort: params && params.reasoningEffort ? params.reasoningEffort : '',
    })
    const draftToParams = (draft) => ({
      temperature: draft.temperature === '' ? null : Number(draft.temperature),
      maxTokens: draft.maxTokens === '' ? null : Math.round(Number(draft.maxTokens)),
      reasoningEffort: draft.reasoningEffort === '' ? null : draft.reasoningEffort,
    })

    const average = (list) => list.length === 0 ? null : list.reduce((sum, value) => sum + value, 0) / list.length
    const summaryOf = (list) => {
      const ok = list.filter((item) => item.ok === true).length
      const ttfts = list.map((item) => item.ttftMs).filter((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
      const speeds = list.map((item) => item.tokensPerSecond).filter((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)
      return {
        total: list.length,
        ok,
        failed: list.length - ok,
        averageTtftMs: average(ttfts),
        averageTokensPerSecond: average(speeds),
        fastest: speeds.length === 0 ? null : Math.max(...speeds),
        slowest: speeds.length === 0 ? null : Math.min(...speeds),
      }
    }
    function panelGlyph(size) { const edge = typeof size === 'number' && size > 0 ? size : 16; return React.createElement('span', { className: 'mt-entry-dot', style: { width: edge + 'px', height: edge + 'px' } }, 'M') }

    function Panel() {
      const [catalog, setCatalog] = React.useState({ loading: true, data: null, error: null })
      const [results, setResults] = React.useState({})
      const [running, setRunning] = React.useState(false)
      const [pending, setPending] = React.useState([])
      // 收纳状态存「展开过的组」而不是「收起的组」：目录动辄十几个组，默认全收，
      // 只记住用户展开过哪些；点组头任意空白处即可切换。
      const [expanded, setExpanded] = React.useState([])
      const [notice, setNotice] = React.useState(null)
      const [options, setOptions] = React.useState({ timeoutMs: 120000, maxTokens: 256, concurrency: 3 })
      const [prompt, setPrompt] = React.useState('请连续输出 80 个「测速」，词与词之间只用空格，不要解释。')
      // 手工参数覆盖：{ 'provider\0model' -> {temperature,maxTokens,reasoningEffort} }，'provider\0*' 是整组默认。
      const [overrides, setOverrides] = React.useState({})
      // 正在编辑的目标键（null = 没打开任何参数面板）
      const [editing, setEditing] = React.useState(null)
      // 编辑中的草稿（字符串，空 = 自动）
      const [draft, setDraft] = React.useState({ temperature: '', maxTokens: '', reasoningEffort: '' })
      const [saving, setSaving] = React.useState(false)
      // 全局默认：优先级最低的一层，测试时对所有没被覆盖的模型生效
      const [defaults, setDefaults] = React.useState({ temperature: '', reasoningEffort: '' })
      // 按需拉取的 YAML 片段：{ key, loading, text, error }
      const [snippet, setSnippet] = React.useState(null)
      // DSH 真实配置：{ 'provider\0model' -> {loading, data, error} }，按目标缓存
      const [dshState, setDshState] = React.useState({})
      // 正在写 DSH 配置的目标键（null = 没有写入进行中）
      const [dshWriting, setDshWriting] = React.useState(null)
      const seq = React.useRef(0)
      const rootRef = React.useRef(null)

      const loadCatalog = () => {
        setCatalog({ loading: true, data: null, error: null })
        fetchJson('/api/model-test/catalog')
          .then((data) => {
            setCatalog({ loading: false, data, error: null })
            if (data !== null && typeof data === 'object' && data.overrides !== null && typeof data.overrides === 'object') setOverrides(data.overrides)
          })
          .catch((error) => setCatalog({ loading: false, data: null, error: String(error && error.message ? error.message : error) }))
      }
      React.useEffect(() => { loadCatalog() }, [])
      React.useEffect(() => {
        const el = rootRef.current
        if (el === null || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return undefined
        const fit = () => {
          const top = el.getBoundingClientRect().top
          let limit = window.innerHeight - top - 4
          let node = el.parentElement
          while (node !== null && node !== document.documentElement) {
            const style = window.getComputedStyle(node)
            if (style.display === 'contents') {
              node = node.parentElement
              continue
            }
            const oy = style.overflowY
            if ((oy === 'hidden' || oy === 'auto' || oy === 'scroll' || oy === 'clip') && node.clientHeight > 0) {
              const available = node.clientHeight - (top - node.getBoundingClientRect().top) - 4
              if (available > 80 && available < limit) limit = available
            }
            node = node.parentElement
          }
          const height = Math.max(160, Math.floor(limit))
          el.style.position = 'relative'
          el.style.inset = 'auto'
          el.style.left = 'auto'
          el.style.right = 'auto'
          el.style.top = 'auto'
          el.style.bottom = 'auto'
          el.style.width = 'auto'
          el.style.height = height + 'px'
          el.style.maxHeight = height + 'px'
          el.style.flex = '0 0 auto'
          el.style.overflowY = 'auto'
          el.style.overflowX = 'hidden'
        }
        fit()
        const frame = window.requestAnimationFrame(() => fit())
        window.addEventListener('resize', fit)
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
        if (observer !== null) {
          observer.observe(document.documentElement)
        }
        return () => {
          window.cancelAnimationFrame(frame)
          window.removeEventListener('resize', fit)
          if (observer !== null) observer.disconnect()
        }
      }, [])

      const data = catalog.data
      const groups = data !== null && typeof data === 'object' && Array.isArray(data.groups) ? data.groups : []
      const failures = data !== null && typeof data === 'object' && Array.isArray(data.failures) ? data.failures : []
      const resultList = groups.flatMap((group) => group.models.map((item) => results[keyOf(group.id, item.id)]).filter((item) => item !== undefined && item !== null))
      const summary = summaryOf(resultList)
      const allKeys = groups.flatMap((group) => group.models.map((item) => keyOf(group.id, item.id)))

      const run = (body, keys) => {
        const mine = seq.current + 1
        seq.current = mine
        setRunning(true)
        setPending(keys)
        setNotice(null)
        const params = {}
        if (defaults.temperature !== '') params.temperature = Number(defaults.temperature)
        if (defaults.reasoningEffort !== '') params.reasoningEffort = defaults.reasoningEffort
        postJson('/api/model-test/run', { ...options, prompt, params, ...body })
          .then((payload) => {
            if (seq.current !== mine) return
            const next = {}
            const list = Array.isArray(payload.results) ? payload.results : []
            for (const item of list) next[keyOf(item.provider, item.model)] = item
            // 合并而非替换：单测某个模型时，其它模型上一次的读数仍留在表里。
            setResults((previous) => ({ ...previous, ...next }))
            setPending([])
            const done = payload.summary !== null && typeof payload.summary === 'object' ? payload.summary : summaryOf(list)
            setNotice({
              kind: done.failed === 0 ? 'ok' : 'error',
              text: '测完 ' + done.total + ' 个模型：成功 ' + done.ok + ' 个' + (done.failed > 0 ? '，失败 ' + done.failed + ' 个' : '')
                + (done.averageTtftMs !== null && done.averageTtftMs !== undefined ? '，平均首字 ' + fmtMs(done.averageTtftMs) : '')
                + (done.averageTokensPerSecond !== null && done.averageTokensPerSecond !== undefined ? '，平均 ' + fmtSpeed(done.averageTokensPerSecond) : ''),
            })
          })
          .catch((error) => {
            if (seq.current !== mine) return
            setPending([])
            setNotice({ kind: 'error', text: String(error && error.message ? error.message : error) })
          })
          .finally(() => { if (seq.current === mine) setRunning(false) })
      }

      const toggleGroup = (id) => setExpanded(expanded.includes(id) ? expanded.filter((item) => item !== id) : expanded.concat([id]))
      const setOption = (patch) => setOptions({ ...options, ...patch })

      // ── 参数覆盖的读写 ────────────────────────────────────────
      // 所有操作都走 POST /api/model-test/config（整表落盘），因此面板状态与磁盘始终一致：
      // 提交成功后用服务端回的 overrides 覆盖本地，不做乐观更新，避免写失败后界面说谎。
      const saveOverride = (provider, model, params) => {
        const key = provider + '\u0000' + (model || '*')
        const next = { ...overrides }
        const empty = params.temperature === null && params.maxTokens === null && params.reasoningEffort === null
        if (empty) delete next[key]
        else next[key] = params
        const entries = [{ provider, model: model || '*', params: empty ? null : params }]
        setSaving(true)
        postJson('/api/model-test/config', { entries })
          .then((payload) => {
            setOverrides(payload.overrides !== null && typeof payload.overrides === 'object' ? payload.overrides : next)
            setEditing(null)
            setNotice({ kind: 'ok', text: (empty ? '已清除 ' : '已保存 ') + provider + ' / ' + (model || '整组默认') + ' 的参数' })
            loadCatalog()
          })
          .catch((error) => setNotice({ kind: 'error', text: '保存失败：' + String(error && error.message ? error.message : error) }))
          .finally(() => setSaving(false))
      }
      const openEditor = (provider, model) => {
        const key = provider + '\u0000' + (model || '*')
        if (editing === key) { setEditing(null); return }
        setEditing(key)
        setDraft(draftOf(overrideOf(overrides, provider, model)))
        // 整组参数按钮在组头上，组可能正收着：不展开的话编辑器会落在收起区里。
        if (model === null || model === undefined) setExpanded((current) => (current.includes(provider) ? current : current.concat([provider])))
        // 展开就顺手把 DSH 里的真实配置读回来：用户点「参数」是想看「现在是什么、差在哪」，
        // 不该再让他多点一次。整组编辑没有 DSH 区块，不读。
        if (model !== null && model !== undefined) {
          const dshKey = provider + '\u0000' + model
          const seen = dshState[dshKey]
          if (seen === undefined || (seen.data === null && seen.error === null && seen.loading !== true)) readDsh(provider, model)
        }
      }
      const setDraftField = (patch) => setDraft({ ...draft, ...patch })

      // 同步 models.dev：按当前目录里的模型拉参数预设，回来后刷新目录让徽标立即更新。
      const syncPresets = () => {
        setNotice(null)
        postJson('/api/model-test/presets/sync', {})
          .then((payload) => {
            setNotice({ kind: 'ok', text: payload.message !== undefined ? String(payload.message) : '同步完成' })
            loadCatalog()
          })
          .catch((error) => setNotice({ kind: 'error', text: '同步失败：' + String(error && error.message ? error.message : error) }))
      }

      // ── DSH 真实配置的读写 ──────────────────────────────────────
      // 与上面的 params.json 是两回事：那边只影响「测试」，这边写进 cordis.patch.yml，
      // 写完真实对话就生效（temperature 除外，它不是模型级配置）。
      const dshKeyOf = (provider, model) => provider + '\u0000' + model
      const readDsh = (provider, model) => {
        const key = dshKeyOf(provider, model)
        // 函数式更新：连着读两个模型时，直接展开闭包里的 dshState 会把前一个覆盖掉。
        setDshState((prev) => ({ ...prev, [key]: { loading: true, data: null, error: null } }))
        fetchJson('/api/model-test/dsh?provider=' + encodeURIComponent(provider) + '&model=' + encodeURIComponent(model))
          .then((data) => setDshState((prev) => ({ ...prev, [key]: { loading: false, data, error: null } })))
          .catch((error) => setDshState((prev) => ({
            ...prev,
            [key]: { loading: false, data: null, error: String(error && error.message ? error.message : error) },
          })))
      }
      const writeDsh = (provider, model, mode) => {
        const key = dshKeyOf(provider, model)
        const state = dshState[key]
        const revision = state !== null && state !== undefined && state.data !== null && state.data !== undefined && typeof state.data.revision === 'number'
          ? state.data.revision
          : undefined
        setDshWriting(key)
        // 带上读取时的 revision：DSH 侧是 CAS，别人在这期间改过配置就会拒绝而不是覆盖。
        postJson('/api/model-test/dsh', revision === undefined ? { provider, model, mode } : { provider, model, mode, revision })
          .then((payload) => {
            setNotice({ kind: 'ok', text: payload.message !== undefined ? String(payload.message) : '已写入 DSH 配置' })
            readDsh(provider, model)
            loadCatalog()
          })
          .catch((error) => setNotice({ kind: 'error', text: '写入 DSH 配置失败：' + String(error && error.message ? error.message : error) }))
          .finally(() => setDshWriting(null))
      }

      const optionNode = (label, node) => React.createElement('label', { className: 'mt-opt' }, label, node)
      const statNode = (label, value) => React.createElement('div', { className: 'mt-card' },
        React.createElement('div', { className: 'mt-stat-label' }, label),
        React.createElement('div', { className: 'mt-stat-value' }, value))

      // 参数编辑区：temperature / 思考档位 / 输出上限 + 生成 YAML 片段。
      const paramsEditor = (provider, model) => {
        const key = provider + '\u0000' + (model === null ? '*' : model.id)
        const isGroup = model === null
        const current = overrideOf(overrides, provider, model)
        const preset = model !== null && model.preset !== undefined ? model.preset : null
        const levels = preset !== null && preset.reasoning !== null && Array.isArray(preset.reasoning.levels) && preset.reasoning.levels.length > 0
          ? preset.reasoning.levels
          : THINKING_LEVELS
        const locked = preset !== null && preset.supportsTemperature === false
        const helpParts = []
        if (preset !== null) {
          if (preset.contextWindow) helpParts.push('上下文 ' + preset.contextWindow)
          if (preset.maxTokens) helpParts.push('输出上限 ' + preset.maxTokens)
          if (locked) helpParts.push('该模型不接受 temperature')
          if (preset.reasoning !== null && preset.reasoning.mode !== 'none') helpParts.push('思考模式：' + preset.reasoning.mode)
        }
        if (current !== null && current !== undefined) helpParts.push('当前覆盖：' + paramsText(current))
        const fieldNode = (label, node) => React.createElement('label', { className: 'mt-field' }, label, node)
        const presetLine = preset === null
          ? '预设：没有命中（只能按全局默认推断）'
          : '预设：' + presetText(preset) + (preset.suggest !== null && preset.suggest !== undefined
            ? ' · 建议 ' + paramsText(preset.suggest) : '')
        return React.createElement('div', { className: 'mt-params' },
          React.createElement('div', { className: 'mt-meta' }, presetLine),
          React.createElement('div', { className: 'mt-params-row' },
            fieldNode('temperature', React.createElement('input', {
              className: 'mt-input',
              value: draft.temperature,
              placeholder: locked ? '不支持' : '自动',
              title: locked ? '预设标记该模型不接受 temperature' : '留空 = 按预设/全局默认；0~2',
              onChange: (event) => setDraftField({ temperature: event.target.value }),
            })),
            fieldNode('思考档位', React.createElement('select', {
              className: 'mt-select',
              value: draft.reasoningEffort,
              onChange: (event) => setDraftField({ reasoningEffort: event.target.value }),
            }, [React.createElement('option', { key: '', value: '' }, '自动')].concat(levels.map((level) =>
              React.createElement('option', { key: level, value: level }, LEVEL_LABEL[level] || level))))),
            fieldNode('输出上限', React.createElement('input', {
              className: 'mt-input',
              value: draft.maxTokens,
              placeholder: '自动',
              title: '留空 = 按全局「输出上限」；测试时会被它收顶',
              onChange: (event) => setDraftField({ maxTokens: event.target.value }),
            })),
            React.createElement('button', {
              className: 'mt-btn mt-btn-primary',
              disabled: saving || running,
              onClick: () => saveOverride(provider, isGroup ? null : model.id, draftToParams(draft)),
            }, saving ? '保存中…' : '保存'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: saving || running || current === null || current === undefined,
              title: '清除这个目标的手工参数，恢复按预设推断',
              onClick: () => saveOverride(provider, isGroup ? null : model.id, { temperature: null, maxTokens: null, reasoningEffort: null }),
            }, '清除'),
            model !== null ? React.createElement('button', {
              className: 'mt-btn',
              disabled: (snippet !== null && snippet.loading === true) || false,
              title: '从适配器读真实能力，生成可直接粘进 cordis.patch.yml 的 models 条目',
              onClick: () => {
                const mine = key
                setSnippet({ key: mine, loading: true, text: '', error: null })
                postJson('/api/model-test/inspect', { provider, model: model.id, params: current })
                  .then((payload) => setSnippet({ key: mine, loading: false, text: typeof payload.snippet === 'string' ? payload.snippet : '', error: null }))
                  .catch((error) => setSnippet({ key: mine, loading: false, text: '', error: String(error && error.message ? error.message : error) }))
              },
            }, snippet !== null && snippet.key === key && snippet.loading === true ? '读取中…' : '生成 YAML 片段') : null),
          React.createElement('div', { className: 'mt-meta' },
            (isGroup ? '整组默认：对该组所有模型生效，优先级低于单模型配置。' : '留空即自动：按「预设 → 全局默认」推断，绝不强发模型不接受的参数。')
            + (helpParts.length > 0 ? ' ' + helpParts.join(' · ') : '')),
          snippet !== null && snippet.key === key && snippet.error !== null
            ? React.createElement('div', { className: 'mt-msg mt-msg-err' }, '读取失败：' + snippet.error) : null,
          snippet !== null && snippet.key === key && snippet.text !== ''
            ? React.createElement('pre', { className: 'mt-code' }, snippet.text) : null,
          model !== null ? dshNode(provider, model) : null)
      }

      // DSH 真实配置区块：读当前值 → 与预设建议逐字段比对 → 一键补缺 / 覆盖差异。
      // 和上面的 params.json 编辑区并排，是因为它们解决的是两件事：
      //   上面 = 只影响这台面板点「测试」时发什么参数；
      //   这里 = 写进 cordis.patch.yml，真实对话也生效（temperature 不在其中）。
      const dshNode = (provider, model) => {
        const key = dshKeyOf(provider, model.id)
        const state = dshState[key] !== undefined ? dshState[key] : null
        const data = state !== null && state.data !== null ? state.data : null
        const busy = dshWriting === key
        const head = React.createElement('div', { className: 'mt-dsh-head' },
          React.createElement('span', { className: 'mt-dsh-title' }, 'DSH 配置'),
          React.createElement('span', { className: 'mt-dsh-tag', title: '写入位置：profile 的 cordis.patch.yml，llm-pi-ai 的 models 条目' },
            data !== null && typeof data.ns === 'string' ? data.ns : 'llm-pi-ai'),
          data !== null && data.declaredInModels === false
            ? React.createElement('span', { className: 'mt-dsh-tag mt-dsh-tag-warn' }, '该模型不在 models 列表里') : null,
          data !== null && data.available === false
            ? React.createElement('span', { className: 'mt-dsh-tag mt-dsh-tag-warn' }, '不可写') : null,
          React.createElement('button', {
            className: 'mt-btn',
            disabled: busy || (state !== null && state.loading === true),
            title: '读取 DSH 里这个模型的真实参数，并与预设建议比较',
            onClick: () => readDsh(provider, model.id),
          }, state === null ? '读取 DSH 配置' : state.loading === true ? '读取中…' : '重新读取'))

        if (state === null) {
          return React.createElement('div', { className: 'mt-dsh' }, head,
            React.createElement('div', { className: 'mt-dsh-note' }, '读一下 DSH 里这个模型现在配了什么，再决定要不要补。'))
        }
        if (state.error !== null) {
          return React.createElement('div', { className: 'mt-dsh' }, head,
            React.createElement('div', { className: 'mt-msg mt-msg-err' }, '读取失败：' + state.error))
        }
        if (data === null) {
          return React.createElement('div', { className: 'mt-dsh' }, head,
            React.createElement('div', { className: 'mt-dsh-note' }, '读取中…'))
        }
        if (data.available !== true) {
          return React.createElement('div', { className: 'mt-dsh' }, head,
            React.createElement('div', { className: 'mt-dsh-warn' }, data.reason !== null && data.reason !== undefined ? String(data.reason) : '这个模型不可写'))
        }

        const rows = Array.isArray(data.diff) ? data.diff : []
        const node = (row) => {
          const same = row.changed !== true
          const tag = row.missing === true ? '缺' : same ? '一致' : '不同'
          return React.createElement('div', { className: 'mt-dsh-row', key: row.field },
            React.createElement('span', { className: 'mt-dsh-field' }, row.label),
            React.createElement('span', { className: 'mt-dsh-val' + (same ? ' mt-dsh-val-same' : ''), title: row.field },
              same
                ? row.afterText
                : row.beforeText + '  →  ' + row.afterText),
            React.createElement('span', {
              className: 'mt-dsh-tag' + (row.missing === true ? ' mt-dsh-tag-miss' : same ? ' mt-dsh-tag-same' : ' mt-dsh-tag-warn'),
            }, tag))
        }
        const willFill = Array.isArray(data.plan?.applied) ? data.plan.applied.length : 0
        const changedCount = rows.filter((row) => row.changed === true).length

        return React.createElement('div', { className: 'mt-dsh' },
          head,
          React.createElement('div', { className: 'mt-dsh-note' },
            'DSH 现在：' + (typeof data.summary === 'string' && data.summary !== '' ? data.summary : '（这条没有任何可写字段）')),
          rows.length > 0 ? React.createElement('div', null, rows.map(node)) : null,
          React.createElement('div', { className: 'mt-dsh-head' },
            React.createElement('button', {
              className: 'mt-btn mt-btn-primary',
              disabled: busy || willFill === 0,
              title: '只补 DSH 里还没有的字段，已有的值一概不动',
              onClick: () => writeDsh(provider, model.id, 'fill'),
            }, busy ? '写入中…' : willFill === 0 ? '没有要补的' : '补全缺失（' + willFill + '）'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: busy || changedCount === 0,
              title: '用预设建议覆盖所有有差异的字段',
              onClick: () => writeDsh(provider, model.id, 'replace'),
            }, '覆盖差异（' + changedCount + '）'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: busy,
              title: '重新读一遍，确认磁盘上真实的配置',
              onClick: () => readDsh(provider, model.id),
            }, '刷新')),
          React.createElement('div', { className: 'mt-dsh-note' },
            data.note !== undefined && data.note !== null ? String(data.note) : ''))
      }

      const modelRow = (group, model) => {
        const key = keyOf(group.id, model.id)
        const result = results[key] !== undefined ? results[key] : null
        const override = overrideOf(overrides, group.id, model.id)
        const isPending = pending.includes(key)
        const stateText = isPending ? PENDING_LABEL : resultText(result)
        const isEditing = editing === key
        // 行头只留名字/状态/按钮：参数摘要与预设来源都在「参数」抽屉里，一行太长反而难扫。
        return React.createElement('div', { className: 'mt-row', key },
          React.createElement('div', { className: 'mt-model' },
            React.createElement('span', { className: 'mt-dot' + (result === null ? '' : result.ok === true ? ' mt-dot-ok' : ' mt-dot-bad') }),
            React.createElement('div', { className: 'mt-model-main' },
              React.createElement('span', { className: 'mt-model-name' }, model.name),
              model.name === model.id ? null : React.createElement('span', { className: 'mt-model-id' }, model.id)),
            React.createElement('span', { className: resultClass(result), title: stateText }, stateText),
            React.createElement('button', {
              className: 'mt-btn',
              title: '单独编辑这个模型的参数',
              disabled: running,
              onClick: () => openEditor(group.id, model.id),
            }, isEditing ? '收起' : '参数'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: running,
              onClick: () => run({ provider: group.id, model: model.id }, [key]),
            }, isPending ? PENDING_LABEL : '测试')),
          isEditing ? paramsEditor(group.id, model) : null)
      }

      const groupNode = (group) => {
        const isCollapsed = !expanded.includes(group.id)
        const groupKeys = group.models.map((item) => keyOf(group.id, item.id))
        const groupOverride = overrideOf(overrides, group.id, null)
        const groupKey = group.id + '\u0000*'
        const editingGroup = editing === groupKey
        const onHeadClick = (event) => {
          const el = event.target
          // 组头里的按钮/输入框各有动作，只有点空白、组名、计数这类区域才算「收起/展开」。
          if (el !== null && typeof el.closest === 'function' && el.closest('button, input, select, textarea, a, label') !== null) return
          toggleGroup(group.id)
        }
        return React.createElement('div', { className: 'mt-group', key: group.id },
          React.createElement('div', {
            className: 'mt-group-head',
            onClick: onHeadClick,
            title: isCollapsed ? '点击展开这一组' : '点击收起这一组',
          },
            React.createElement('span', { className: 'mt-caret' }, isCollapsed ? '▸' : '▾'),
            React.createElement('span', { className: 'mt-group-name' }, group.name),
            group.name === group.id ? null : React.createElement('span', { className: 'mt-group-id' }, group.id),
            React.createElement('span', { className: 'mt-count' }, group.models.length + ' 个模型'),
            groupOverride !== null && groupOverride !== undefined
              ? React.createElement('span', { className: 'mt-badge mt-badge-mine', title: '整组默认：' + paramsText(groupOverride) }, '整组默认')
              : null,
            React.createElement('button', {
              className: 'mt-btn',
              disabled: running,
              title: '给这一组设置默认参数（单模型配置会覆盖它）',
              onClick: () => openEditor(group.id, null),
            }, editingGroup ? '收起' : '整组参数'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: running || group.models.length === 0,
              title: '测试这一组的全部模型（会先展开这一组，方便看结果）',
              onClick: () => {
                setExpanded((current) => (current.includes(group.id) ? current : current.concat([group.id])))
                run({ provider: group.id }, groupKeys)
              },
            }, '测试本组')),
          editingGroup ? React.createElement('div', { className: 'mt-models' }, paramsEditor(group.id, null)) : null,
          isCollapsed ? null : React.createElement('div', { className: 'mt-models' },
            group.models.length === 0
              ? React.createElement('div', { className: 'mt-empty' }, '该组没有可用模型')
              : group.models.map((model) => modelRow(group, model))))
      }

      return React.createElement('div', { className: 'mt-root', ref: rootRef },
        React.createElement('div', { className: 'mt-head' },
          React.createElement('div', null,
            React.createElement('h2', { className: 'mt-title' }, '模型测试'),
            React.createElement('div', { className: 'mt-sub' }, '与对话走同一条 DSH 适配器链路。输出速度 = 输出 tokens ÷ 总耗时，和网关「输出 TPS」同一口径。首字和总耗时从本机发起调用算起，含适配器准备，会比网关入站计时略高。会真实调用并计费，单次输出上限 ' + options.maxTokens + ' tokens。参数按「手工配置 > 整组默认 > 预设 > 全局默认」推断，并用适配器真实能力做安全阀（不支持的档位自动降级）。')),
          React.createElement('div', { className: 'mt-actions' },
            React.createElement('button', {
              className: 'mt-btn mt-btn-primary',
              disabled: running || groups.length === 0,
              onClick: () => run({}, allKeys),
            }, running ? PENDING_LABEL : '测试全部'),
            React.createElement('button', {
              className: 'mt-btn',
              disabled: running,
              title: '按当前目录里的模型，从 models.dev 拉一份参数预设（写进本地 presets.json）',
              onClick: syncPresets,
            }, '同步参数预设'),
            React.createElement('button', { className: 'mt-btn', disabled: running, onClick: loadCatalog }, '刷新目录'))),
        React.createElement('div', { className: 'mt-actions' },
          optionNode('超时', React.createElement('select', {
            className: 'mt-select',
            value: String(options.timeoutMs),
            disabled: running,
            onChange: (event) => setOption({ timeoutMs: Number(event.target.value) }),
          }, [15000, 30000, 60000, 120000, 180000].map((value) => React.createElement('option', { key: value, value: String(value) }, value / 1000 + ' 秒')))),
          optionNode('输出上限', React.createElement('select', {
            className: 'mt-select',
            value: String(options.maxTokens),
            disabled: running,
            onChange: (event) => setOption({ maxTokens: Number(event.target.value) }),
          }, [16, 64, 256, 512].map((value) => React.createElement('option', { key: value, value: String(value) }, value + ' tokens')))),
          optionNode('并发', React.createElement('select', {
            className: 'mt-select',
            value: String(options.concurrency),
            disabled: running,
            onChange: (event) => setOption({ concurrency: Number(event.target.value) }),
          }, [1, 2, 3, 5, 8].map((value) => React.createElement('option', { key: value, value: String(value) }, String(value))))),
          optionNode('默认 temperature', React.createElement('input', {
            className: 'mt-input',
            value: defaults.temperature,
            placeholder: '自动',
            disabled: running,
            title: '全局默认：只对既没手工配置、也没命中预设 temperature 的模型生效',
            onChange: (event) => setDefaults({ ...defaults, temperature: event.target.value }),
          })),
          optionNode('默认档位', React.createElement('select', {
            className: 'mt-select',
            value: defaults.reasoningEffort,
            disabled: running,
            title: '全局默认：只对既没手工配置、也没命中预设的模型生效',
            onChange: (event) => setDefaults({ ...defaults, reasoningEffort: event.target.value }),
          }, [React.createElement('option', { key: '', value: '' }, '自动')].concat(THINKING_LEVELS.map((level) =>
            React.createElement('option', { key: level, value: level }, LEVEL_LABEL[level] || level))))),
          optionNode('提示词', React.createElement('input', {
            className: 'mt-select',
            style: { width: '280px' },
            value: prompt,
            disabled: running,
            onChange: (event) => setPrompt(event.target.value),
          }))),
        catalog.loading ? React.createElement('div', { className: 'mt-card mt-empty' }, '正在读取模型目录…') : null,
        catalog.error !== null ? React.createElement('div', { className: 'mt-card mt-msg mt-msg-err' }, '目录读取失败：' + catalog.error) : null,
        failures.length > 0 ? React.createElement('div', { className: 'mt-card' },
          failures.map((item) => React.createElement('div', { className: 'mt-msg mt-msg-err', key: (item.id || '') + item.message }, (item.name || item.id) + '：' + item.message))) : null,
        resultList.length > 0 ? React.createElement('div', { className: 'mt-stats' },
          statNode('成功', summary.ok + ' / ' + summary.total),
          statNode('平均首字', fmtMs(summary.averageTtftMs)),
          statNode('平均输出', fmtSpeed(summary.averageTokensPerSecond)),
          statNode('最快 / 最慢', (summary.fastest === null ? '-' : fmtSpeed(summary.fastest)) + ' / ' + (summary.slowest === null ? '-' : fmtSpeed(summary.slowest)))) : null,
        React.createElement('div', { className: 'mt-scroll' },
          groups.length === 0 && catalog.loading === false && catalog.error === null
            ? React.createElement('div', { className: 'mt-card mt-empty' }, '当前没有可路由的模型组：DSH 里还没有激活的模型配置，或适配器未注册任何 route。')
            : groups.map((group) => groupNode(group)),
          notice !== null ? React.createElement('div', { className: 'mt-msg ' + (notice.kind === 'ok' ? 'mt-msg-ok' : 'mt-msg-err') }, notice.text) : null),
        React.createElement('div', { className: 'mt-path' }, '调用链：ctx.llm.stream() → 该组配置的 baseURL。参数覆盖存在 $DSH_HOME/dsh-toolkit/model-test/params.json，预设同步结果存在同目录的 presets.json。「生成 YAML 片段」会读取适配器真实能力，可直接粘进 cordis.patch.yml 的 llm-pi-ai providers.models 条目。'))
    }

    if (slots === undefined) return
    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, Panel))
    // 侧边栏入口：和 dsh-toolkit 其它组件一起加载时统一交给 toolkit 组件管理
    // （在共享注册表里登记一份）；单独加载本文件时注册表不存在，退回自己注册。
    const registry = typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null
    if (registry !== null) {
      registry.register({ id: PANEL_KEY, Panel, label: '模型测试', order: 51, glyphText: 'M' })
    } else {
      slots.inject('sidebar.panellist', () => slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, label: '模型测试', order: 51 }, (props) => panelGlyph(props !== null && typeof props === 'object' ? props.size : 16)))
    }
  },
}
}

// ─── 组件：notifications ───
function notificationsClientFactory(require) {
    const React = require("react")
// 本组件不做任何站内提醒：没有浮层 toast，也不注册 shell.overlay。
// 提醒一律交给操作系统通知中心（渲染进程的 Notification，Electron 会把它
// 交给系统，署名是 DSH 应用本体）。原因是站内 toast 有三个绕不过去的毛病：
//   1. 它只在 DSH 窗口看得见时存在，切到别的 app 就等于没提醒；
//   2. `shell.overlay` 的容器是 `position:absolute; inset:0; z-index:20;
//      overflow:hidden`，聊天区内部用到 z-index:1100，很容易被盖住；
//   3. 用户明确要求「应用内部不要提醒，只要系统通知」。
// 面板（sidebar 里的「通知」）仍然保留：它是历史记录，不主动弹任何东西。
//
// 信息排版（用户指定）：标题是「谁」——工作区 / 会话名；正文第一段是「为什么」
// ——哪个场景触发的（会话完成、需要权限…），后面才是细节。所以 item.title 是
// 标题、item.status 是场景 label、item.body 是明细，这里组装给系统通知。
//
// 点击通知会跳回对应会话（`uiWorkspace.openSession`），并关闭这条通知。
// 找不到会话（会话已删、Host 没给 id）时退化成「只关闭」。
const CSS = '.nf-root{position:relative;display:flex;flex-direction:column;gap:14px;padding:18px 20px 12px;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;min-height:0;background:var(--dsw-alias-bg-layer-0)}.nf-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;flex:none}.nf-title{margin:0;font-size:18px;font-weight:650;color:var(--dsw-alias-label-primary)}.nf-sub{margin-top:6px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);max-width:640px}.nf-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.nf-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;font-size:12px;line-height:1.6;border-radius:6px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.nf-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.nf-btn:disabled{opacity:.5;cursor:default}.nf-btn-on{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.nf-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600}.nf-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;flex:none}.nf-stat{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:10px 12px}.nf-stat-label{font-size:11px;color:var(--dsw-alias-label-secondary)}.nf-stat-value{font-size:19px;font-weight:650;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;margin-top:3px}.nf-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;overflow:hidden;flex:none}.nf-card-head{display:flex;align-items:center;gap:10px;padding:10px 12px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}.nf-list{display:flex;flex-direction:column}.nf-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;cursor:pointer;min-width:0}.nf-item+.nf-item{border-top:1px solid var(--dsw-alias-border-l2)}.nf-item:hover{background:var(--dsw-alias-interactive-bg-hover)}.nf-item-read{opacity:.62}.nf-dot{flex:none;width:7px;height:7px;margin-top:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}.nf-lv-info{background:var(--dsw-alias-state-success-primary)}.nf-lv-warning{background:var(--dsw-alias-state-warn-primary)}.nf-lv-error{background:var(--dsw-alias-state-error-primary)}.nf-lv-action{background:var(--dsw-alias-brand-primary)}.nf-item-main{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1 1 auto}.nf-item-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);min-width:0}.nf-item-body{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}.nf-item-detail{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}.nf-item-meta{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--dsw-alias-label-tertiary);flex-wrap:wrap}.nf-tag{flex:none;display:inline-flex;align-items:center;padding:0 6px;font-size:10px;line-height:1.7;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-weight:600}.nf-warn{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:9px;border:1px solid var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-bg-layer-1);font-size:12px;line-height:1.6;color:var(--dsw-alias-label-primary);flex:none}.nf-jump{flex:none;padding:0 6px;font-size:10px;line-height:1.7;border-radius:6px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}.nf-jump:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.nf-count{flex:none;display:inline-flex;align-items:center;padding:0 5px;font-size:10px;line-height:1.7;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}.nf-kind-row{display:flex;align-items:center;gap:10px;padding:7px 12px;font-size:12px}.nf-kind-row+.nf-kind-row{border-top:1px solid var(--dsw-alias-border-l2)}.nf-kind-label{color:var(--dsw-alias-label-primary);flex:none;min-width:96px}.nf-kind-hint{color:var(--dsw-alias-label-tertiary);flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nf-empty{padding:14px;font-size:12px;color:var(--dsw-alias-label-secondary)}.nf-msg{margin-top:2px;font-size:12px;line-height:1.5;word-break:break-all}.nf-msg-ok{color:var(--dsw-alias-state-success-primary)}.nf-msg-err{color:var(--dsw-alias-state-error-primary)}.nf-path{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;flex:none}.nf-entry-dot{display:inline-flex;align-items:center;justify-content:center;border-radius:5px;font-size:10px;font-weight:700;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}.nf-switch{flex:none;display:inline-flex;align-items:center;justify-content:center;width:34px;height:19px;padding:0;border-radius:999px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);position:relative}.nf-switch::after{content:"";width:13px;height:13px;border-radius:50%;background:var(--dsw-alias-label-tertiary);transition:transform .16s ease}.nf-switch-on{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary)}.nf-switch-on::after{transform:translateX(7px);background:var(--dsw-alias-bg-base)}'
const PANEL_KEY = 'notifications'
/** 面板轮询间隔，同时也是「拉取新通知去弹系统通知」的心跳。8 秒足够稀疏。 */
const POLL_MS = 8000
const LEVEL_LABEL = { info: '信息', warning: '警告', error: '错误', action: '待处理' }
const LEVEL_CLASS = { info: 'nf-lv-info', warning: 'nf-lv-warning', error: 'nf-lv-error', action: 'nf-lv-action' }
const EMPTY_PAGE = { loading: true, data: null, error: null }
const PERM_LABEL = { granted: '系统通知已开', denied: '系统通知被拒绝', default: '开启系统通知', unsupported: '此环境不支持系统通知' }
/** Host 侧探测到的系统通知通道名。 */
const NATIVE_LABEL = { osascript: 'macOS 通知中心', 'notify-send': 'Linux 通知中心', none: '不可用' }
return {
  inject: ['slots', 'timer'],
  apply(ctx) {
    ctx.effect(() => {
      const el = document.createElement("style")
      el.textContent = CSS
      document.head.appendChild(el)
      return () => el.remove()
    }, "notifications: styles")

    const slots = ctx.slots

    const fetchJson = (url, init) => fetch(url, {
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      cache: 'no-store',
      ...init,
    }).then((response) => response.json().catch(() => null).then((body) => {
      const failure = body !== null && typeof body === 'object' && typeof body.message === 'string' && body.message !== ''
        ? body.message
        : 'HTTP ' + response.status
      if (!response.ok || body === null || typeof body !== 'object' || body.ok !== true) throw new Error(failure)
      return body
    }))
    const load = () => fetchJson('/api/notifications')
    const act = (action, extra) => fetchJson('/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ action, ...(extra === undefined ? {} : extra) }),
    })

    // ── 共享数据源 ──────────────────────────────────────────────
    // 面板和 toast 都要同一份通知列表，但只能有一个轮询器，否则同一条通知
    // 会被拉两次、系统通知也会弹两次。所以这里做一个极小的 store：
    // apply 里起唯一的定时器，两个 React 组件订阅它。
    const store = { page: null, listeners: new Set() }
    function publish(page) {
      store.page = page
      for (const listener of Array.from(store.listeners)) {
        try { listener(page) } catch { /* 单个组件渲染异常不能拖垮轮询 */ }
      }
    }
    function subscribe(listener) {
      store.listeners.add(listener)
      return () => { store.listeners.delete(listener) }
    }
    let requestSeq = 0
    function refresh() {
      const seq = ++requestSeq
      load().then((data) => {
        // 迟到的响应不能覆盖新数据，否则「刚标记已读」会被旧快照打回去。
        if (seq !== requestSeq) return
        publish({ loading: false, data, error: null })
      }, (cause) => {
        if (seq !== requestSeq) return
        const message = cause !== null && typeof cause === 'object' && typeof cause.message === 'string' ? cause.message : String(cause)
        publish({ loading: false, data: store.page !== null ? store.page.data : null, error: message })
      })
    }
    refresh()
    // `timer` 是硬依赖（在 inject 里声明），但应用加载早期它可能还没就位；
    // 没有定时器就退化成「只在面板打开时拉一次」，不能让整个插件起不来。
    if (typeof ctx.interval === 'function') ctx.interval(refresh, POLL_MS)

    // ── 系统通知 ────────────────────────────────────────────────
    const supported = () => typeof Notification !== 'undefined'
    const permission = () => (supported() ? Notification.permission : 'unsupported')
    /**
     * 系统通知：本插件唯一的提醒通道。
     * 在 DSH desktop（Electron）里，渲染进程的 Notification 由主进程转交给操作
     * 系统，署名是 DSH 应用本体；在普通浏览器里就是标准的 Web Notification。
     *
     * 三个选项合起来才是用户要的「停留，等我自己关掉」：
     *   requireInteraction: true —— Web 标准，保持可见直到用户交互；
     *   timeoutType: 'never'    —— Electron 专有（macOS / Windows 生效），不自动消失；
     *   silent                  —— 由面板上的「提示音」开关控制。
     * 只设 requireInteraction 在某些 Chromium 版本上仍会被系统样式降级成横幅，
     * 两个都写才是稳的。
     */
    function notify(item, sound) {
      if (!supported()) return false
      // 只有「明确被拒绝」才放弃。'default' 还要试：Electron 主进程对非 media
      // 权限一律放行，requestPermission() 是异步的，等它 resolve 再弹会把启动
      // 头几秒的通知全丢掉。
      if (Notification.permission === 'denied') return false
      // 标题 = 谁（工作区 / 会话），正文第一行 = 为什么（场景），第二行才是明细。
      // 通知中心里能一眼看到的只有标题和一两行正文，顺序反了就没用了。
      const title = typeof item.title === 'string' && item.title !== '' ? item.title : 'DSH'
      const status = typeof item.status === 'string' && item.status !== '' ? item.status : ''
      const detail = typeof item.body === 'string' && item.body !== '' ? item.body : ''
      const body = status === '' ? detail : detail === '' ? status : status + ' · ' + detail
      try {
        const note = new Notification(title, {
          body,
          tag: item.id,
          requireInteraction: true,
          timeoutType: 'never',
          silent: sound !== true,
        })
        // 标已读只发一次：onclick 里 note.close() 会再触发 onclose，
        // 幂等但白白多发一个请求，用 flagged 挡掉。
        let readSent = false
        const markItemRead = () => {
          if (readSent) return
          readSent = true
          act('read', { ids: [item.id] }).catch(() => {})
        }
        // 点击 → 标已读 → 跳到那条通知对应的会话，然后关掉通知本身。
        // openSession 找不到会话时会自己报错，这里吞掉：最差退化成「只关闭」。
        note.onclick = () => {
          markItemRead()
          openSession(item.sessionId)
          try { note.close() } catch { /* 系统已经关掉了 */ }
        }
        // 用户手动关掉通知（点 ×、从通知中心清除）也算已读——
        // 他已经看到了，面板里不该再亮着未读。
        note.onclose = () => {
          markItemRead()
        }
        return true
      } catch {
        return false
      }
    }

    // 「点击通知」的落点。uiWorkspace.openSession(target) 接受 SessionId（或
    // SubagentAddress），正好是通知条目里的 sessionId。服务没装/会话不存在时
    // 静默失败——通知该关还是要关。
    function openSession(sessionId) {
      const id = typeof sessionId === 'string' ? sessionId.trim() : ''
      if (id === '') return false
      let workspace = null
      try {
        workspace = typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : ctx.uiWorkspace
      } catch { workspace = null }
      if (workspace === null || workspace === undefined || typeof workspace.openSession !== 'function') return false
      try {
        workspace.openSession(id)
        return true
      } catch {
        return false
      }
    }

    // 新通知 → 弹系统通知。放在 apply 里而不是某个 React 组件里：面板没被打开
    // 时也必须能提醒（React 组件只有被渲染时才存在）。
    const notified = { ids: [] }
    let notifyReady = false
    const watch = (page) => {
      const data = page !== null && page.data !== null && typeof page.data === 'object' ? page.data : null
      if (data === null || !Array.isArray(data.items)) return
      const sound = !(data.config !== null && typeof data.config === 'object' &&
        data.config.native !== null && typeof data.config.native === 'object' &&
        data.config.native.sound === false)
      if (notifyReady === false) {
        // 首帧拿到的是历史记录（可能几百条），全部记成「已提醒」，绝不补弹。
        notifyReady = true
        for (const item of data.items) notified.ids.push(item.id)
        return
      }
      // items 是倒序（最新在前），反过来按时间顺序弹，否则多条同时到达时会乱序。
      for (let index = data.items.length - 1; index >= 0; index -= 1) {
        const item = data.items[index]
        if (item.read === true) continue
        if (notified.ids.indexOf(item.id) !== -1) continue
        notified.ids.push(item.id)
        notify(item, sound)
      }
      if (notified.ids.length > 300) notified.ids.splice(0, notified.ids.length - 300)
    }
    subscribe(watch)
    // 权限：Electron 主进程对非 media 权限一律放行，浏览器里会弹一次系统询问。
    // 失败无所谓——面板上有「开启系统通知」按钮可以手动再要一次。
    if (supported() && Notification.permission === 'default') {
      try { Notification.requestPermission().catch(() => {}) } catch { /* 老浏览器没有 Promise 版 */ }
    }

    const fmtAgo = (at) => {
      const diff = Date.now() - Number(at)
      if (!Number.isFinite(diff) || diff < 60000) return '刚刚'
      if (diff < 3600000) return Math.round(diff / 60000) + ' 分钟前'
      if (diff < 86400000) return Math.round(diff / 3600000) + ' 小时前'
      return Math.round(diff / 86400000) + ' 天前'
    }
    const levelLabel = (level) => (LEVEL_LABEL[level] !== undefined ? LEVEL_LABEL[level] : String(level))
    const nativeLabel = (native) => {
      const channel = typeof native.channel === 'string' ? native.channel : 'none'
      const text = NATIVE_LABEL[channel] !== undefined ? NATIVE_LABEL[channel] : channel
      if (native.supported !== true) {
        return text + (typeof native.reason === 'string' && native.reason !== '' ? '（' + native.reason + '）' : '')
      }
      return text + (typeof native.sent === 'number' && native.sent > 0 ? '，已投递 ' + native.sent + ' 条' : '')
    }
    const levelClass = (level) => 'nf-dot ' + (LEVEL_CLASS[level] !== undefined ? LEVEL_CLASS[level] : 'nf-lv-info')
    function panelGlyph(size) {
      const edge = typeof size === 'number' && size > 0 ? size : 16
      return React.createElement('span', { className: 'nf-entry-dot', style: { width: edge + 'px', height: edge + 'px' } }, 'N')
    }

    // ── 面板 ────────────────────────────────────────────────────
    // hook 槽位顺序（自检按顺序注入，改动必须同步 tools/check-client.mjs）：
    //   0 page / 1 filter / 2 notice / 3 sysPerm / 4 showKinds
    function NotificationsPanel() {
      const [page, setPage] = React.useState(store.page !== null ? store.page : EMPTY_PAGE)
      const [filter, setFilter] = React.useState('all')
      const [notice, setNotice] = React.useState(null)
      const [sysPerm, setSysPerm] = React.useState(permission())
      const [showKinds, setShowKinds] = React.useState(false)

      React.useEffect(() => {
        const stop = subscribe(setPage)
        return stop
      }, [])

      const data = page.data
      const items = data !== null && Array.isArray(data.items) ? data.items : []
      const kinds = data !== null && Array.isArray(data.kinds) ? data.kinds : []
      const config = data !== null && data.config !== null && typeof data.config === 'object' ? data.config : {}
      const files = data !== null && data.files !== null && typeof data.files === 'object' ? data.files : {}
      const unread = data !== null && typeof data.unread === 'number' ? data.unread : 0
      const total = data !== null && typeof data.total === 'number' ? data.total : items.length
      const enabledKinds = kinds.filter((kind) => kind.enabled === true).length
      const native = data !== null && data.native !== null && typeof data.native === 'object' ? data.native : {}
      const shown = filter === 'unread' ? items.filter((item) => item.read !== true) : items

      const say = (kind, text) => setNotice({ kind, text })
      const run = (promise, okText) => promise.then(() => {
        if (okText !== undefined) say('ok', okText)
        refresh()
      }, (cause) => {
        const message = cause !== null && typeof cause === 'object' && typeof cause.message === 'string' ? cause.message : String(cause)
        say('err', '操作失败：' + message)
      })

      const markRead = (item) => {
        if (item.read === true) return
        // 乐观更新：先本地置读，请求失败后由下一次 refresh 纠正。
        if (data !== null && Array.isArray(data.items)) {
          const next = data.items.map((one) => (one.id === item.id ? { ...one, read: true } : one))
          setPage({ ...page, data: { ...data, items: next, unread: Math.max(0, unread - 1) } })
        }
        act('read', { ids: [item.id] }).then(refresh, () => refresh())
      }
      const markAll = () => run(act('readAll'), '已把 ' + unread + ' 条标记为已读')
      const clearRead = () => run(act('clear'), '已清空已读通知')
      const clearAll = () => run(act('clearAll'), '已清空全部通知')
      // 主通道自测：不经过 Host、不写队列，直接弹一条本地系统通知，用来确认
      // 「停留 + 点击只关闭」在当前环境里成立。
      const testLocal = () => {
        const nativeCfg = config.native !== null && typeof config.native === 'object' ? config.native : {}
        const ok = notify({ id: 'local-test', title: 'DSH 通知测试', status: '测试通知', body: '这条会一直停在屏幕上，等你自己点掉；点它会关掉（这条没有对应会话，所以不跳转）。' }, nativeCfg.sound !== false)
        say(ok ? 'ok' : 'err', ok ? '已弹出一条系统通知，看看屏幕右上角' : '这个环境弹不出系统通知（权限被拒或不支持）')
      }
      const toggleKind = (kind) => {
        const next = {}
        for (const one of kinds) next[one.id] = one.id === kind.id ? kind.enabled !== true : one.enabled === true
        run(act('config', { config: { kinds: next } }))
      }
      const toggleEnabled = () => run(act('config', { config: { enabled: config.enabled !== true } }))
      const nativeConfig = config.native !== null && typeof config.native === 'object' ? config.native : {}
      const toggleNative = () => run(act('config', { config: { native: { enabled: nativeConfig.enabled === false } } }))
      const toggleSound = () => run(act('config', { config: { native: { sound: nativeConfig.sound === false } } }))
      // 系统设置：用户「没看到通知」时，除了权限还有一件事只能他自己改——
      // 提醒样式。macOS 上如果是「横幅」，通知会几秒后自己滑走；改成「提醒」
      // 才会像用户要求的那样停在屏幕上等人处理。
      const openSettingsPage = () => run(act('open-settings'), '已打开系统通知设置：把「提醒样式」改成「提醒」，通知就会一直停着等你点掉')
      const askPermission = () => {
        if (!supported()) { setSysPerm('unsupported'); return }
        try {
          Notification.requestPermission().then((result) => {
            setSysPerm(result)
            say(result === 'granted' ? 'ok' : 'err', result === 'granted' ? '系统通知已开启' : '系统通知未开启（' + result + '）')
          }, () => setSysPerm(permission()))
        } catch {
          setSysPerm(permission())
        }
      }

      // 一行里排的是「谁 → 为什么 → 多少次」：标题（工作区 / 会话）→ 场景徽章 → 去重计数。
      // 顺序是用户指定的：先看清是哪个会话，再看它因为什么冒出来。
      const itemNode = (item) => React.createElement('div', {
        key: item.id,
        className: 'nf-item' + (item.read === true ? ' nf-item-read' : ''),
        onClick: () => markRead(item),
        title: item.read === true ? '已读' : '点击标记为已读',
      },
        React.createElement('span', { className: levelClass(item.level) }),
        React.createElement('div', { className: 'nf-item-main' },
          React.createElement('div', { className: 'nf-item-title' },
            item.title,
            typeof item.status === 'string' && item.status !== ''
              ? React.createElement('span', { className: 'nf-tag' }, item.status)
              : null,
            typeof item.count === 'number' && item.count > 1 ? React.createElement('span', { className: 'nf-count' }, '×' + item.count) : null),
          React.createElement('div', { className: 'nf-item-body' }, item.body),
          item.detail !== undefined && item.detail !== '' ? React.createElement('div', { className: 'nf-item-detail' }, item.detail) : null,
          React.createElement('div', { className: 'nf-item-meta' },
            React.createElement('span', null, levelLabel(item.level)),
            // 整条的点击是「标记已读」，所以跳会话必须另给一个按钮——不然 meta 上写
            // 「点击可跳到该会话」就是空头支票（自检里也有用例盯着这个按钮）。
            item.sessionId !== undefined && item.sessionId !== ''
              ? React.createElement('button', {
                type: 'button',
                className: 'nf-jump',
                onClick: (event) => {
                  if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                  markRead(item)
                  openSession(item.sessionId)
                },
                title: '打开这条通知对应的会话',
              }, '跳到会话')
              : null,
            React.createElement('span', null, fmtAgo(item.createdAt)))))
      const kindNode = (kind) => React.createElement('div', { key: kind.id, className: 'nf-kind-row' },
        React.createElement('span', { className: 'nf-kind-label' }, kind.label),
        React.createElement('span', { className: 'nf-kind-hint', title: kind.hint }, kind.hint),
        React.createElement('button', {
          type: 'button',
          className: 'nf-switch' + (kind.enabled === true ? ' nf-switch-on' : ''),
          onClick: () => toggleKind(kind),
          title: kind.enabled === true ? '已启用，点击关闭' : '已关闭，点击启用',
        }))

      return React.createElement('div', { className: 'nf-root' },
        React.createElement('div', { className: 'nf-head' },
          React.createElement('div', null,
            React.createElement('h2', { className: 'nf-title' }, '通知'),
            React.createElement('div', { className: 'nf-sub' },
              '会话完成、需要你批准、模型失败、子智能体结束时都会在这里留一条记录。Host 侧负责收集，浏览器只负责显示——所以页面刷不刷、开不开，记录都不会丢。')),
          React.createElement('div', { className: 'nf-actions' },
            React.createElement('button', { type: 'button', className: 'nf-btn', onClick: markAll, disabled: unread === 0 }, '全部已读'),
            React.createElement('button', { type: 'button', className: 'nf-btn', onClick: clearRead }, '清空已读'),
            React.createElement('button', { type: 'button', className: 'nf-btn', onClick: clearAll }, '清空全部'),
            React.createElement('button', { type: 'button', className: 'nf-btn nf-btn-primary', onClick: testLocal }, '测试系统通知'),
            React.createElement('button', { type: 'button', className: 'nf-btn', onClick: openSettingsPage, title: '打开系统通知设置：把提醒样式改成「提醒」，通知才会停在屏幕上等你了' }, '系统通知设置'),
            React.createElement('button', {
              type: 'button',
              className: 'nf-btn' + (sysPerm === 'granted' ? ' nf-btn-on' : ''),
              onClick: askPermission,
              disabled: sysPerm === 'granted' || sysPerm === 'unsupported',
            }, PERM_LABEL[sysPerm] !== undefined ? PERM_LABEL[sysPerm] : '开启系统通知'))),

        // 用户没开通知时的兜底引导：不弹系统通知是「静默失败」最典型的形态，
        // 所以这里必须有一块显眼的东西告诉他去开哪两个开关（权限 + 提醒样式）。
        sysPerm === 'denied' || sysPerm === 'default'
          ? React.createElement('div', { className: 'nf-warn' },
            React.createElement('div', { style: { flex: '1 1 auto', minWidth: '0' } },
              sysPerm === 'denied'
                ? '系统通知被拒绝了，所以现在一条都不会弹——只有这个面板里还在记流水账。去「系统设置 → 通知」里把 DSH 的通知打开，或者点右边的按钮重新申请一次。'
                : '系统通知还没被允许，现在只有这个面板在记录。点右边的按钮申请一次（桌面版 DSH 里一般会直接通过）。'),
            React.createElement('button', {
              type: 'button',
              className: 'nf-btn nf-btn-primary',
              onClick: askPermission,
              disabled: sysPerm === 'unsupported',
            }, sysPerm === 'denied' ? '重新申请通知权限' : '开启通知权限'),
            React.createElement('button', { type: 'button', className: 'nf-btn', onClick: openSettingsPage }, '打开系统设置'))
          : null,

        React.createElement('div', { className: 'nf-stats' },
          React.createElement('div', { className: 'nf-stat' },
            React.createElement('div', { className: 'nf-stat-label' }, '未读'),
            React.createElement('div', { className: 'nf-stat-value' }, String(unread))),
          React.createElement('div', { className: 'nf-stat' },
            React.createElement('div', { className: 'nf-stat-label' }, '记录总数'),
            React.createElement('div', { className: 'nf-stat-value' }, String(total))),
          React.createElement('div', { className: 'nf-stat' },
            React.createElement('div', { className: 'nf-stat-label' }, '已启用场景'),
            React.createElement('div', { className: 'nf-stat-value' }, enabledKinds + ' / ' + kinds.length))),

        React.createElement('div', { className: 'nf-actions' },
          React.createElement('button', {
            type: 'button',
            className: 'nf-btn' + (config.enabled !== false ? ' nf-btn-on' : ''),
            onClick: toggleEnabled,
          }, config.enabled !== false ? '通知总开关：开' : '通知总开关：关'),
          React.createElement('button', { type: 'button', className: 'nf-btn', onClick: () => setFilter('all') }, filter === 'all' ? '· 全部' : '全部'),
          React.createElement('button', { type: 'button', className: 'nf-btn', onClick: () => setFilter('unread') }, filter === 'unread' ? '· 仅未读' : '仅未读'),
          React.createElement('button', { type: 'button', className: 'nf-btn', onClick: () => setShowKinds(!showKinds) }, showKinds ? '收起场景设置' : '场景设置（' + kinds.length + '）'),
          React.createElement('button', { type: 'button', className: 'nf-btn', onClick: refresh }, '刷新')),

        // 兜底通道（Host 起子进程直接调操作系统通知中心）。默认关闭：
        // 主通道是渲染进程的 Notification，那条署名是 DSH 本体、还能停在屏幕上。
        // 这条只有在页面根本加载不起来时才有意义，打开后每条通知会多弹一条。
        React.createElement('div', { className: 'nf-actions' },
          React.createElement('button', {
            type: 'button',
            className: 'nf-btn' + (native.enabled === true ? ' nf-btn-on' : ''),
            onClick: toggleNative,
            title: '兜底通道：由 Host 直接调操作系统通知中心。打开后每条通知会多弹一条（署名不是 DSH）',
          }, native.enabled === true ? '兜底通道：开' : '兜底通道：关'),
          React.createElement('button', {
            type: 'button',
            className: 'nf-btn' + (native.sound !== false ? ' nf-btn-on' : ''),
            onClick: toggleSound,
            title: '系统通知是否带提示音',
          }, native.sound !== false ? '提示音：开' : '提示音：关'),
          React.createElement('span', { className: 'nf-path' }, '兜底状态：' + nativeLabel(native))),

        notice !== null ? React.createElement('div', { className: 'nf-msg ' + (notice.kind === 'ok' ? 'nf-msg-ok' : 'nf-msg-err') }, notice.text) : null,
        page.error !== null && page.error !== undefined ? React.createElement('div', { className: 'nf-msg nf-msg-err' }, '读取失败：' + page.error) : null,

        showKinds === true ? React.createElement('div', { className: 'nf-card' },
          React.createElement('div', { className: 'nf-card-head' }, '场景设置'),
          kinds.map((kind) => kindNode(kind))) : null,

        React.createElement('div', { className: 'nf-card' },
          React.createElement('div', { className: 'nf-card-head' }, filter === 'unread' ? '未读通知' : '全部通知'),
          page.loading === true && data === null
            ? React.createElement('div', { className: 'nf-empty' }, '正在读取通知…')
            : shown.length === 0
              ? React.createElement('div', { className: 'nf-empty' }, filter === 'unread' ? '没有未读通知。' : '还没有通知。会话跑完一轮、需要你批准、或者模型报错时，这里会出现一条记录。')
              : React.createElement('div', { className: 'nf-list' }, shown.map((item) => itemNode(item)))),

        React.createElement('div', { className: 'nf-path' },
          '记录与配置落在 ' + (typeof files.config === 'string' && files.config !== '' ? files.config : '$DSH_HOME/dsh-toolkit/notifications/config.json') +
          '。可用 NOTIFICATIONS_CONFIG / NOTIFICATIONS_QUEUE 覆盖。'),
        React.createElement('div', { className: 'nf-path' },
          '提醒只走系统通知中心：通知的标题是「工作区 / 会话」，正文第一段是原因（会话完成、需要权限、模型失败…）。点通知会跳回那条会话并关掉通知；找不到会话时只关闭。'),
        React.createElement('div', { className: 'nf-path' },
          '没收到通知？按这个顺序查：① 顶部有没有提示权限被拒——有就点「开启通知权限」；② 「系统通知设置」里把 DSH 的提醒样式改成「提醒」而不是「横幅」，否则通知会几秒后自己滑走；③ 确认下面的「通知总开关」和对应的场景开关都是开的。'),
        React.createElement('div', { className: 'nf-path' },
          '这个面板是历史记录，自己不会弹任何东西。上面那排是渲染进程系统通知（DSH desktop 里署名就是 DSH 本体）；下面那排是 Host 兜底通道（直接调 macOS / Linux 的通知中心），默认关闭，只有你想在页面加载不到时也留一条时才需要打开。'))
    }

    if (slots === undefined) return
    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, NotificationsPanel))
    // 侧边栏入口：和 dsh-toolkit 其它组件一起加载时统一交给 toolkit 组件管理
    // （在共享注册表里登记一份）；单独加载本文件时注册表不存在，退回自己注册。
    const registry = typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null
    if (registry !== null) {
      registry.register({ id: PANEL_KEY, Panel: NotificationsPanel, label: '通知', order: 52, glyphText: 'N' })
    } else {
      slots.inject('sidebar.panellist', () => slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, label: '通知', order: 52 }, (props) => panelGlyph(props !== null && typeof props === 'object' ? props.size : 16)))
    }
  },
}
}

// ─── 组件：skill ───
function skillClientFactory(require) {
    const React = require("react")
const CSS = '.sk-root{position:relative;display:flex;flex-direction:column;gap:12px;padding:16px 18px 14px;box-sizing:border-box;min-height:0;height:100%;overflow:hidden;background:var(--dsw-alias-bg-layer-0);color:var(--dsw-alias-label-primary)}.sk-meta{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);font-size:12px}.sk-kv{display:flex;align-items:baseline;gap:6px;min-width:0}.sk-k{color:var(--dsw-alias-label-tertiary);flex:none}.sk-v{color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-family-mono,monospace);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:340px}.sk-meta-spacer{flex:1 1 auto}.sk-body{flex:1 1 auto;display:flex;gap:12px;min-height:0}.sk-col-list{flex:0 0 300px;display:flex;flex-direction:column;gap:8px;min-height:0}.sk-col-detail{flex:1 1 auto;display:flex;flex-direction:column;gap:10px;min-height:0;min-width:0}.sk-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:8px;padding-right:2px}.sk-group{display:flex;flex-direction:column;gap:4px}.sk-group-head{display:flex;align-items:center;gap:6px;padding:4px 2px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-tertiary)}.sk-group-id{font-family:var(--dsw-font-family-mono,monospace);color:var(--dsw-alias-label-secondary)}.sk-group-count{margin-left:auto;font-family:var(--dsw-font-family-mono,monospace)}.sk-item{display:flex;flex-direction:column;gap:3px;padding:7px 9px;border:1px solid transparent;border-radius:8px;cursor:pointer;background:transparent;text-align:left;width:100%;box-sizing:border-box;font:inherit;color:inherit}.sk-item:hover{background:var(--dsw-alias-interactive-bg-hover)}.sk-item-on{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}.sk-item-name{font-size:12.5px;font-weight:600;word-break:break-all}.sk-item-meta{display:flex;flex-wrap:wrap;gap:4px;align-items:center}.sk-badge{display:inline-flex;align-items:center;gap:3px;padding:0 5px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}.sk-badge-ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}.sk-badge-bad{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}.sk-badge-warn{color:var(--dsw-alias-state-warning-primary);border-color:var(--dsw-alias-state-warning-primary)}.sk-detail-head{flex:none;display:flex;flex-direction:column;gap:4px;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}.sk-detail-title{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13.5px;font-weight:600}.sk-path{font-family:var(--dsw-font-family-mono,monospace);font-size:10.5px;color:var(--dsw-alias-label-tertiary);word-break:break-all}.sk-tabs{display:flex;gap:4px;flex:none}.sk-tab{appearance:none;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:7px;padding:4px 11px;font-size:12px;cursor:pointer}.sk-tab-on{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary);font-weight:600}.sk-field{display:flex;flex-direction:column;gap:4px}.sk-label{font-size:11px;color:var(--dsw-alias-label-tertiary)}.sk-input,.sk-textarea{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:6px 8px;font-size:12px;font-family:inherit;outline:none}.sk-input:focus,.sk-textarea:focus{border-color:var(--dsw-alias-brand-primary)}.sk-textarea{resize:vertical;line-height:1.5}.sk-mono{font-family:var(--dsw-font-family-mono,monospace);font-size:11.5px}.sk-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.sk-btn{appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:5px 12px;font-size:12px;cursor:pointer;white-space:nowrap}.sk-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.sk-btn:disabled{opacity:.45;cursor:not-allowed}.sk-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600}.sk-btn-danger{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);background:transparent}.sk-btn-sm{padding:2px 8px;font-size:11px}.sk-switch{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:4px 9px;font-size:11.5px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);cursor:pointer}.sk-switch-on{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}.sk-switch:disabled{opacity:.5;cursor:not-allowed}.sk-notice{flex:none;padding:7px 10px;border-radius:8px;font-size:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}.sk-notice-ok{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}.sk-notice-bad{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}.sk-notice-warn{border-color:var(--dsw-alias-state-warning-primary);color:var(--dsw-alias-state-warning-primary)}.sk-issues{margin:0;padding:0 0 0 16px;font-size:11.5px;color:var(--dsw-alias-state-error-primary)}.sk-issue{margin:1px 0}.sk-empty{padding:18px 12px;font-size:12px;color:var(--dsw-alias-label-tertiary);text-align:center;border:1px dashed var(--dsw-alias-border-l1);border-radius:9px}.sk-create{flex:none;display:flex;flex-direction:column;gap:6px;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}.sk-create-head{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}.sk-dirty{color:var(--dsw-alias-state-warning-primary);font-size:11px}.sk-glyph{display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:13px;font-weight:700;color:inherit}.sk-hint{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.5}'
const PANEL_KEY = 'skill'
const LABEL = 'Skill'
const MODE_RAW = 'raw'
const MODE_FORM = 'structured'
const KIND_DIR = 'directory'
const KIND_FILE = 'file'

/** 面板状态里的空壳：初始渲染必须能画出来（自检的渲染冒烟不会触发网络）。 */
const EMPTY_META = { loading: true, data: null, error: null }
const EMPTY_LIST = { loading: true, data: null, error: null }
const EMPTY_DETAIL = { loading: false, data: null, error: null }
const EMPTY_FIELDS = { name: '', description: '', whenToUse: '', metadataText: '', body: '', modelInvocable: true, userInvocable: true }
const EMPTY_CREATE = { open: false, root: 'user-dsh', name: '', description: '', whenToUse: '', kind: KIND_DIR }

/** 错误信息取人话（host 返回的 message 已经在 Error 里了）。 */
function errText(cause) {
  if (cause === null || cause === undefined) return '未知错误'
  if (typeof cause === 'string') return cause
  if (typeof cause.message === 'string' && cause.message !== '') return cause.message
  return String(cause)
}

/** 切换/关闭前的未保存确认。非浏览器环境没有 confirm 时按「允许」处理，避免卡死。 */
function confirmLose() {
  if (typeof globalThis.confirm !== 'function') return true
  return globalThis.confirm('当前 skill 有未保存的改动，继续操作会丢失，确定吗？')
}

function badgeText(item) {
  if (item.valid === true) return '有效'
  return '未生效'
}

function badgeClass(item) {
  return item.valid === true ? 'sk-badge sk-badge-ok' : 'sk-badge sk-badge-bad'
}

/** 从 host 的 one 响应里取出表单初值；metadata 用 JSON 文本编辑（保存前再解析）。 */
function fieldsFrom(data) {
  if (data === null || data === undefined) return EMPTY_FIELDS
  const parsed = data.parsed !== null && typeof data.parsed === 'object' ? data.parsed : {}
  let metadataText = ''
  if (parsed.metadata !== null && parsed.metadata !== undefined) {
    try {
      metadataText = JSON.stringify(parsed.metadata, null, 2)
    } catch {
      metadataText = ''
    }
  }
  return {
    name: typeof parsed.name === 'string' ? parsed.name : '',
    description: typeof parsed.description === 'string' ? parsed.description : '',
    whenToUse: typeof parsed.whenToUse === 'string' ? parsed.whenToUse : '',
    metadataText,
    body: typeof data.body === 'string' ? data.body.replace(/^\s*\n/, '') : '',
    modelInvocable: parsed.modelInvocable !== false,
    userInvocable: parsed.userInvocable !== false,
  }
}

/** metadata 文本框 → 对象：空文本给 null，非对象/非法 JSON 抛错（保存前拦住，别写坏文件）。 */
function parseMetadata(text) {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (trimmed === '') return null
  let value
  try {
    value = JSON.parse(trimmed)
  } catch (cause) {
    throw new Error('metadata 不是合法 JSON：' + errText(cause))
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('metadata 必须是 JSON 对象')
  return value
}

return {
  inject: ['slots'],
  apply(ctx) {
    ctx.effect(() => {
      const el = document.createElement("style")
      el.textContent = CSS
      document.head.appendChild(el)
      return () => el.remove()
    }, "skill: styles")

    const slots = ctx.slots

    const fetchJson = (url, init) => fetch(url, {
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      ...init,
    }).then((response) => response.json().catch(() => null).then((body) => {
      const failure = body !== null && typeof body === 'object' && typeof body.message === 'string' && body.message !== '' ? body.message : 'HTTP ' + response.status
      if (!response.ok || body === null || typeof body !== 'object' || body.ok !== true) throw new Error(failure)
      return body
    }))
    const postJson = (url, body) => fetchJson(url, { method: 'POST', body: JSON.stringify(body) })

    /** 删除要区分 409（目录里有资源文件），所以单独拿状态码；不动上面的 fetchJson 语义。 */
    const deleteJson = (rootId, name, force) => fetch(
      '/api/skill/one?root=' + encodeURIComponent(rootId) + '&name=' + encodeURIComponent(name) + (force ? '&force=1' : ''),
      { method: 'DELETE', headers: { accept: 'application/json', 'content-type': 'application/json' } },
    ).then((response) => response.json().catch(() => null).then((body) => ({ status: response.status, body })))

    function Panel() {
      const [meta, setMeta] = React.useState(EMPTY_META)
      const [list, setList] = React.useState(EMPTY_LIST)
      const [selected, setSelected] = React.useState(null)
      const [detail, setDetail] = React.useState(EMPTY_DETAIL)
      const [mode, setMode] = React.useState(MODE_RAW)
      const [rawDraft, setRawDraft] = React.useState('')
      const [fields, setFields] = React.useState(EMPTY_FIELDS)
      const [dirty, setDirty] = React.useState(false)
      const [busy, setBusy] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [createDraft, setCreateDraft] = React.useState(EMPTY_CREATE)

      const loadAll = () => {
        setMeta(EMPTY_META)
        setList(EMPTY_LIST)
        return Promise.all([
          fetchJson('/api/skill/meta').catch((cause) => ({ __error: errText(cause) })),
          fetchJson('/api/skill/list').catch((cause) => ({ __error: errText(cause) })),
        ]).then(([metaResult, listResult]) => {
          setMeta(metaResult.__error === undefined ? { loading: false, data: metaResult, error: null } : { loading: false, data: null, error: metaResult.__error })
          setList(listResult.__error === undefined ? { loading: false, data: listResult, error: null } : { loading: false, data: null, error: listResult.__error })
        })
      }

      React.useEffect(() => { loadAll() }, [])

      /**
       * 打开一个 skill：有未保存改动先确认；成功后同时重置两个草稿。
       * 保存/切换开关后自己重读时传 skipConfirm=true——那一帧的 dirty 还是旧值，
       * 不能让它把刚保存完的流程拦在 confirm 上。
       */
      const openSkill = (rootId, name, skipConfirm) => {
        if (skipConfirm !== true && dirty && !confirmLose()) return
        setSelected({ rootId, name })
        setDetail({ loading: true, data: null, error: null })
        setMode(MODE_RAW)
        setBusy('read')
        fetchJson('/api/skill/one?root=' + encodeURIComponent(rootId) + '&name=' + encodeURIComponent(name))
          .then((data) => {
            setDetail({ loading: false, data, error: null })
            setRawDraft(typeof data.raw === 'string' ? data.raw : '')
            setFields(fieldsFrom(data))
            setDirty(false)
          })
          .catch((cause) => setDetail({ loading: false, data: null, error: errText(cause) }))
          .then(() => setBusy(null))
      }

      const reloadList = () => fetchJson('/api/skill/list')
        .then((data) => setList({ loading: false, data, error: null }))
        .catch((cause) => setNotice({ kind: 'bad', text: '刷新列表失败：' + errText(cause) }))

      const save = () => {
        if (selected === null) return
        setBusy('save')
        setNotice(null)
        let payload
        if (mode === MODE_RAW) {
          payload = { root: selected.rootId, name: selected.name, mode: MODE_RAW, raw: rawDraft }
        } else {
          let metadata
          try {
            metadata = parseMetadata(fields.metadataText)
          } catch (cause) {
            setNotice({ kind: 'bad', text: errText(cause) })
            setBusy(null)
            return
          }
          payload = {
            root: selected.rootId,
            name: selected.name,
            mode: MODE_FORM,
            fields: {
              name: fields.name,
              description: fields.description,
              whenToUse: fields.whenToUse,
              metadata,
              modelInvocable: fields.modelInvocable,
              userInvocable: fields.userInvocable,
            },
            body: fields.body,
          }
        }
        postJson('/api/skill/save', payload)
          .then((data) => {
            setNotice({ kind: 'ok', text: '已保存：' + data.path })
            setDirty(false)
            return reloadList().then(() => openSkill(selected.rootId, selected.name, true))
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '保存失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const toggle = (key, next) => {
        if (selected === null || detail.data === null) return
        setBusy('toggle')
        setNotice(null)
        const payload = { root: selected.rootId, name: selected.name }
        if (key === 'modelInvocable') payload.modelInvocable = next
        else payload.userInvocable = next
        postJson('/api/skill/toggle', payload)
          .then(() => reloadList().then(() => openSkill(selected.rootId, selected.name, true)))
          .catch((cause) => setNotice({ kind: 'bad', text: '切换失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      /** 删除：目录里有资源文件时 host 先给 409 + 清单，用户确认后才带 force 重删。 */
      const remove = () => {
        if (selected === null) return
        const accept = typeof globalThis.confirm !== 'function'
          ? true
          : globalThis.confirm('删除 skill「' + selected.name + '」？目录里的资源文件也会一起删除，无法撤销。')
        if (!accept) return
        setBusy('delete')
        setNotice(null)
        deleteJson(selected.rootId, selected.name, false).then(({ status, body }) => {
          if (status === 409) {
            const resources = body !== null && typeof body === 'object' && Array.isArray(body.resources) ? body.resources : []
            const listed = resources.length > 0 ? '\n\n' + resources.slice(0, 20).join('\n') + (resources.length > 20 ? '\n…共 ' + resources.length + ' 个' : '') : ''
            const again = typeof globalThis.confirm !== 'function' ? true : globalThis.confirm('这个目录里还有资源文件' + listed + '\n\n确认一起删除？')
            if (!again) {
              setNotice({ kind: 'warn', text: '已取消删除：目录里还有 ' + resources.length + ' 个资源文件' })
              setBusy(null)
              return
            }
            return deleteJson(selected.rootId, selected.name, true)
          }
          if (status < 200 || status >= 300 || body === null || body.ok !== true) {
            throw new Error(body !== null && typeof body.message === 'string' ? body.message : 'HTTP ' + status)
          }
          return { status, body }
        }).then((result) => {
          if (result === undefined) return
          if (result.status < 200 || result.status >= 300) {
            throw new Error(result.body !== null && typeof result.body.message === 'string' ? result.body.message : 'HTTP ' + result.status)
          }
          setNotice({ kind: 'ok', text: '已删除：' + selected.name })
          setSelected(null)
          setDetail(EMPTY_DETAIL)
          setRawDraft('')
          setFields(EMPTY_FIELDS)
          setDirty(false)
          return reloadList()
        }).catch((cause) => {
          setNotice({ kind: 'bad', text: '删除失败：' + errText(cause) })
          setBusy(null)
        }).then(() => setBusy(null))
      }

      const create = () => {
        setBusy('create')
        setNotice(null)
        postJson('/api/skill/create', {
          root: createDraft.root,
          name: createDraft.name,
          description: createDraft.description,
          whenToUse: createDraft.whenToUse,
          kind: createDraft.kind,
        })
          .then((data) => {
            setNotice({ kind: 'ok', text: '已创建：' + data.path })
            setCreateDraft({ ...EMPTY_CREATE, open: false, root: createDraft.root, kind: createDraft.kind })
            return reloadList().then(() => openSkill(data.rootId, data.name, true))
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '创建失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const syncOfficial = () => {
        setBusy('sync')
        postJson('/api/skill/sync', {})
          .then((data) => {
            const official = data.official !== null && typeof data.official === 'object' ? data.official : { available: false, count: 0, names: [] }
            setNotice({
              kind: official.available ? 'ok' : 'warn',
              text: official.available
                ? '官方服务当前识别到 ' + official.count + ' 个 skill'
                : '官方 skills 服务不可用（未安装或未启用），面板只显示磁盘扫描结果',
            })
            return reloadList()
          })
          .catch((cause) => setNotice({ kind: 'bad', text: '同步失败：' + errText(cause) }))
          .then(() => setBusy(null))
      }

      const metaData = meta.data
      const listData = list.data
      const roots = listData !== null && Array.isArray(listData.roots) ? listData.roots : metaData !== null && Array.isArray(metaData.roots) ? metaData.roots : []
      const skills = listData !== null && Array.isArray(listData.skills) ? listData.skills : []
      const writableRoots = roots.filter((root) => root.writable === true)
      const official = listData !== null && listData.official !== null && typeof listData.official === 'object' ? listData.official : null
      const current = detail.data
      const readonly = current !== null && current.writable !== true
      const working = busy !== null

      const markDirty = () => { if (dirty !== true) setDirty(true) }

      /* ------------------------------------------------------------ 顶部 meta 条 */
      const metaBar = React.createElement('div', { className: 'sk-meta' },
        React.createElement('div', { className: 'sk-kv' },
          React.createElement('span', { className: 'sk-k' }, 'dshHome'),
          React.createElement('span', { className: 'sk-v', title: metaData === null ? '' : metaData.dshHome }, metaData === null ? '—' : metaData.dshHome)),
        React.createElement('div', { className: 'sk-kv' },
          React.createElement('span', { className: 'sk-k' }, 'projectRoot'),
          React.createElement('span', { className: 'sk-v', title: metaData === null ? '' : metaData.projectRoot }, metaData === null ? '—' : metaData.projectRoot)),
        React.createElement('div', { className: 'sk-kv' },
          React.createElement('span', { className: 'sk-k' }, '官方识别'),
          React.createElement('span', { className: 'sk-v' },
            official === null ? '—' : official.available === true ? official.count + ' 个' : '服务不可用')),
        React.createElement('div', { className: 'sk-kv' },
          React.createElement('span', { className: 'sk-k' }, '磁盘扫描'),
          React.createElement('span', { className: 'sk-v' },
            listData === null ? '—' : listData.counts.total + ' 个（有效 ' + listData.counts.valid + ' / 未生效 ' + listData.counts.invalid + '）')),
        React.createElement('div', { className: 'sk-meta-spacer' }),
        React.createElement('button', { className: 'sk-btn sk-btn-sm', disabled: working, onClick: loadAll }, '刷新'),
        React.createElement('button', { className: 'sk-btn sk-btn-sm', disabled: working, onClick: syncOfficial }, '同步官方服务'))

      /* --------------------------------------------------------------- 左列：列表 */
      const listNodes = []
      if (list.loading === true) {
        listNodes.push(React.createElement('div', { className: 'sk-empty' }, '正在扫描 skill 目录…'))
      } else if (list.error !== null) {
        listNodes.push(React.createElement('div', { className: 'sk-notice sk-notice-bad' }, '列表加载失败：' + list.error))
      } else if (skills.length === 0) {
        listNodes.push(React.createElement('div', { className: 'sk-empty' }, '没有找到任何 skill。三个可写根都是空的，可以用下面的「新建」开始。'))
      } else {
        const grouped = new Map()
        for (const root of roots) grouped.set(root.id, [])
        for (const item of skills) {
          if (!grouped.has(item.rootId)) grouped.set(item.rootId, [])
          grouped.get(item.rootId).push(item)
        }
        for (const root of roots) {
          const items = grouped.get(root.id) ?? []
          if (items.length === 0 && root.exists !== true) continue
          const head = React.createElement('div', { className: 'sk-group-head' },
            React.createElement('span', {}, root.label ?? root.source),
            React.createElement('span', { className: 'sk-group-id' }, root.id),
            root.writable === true ? null : React.createElement('span', { className: 'sk-badge' }, '只读'),
            React.createElement('span', { className: 'sk-group-count' }, items.length + ' / ' + (root.exists === true ? '目录存在' : '目录不存在')))
          const rows = items.map((item) => {
            const active = selected !== null && selected.rootId === item.rootId && selected.name === item.name
            const nameBadges = []
            nameBadges.push(React.createElement('span', { key: 'v', className: badgeClass(item) }, badgeText(item)))
            if (item.modelInvocable === false) nameBadges.push(React.createElement('span', { key: 'm', className: 'sk-badge sk-badge-warn' }, '模型不可调用'))
            if (item.userInvocable === false) nameBadges.push(React.createElement('span', { key: 'u', className: 'sk-badge sk-badge-warn' }, '用户不可调用'))
            if (item.kind === 'file') nameBadges.push(React.createElement('span', { key: 'k', className: 'sk-badge' }, '单文件'))
            if (item.shadowedBy !== null && item.shadowedBy !== undefined) nameBadges.push(React.createElement('span', { key: 's', className: 'sk-badge sk-badge-warn' }, '被 ' + item.shadowedBy.rootId + ' 覆盖'))
            return React.createElement('button', {
              key: item.rootId + '/' + item.name,
              type: 'button',
              className: active ? 'sk-item sk-item-on' : 'sk-item',
              onClick: () => openSkill(item.rootId, item.name),
            },
            React.createElement('span', { className: 'sk-item-name' }, item.name),
            React.createElement('span', { className: 'sk-item-meta' }, nameBadges),
            item.valid === true ? null : React.createElement('span', { className: 'sk-hint' }, item.error))
          })
          listNodes.push(React.createElement('div', { key: root.id, className: 'sk-group' }, head, rows))
        }
      }

      /* ------------------------------------------------------ 左下：新建表单 */
      const createSection = createDraft.open === true
        ? React.createElement('div', { className: 'sk-create' },
          React.createElement('div', { className: 'sk-create-head' },
            React.createElement('span', {}, '新建 skill'),
            React.createElement('span', { className: 'sk-meta-spacer' }),
            React.createElement('button', { className: 'sk-btn sk-btn-sm', disabled: working, onClick: () => setCreateDraft({ ...createDraft, open: false }) }, '收起')),
          React.createElement('div', { className: 'sk-field' },
            React.createElement('span', { className: 'sk-label' }, '写入哪个根'),
            React.createElement('select', {
              className: 'sk-input',
              value: createDraft.root,
              onChange: (event) => setCreateDraft({ ...createDraft, root: event.target.value }),
            }, writableRoots.map((root) => React.createElement('option', { key: root.id, value: root.id }, root.id + ' · ' + root.path)))),
          React.createElement('div', { className: 'sk-field' },
            React.createElement('span', { className: 'sk-label' }, 'name（kebab-case）'),
            React.createElement('input', {
              className: 'sk-input sk-mono',
              value: createDraft.name,
              placeholder: 'my-new-skill',
              onChange: (event) => setCreateDraft({ ...createDraft, name: event.target.value }),
            })),
          React.createElement('div', { className: 'sk-field' },
            React.createElement('span', { className: 'sk-label' }, 'description（必填）'),
            React.createElement('textarea', {
              className: 'sk-textarea',
              rows: 2,
              value: createDraft.description,
              onChange: (event) => setCreateDraft({ ...createDraft, description: event.target.value }),
            })),
          React.createElement('div', { className: 'sk-field' },
            React.createElement('span', { className: 'sk-label' }, 'whenToUse（可选）'),
            React.createElement('input', {
              className: 'sk-input',
              value: createDraft.whenToUse,
              onChange: (event) => setCreateDraft({ ...createDraft, whenToUse: event.target.value }),
            })),
          React.createElement('div', { className: 'sk-row' },
            React.createElement('select', {
              className: 'sk-input',
              style: { width: 'auto' },
              value: createDraft.kind,
              onChange: (event) => setCreateDraft({ ...createDraft, kind: event.target.value }),
            },
            React.createElement('option', { value: KIND_DIR }, '目录型 <name>/SKILL.md'),
            React.createElement('option', { value: KIND_FILE }, '单文件 <name>.md')),
            React.createElement('span', { className: 'sk-meta-spacer' }),
            React.createElement('button', {
              className: 'sk-btn sk-btn-primary',
              disabled: working || createDraft.name === '' || createDraft.description === '',
              onClick: create,
            }, busy === 'create' ? '创建中…' : '创建')))
        : React.createElement('button', {
          className: 'sk-btn',
          disabled: working || writableRoots.length === 0,
          onClick: () => setCreateDraft({ ...EMPTY_CREATE, open: true, root: writableRoots.length > 0 ? writableRoots[0].id : 'user-dsh' }),
        }, writableRoots.length === 0 ? '没有可写根，无法新建' : '＋ 新建 skill')

      const leftColumn = React.createElement('div', { className: 'sk-col-list' },
        React.createElement('div', { className: 'sk-scroll' }, listNodes),
        createSection)

      /* ------------------------------------------------------------ 右列：详情 */
      const detailNodes = []
      if (selected === null) {
        detailNodes.push(React.createElement('div', { className: 'sk-empty' }, '从左侧选一个 skill。未生效的文件也会列出来，并给出具体原因。'))
      } else if (detail.loading === true) {
        detailNodes.push(React.createElement('div', { className: 'sk-empty' }, '正在读取 ' + selected.name + ' …'))
      } else if (detail.error !== null) {
        detailNodes.push(React.createElement('div', { className: 'sk-notice sk-notice-bad' }, '读取失败：' + detail.error))
      } else if (current !== null) {
        detailNodes.push(React.createElement('div', { className: 'sk-detail-head' },
          React.createElement('div', { className: 'sk-detail-title' },
            React.createElement('span', {}, current.name),
            React.createElement('span', { className: badgeClass(current) }, badgeText(current)),
            current.writable === true ? null : React.createElement('span', { className: 'sk-badge' }, '只读根 · ' + current.source),
            current.shadowedBy !== null && current.shadowedBy !== undefined
              ? React.createElement('span', { className: 'sk-badge sk-badge-warn' }, '被 ' + current.shadowedBy.rootId + ' 覆盖')
              : null,
            dirty === true ? React.createElement('span', { className: 'sk-dirty' }, '有未保存改动') : null),
          React.createElement('div', { className: 'sk-path' }, current.path),
          readonly === true
            ? React.createElement('div', { className: 'sk-hint' }, '这个根（' + current.source + '）是只读的：只能查看与对照，编辑、删除、开关都已禁用。要改请复制到可写根。')
            : null))

        if (Array.isArray(current.issues) && current.issues.length > 0) {
          detailNodes.push(React.createElement('div', { className: 'sk-notice ' + (current.valid === true ? 'sk-notice-warn' : 'sk-notice-bad') },
            React.createElement('div', {}, current.valid === true ? '这条 skill 有效，但有几处值得注意：' : '这条 skill 现在不会生效（官方扫描器会丢弃它）：'),
            React.createElement('ul', { className: 'sk-issues' }, current.issues.map((issue, index) => React.createElement('li', { key: index, className: 'sk-issue' }, issue)))))
        }

        const switches = React.createElement('div', { className: 'sk-row' },
          React.createElement('button', {
            type: 'button',
            className: current.parsed !== null && current.parsed.modelInvocable !== false ? 'sk-switch sk-switch-on' : 'sk-switch',
            disabled: readonly || working,
            onClick: () => toggle('modelInvocable', !(current.parsed !== null && current.parsed.modelInvocable !== false)),
          }, (current.parsed !== null && current.parsed.modelInvocable !== false ? '✓ ' : '✕ ') + '模型可调用'),
          React.createElement('button', {
            type: 'button',
            className: current.parsed !== null && current.parsed.userInvocable !== false ? 'sk-switch sk-switch-on' : 'sk-switch',
            disabled: readonly || working,
            onClick: () => toggle('userInvocable', !(current.parsed !== null && current.parsed.userInvocable !== false)),
          }, (current.parsed !== null && current.parsed.userInvocable !== false ? '✓ ' : '✕ ') + '用户可调用'),
          React.createElement('span', { className: 'sk-hint' }, '开关立即写回文件，由官方 watcher 热更。'))

        const tabs = React.createElement('div', { className: 'sk-tabs' },
          React.createElement('button', {
            type: 'button',
            className: mode === MODE_RAW ? 'sk-tab sk-tab-on' : 'sk-tab',
            onClick: () => setMode(MODE_RAW),
          }, '原文'),
          React.createElement('button', {
            type: 'button',
            className: mode === MODE_FORM ? 'sk-tab sk-tab-on' : 'sk-tab',
            onClick: () => {
              if (mode !== MODE_FORM && dirty !== true) setFields(fieldsFrom(current))
              setMode(MODE_FORM)
            },
          }, '表单'))

        const editor = mode === MODE_RAW
          ? React.createElement('textarea', {
            className: 'sk-textarea sk-mono',
            rows: 20,
            spellCheck: false,
            readOnly: readonly === true,
            value: rawDraft,
            onChange: (event) => { setRawDraft(event.target.value); markDirty() },
          })
          : React.createElement('div', { className: 'sk-scroll' },
            React.createElement('div', { className: 'sk-field' },
              React.createElement('span', { className: 'sk-label' }, 'name（kebab-case，必须是文件/目录名）'),
              React.createElement('input', {
                className: 'sk-input sk-mono',
                readOnly: readonly === true,
                value: fields.name,
                onChange: (event) => { setFields({ ...fields, name: event.target.value }); markDirty() },
              })),
            React.createElement('div', { className: 'sk-field' },
              React.createElement('span', { className: 'sk-label' }, 'description（必填，写清「做什么」，模型靠它决定要不要加载）'),
              React.createElement('textarea', {
                className: 'sk-textarea',
                rows: 3,
                readOnly: readonly === true,
                value: fields.description,
                onChange: (event) => { setFields({ ...fields, description: event.target.value }); markDirty() },
              })),
            React.createElement('div', { className: 'sk-field' },
              React.createElement('span', { className: 'sk-label' }, 'whenToUse（可选）'),
              React.createElement('textarea', {
                className: 'sk-textarea',
                rows: 2,
                readOnly: readonly === true,
                value: fields.whenToUse,
                onChange: (event) => { setFields({ ...fields, whenToUse: event.target.value }); markDirty() },
              })),
            React.createElement('div', { className: 'sk-field' },
              React.createElement('span', { className: 'sk-label' }, 'metadata（可选，JSON 对象）'),
              React.createElement('textarea', {
                className: 'sk-textarea sk-mono',
                rows: 4,
                spellCheck: false,
                readOnly: readonly === true,
                value: fields.metadataText,
                onChange: (event) => { setFields({ ...fields, metadataText: event.target.value }); markDirty() },
              })),
            React.createElement('div', { className: 'sk-field' },
              React.createElement('span', { className: 'sk-label' }, '正文（frontmatter 之后的 Markdown）'),
              React.createElement('textarea', {
                className: 'sk-textarea sk-mono',
                rows: 14,
                readOnly: readonly === true,
                value: fields.body,
                onChange: (event) => { setFields({ ...fields, body: event.target.value }); markDirty() },
              })))

        const actions = React.createElement('div', { className: 'sk-row' },
          React.createElement('button', {
            className: 'sk-btn sk-btn-primary',
            disabled: readonly || working || dirty !== true,
            onClick: save,
          }, busy === 'save' ? '保存中…' : '保存'),
          React.createElement('button', {
            className: 'sk-btn',
            disabled: readonly || working || dirty !== true,
            onClick: () => {
              if (!confirmLose()) return
              setDirty(false)
              openSkill(selected.rootId, selected.name, true)
            },
          }, '放弃改动'),
          React.createElement('span', { className: 'sk-meta-spacer' }),
          React.createElement('button', {
            className: 'sk-btn sk-btn-danger',
            disabled: readonly || working,
            onClick: remove,
          }, busy === 'delete' ? '删除中…' : '删除'),
          React.createElement('span', { className: 'sk-hint' },
            current.kind === 'file' ? '单文件型 skill' : '目录型 skill' + (Array.isArray(current.resources) && current.resources.length > 0 ? ' · 另有 ' + current.resources.length + ' 个资源文件' : '')))

        const resourceNote = Array.isArray(current.resources) && current.resources.length > 0
          ? React.createElement('div', { className: 'sk-hint' }, '资源文件：' + current.resources.slice(0, 12).join('、') + (current.resources.length > 12 ? ' …共 ' + current.resources.length + ' 个' : ''))
          : null

        detailNodes.push(React.createElement('div', { className: 'sk-tabs-row sk-row' }, tabs,
          React.createElement('span', { className: 'sk-meta-spacer' }),
          React.createElement('span', { className: 'sk-hint' },
            mode === MODE_RAW ? '原文模式：保存前会校验 frontmatter，不合法就不落盘。' : '表单模式：按固定键顺序重写 frontmatter，布尔只写 true/false。')))
        detailNodes.push(editor)
        detailNodes.push(switches)
        resourceNote === null ? null : detailNodes.push(resourceNote)
        detailNodes.push(actions)
      }

      const rightColumn = React.createElement('div', { className: 'sk-col-detail' }, detailNodes)

      return React.createElement('div', { className: 'sk-root' },
        metaBar,
        notice === null ? null : React.createElement('div', { className: 'sk-notice sk-notice-' + notice.kind }, notice.text),
        React.createElement('div', { className: 'sk-body' },
          leftColumn,
          React.createElement('div', { className: 'sk-col-detail' },
            React.createElement('div', { className: 'sk-scroll' }, rightColumn))))
    }

    if (slots === undefined) return
    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, Panel))
    // 侧边栏入口：和 dsh-toolkit 其它组件一起加载时统一交给 toolkit 组件管理
    // （在共享注册表里登记一份）；单独加载本文件时注册表不存在，退回自己注册。
    const registry = typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null
    if (registry !== null) {
      registry.register({ id: PANEL_KEY, Panel, label: LABEL, order: 54, glyphText: 'S' })
    } else {
      slots.inject('sidebar.panellist', () => slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, label: LABEL, order: 54 }, function Glyph() { return React.createElement('span', { className: 'sk-glyph' }, 'S') }))
    }
  },
}
}

// ─── 组件：token-usage ───
function tokenUsageClientFactory(require) {
    const React = require("react")
const CSS = '.tk-root{display:flex;flex-direction:column;gap:14px;padding:18px 20px;overflow:auto;height:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-0)}.tk-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}.tk-title{font-size:13px;color:var(--dsw-alias-label-secondary);margin:0 0 6px}.tk-total{font-size:34px;font-weight:650;color:var(--dsw-alias-label-primary);line-height:1.05}.tk-sub{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:6px}.tk-actions,.tk-flex,.tk-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.tk-summary{display:flex;align-items:center;gap:12px;min-width:320px}.tk-summary-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#34343a;color:#fff;font-size:21px}.tk-summary-side{display:flex;align-items:stretch;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}.tk-summary-stat{padding:9px 15px;min-width:98px}.tk-summary-stat+.tk-summary-stat{border-left:1px solid var(--dsw-alias-border-l1)}.tk-summary-label{font-size:11px;color:var(--dsw-alias-label-secondary);margin-bottom:3px}.tk-summary-value{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}.tk-summary-cost{color:var(--dsw-alias-state-success-primary)}.tk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tk-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:14px 16px}.tk-metric{display:flex;flex-direction:column;gap:6px;min-height:72px;box-sizing:border-box}.tk-metric-label{font-size:12px;color:var(--dsw-alias-label-secondary)}.tk-metric-value{font-size:20px;font-weight:600;color:var(--dsw-alias-label-primary)}.tk-bar{height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin-top:2px}.tk-bar>div{height:100%;background:var(--dsw-alias-state-success-primary)}.tk-section-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);margin:0 0 10px}.tk-table{width:100%;border-collapse:collapse;font-size:12px}.tk-table th{text-align:right;font-weight:500;color:var(--dsw-alias-label-secondary);padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);white-space:nowrap}.tk-table th:first-child,.tk-table td:first-child{text-align:left}.tk-table td{text-align:right;padding:7px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);white-space:nowrap}.tk-row{cursor:pointer}.tk-row:hover td{background:var(--dsw-alias-bg-layer-2)}.tk-name{font-weight:500}.tk-tag{font-size:11px;padding:1px 6px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);margin-left:6px}.tk-btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:6px 11px;font-size:12px;cursor:pointer}.tk-btn:hover{border-color:#8b8b95}.tk-btn-active{background:#34343a!important;color:#f5f5f5!important;border-color:#686873!important}.tk-input,.tk-select{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:6px 9px;font-size:12px;color:var(--dsw-alias-label-primary)}.tk-input{min-width:150px}.tk-detail{padding:10px 12px;background:var(--dsw-alias-bg-layer-2);border-radius:7px;margin-top:4px;overflow:auto}.tk-price-toggle{width:100%;display:flex;justify-content:space-between;align-items:center;background:transparent;border:0;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;font-weight:600;padding:0;cursor:pointer;text-align:left}.tk-price-toggle span:last-child{color:var(--dsw-alias-label-secondary);font-size:16px}.tk-chart{width:100%;height:clamp(250px,30vw,360px);min-height:250px;max-height:360px}.tk-chart svg{display:block;width:100%;height:100%;overflow:visible}.tk-grid-line{stroke:var(--dsw-alias-border-l1);stroke-width:1}.tk-axis-text{fill:var(--dsw-alias-label-secondary);font-size:11px}.tk-area{fill:url(#tk-cache-fill);opacity:.88}.tk-line{fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.tk-point{stroke:var(--dsw-alias-bg-layer-1);stroke-width:1.5}.tk-hover-line{stroke:rgba(255,255,255,.55);stroke-width:1}.tk-tooltip{fill:#25252a;stroke:#8b8b95;stroke-width:1}.tk-tooltip-text{font-size:11px}.tk-axis{position:relative;height:18px;margin-top:6px;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden}.tk-axis span{position:absolute;top:0;line-height:16px}.tk-legend{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:var(--dsw-alias-label-secondary)}.tk-legend-item{display:flex;align-items:center;gap:5px}.tk-legend-dot{width:18px;height:2px;border-radius:2px}.tk-empty{padding:22px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px}.tk-entry{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);border-radius:7px;padding:6px 8px;font:inherit;font-size:13px;cursor:pointer;text-align:left}.tk-entry-dot{width:20px;height:20px;flex:0 0 20px;border-radius:5px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center}.tk-entry-label{flex:1;min-width:0}@media(max-width:720px){.tk-grid{grid-template-columns:1fr}.tk-summary{min-width:0;flex-wrap:wrap}.tk-summary-side{width:100%}.tk-summary-stat{flex:1}.tk-total{font-size:30px}}.tk-switching{position:fixed;top:14px;right:18px;z-index:60;display:inline-flex;align-items:center;gap:7px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:99px;padding:5px 12px;font-size:12px;color:var(--dsw-alias-label-primary);box-shadow:0 4px 16px rgba(0,0,0,.22)}.tk-switching::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:tk-pulse 1s ease-in-out infinite}@keyframes tk-pulse{0%,100%{opacity:.25}50%{opacity:1}}.tk-heat{padding-bottom:4px}.tk-heat-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.tk-heat-legend{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--dsw-alias-label-secondary)}.tk-heat-swatch{width:11px;height:11px;border-radius:2px;display:inline-block}.tk-heat-body{display:flex;gap:8px;align-items:stretch;margin-top:12px}.tk-heat-wd{display:grid;grid-template-rows:repeat(7,1fr);gap:3px;width:26px;margin-top:24px;font-size:10px;color:var(--dsw-alias-label-secondary)}.tk-heat-wd span{display:flex;align-items:center;justify-content:flex-end}.tk-heat-main{flex:1;min-width:0}.tk-heat-months{height:18px;margin-bottom:6px;font-size:10px;color:var(--dsw-alias-label-secondary)}.tk-heat-month{white-space:nowrap;overflow:hidden}.tk-heat-cell{width:100%;aspect-ratio:1/1;border-radius:2px;background:#2f2f35}.tk-heat-l1{background:#14532d}.tk-heat-l2{background:#15803d}.tk-heat-l3{background:#22c55e}.tk-heat-l4{background:#4ade80}.tk-heat-tip{position:fixed;z-index:40;pointer-events:none;background:#25252a;border:1px solid #8b8b95;border-radius:8px;padding:8px 10px;font-size:11px;color:#fff;white-space:nowrap}.tk-range{position:relative}.tk-range-btn{display:inline-flex;align-items:center;gap:6px}.tk-range-caret{font-size:9px;opacity:.7}.tk-pop-backdrop{position:fixed;inset:0;z-index:60}.tk-pop{position:absolute;top:calc(100% + 6px);right:0;z-index:61;min-width:246px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:2px;box-shadow:0 12px 32px #0009}.tk-pop-item{border:0;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;font-size:12px;padding:6px 9px;border-radius:6px;cursor:pointer}.tk-pop-item:hover{background:var(--dsw-alias-bg-layer-1)}.tk-pop-item-on{color:var(--dsw-alias-brand-primary);font-weight:600}.tk-pop-sep{height:1px;background:var(--dsw-alias-border-l1);margin:6px 2px}.tk-pop-title{font-size:11px;color:var(--dsw-alias-label-secondary);padding:0 9px 4px}.tk-pop-row{display:flex;align-items:center;gap:6px;padding:0 9px 4px}.tk-pop-label{font-size:11px;color:var(--dsw-alias-label-secondary);flex:0 0 18px}.tk-range-input{flex:1;min-width:0;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:4px 6px;font-size:11px;color:var(--dsw-alias-label-primary);color-scheme:dark}.tk-pop-apply{margin:4px 9px 2px;text-align:center;justify-content:center}.tk-pop-apply:disabled{opacity:.5;cursor:not-allowed}.tk-price-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 2px}.tk-price-form{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin:8px 0}.tk-price-form label{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--dsw-alias-label-secondary)}.tk-price-form label input{width:96px}.tk-price-form label.tk-price-form-wide input{width:170px}.tk-mini-btn{padding:2px 8px;font-size:11px}.tk-price-notice{font-size:12px;margin:6px 0}.tk-price-notice-bad{color:var(--dsw-alias-state-danger-primary,#f43f5e)}.tk-price-syncmeta{font-size:11px;color:var(--dsw-alias-label-secondary)}.tk-price-rate{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--dsw-alias-label-secondary)}'
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
      const [usedOnly, setUsedOnly] = React.useState(true)
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
      const usedOnlyAvailable = Array.isArray(pricing.used) && pricing.used.length > 0
      const usedSet = new Set((pricing.used || []).map((name) => String(name).toLowerCase()))
      const allEntries = pricing.entries || []
      const visibleEntries = usedOnly && usedOnlyAvailable
        ? allEntries.filter((item) => usedSet.has(String(item.modelId).toLowerCase()))
        : allEntries
      const labels = ['模型', '输入', '输出', '缓存命中', '缓存创建', '操作']
      const body = visibleEntries.map((item) => {
        const perImage = Number(item.perImage) > 0
        return React.createElement('tr', { key: item.modelId },
        React.createElement('td', null, (item.displayName || item.modelId) + (perImage ? ' · $' + item.perImage + '/张' : '')),
        React.createElement('td', null, perImage ? '—' : fmtUnitPrice(item.input)),
        React.createElement('td', null, perImage ? '—' : fmtUnitPrice(item.output)),
        React.createElement('td', null, perImage ? '—' : fmtUnitPrice(item.cacheRead)),
        React.createElement('td', null, perImage ? '—' : fmtUnitPrice(item.cacheWrite)),
        React.createElement('td', null,
          perImage
            ? React.createElement('span', { className: 'tk-price-syncmeta' }, '图片生成面板 · 编辑模型里配置')
            : React.createElement('span', { className: 'tk-toolbar' },
              React.createElement('button', { className: 'tk-btn tk-mini-btn', disabled: busy, onClick: () => setForm({ modelId: item.modelId, displayName: item.displayName || item.modelId, input: String(item.input ?? 0), output: String(item.output ?? 0), cacheRead: String(item.cacheRead ?? 0), cacheWrite: String(item.cacheWrite ?? 0) }) }, '改'),
              React.createElement('button', { className: 'tk-btn tk-mini-btn', disabled: busy, onClick: () => post({ action: 'delete', modelId: item.modelId }) }, '删'))))
      })
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
        usedOnlyAvailable ? React.createElement('button', {
          className: 'tk-btn tk-mini-btn' + (usedOnly ? ' tk-btn-active' : ''),
          disabled: busy,
          title: '只显示实际用过或 DSH 设置里已配置的模型',
          onClick: () => setUsedOnly(!usedOnly),
        }, usedOnly ? '✓ 只看在用' : '只看在用') : null,
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
          React.createElement('span', null, '计价明细（每百万 Token）· ' + fmtInt(visibleEntries.length) + ' / ' + fmtInt(allEntries.length) + ' 个模型 · ' + sourceText + errorText),
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
    if (slots === undefined) return
    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, Panel))
    // 侧边栏入口已隐藏。面板本身仍注册，避免已打开的页面直接拆掉。
  },
}
}

// ─── 组件：toolkit ───
function toolkitClientFactory(require) {
    const React = require("react")
// toolkit：把 dsh-toolkit 的各个面板收进同一个界面。
//
// 侧边栏只留一条 entry：`toolkit`（图标 `T` + 标签「工具集」）。点开后是一条
// 分页栏 + 当前分页内容，分页切换全在面板内部完成 —— 侧边栏不再为每个分页
// 各占一行。
//
// 面板本身从 __dshToolkitRegistry 读：组件之间没有 require 通道，但 build.mjs
// 把各组件工厂函数放在同一模块作用域，这个注册表就是共享面。单独加载
// components/toolkit/client.js（不经 build.mjs）时注册表不存在 -> 本组件不注册
// 任何 UI，免得露出一个点不开的空壳。
//
// 末尾的「设置」分页是壳自己内置的（不经过注册表）：它只读展示各组件的数据落点，
// 数据来自 host.js 的 GET /api/toolkit/settings。
const CSS = '.tks-root{position:relative;display:flex;flex-direction:column;min-height:0;height:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-0)}.tks-tabs{display:flex;align-items:center;gap:2px;padding:6px 12px 0;flex:none;border-bottom:1px solid var(--dsw-alias-border-l1);overflow-x:auto;overflow-y:hidden}.tks-tab{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font:inherit;font-size:13px;line-height:1.5;white-space:nowrap;border:none;border-bottom:2px solid transparent;border-radius:6px 6px 0 0;cursor:pointer;background:transparent;color:var(--dsw-alias-label-secondary)}.tks-tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.tks-tab-on{color:var(--dsw-alias-brand-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600}.tks-body{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden}.tks-empty{display:flex;align-items:center;justify-content:center;padding:32px 20px;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary);text-align:center}.tks-glyph{border-radius:5px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600;display:flex;align-items:center;justify-content:center}'
const CSS_SETTINGS = '.tks-set{display:flex;flex-direction:column;gap:12px;padding:14px 16px 20px;overflow:auto;min-height:0;box-sizing:border-box}.tks-set-head{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap}.tks-set-title{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary)}.tks-set-sub{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary)}.tks-set-actions{display:flex;gap:8px;margin-left:auto}.tks-btn{font:inherit;font-size:12px;line-height:1.5;padding:4px 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap}.tks-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.tks-card{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}.tks-card-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.tks-card-name{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}.tks-card-dir{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);word-break:break-all;font-family:var(--dsw-font-mono,ui-monospace,monospace)}.tks-row{display:flex;align-items:flex-start;gap:8px;padding:4px 0;border-top:1px dashed var(--dsw-alias-border-l1)}.tks-row:first-of-type{border-top:none}.tks-row-main{min-width:0;flex:1 1 auto;display:flex;flex-direction:column;gap:2px}.tks-row-label{font-size:12px;color:var(--dsw-alias-label-primary)}.tks-row-path{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);word-break:break-all;font-family:var(--dsw-font-mono,ui-monospace,monospace)}.tks-row-meta{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none}.tks-miss{color:var(--dsw-alias-label-secondary);opacity:.75}.tks-note{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary)}.tks-badge{font-size:11px;padding:1px 6px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}'
const CSS_ALL = CSS + CSS_SETTINGS
const PANEL_KEY = 'toolkit'
const TITLE = '工具集'
const EMPTY_HINT = '这个 bundle 里没有可显示的面板：dsh-toolkit 的其它组件没有把面板登记到共享注册表（多半是 client.js 没重新构建，或组件被单独加载了）。'
const SETTINGS_ID = '__toolkit-settings'
const SETTINGS_LABEL = '设置'

/** 注册表安全取用：单独加载本文件时它不存在。 */
function toolkitRegistry() {
  return typeof __dshToolkitRegistry === 'object' && __dshToolkitRegistry !== null ? __dshToolkitRegistry : null
}

/** 字节数 → 人类可读（设置页只做展示，不参与任何计算）。 */
function formatBytes(value) {
  const bytes = Number(value) || 0
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

/** mtime → 本地时间短串。 */
function formatTime(ms) {
  const stamp = Number(ms) || 0
  if (stamp <= 0) return ''
  try {
    return new Date(stamp).toLocaleString()
  } catch {
    return ''
  }
}

/** 同源 fetch + JSON：失败时把网关回的错误码/消息带出来。 */
async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  const text = await res.text()
  let data = null
  try {
    data = text === '' ? null : JSON.parse(text)
  } catch {
    data = null
  }
  if (!res.ok) {
    const message = data !== null && typeof data === 'object' && (data.message || data.code)
    throw new Error(message || ('HTTP ' + res.status))
  }
  return data
}

return {
  inject: ['slots', 'layout'],
  apply(ctx) {
    ctx.effect(() => {
      const el = document.createElement("style")
      el.textContent = CSS_ALL
      document.head.appendChild(el)
      return () => el.remove()
    }, "toolkit: styles")

    const slots = ctx.slots
    const registry = toolkitRegistry()
    // 面板必须登记 main，否则 layout.selectPanel('toolkit') 会抛错；这里先返回，
    // 让「单独加载」退化成「没有 UI」而不是「一条点不开的入口」。
    if (slots === undefined || registry === null) return

    // 共享的当前分页挂在注册表上：所有工厂函数同处一个模块作用域，这样壳与
    // 将来其它组件都能读到同一份状态。
    if (registry.shell === undefined || registry.shell === null) registry.shell = { active: '', listeners: new Set() }
    const state = registry.shell

    const emit = () => {
      for (const listener of Array.from(state.listeners)) {
        try { listener() } catch (error) { /* 单个订阅者出错不影响其它人 */ }
      }
    }

    /** 设置页：只读展示各组件的数据落点（文件是否存在、多大、什么时候改的）。 */
    function SettingsPanel() {
      const [state, setState] = React.useState({ loading: true, data: null, error: null })
      const [copied, setCopied] = React.useState('')

      const load = () => {
        setState((prev) => ({ ...prev, loading: true, error: null }))
        fetchJson('/api/toolkit/settings')
          .then((data) => setState({ loading: false, data, error: null }))
          .catch((error) => setState({ loading: false, data: null, error: String(error && error.message ? error.message : error) }))
      }
      React.useEffect(() => { load() }, [])

      const copy = (text) => {
        const done = () => {
          setCopied(text)
          window.setTimeout(() => setCopied(''), 1500)
        }
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(text).then(done).catch(() => {})
        }
      }

      const data = state.data
      const components = data !== null && Array.isArray(data.components) ? data.components : []
      const overridden = data !== null && Array.isArray(data.overriddenNames) ? data.overriddenNames : []

      const head = React.createElement('div', { className: 'tks-set-head' },
        React.createElement('div', null,
          React.createElement('div', { className: 'tks-set-title' }, '数据目录'),
          React.createElement('div', { className: 'tks-set-sub' },
            '各组件的数据分开存放，不做老位置兼容；这里显示的就是它实际读写的位置。')),
        React.createElement('div', { className: 'tks-set-actions' },
          data !== null && data.version ? React.createElement('span', { className: 'tks-badge' }, 'v' + data.version) : null,
          React.createElement('button', { className: 'tks-btn', type: 'button', onClick: load, disabled: state.loading },
            state.loading ? '读取中…' : '刷新')))

      const root = data === null
        ? null
        : React.createElement('div', { className: 'tks-card' },
            React.createElement('div', { className: 'tks-card-head' },
              React.createElement('span', { className: 'tks-card-name' }, '根目录'),
              React.createElement('button', {
                className: 'tks-btn',
                type: 'button',
                onClick: () => copy(String(data.dataDir || '')),
              }, copied === String(data.dataDir || '') ? '已复制' : '复制路径')),
            React.createElement('div', { className: 'tks-card-dir' }, String(data.dataDir || '')),
            overridden.length === 0
              ? null
              : React.createElement('div', { className: 'tks-note' }, '这些位置被环境变量接管：' + overridden.join('、')))

      const cards = components.map((component) => React.createElement('div', { className: 'tks-card', key: component.id },
        React.createElement('div', { className: 'tks-card-head' },
          React.createElement('span', { className: 'tks-card-name' }, component.label),
          component.dir === null || component.dir === undefined
            ? null
            : React.createElement('button', {
                className: 'tks-btn',
                type: 'button',
                onClick: () => copy(String(component.dir)),
              }, copied === String(component.dir) ? '已复制' : '复制目录')),
        component.dir === null || component.dir === undefined
          ? null
          : React.createElement('div', { className: 'tks-card-dir' }, String(component.dir)),
        component.note !== undefined && component.note !== null && String(component.note) !== ''
          ? React.createElement('div', { className: 'tks-note' }, String(component.note))
          : null,
        (Array.isArray(component.files) ? component.files : []).map((file) => React.createElement('div', { className: 'tks-row', key: file.path },
          React.createElement('div', { className: 'tks-row-main' },
            React.createElement('div', { className: 'tks-row-label' }, String(file.label)),
            React.createElement('div', { className: 'tks-row-path' }, String(file.path))),
          React.createElement('div', { className: file.exists ? 'tks-row-meta' : 'tks-row-meta tks-miss' },
            file.exists === true
              ? (file.kind === 'dir' ? '目录' : formatBytes(file.bytes)) + (file.mtime > 0 ? ' · ' + formatTime(file.mtime) : '')
              : '未创建')))))

      return React.createElement('div', { className: 'tks-set' },
        head,
        state.error !== null
          ? React.createElement('div', { className: 'tks-empty' }, '读取数据目录失败：' + state.error)
          : null,
        data === null && state.loading === true
          ? React.createElement('div', { className: 'tks-empty' }, '正在读取数据目录…')
          : null,
        root,
        cards)
    }

    /** 全部分页 = 注册表里的组件面板 + 壳内置的设置页（永远排最后）。 */
    const entriesOf = () => registry.entries().concat([{ id: SETTINGS_ID, label: SETTINGS_LABEL, order: 9999, Panel: SettingsPanel }])

    const keysOf = () => entriesOf().map((entry) => entry.id)
    const labelOf = (entry) => entry.label !== undefined && entry.label !== null ? String(entry.label) : entry.id

    /** 选一个分页：写共享状态并通知面板重渲染。选不到就退到第一个可用分页。 */
    function selectTab(key) {
      const available = keysOf()
      if (available.length === 0) return
      state.active = typeof key === 'string' && available.includes(key) ? key : available[0]
      emit()
    }

    function currentTab() {
      const available = keysOf()
      if (available.length === 0) return ''
      return available.includes(state.active) ? state.active : available[0]
    }

    function mainGlyph() {
      return React.createElement('span', {
        className: 'tks-glyph',
        style: { width: '18px', height: '18px', fontSize: '11px' },
      }, 'T')
    }

    /** toolkit 界面本体：分页栏 + 当前分页（非活动页整个卸载，避免后台轮询常驻）。 */
    function ToolkitPanel() {
      const entries = entriesOf()
      const [, setTick] = React.useState(0)
      React.useEffect(() => {
        const listener = () => setTick((value) => value + 1)
        state.listeners.add(listener)
        return () => { state.listeners.delete(listener) }
      }, [])
      const active = currentTab()
      const activeEntry = entries.find((entry) => entry.id === active)
      return React.createElement('div', { className: 'tks-root' },
        React.createElement('div', { className: 'tks-tabs', role: 'tablist' }, entries.map((entry) => React.createElement('button', {
          key: entry.id,
          type: 'button',
          role: 'tab',
          className: 'tks-tab' + (entry.id === active ? ' tks-tab-on' : ''),
          'aria-selected': entry.id === active,
          onClick: () => selectTab(entry.id),
        }, labelOf(entry)))),
        React.createElement('div', { className: 'tks-body' },
          activeEntry !== undefined
            ? React.createElement(activeEntry.Panel)
            : React.createElement('div', { className: 'tks-empty' }, EMPTY_HINT)))
    }

    slots.inject('main', () => slots.register({ name: 'main', key: PANEL_KEY }, ToolkitPanel))
    slots.inject('sidebar.panellist', () => slots.register(
      { name: 'sidebar.panellist', id: PANEL_KEY, label: TITLE, order: 48 },
      () => mainGlyph()))
  },
}
}

    const components = [imageGenClientFactory, mcpClientFactory, modelTestClientFactory, notificationsClientFactory, skillClientFactory, tokenUsageClientFactory, toolkitClientFactory]
    const plugins = components.map((component) => component(require))
    return {
      inject: [...new Set(plugins.flatMap((plugin) => (Array.isArray(plugin.inject) ? plugin.inject : [])))],
      apply(ctx) {
        for (const plugin of plugins) plugin.apply(ctx)
      },
    }
  },
})
