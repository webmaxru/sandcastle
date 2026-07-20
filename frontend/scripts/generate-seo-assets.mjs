// Generate SEO / PWA raster assets from the Sandcastle brand mark, into public/.
//
// Why this exists: the CI/build image has no image libraries (sharp/canvas), so we
// pre-generate and COMMIT the rasters. This script is kept for reproducibility — run it
// only when the brand mark or social-card design changes:
//
//   node scripts/generate-seo-assets.mjs
//
// It drives headless Chrome over CDP (Node 22 global WebSocket + fetch — no Puppeteer)
// to rasterize inline SVG/HTML at exact pixel sizes, then packs favicon.ico by hand.
//
// Outputs (all in ../public):
//   favicon.ico (16/32/48)  apple-touch-icon.png (180, opaque)
//   icon-192.png  icon-512.png (rounded, transparent)  icon-maskable-512.png (512, opaque, safe zone)
//   og-image.png (1200x630, opaque social card)

import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import {
  writeFileSync, readFileSync, mkdirSync, mkdtempSync, rmSync, existsSync,
} from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import os from 'node:os'

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const PUBLIC = path.resolve(HERE, '..', 'public')
const FONTS = path.join(PUBLIC, 'fonts')
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9223 + Math.floor(Math.random() * 400)

// ---- brand ----------------------------------------------------------------
const INDIGO = '#3461c9'
const PAPER = '#f5f7f9'

/** The castle group from public/favicon.svg (white ink, amber flag). */
const CASTLE = `
  <path d="M12 2.4v4.2" stroke-width="1.6"/>
  <path d="M12 2.7 16 3.9 12 5.1Z" fill="#f4c77a" stroke="none"/>
  <path d="M3.5 20.8v-8.3h2.2v-2h2.2v2h2v-2.9h2.2v2.9h2v-2h2.2v2h2.2v8.3Z" fill="#ffffff" fill-opacity="0.18" stroke-width="1.5"/>
  <path d="M9.9 20.8v-3a2.1 2.1 0 0 1 4.2 0v3" stroke-width="1.4" fill="none"/>`

/** Rounded-tile mark (transparent outside), matches favicon.svg. */
const roundedSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" rx="5" fill="${INDIGO}"/>
  <g transform="translate(12 12.2) scale(0.82) translate(-11 -11.6)" stroke="#ffffff" stroke-linejoin="round" stroke-linecap="round">${CASTLE}</g>
</svg>`

/** Full-bleed square mark on indigo. `scale` shrinks the castle for maskable safe zones. */
const fullBleedSvg = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" fill="${INDIGO}"/>
  <g transform="translate(12 12.2) scale(${scale}) translate(-11 -11.6)" stroke="#ffffff" stroke-linejoin="round" stroke-linecap="round">${CASTLE}</g>
</svg>`

const iconPage = (svg, { bg = 'transparent' } = {}) =>
  `<!doctype html><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:${bg}}svg{display:block;width:100vw;height:100vh}</style>${svg}`

// ---- social card (1200x630) ----------------------------------------------
function fontFace(family, weight, file) {
  const b64 = readFileSync(path.join(FONTS, file)).toString('base64')
  return `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2')}`
}

function ogHtml() {
  const faces = [
    fontFace('Plex Sans', 400, 'ibm-plex-sans-latin-400-normal.woff2'),
    fontFace('Plex Sans', 600, 'ibm-plex-sans-latin-600-normal.woff2'),
    fontFace('Plex Sans', 700, 'ibm-plex-sans-latin-700-normal.woff2'),
    fontFace('Plex Mono', 500, 'ibm-plex-mono-latin-500-normal.woff2'),
  ].join('')
  const mark = `<svg viewBox="0 0 24 24" width="112" height="112" fill="none" style="border-radius:24px">
    <rect width="24" height="24" rx="5" fill="${INDIGO}"/>
    <g transform="translate(12 12.2) scale(0.82) translate(-11 -11.6)" stroke="#fff" stroke-linejoin="round" stroke-linecap="round">${CASTLE}</g></svg>`
  const lane = (dot, label) =>
    `<span class="lane"><span class="dot" style="background:${dot}"></span>${label}</span>`
  return `<!doctype html><meta charset="utf-8"><style>
    ${faces}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1200px;height:630px}
    body{background:${PAPER};color:#1f2734;font-family:'Plex Sans',system-ui,sans-serif;
      padding:76px 80px;position:relative;overflow:hidden}
    .frame{position:absolute;inset:20px;border:1px solid #dadee3;border-radius:20px;
      background:#fdfdfe;box-shadow:0 1px 2px rgba(31,39,52,.05),0 10px 30px rgba(31,39,52,.06)}
    .in{position:relative;height:100%;display:flex;flex-direction:column;gap:26px}
    .top{display:flex;align-items:center;gap:26px}
    .word{font-weight:700;font-size:76px;letter-spacing:-1.5px}
    .kicker{font-family:'Plex Mono',monospace;font-weight:500;font-size:20px;color:#4c535f;
      letter-spacing:.5px;text-transform:uppercase}
    h1{font-weight:600;font-size:52px;line-height:1.14;letter-spacing:-1px;max-width:1000px}
    h1 .a{color:${INDIGO}}
    .lanes{display:flex;gap:16px;margin-top:2px}
    .lane{display:inline-flex;align-items:center;gap:11px;font-family:'Plex Mono',monospace;
      font-weight:500;font-size:24px;color:#1f2734;background:#fdfdfe;border:1px solid #dadee3;
      border-radius:999px;padding:11px 22px}
    .dot{width:14px;height:14px;border-radius:50%;display:inline-block}
    .foot{margin-top:auto;display:flex;align-items:center;gap:16px;font-family:'Plex Mono',monospace;
      font-size:23px;color:#4c535f}
    .pass{color:#007842;font-weight:500}
    .url{color:${INDIGO};font-weight:500}
    .sep{color:#c2c8cf}
  </style>
  <div class="frame"></div>
  <div class="in">
    <div class="top">${mark}<div><div class="kicker">GitHub Copilot × Microsoft Agent Framework</div><div class="word">Sandcastle</div></div></div>
    <h1>Watch an AI team <span class="a">plan, build, run &amp; self-heal</span> a real app — live, in a sandbox.</h1>
    <div class="lanes">${lane('#0065b4', 'Planner')}${lane('#8d5403', 'Builder')}${lane('#007842', 'Fixer')}</div>
    <div class="foot"><span class="pass">✓ validation green</span><span class="sep">·</span><span>real code &amp; live preview</span><span class="sep">·</span><span class="url">sandcastle.isainative.dev</span></div>
  </div>`
}

// ---- minimal CDP client ---------------------------------------------------
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.sessions = new Map()
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data)
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id)
        if (m.error) reject(new Error(m.error.message)); else resolve(m.result)
      }
    })
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id
    const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId
    this.ws.send(JSON.stringify(msg))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }
}

async function connect(url) {
  const ws = new WebSocket(url)
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }) })
  return new CDP(ws)
}

async function capture(cdp, { file, width, height, transparent }) {
  const t = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const a = await cdp.send('Target.attachToTarget', { targetId: t.targetId, flatten: true })
  const s = a.sessionId
  await cdp.send('Page.enable', {}, s)
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, s)
  await cdp.send('Emulation.setDefaultBackgroundColorOverride',
    transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {}, s)
  await cdp.send('Page.navigate', { url: pathToFileURL(file).href }, s)
  await sleep(250)
  try { await cdp.send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>1)', awaitPromise: true }, s) } catch {}
  await sleep(400)
  const { data } = await cdp.send('Page.captureScreenshot',
    { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 }, captureBeyondViewport: true }, s)
  await cdp.send('Target.closeTarget', { targetId: t.targetId })
  return Buffer.from(data, 'base64')
}

// ---- favicon.ico (PNG-in-ICO) --------------------------------------------
function buildIco(pngs) {
  // pngs: [{size, buf}]
  const count = pngs.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(count, 4)
  const dir = Buffer.alloc(16 * count)
  let offset = 6 + 16 * count
  const bodies = []
  pngs.forEach((p, i) => {
    const b = i * 16
    dir.writeUInt8(p.size >= 256 ? 0 : p.size, b + 0)
    dir.writeUInt8(p.size >= 256 ? 0 : p.size, b + 1)
    dir.writeUInt8(0, b + 2); dir.writeUInt8(0, b + 3)
    dir.writeUInt16LE(1, b + 4); dir.writeUInt16LE(32, b + 6)
    dir.writeUInt32LE(p.buf.length, b + 8)
    dir.writeUInt32LE(offset, b + 12)
    offset += p.buf.length
    bodies.push(p.buf)
  })
  return Buffer.concat([header, dir, ...bodies])
}

// ---- main -----------------------------------------------------------------
async function main() {
  if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME} (set CHROME_PATH)`)
  mkdirSync(PUBLIC, { recursive: true })
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'seo-assets-'))
  const profile = path.join(tmp, 'profile')

  const write = (name, html) => { const f = path.join(tmp, name); writeFileSync(f, html); return f }

  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--remote-allow-origins=*',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  ], { stdio: 'ignore' })

  try {
    let wsUrl
    for (let i = 0; i < 60; i++) {
      try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); wsUrl = (await r.json()).webSocketDebuggerUrl; break } catch {}
      await sleep(200)
    }
    if (!wsUrl) throw new Error('Chrome DevTools endpoint did not come up')
    const cdp = await connect(wsUrl)

    const jobs = [
      { out: 'apple-touch-icon.png', page: iconPage(fullBleedSvg(0.78), { bg: INDIGO }), size: 180, transparent: false },
      { out: 'icon-192.png', page: iconPage(roundedSvg()), size: 192, transparent: true },
      { out: 'icon-512.png', page: iconPage(roundedSvg()), size: 512, transparent: true },
      { out: 'icon-maskable-512.png', page: iconPage(fullBleedSvg(0.6), { bg: INDIGO }), size: 512, transparent: false },
      { out: 'ico-16.png', page: iconPage(roundedSvg()), size: 16, transparent: true, tmpOnly: true },
      { out: 'ico-32.png', page: iconPage(roundedSvg()), size: 32, transparent: true, tmpOnly: true },
      { out: 'ico-48.png', page: iconPage(roundedSvg()), size: 48, transparent: true, tmpOnly: true },
    ]

    const icoParts = []
    for (const j of jobs) {
      const f = write(j.out + '.html', j.page)
      const buf = await capture(cdp, { file: f, width: j.size, height: j.size, transparent: j.transparent })
      if (j.tmpOnly) icoParts.push({ size: j.size, buf })
      else { writeFileSync(path.join(PUBLIC, j.out), buf); console.log('  wrote', j.out, `(${j.size}x${j.size})`) }
    }

    writeFileSync(path.join(PUBLIC, 'favicon.ico'), buildIco(icoParts))
    console.log('  wrote favicon.ico (16/32/48)')

    const ogf = write('og.html', ogHtml())
    const og = await capture(cdp, { file: ogf, width: 1200, height: 630, transparent: false })
    writeFileSync(path.join(PUBLIC, 'og-image.png'), og)
    console.log('  wrote og-image.png (1200x630)')
  } finally {
    try { chrome.kill() } catch {}
    try { rmSync(tmp, { recursive: true, force: true }) } catch {}
  }
  console.log('Done. Assets in', PUBLIC)
}

main().catch((e) => { console.error(e); process.exit(1) })
