// Minimal Chrome DevTools Protocol client (Node 22 global WebSocket + fetch).
// Launches local Chrome headless, screenshots a #shot element from file:// HTML pages.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9412;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function launchChrome() {
  const udd = mkdtempSync(join(tmpdir(), 'cdp-chrome-'));
  const args = [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', '--hide-scrollbars',
    '--force-color-profile=srgb', '--font-render-hinting=none',
    `--user-data-dir=${udd}`, `--remote-debugging-port=${PORT}`, 'about:blank',
  ];
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  return proc;
}

async function wsEndpoint() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

class Conn {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  return new Conn(ws);
}

export async function newBrowser() {
  const proc = launchChrome();
  const url = await wsEndpoint();
  const conn = await connect(url);
  return { proc, conn };
}

// Screenshot the #shot element of a file:// page. Waits for window.__ready.
export async function shoot(conn, fileUrl, outPath, { timeout = 25000, settle = 250 } = {}) {
  const { targetId } = await conn.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await conn.send('Target.attachToTarget', { targetId, flatten: true });
  try {
    await conn.send('Page.enable', {}, sessionId);
    await conn.send('Runtime.enable', {}, sessionId);
    await conn.send('Page.navigate', { url: fileUrl }, sessionId);

    // wait for window.__ready === true
    const start = Date.now();
    for (;;) {
      const { result } = await conn.send('Runtime.evaluate',
        { expression: 'window.__ready === true', returnByValue: true }, sessionId);
      if (result && result.value === true) break;
      if (Date.now() - start > timeout) throw new Error(`timeout waiting for __ready: ${fileUrl}`);
      await sleep(120);
    }
    await sleep(settle);

    // measure #shot (return primitive JSON string; invoke the IIFE!)
    const { result: rectRes } = await conn.send('Runtime.evaluate', {
      expression: `JSON.stringify((()=>{const e=document.querySelector('#shot');const r=e.getBoundingClientRect();return {x:r.x+window.scrollX,y:r.y+window.scrollY,w:Math.ceil(r.width),h:Math.ceil(r.height)};})())`,
      returnByValue: true,
    }, sessionId);
    const rect = JSON.parse(rectRes.value);

    const { data } = await conn.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: 2 },
      captureBeyondViewport: true,
    }, sessionId);
    writeFileSync(outPath, Buffer.from(data, 'base64'));
    return rect;
  } finally {
    await conn.send('Target.closeTarget', { targetId });
  }
}
