import type { AppConfig, FileEntry, SseEvent } from './types'

const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export const apiBase = API_BASE

export function previewUrl(sessionId: string, version = 0): string {
  return `${API_BASE}/api/preview/${sessionId}/?v=${version}`
}

export async function getConfig(): Promise<AppConfig> {
  const r = await fetch(`${API_BASE}/api/config`)
  if (!r.ok) throw new Error(`config failed: ${r.status}`)
  return r.json()
}

export async function createSession(): Promise<{ id: string; preview: string }> {
  const r = await fetch(`${API_BASE}/api/sessions`, { method: 'POST' })
  if (!r.ok) {
    const detail = await safeDetail(r)
    throw new Error(detail || `create failed: ${r.status}`)
  }
  return r.json()
}

export async function getFiles(id: string): Promise<FileEntry[]> {
  const r = await fetch(`${API_BASE}/api/sessions/${id}/files`)
  if (!r.ok) throw new Error(`files failed: ${r.status}`)
  return (await r.json()).files
}

export async function getFileContent(id: string, path: string): Promise<string> {
  const r = await fetch(`${API_BASE}/api/sessions/${id}/files/${path}`)
  if (!r.ok) throw new Error(`file failed: ${r.status}`)
  return r.text()
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/sessions/${id}`, { method: 'DELETE' })
}

/** POST a build prompt and yield parsed SSE events as they stream in. */
export async function* streamBuild(
  id: string,
  prompt: string,
  signal?: AbortSignal,
): AsyncGenerator<SseEvent> {
  const r = await fetch(`${API_BASE}/api/sessions/${id}/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal,
  })
  if (!r.ok || !r.body) throw new Error(`build failed: ${r.status}`)

  const reader = r.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    let idx: number
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      const ev = parseFrame(frame)
      if (ev) yield ev
    }
  }
}

function parseFrame(frame: string): SseEvent | null {
  const dataLines: string[] = []
  for (const line of frame.split('\n')) {
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
  }
  if (dataLines.length === 0) return null
  try {
    return JSON.parse(dataLines.join('\n')) as SseEvent
  } catch {
    return null
  }
}

async function safeDetail(r: Response): Promise<string> {
  try {
    return (await r.json()).detail ?? ''
  } catch {
    return ''
  }
}
