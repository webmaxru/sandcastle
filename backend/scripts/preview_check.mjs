// Headless functional check for the built starter apps.
//
// Reads .sessions/validate_report.json (written by validate_starters.py), serves the
// persisted apps in .sessions/_results over http, and loads each one in headless Chrome
// via CDP (Node 22 global WebSocket + fetch — no Puppeteer). For every app it records
// uncaught JS exceptions, console errors, and network responses, then checks an app
// specific "ready" signal so we know the app actually WORKS, not merely that its JS
// parses. Weather additionally must make a live Open-Meteo 200 and render a temperature.
//
// Usage:  node backend/scripts/preview_check.mjs
// Exit 0 if every app passes, 1 otherwise.

import { spawn } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSIONS = path.join(__dirname, '..', '.sessions')
const RESULTS = path.join(SESSIONS, '_results')
const REPORT = path.join(SESSIONS, 'validate_report.json')
const OUT = path.join(SESSIONS, 'preview_report.json')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

// Per-app "the app actually rendered/works" probe, evaluated in the page.
const READY = {
  weather: `/-?\\d+\\s*°/.test(document.body.innerText)`,
  pomodoro: `/\\b\\d?\\d\\s*:\\s*\\d\\d\\b/.test(document.body.innerText)`,
  markdown: `document.querySelectorAll('textarea,[contenteditable="true"]').length>0`,
  kanban: `/to-?do/i.test(document.body.innerText)&&/doing/i.test(document.body.innerText)&&/\\bdone\\b/i.test(document.body.innerText)`,
  expense: `/(settle|owes?|expense)/i.test(document.body.innerText)`,
  typing: `/wpm|words\\s*per\\s*minute/i.test(document.body.innerText)`,
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function startServer(root) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0])
    if (url === '/favicon.ico') { res.writeHead(204); res.end(); return }
    let file = path.join(root, url)
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

// --- Minimal CDP client over the browser websocket (flat sessions) ---
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Set()
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id)
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
      } else if (msg.method) {
        for (const h of this.handlers) h(msg)
      }
    })
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }
  on(fn) { this.handlers.add(fn) }
}

async function connect(url) {
  const ws = new WebSocket(url)
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }) })
  return new CDP(ws)
}

async function checkApp(cdp, base, name) {
  const target = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true })

  const exceptions = []
  const consoleErrors = []
  const responses = []
  const failures = []
  cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails
      exceptions.push(d.exception?.description || d.text || 'exception')
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push((msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200))
    } else if (msg.method === 'Network.responseReceived') {
      responses.push({ url: msg.params.response.url, status: msg.params.response.status })
    } else if (msg.method === 'Network.loadingFailed') {
      failures.push(msg.params.errorText + ' ' + (msg.params.type || ''))
    }
  })
  for (const d of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await cdp.send(d, {}, sessionId)

  await cdp.send('Page.navigate', { url: `${base}/${name}/index.html` }, sessionId)
  await sleep(1200)

  // Poll the app-specific ready signal for up to 12s (covers async fetch + render).
  const ready = READY[name] || 'document.body.innerText.length>50'
  let isReady = false
  for (let i = 0; i < 24 && !isReady; i++) {
    try {
      const r = await cdp.send('Runtime.evaluate', { expression: `!!(${ready})`, returnByValue: true }, sessionId)
      isReady = !!r.result.value
    } catch { /* page mid-navigation */ }
    if (!isReady) await sleep(500)
  }

  const textRes = await cdp.send('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true }, sessionId).catch(() => ({ result: { value: '' } }))
  const text = (textRes.result.value || '').trim()

  await cdp.send('Target.closeTarget', { targetId: target.targetId }).catch(() => {})

  const weatherApi = responses.filter((r) => /open-meteo\.com/.test(r.url))
  const weatherOk = weatherApi.some((r) => r.status === 200)
  const badApi = responses.filter((r) => r.status >= 400 && !/favicon/.test(r.url))

  let pass = exceptions.length === 0 && isReady && text.length > 40
  const reasons = []
  if (exceptions.length) reasons.push(`uncaught: ${exceptions[0]}`)
  if (!isReady) reasons.push('ready-signal not met')
  if (text.length <= 40) reasons.push('blank page')
  if (name === 'weather') {
    if (!weatherApi.length) { pass = false; reasons.push('no Open-Meteo request') }
    else if (!weatherOk) { pass = false; reasons.push('Open-Meteo did not return 200') }
  }
  return { name, pass, reasons, isReady, exceptions, consoleErrors: consoleErrors.slice(0, 5), weatherApi, badApi: badApi.slice(0, 5), textLen: text.length }
}

async function main() {
  if (!fs.existsSync(REPORT)) { console.error(`missing ${REPORT}`); process.exit(2) }
  const report = JSON.parse(fs.readFileSync(REPORT, 'utf-8'))
  const names = Object.keys(report).filter((n) => fs.existsSync(path.join(RESULTS, n, 'index.html')))
  if (!names.length) { console.error('no built apps to check'); process.exit(2) }

  const server = await startServer(RESULTS)
  const port = server.address().port
  const base = `http://127.0.0.1:${port}`

  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'))
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${userDir}`, '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = ''
    const t = setTimeout(() => reject(new Error('chrome devtools url timeout')), 15000)
    chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/ws:\/\/[^\s]+/); if (m) { clearTimeout(t); resolve(m[0]) } })
  })
  const cdp = await connect(wsUrl)

  const results = []
  for (const name of names) {
    process.stdout.write(`  checking ${name} … `)
    const r = await checkApp(cdp, base, name)
    results.push(r)
    console.log(r.pass ? `PASS (ready=${r.isReady}, ${r.textLen}B)` : `FAIL — ${r.reasons.join('; ')}`)
    if (name === 'weather') console.log(`      open-meteo: ${JSON.stringify(r.weatherApi)}`)
    if (r.consoleErrors.length) r.consoleErrors.forEach((e) => console.log(`      console.error: ${e}`))
  }

  fs.writeFileSync(OUT, JSON.stringify(results, null, 2))
  chrome.kill()
  server.close()

  const failed = results.filter((r) => !r.pass)
  console.log(`\n=== HEADLESS SUMMARY ===`)
  results.forEach((r) => console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.pass ? '' : '  <- ' + r.reasons.join('; ')}`))
  console.log(`\n[report] ${OUT}`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(2) })
