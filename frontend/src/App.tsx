import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import type { Activity, AppConfig, FileEntry, SseEvent } from './types'
import {
  createSession,
  deleteSession,
  getConfig,
  previewUrl,
  streamBuild,
} from './api'
import { ActivityFeed } from './components/ActivityFeed'
import { ExampleGallery } from './components/ExampleGallery'
import { FileExplorer } from './components/FileExplorer'
import { PreviewPane } from './components/PreviewPane'
import { PromptBar } from './components/PromptBar'
import { Chip } from './components/Badges'

let _seq = 0
const uid = () => `a${Date.now()}_${_seq++}`

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [building, setBuilding] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [files, setFiles] = useState<FileEntry[]>([])
  const [previewVersion, setPreviewVersion] = useState(0)
  const [hasApp, setHasApp] = useState(false)
  const [tab, setTab] = useState<'preview' | 'code'>('preview')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [initialPrompt, setInitialPrompt] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const lastPromptRef = useRef('')

  useEffect(() => {
    getConfig().then(setConfig).catch(() => setConfig(null))
    const q = new URLSearchParams(window.location.search).get('prompt')
    if (q) setInitialPrompt(q)
  }, [])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const handleBuild = useCallback(
    async (prompt: string) => {
      if (building) return
      setError(null)
      setBuilding(true)
      lastPromptRef.current = prompt
      setActivities((prev) => [...prev, { key: uid(), kind: 'user', text: prompt }])

      try {
        let id = sessionId
        if (!id) {
          const s = await createSession()
          id = s.id
          setSessionId(id)
        }
        const ctrl = new AbortController()
        abortRef.current = ctrl

        for await (const ev of streamBuild(id, prompt, ctrl.signal)) {
          applyStreamEvent(ev)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg !== 'BodyStreamBuffer was aborted' && !msg.includes('aborted')) {
          setError(msg)
          setActivities((prev) => [...prev, { key: uid(), kind: 'error', text: msg }])
        }
      } finally {
        setBuilding(false)
        abortRef.current = null
      }
    },
    [building, sessionId],
  )

  function applyStreamEvent(ev: SseEvent) {
    switch (ev.type) {
      case 'files':
        setFiles(ev.files ?? [])
        return
      case 'done':
        setHasApp(!!ev.preview)
        if (ev.preview) {
          setPreviewVersion((v) => v + 1)
          setTab('preview')
        }
        return
      case 'status':
      case 'usage':
        return
      default:
        setActivities((prev) => reduceActivity(prev, ev))
    }
  }

  const handleNewApp = useCallback(async () => {
    abortRef.current?.abort()
    const id = sessionId
    setSessionId(null)
    setActivities([])
    setFiles([])
    setHasApp(false)
    setBuilding(false)
    setError(null)
    setTab('preview')
    if (id) deleteSession(id).catch(() => undefined)
  }, [sessionId])

  const handleShare = useCallback(() => {
    const p = lastPromptRef.current
    const url = `${window.location.origin}${window.location.pathname}${
      p ? `?prompt=${encodeURIComponent(p)}` : ''
    }`
    navigator.clipboard?.writeText(url).then(
      () => flash('Shareable link copied to clipboard'),
      () => flash(url),
    )
  }, [flash])

  const previewSrc = sessionId ? previewUrl(sessionId, previewVersion) : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">🏰</span>
          <div>
            <div className="brand-name">Sandcastle</div>
            <div className="brand-tag">
              Describe an app. Watch a team of Copilot agents build, ground &amp; self-heal it — live.
            </div>
          </div>
        </div>
        <div className="badges">
          {config && (
            <>
              <Chip label="model" value={config.model} />
              <Chip label="team" value={config.agents.join(' → ')} />
              <Chip
                label="grounding"
                value={config.mcp_grounding.length ? 'Microsoft Learn' : 'off'}
                on={config.mcp_grounding.length > 0}
              />
              <Chip label="self-heal" value={`${config.max_fix_attempts}×`} />
            </>
          )}
        </div>
      </header>

      <main className="workspace">
        <section className="left">
          <div className="left-head">
            <span>Agent activity</span>
            <div className="left-actions">
              {(activities.length > 0 || sessionId) && (
                <button className="ghost-btn" onClick={handleShare}>
                  Share
                </button>
              )}
              {sessionId && (
                <button className="ghost-btn" onClick={handleNewApp}>
                  New app
                </button>
              )}
            </div>
          </div>

          <div className="left-body">
            {activities.length === 0 && !building ? (
              <ExampleGallery onPick={handleBuild} />
            ) : (
              <ActivityFeed activities={activities} building={building} />
            )}
          </div>

          {error && <div className="error-banner">⚠️ {error}</div>}

          <PromptBar
            onSubmit={handleBuild}
            building={building}
            hasSession={!!sessionId}
            initial={initialPrompt}
            key={sessionId ?? 'new'}
          />
        </section>

        <section className="right">
          <div className="tabs">
            <button className={tab === 'preview' ? 'tab active' : 'tab'} onClick={() => setTab('preview')}>
              Live preview
            </button>
            <button className={tab === 'code' ? 'tab active' : 'tab'} onClick={() => setTab('code')}>
              Code {files.length > 0 && <span className="tab-count">{files.length}</span>}
            </button>
          </div>
          <div className="right-body">
            {tab === 'preview' ? (
              <PreviewPane
                src={previewSrc}
                hasApp={hasApp}
                onReload={() => setPreviewVersion((v) => v + 1)}
              />
            ) : (
              <FileExplorer sessionId={sessionId} files={files} />
            )}
          </div>
        </section>
      </main>

      {toast && <div className="toast">{toast}</div>}
      <footer className="footer">
        Powered by the <strong>GitHub Copilot</strong> provider for{' '}
        <strong>Microsoft Agent Framework</strong>
        {config && ` · ${config.auth_mode.toUpperCase()} mode`}
      </footer>
    </div>
  )
}

function reduceActivity(prev: Activity[], ev: SseEvent): Activity[] {
  switch (ev.type) {
    case 'phase':
      return [...prev, { key: uid(), kind: 'phase', agent: ev.agent, label: ev.label }]
    case 'tool_start':
      return [
        ...prev,
        {
          key: ev.id || uid(),
          kind: 'tool',
          agent: ev.agent,
          tool: ev.tool,
          summary: ev.summary,
          running: true,
        },
      ]
    case 'tool_end':
      return prev.map((a) =>
        a.kind === 'tool' && a.key === ev.id
          ? { ...a, running: false, ok: ev.success !== false }
          : a,
      )
    case 'text': {
      const last = prev[prev.length - 1]
      const delta = ev.text ?? ''
      if (last && last.kind === 'text' && last.agent === ev.agent) {
        const copy = prev.slice(0, -1)
        return [...copy, { ...last, text: (last.text ?? '') + delta }]
      }
      return [...prev, { key: uid(), kind: 'text', agent: ev.agent, text: delta }]
    }
    case 'validation':
      return [
        ...prev,
        { key: uid(), kind: 'validation', green: ev.green, issues: ev.issues, agent: 'fixer' },
      ]
    case 'error':
      return [
        ...prev,
        { key: uid(), kind: 'error', text: `[${ev.agent ?? 'system'}] ${ev.message ?? ''}` },
      ]
    default:
      return prev
  }
}
