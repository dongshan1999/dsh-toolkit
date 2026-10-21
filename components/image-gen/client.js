// @local/dsh-toolkit — 组件 image-gen 的浏览器半（侧边栏「图片生成」）
window.__ModuleLoader__.load({
  id: '@local/image-gen',
  factory(require) {
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
  },
})