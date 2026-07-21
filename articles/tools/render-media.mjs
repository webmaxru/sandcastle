import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { newBrowser, shoot } from './cdp.mjs';
import { doc, P } from './common.mjs';

// Render every text-based illustration (Mermaid diagrams, tables, code samples) and the
// hand-authored SVGs of an article to PNG in the article's media/ folder, for platforms that
// only accept simple markdown + attached images (e.g. LinkedIn). The .md stays the source of
// truth: blocks are extracted verbatim by line range and never modified.
//   Usage:  node render-media.mjs [idFilter]   (idFilter = optional substring, e.g. "mmd-")
// Adapting to another article: repoint ARTICLE and update RANGES / CODE_META to its blocks.
const __dir = dirname(fileURLToPath(import.meta.url));
const ARTICLE = join(__dir, '..', 'building-sandcastle-github-copilot-agent-framework.md');
const MEDIA = join(__dir, '..', 'media');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const lines = readFileSync(ARTICLE, 'utf8').split(/\r?\n/);
const slice = ([a, b]) => lines.slice(a - 1, b).join('\n'); // 1-indexed inclusive

// ---- exact source ranges (content between ``` fences / table blocks) ----
const RANGES = {
  'code-pip-install': [33, 33], 'code-minimal-agent': [39, 48],
  'mmd-arch-system': [105, 125], 'code-sessions-personas': [139, 151],
  'code-default-options': [157, 163], 'mmd-orchestrator-team': [171, 184],
  'code-orchestrator': [192, 216], 'code-validation': [228, 235],
  'mmd-selfheal-state': [241, 250], 'code-stream-map': [258, 269],
  'mmd-sse-sequence': [275, 308], 'code-byok-make-client': [354, 362],
  'code-byok-default-options': [368, 376], 'mmd-observability': [403, 407],
  'mmd-deploy-azure': [417, 430], 'mmd-build-journey': [442, 452],
  'code-build-your-own': [470, 472], 'table-capabilities': [57, 65],
  'table-config-knobs': [73, 79],
};
const CODE_META = {
  'code-pip-install': ['bash', 'shell'],
  'code-minimal-agent': ['python', 'python'],
  'code-sessions-personas': ['python', 'backend/app/sessions.py'],
  'code-default-options': ['python', 'default_options'],
  'code-orchestrator': ['python', 'backend/app/agents/orchestrator.py'],
  'code-validation': ['python', 'backend/app/validation.py'],
  'code-stream-map': ['python', 'backend/app/agents/stream_map.py'],
  'code-byok-make-client': ['python', 'backend/app/sessions.py'],
  'code-byok-default-options': ['python', 'backend/app/sessions.py'],
  'code-build-your-own': ['bash', 'shell'],
};

// ---- mermaid theme ----
const MERMAID = {
  theme: 'base',
  themeVariables: {
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontSize: '15px',
    background: 'transparent', primaryColor: '#FFFFFF', primaryBorderColor: '#CBD3DA',
    primaryTextColor: '#1F2937', secondaryColor: '#F2FAF9', tertiaryColor: '#F7F6F2',
    lineColor: '#9AA3AE', clusterBkg: '#F7F6F2', clusterBorder: '#E3DCCE',
    titleColor: '#1F2937', edgeLabelBackground: '#FBF8F2', nodeBorder: '#CBD3DA',
    actorBkg: '#FFFFFF', actorBorder: '#CBD3DA', actorTextColor: '#1F2937',
    signalColor: '#4B5563', signalTextColor: '#374151', labelBoxBkgColor: '#F7F6F2',
    labelBoxBorderColor: '#E3DCCE', noteBkgColor: '#FEF1DA', noteBorderColor: '#F6D68A',
    cScale0: '#EEF4FF', cScale1: '#ECF7F5', cScale2: '#FDF3E7', cScale3: '#EDF7EF',
    cScale4: '#F4EFFB', cScale5: '#FBEFF0', cScale6: '#EEF4FF', cScale7: '#ECF7F5', cScale8: '#FDF3E7',
    cScaleLabel0: '#374151', cScaleLabel1: '#374151', cScaleLabel2: '#374151', cScaleLabel3: '#374151',
    cScaleLabel4: '#374151', cScaleLabel5: '#374151', cScaleLabel6: '#374151', cScaleLabel7: '#374151', cScaleLabel8: '#374151',
  },
  flowchart: { curve: 'basis', htmlLabels: true, padding: 16, nodeSpacing: 50, rankSpacing: 58, useMaxWidth: false },
  sequence: { useMaxWidth: false, mirrorActors: false },
  state: { useMaxWidth: false },
  timeline: { useMaxWidth: false },
  gantt: { useMaxWidth: false },
  securityLevel: 'loose', startOnLoad: false,
};

// ---- inline markdown (for table cells) ----
function inline(md) {
  let s = esc(md);
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}

// ---- page builders ----
function mermaidPage(src) {
  const css = `.sheet-pad{padding:30px 32px;}
    .mermaid{font-family:'IBM Plex Sans',system-ui,sans-serif;display:flex;justify-content:center;}
    .mermaid .edgeLabel,.mermaid span.edgeLabel{background:${P.paper}!important;color:${P.inkSoft};}
    .mermaid .cluster-label,.mermaid .cluster-label span,.mermaid .cluster-label p,
    .mermaid .cluster-label div{white-space:nowrap!important;max-width:none!important;width:max-content!important;overflow:visible!important;}
    .mermaid .cluster-label foreignObject,.mermaid g.cluster foreignObject{overflow:visible!important;}
    .mermaid text.sequenceNumber{fill:#FFFFFF!important;font-weight:600;}`;
  const body = `<div class="sheet-pad"><div class="mermaid">${esc(src)}</div></div>`;
  const ready = `import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';
    mermaid.initialize(${JSON.stringify(MERMAID)});
    await mermaid.run({ nodes: document.querySelectorAll('.mermaid') });
    await document.fonts.ready;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    window.__ready = true;`;
  return doc({ css, body, ready });
}

function codePage(code, lang, caption) {
  const css = `.code-head{display:flex;align-items:center;gap:9px;padding:12px 18px;
      background:${P.recessed};border-bottom:1px solid ${P.line};}
    .dot{width:11px;height:11px;border-radius:50%;display:inline-block;}
    .code-cap{margin-left:6px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:${P.inkFaint};}
    .code-body{padding:18px 24px 20px;background:${P.sheet};}
    .code-body pre{margin:0;}
    .code-body code.hljs{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13.5px;
      line-height:1.62;background:transparent;padding:0;color:${P.ink};white-space:pre;}`;
  const head = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css">`;
  const body = `<div class="code-head">
      <span class="dot" style="background:#E4B7B2"></span>
      <span class="dot" style="background:#EBD9AE"></span>
      <span class="dot" style="background:#BFD9C4"></span>
      <span class="code-cap">${esc(caption)}</span></div>
    <div class="code-body"><pre><code class="language-${lang}">${esc(code)}</code></pre></div>`;
  const ready = `import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/es/highlight.min.js';
    document.querySelectorAll('code').forEach(el=>hljs.highlightElement(el));
    await document.fonts.ready;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    window.__ready = true;`;
  return doc({ css, head, body, ready });
}

function tablePage(block, title) {
  const rows = block.split('\n').filter((l) => l.trim().startsWith('|'));
  const cells = rows.map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const isSep = (row) => row.every((c) => /^:?-{2,}:?$/.test(c));
  const header = cells[0];
  const bodyRows = cells.slice(1).filter((r) => !isSep(r));
  const th = header.map((c) => `<th>${inline(c)}</th>`).join('');
  const trs = bodyRows.map((r) =>
    `<tr>${r.map((c, i) => `<td class="${i === 0 ? 'c0' : 'c1'}">${inline(c)}</td>`).join('')}</tr>`).join('');
  const css = `.sheet-pad{padding:24px 26px 26px;}
    table{border-collapse:collapse;font-family:'IBM Plex Sans',system-ui,sans-serif;
      color:${P.inkSoft};font-size:14.5px;line-height:1.5;max-width:760px;}
    thead th{text-align:left;font-size:11.5px;letter-spacing:.07em;text-transform:uppercase;
      color:${P.inkFaint};font-weight:600;padding:0 18px 10px;border-bottom:2px solid ${P.line};}
    tbody td{padding:13px 18px;border-bottom:1px solid ${P.line};vertical-align:top;}
    tbody tr:last-child td{border-bottom:none;}
    td.c0{white-space:nowrap;color:${P.ink};font-weight:500;padding-right:26px;}
    td.c1{color:${P.inkSoft};}
    strong{color:${P.ink};font-weight:600;} em{color:${P.inkSoft};font-style:italic;}
    a{color:${P.teal};text-decoration:none;font-weight:500;}
    code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.8px;
      background:${P.recessed};border:1px solid ${P.line};border-radius:5px;padding:1px 5px;color:${P.ink};}`;
  const cap = title ? `<div class="cap" style="margin:0 0 14px 2px;">${title}</div>` : '';
  const body = `<div class="sheet-pad">${cap}<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`;
  const ready = `await document.fonts.ready;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    window.__ready = true;`;
  return doc({ css, body, ready });
}

function svgPage(svgFile, w) {
  const url = pathToFileURL(join(MEDIA, svgFile)).href;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:#fff;}
    #shot{display:inline-block;line-height:0;font-size:0;}
    #svg{width:${w}px;height:auto;display:block;}
    </style></head><body><div id="shot"><img id="svg" src="${url}"></div>
    <script type="module">
      const img=document.getElementById('svg');
      if(img.decode){try{await img.decode();}catch(e){}}
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      window.__ready=true;
    </script></body></html>`;
}

// ---- item list ----
const items = [];
for (const id of Object.keys(RANGES)) {
  if (id.startsWith('mmd-')) items.push({ id, html: mermaidPage(slice(RANGES[id])) });
  else if (id.startsWith('code-')) { const [l, c] = CODE_META[id]; items.push({ id, html: codePage(slice(RANGES[id]), l, c) }); }
  else if (id === 'table-capabilities') items.push({ id, html: tablePage(slice(RANGES[id]), 'Agentic capabilities') });
  else if (id === 'table-config-knobs') items.push({ id, html: tablePage(slice(RANGES[id]), 'Environment variables') });
}
items.push({ id: 'why-different', html: svgPage('why-different.svg', 1200), timeout: 15000 });
items.push({ id: 'auth-planes', html: svgPage('auth-planes.svg', 1200), timeout: 15000 });

// ---- render ----
const filter = process.argv[2] || '';
const todo = items.filter((it) => it.id.includes(filter));
const { proc, conn } = await newBrowser();
const results = [];
try {
  for (const it of todo) {
    const htmlPath = join(__dir, `page-${it.id}.html`);
    writeFileSync(htmlPath, it.html);
    const outPng = join(MEDIA, `${it.id}.png`);
    try {
      const rect = await shoot(conn, pathToFileURL(htmlPath).href, outPng, { timeout: it.timeout || 30000 });
      results.push({ id: it.id, ok: true, w: rect.w, h: rect.h });
      console.log(`OK   ${it.id}  ${rect.w}x${rect.h}`);
    } catch (e) {
      results.push({ id: it.id, ok: false, err: String(e.message || e) });
      console.log(`FAIL ${it.id}  ${e.message || e}`);
    }
  }
} finally {
  proc.kill();
  for (const f of readdirSync(__dir)) if (f.startsWith('page-') && f.endsWith('.html')) unlinkSync(join(__dir, f));
}
const bad = results.filter((r) => !r.ok);
console.log(`\nDONE ${results.filter(r=>r.ok).length}/${results.length} ok` + (bad.length ? `, FAILED: ${bad.map(b=>b.id).join(', ')}` : ''));
