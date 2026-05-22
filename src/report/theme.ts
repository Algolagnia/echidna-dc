/**
 * Shared visual theme for both Identity and Activity HTML reports.
 *
 * Soft dark palette modeled after GitHub Dark / Linear / modern dev tools:
 *  - cool slate background (no pure black, no warm bias)
 *  - off-white text (no pure white — reduces glare)
 *  - warm tan accent (#d2a679) — orange family but desaturated
 *  - amber for warnings, soft red for risk, no neon
 *  - no animations, no gradients, no body-level radial backgrounds
 *  - sans-serif body, monospace only for code / IDs / timestamps
 *
 * Reasoning: long analyst review benefits from low-glare surfaces with
 * just enough contrast to distinguish severity. Risk still pops via
 * red-bg + soft-red border, but it doesn't strain a 15-min review.
 */

export const SHARED_CSS = `
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#0d1117;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,"Helvetica Neue",sans-serif;font-size:14.5px;line-height:1.6;-webkit-font-smoothing:antialiased}
.frame{max-width:1040px;margin:0 auto;padding:24px 22px 36px}

/* Bilingual visibility */
html[lang="tr"] [data-lang="en"]{display:none!important}
html[lang="en"] [data-lang="tr"]{display:none!important}

/* Header bar */
.bar{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #30363d;padding-bottom:14px;margin-bottom:18px}
.bar .brand{font-weight:600;font-size:18px;letter-spacing:-0.2px;color:#e6edf3}
.bar .doc-kind{color:#7d8590;font-size:12px;letter-spacing:0.5px;margin-left:10px;text-transform:uppercase}
.lang-switch{display:flex;gap:4px}
.lang-switch a{padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;color:#7d8590;border:1px solid #30363d;text-decoration:none;cursor:pointer;background:#161b22;transition:color 0.15s,border-color 0.15s,background 0.15s}
.lang-switch a.active{background:#d2a679;color:#0d1117;border-color:#d2a679}
.lang-switch a:not(.active):hover{color:#e6edf3;border-color:#7d8590}

.ascii{color:#d2a679;white-space:pre;font-family:"SF Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px;line-height:1.2;letter-spacing:0;margin:0 0 4px;opacity:0.65}
.sub{color:#7d8590;font-size:12px;margin-bottom:18px;letter-spacing:0.2px}

h1,h2,h3{font-weight:600;margin:0;color:#e6edf3}
.section{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:18px 22px;margin:14px 0}
.section-title{color:#7d8590;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #21262d;font-weight:600}
.section-title.blood{color:#f85149}

/* Key/value pairs */
.kv{display:grid;grid-template-columns:160px 1fr;gap:6px 18px;font-size:14px}
.kv .k{color:#7d8590;text-transform:lowercase;font-weight:500}
.kv .v{color:#e6edf3;word-break:break-all;font-family:"SF Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px}
.kv .v.dim{color:#7d8590}
.kv .v.warn{color:#e3b341}
.kv .v.bad{color:#ff7b72;font-weight:600}

/* Metric grid */
.meta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:8px 0}
.meta{background:#1c2128;border:1px solid #30363d;border-radius:6px;padding:12px 14px}
.meta .label{color:#7d8590;font-size:10.5px;text-transform:uppercase;letter-spacing:1px;font-weight:600}
.meta .value{color:#d2a679;font-size:20px;font-weight:600;margin-top:4px;font-variant-numeric:tabular-nums}
.meta.blood .value{color:#ff7b72}

/* Guild cards (category-coded borders) */
.guild{background:#161b22;border:1px solid #30363d;border-left:3px solid #d2a679;border-radius:6px;padding:14px 16px;margin:10px 0}
.guild.cat-anime{border-left-color:#bc8cff}
.guild.cat-chat{border-left-color:#58a6ff}
.guild.cat-gaming{border-left-color:#39c5cf}
.guild.cat-education{border-left-color:#7ee787}
.guild.cat-community{border-left-color:#7d8590}
.guild.cat-dev{border-left-color:#6e7681}
.guild.cat-adult{border-left-color:#f85149}
.guild.cat-other{border-left-color:#484f58}
.guild .name{color:#e6edf3;font-size:15px;font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cat-tag{display:inline-block;padding:2px 8px;border-radius:3px;font-size:10.5px;letter-spacing:0.5px;background:#21262d;color:#b0b8c1;border:1px solid #30363d;font-weight:500}
.guild .role-list{color:#b0b8c1;font-size:12.5px;margin-bottom:6px}

/* Live voice / "now" — soft amber, no pulse */
.voice-now{margin-top:10px;padding:10px 14px;background:#2b2014;border-left:3px solid #d29922;border-radius:4px;color:#e6edf3;font-size:13.5px}
.voice-now .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#d29922;margin-right:8px;vertical-align:middle}
.voice-now .where{color:#e3b341;font-weight:600}
.voice-now .dur{color:#e3b341;font-weight:600}
.voice-now .flags{color:#7d8590;margin-left:8px;font-size:11.5px}

/* Message panel (per-guild) */
.message-panel{margin-top:10px;background:#1c2128;border:1px solid #30363d;border-radius:6px;padding:12px 14px}
.message-panel .panel-label{color:#7d8590;font-size:10.5px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:600}
.message-panel .nums{color:#e6edf3;font-size:13.5px;font-variant-numeric:tabular-nums}
.message-panel .nums.dim{color:#7d8590}
.message-panel .channels{margin-top:8px;font-size:12.5px;color:#b0b8c1}
.message-panel .channels .row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dotted #30363d}
.message-panel .channels .row:last-child{border-bottom:none}
.message-panel .trunc{margin-top:8px;padding:6px 10px;background:#2b2014;border-left:2px solid #d29922;border-radius:3px;font-size:11.5px;color:#e3b341}
.message-panel .trunc.ok{background:#102b16;border-left-color:#3fb950;color:#7ee787}

/* Samples (scrollable) */
.samples{margin-top:10px;max-height:480px;overflow-y:auto;padding-right:4px}
.samples::-webkit-scrollbar{width:8px}
.samples::-webkit-scrollbar-track{background:#161b22;border-radius:4px}
.samples::-webkit-scrollbar-thumb{background:#30363d;border-radius:4px}
.samples::-webkit-scrollbar-thumb:hover{background:#484f58}
.sample{background:#161b22;border:1px solid #30363d;border-left:2px solid #30363d;border-radius:4px;padding:6px 10px;margin:3px 0;font-size:12px;color:#b0b8c1}
.sample.full{border-left-color:#d2a679}
.sample .at{color:#7d8590;font-size:10.5px;margin-right:8px;font-family:"SF Mono",ui-monospace,monospace}
.sample .ch{color:#d2a679;margin-right:8px;font-family:"SF Mono",ui-monospace,monospace;font-size:11px}
.sample .txt{color:#e6edf3;white-space:pre-wrap;word-break:break-word}

/* Voice session rows */
.session{background:#161b22;border:1px solid #30363d;border-left:2px solid #d29922;border-radius:3px;padding:5px 10px;margin:2px 0;font-size:11.5px;color:#b0b8c1;display:flex;gap:14px;flex-wrap:wrap}
.session .when{color:#7d8590;font-family:"SF Mono",ui-monospace,monospace}
.session .where{color:#e3b341;font-weight:500}
.session .dur{color:#e6edf3;margin-left:auto;font-weight:500}

/* Aliases */
.alias{display:inline-flex;align-items:center;background:#1f1810;border:1px solid #3d2f1f;border-radius:4px;padding:4px 10px;margin:3px 4px 3px 0;font-size:12.5px;color:#d2a679;font-weight:500}
.alias .sources{color:#7d8590;font-size:10.5px;margin-left:8px;font-weight:600}

/* Footer */
.foot{text-align:center;color:#7d8590;font-size:11.5px;margin-top:32px;padding-top:16px;border-top:1px solid #30363d}

/* Generic tags */
.tag{display:inline-block;padding:2px 7px;border-radius:3px;font-size:10.5px;letter-spacing:0.3px;margin-right:4px;background:#21262d;color:#b0b8c1;border:1px solid #30363d;font-weight:500}
.tag.role{background:#0d2950;color:#79c0ff;border-color:#1f6feb}
.tag.badge{background:#2b2014;color:#e3b341;border-color:#3d2f1f}
.tag.blood{background:#2b1414;color:#ff7b72;border-color:#5c2d2d}

.empty{color:#7d8590;font-style:italic;font-size:13px;text-align:center;padding:10px}

/* Category sub-sections (identity) */
.cat-section h4{color:#b0b8c1;font-size:12.5px;text-transform:uppercase;letter-spacing:1.2px;margin:16px 0 6px;padding-bottom:4px;border-bottom:1px solid #21262d;font-weight:600}
.cat-section .guild-mini{display:flex;justify-content:space-between;align-items:center;padding:7px 12px;background:#1c2128;border:1px solid #30363d;border-left:2px solid #30363d;margin:3px 0;border-radius:4px;gap:10px;flex-wrap:wrap}
.cat-section .guild-mini .gn{color:#e6edf3;font-size:13px;font-weight:500}
.cat-section .guild-mini .nick{color:#7d8590;font-size:11.5px}
.cat-section .guild-mini .role-count{color:#d2a679;font-size:11px;font-weight:500}

/* Risk panel */
.risk-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:12px}
.risk-summary .pill{padding:10px 12px;background:#1c2128;border:1px solid #30363d;border-radius:5px;text-align:center}
.risk-summary .pill.high{background:#2b1414;border-color:#5c2d2d}
.risk-summary .pill.med{background:#2b2014;border-color:#3d2f1f}
.risk-summary .pill.low{background:#0d2950;border-color:#1f3a6e}
.risk-summary .pill .n{font-size:24px;font-weight:600;color:#e6edf3;font-variant-numeric:tabular-nums}
.risk-summary .pill.high .n{color:#ff7b72}
.risk-summary .pill.med .n{color:#e3b341}
.risk-summary .pill.low .n{color:#79c0ff}
.risk-summary .pill .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#7d8590;margin-top:3px;font-weight:600}

.flag{background:#161b22;border:1px solid #30363d;border-left:3px solid #30363d;border-radius:5px;padding:10px 14px;margin:5px 0;font-size:12.5px}
.flag.high{border-left-color:#f85149;background:#1f1414}
.flag.medium{border-left-color:#d29922;background:#1f1a10}
.flag.low{border-left-color:#484f58}
.flag .head{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline}
.flag .cat{font-weight:600;color:#ff7b72;text-transform:uppercase;font-size:10.5px;letter-spacing:0.8px}
.flag.medium .cat{color:#e3b341}
.flag.low .cat{color:#7d8590}
.flag .when{color:#7d8590;font-size:10.5px;font-family:"SF Mono",ui-monospace,monospace}
.flag .where{color:#b0b8c1;font-size:12px;margin:4px 0}
.flag .ev{color:#e6edf3;font-size:12.5px;margin-top:6px;white-space:pre-wrap;word-break:break-word;padding:6px 10px;background:#0d1117;border:1px solid #30363d;border-radius:3px;font-family:"SF Mono",ui-monospace,monospace;font-size:11.5px}

/* Behavioral cards */
.behav-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:6px}
.behav-card{background:#1c2128;border:1px solid #30363d;border-radius:6px;padding:14px 16px}
.behav-card .label{color:#7d8590;font-size:10.5px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600}
.behav-card .primary{color:#e6edf3;font-size:20px;font-weight:600;margin-bottom:6px}
.behav-card .conf{font-size:10.5px;color:#7d8590;letter-spacing:0.3px;margin-bottom:8px;font-weight:500}
.behav-card .conf.high{color:#7ee787}
.behav-card .conf.medium{color:#e3b341}
.behav-card .conf.low{color:#7d8590}
.behav-card .ev{font-size:11.5px;color:#b0b8c1;margin:3px 0;padding-left:8px;border-left:2px solid #30363d}

/* Horizontal bars (behavioral + confidence) */
.bar-row{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:11.5px}
.bar-row .lbl{flex:0 0 60px;color:#7d8590;text-transform:uppercase;font-size:10px;letter-spacing:0.5px;font-weight:600}
.bar-row .track{flex:1;height:6px;background:#0d1117;border-radius:3px;overflow:hidden;border:1px solid #30363d}
.bar-row .fill{height:100%;background:#d2a679}
.bar-row .val{flex:0 0 38px;text-align:right;color:#e6edf3;font-size:11.5px;font-variant-numeric:tabular-nums}

/* Confidence gauge */
.confidence{display:flex;gap:24px;align-items:center;flex-wrap:wrap}
.confidence .score{font-size:52px;font-weight:600;letter-spacing:-2px;line-height:1;color:#d2a679;font-variant-numeric:tabular-nums}
.confidence .score-band{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#7d8590;margin-top:4px;font-weight:600}
.confidence .gauge-wrap{flex:1;min-width:240px}
.confidence-bar{height:10px;background:#0d1117;border:1px solid #30363d;border-radius:5px;overflow:hidden;margin-bottom:10px}
.confidence-bar .fill{height:100%;background:#d2a679}
.factor{display:flex;gap:10px;align-items:center;font-size:11.5px;margin:4px 0;flex-wrap:wrap}
.factor .name{flex:0 0 130px;color:#7d8590;text-transform:lowercase;font-weight:500}
.factor .bar{flex:1;height:5px;background:#0d1117;border-radius:3px;overflow:hidden;min-width:80px;border:1px solid #30363d}
.factor .bar .fill{height:100%;background:#d2a679}
.factor .val{flex:0 0 60px;text-align:right;color:#e6edf3;font-variant-numeric:tabular-nums}
.factor .note{flex:0 0 100%;color:#7d8590;font-size:10.5px;padding-left:140px;margin-bottom:4px}

/* Subtle helpers */
.accent{color:#d2a679}
.dim-text{color:#484f58}

@media(max-width:780px){
  .frame{padding:16px 14px 24px}
  .kv{grid-template-columns:1fr;gap:2px}
  .kv .k{color:#d2a679;font-weight:600;margin-top:6px}
  .bar{flex-wrap:wrap;gap:10px}
  .confidence{gap:14px}
  .confidence .score{font-size:42px}
  .factor .note{padding-left:0}
}
`.trim();

export const LANG_SWITCH_SCRIPT = `
(function(){var V=['tr','en'];function pick(){try{var s=localStorage.getItem('echidna-lang');if(V.indexOf(s)!==-1)return s}catch(e){}var n=(navigator.language||'en').toLowerCase();return n.indexOf('tr')===0?'tr':'en'}function apply(l){if(V.indexOf(l)===-1)l='en';document.documentElement.lang=l;var links=document.querySelectorAll('.lang-switch a');for(var i=0;i<links.length;i++)links[i].classList.toggle('active',links[i].getAttribute('data-target')===l);try{localStorage.setItem('echidna-lang',l)}catch(e){}}function init(){apply(pick());var ls=document.querySelectorAll('.lang-switch a');for(var i=0;i<ls.length;i++){ls[i].addEventListener('click',function(e){e.preventDefault();apply(this.getAttribute('data-target'))})}}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init)}else{init()}})();
`.trim();
