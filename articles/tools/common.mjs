// Shared HTML shell: self-hosted IBM Plex fonts + the article's warm "drafting-paper"
// palette, framed as a paper mat holding a flat white sheet (matches media/*.svg + DESIGN.md).

export const P = {
  paper: '#FBF8F2',      // warm drafting-paper mat (matches the two hand-authored SVGs)
  sheet: '#FFFFFF',
  line: '#E7E0D3',       // warm hairline
  ink: '#1F2937',
  inkSoft: '#374151',
  inkFaint: '#6B7280',
  recessed: '#F7F6F2',
  teal: '#0E7C86',       // provider accent
  planner: '#1D4ED8',
  builder: '#B45309',
  fixer: '#16A34A',
  ground: '#6D28D9',
  danger: '#C51D28',
  indigo: '#3461C9',
};

const fontFace = (fam, weight, file) => `@font-face{font-family:'${fam}';font-style:normal;font-weight:${weight};font-display:block;src:url('./fonts/${file}') format('woff2');}`;

export const FONTS = [
  fontFace('IBM Plex Sans', 400, 'ibm-plex-sans-latin-400-normal.woff2'),
  fontFace('IBM Plex Sans', 500, 'ibm-plex-sans-latin-500-normal.woff2'),
  fontFace('IBM Plex Sans', 600, 'ibm-plex-sans-latin-600-normal.woff2'),
  fontFace('IBM Plex Sans', 700, 'ibm-plex-sans-latin-700-normal.woff2'),
  fontFace('IBM Plex Mono', 400, 'ibm-plex-mono-latin-400-normal.woff2'),
  fontFace('IBM Plex Mono', 500, 'ibm-plex-mono-latin-500-normal.woff2'),
  fontFace('IBM Plex Mono', 600, 'ibm-plex-mono-latin-600-normal.woff2'),
].join('\n');

export const BASE_CSS = `
${FONTS}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#ffffff;}
#shot{display:inline-block;background:${P.paper};padding:40px;}
.sheet{background:${P.sheet};border:1px solid ${P.line};border-radius:16px;
  box-shadow:0 2px 8px rgba(31,39,52,0.07),0 14px 30px rgba(31,39,52,0.06);overflow:hidden;}
.sheet-pad{padding:26px 30px 28px;}
.cap{font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:12px;font-weight:600;
  letter-spacing:.06em;text-transform:uppercase;color:${P.inkFaint};}
`;

// Wrap body content in the paper-mat + sheet frame and emit a ready-signalling doc.
export function doc({ css = '', body, head = '', ready }) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>${BASE_CSS}${css}</style>${head}</head>
<body><div id="shot"><div class="sheet">${body}</div></div>
<script type="module">
${ready}
</script></body></html>`;
}
