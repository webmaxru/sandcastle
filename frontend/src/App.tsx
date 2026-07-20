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
import { Icon, Logo } from './components/icons'

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
    const params = new URLSearchParams(window.location.search)
    const q = params.get('prompt')
    if (q) setInitialPrompt(q)
    // DEV-only: seed a mock transcript for screenshots. Stripped from production builds.
    if (import.meta.env.DEV && params.has('demo')) {
      setActivities(demoActivities())
      setFiles(demoFiles())
      getConfig().then(setConfig).catch(() => setConfig(demoConfig()))
    } else {
      getConfig().then(setConfig).catch(() => setConfig(null))
    }
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
        // Defensive: if a stream ends without the matching tool_end events
        // (network drop, aborted build, or a server-side truncation), clear any
        // lingering "running" rows so the feed never spins forever.
        setActivities((prev) => finalizeRunning(prev))
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

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

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
  const started = activities.length > 0 || building

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo size={30} className="brand-logo" />
          <div className="brand-text">
            <h1 className="wordmark">Sandcastle</h1>
            <p className="brand-tag">An AI team builds, runs &amp; self-heals a live app — watch it happen.</p>
          </div>
        </div>
        {config && (
          <div className="runrail" role="group" aria-label="Run configuration">
            <Chip label="model" value={config.model} />
            <Chip label="team" value={config.agents.join(' → ')} />
            <Chip
              label="grounding"
              value={config.mcp_grounding.length ? 'Microsoft Learn' : 'off'}
              on={config.mcp_grounding.length > 0}
            />
            <Chip label="self-heal" value={`${config.max_fix_attempts}×`} />
            {config.observability && <Chip label="otel" value="App Insights" on />}
          </div>
        )}
      </header>

      <main className="workspace">
        <section className="panel panel-log" aria-label="Build log">
          <div className="panel-head">
            <span className="panel-title">
              <Icon name="code" size={15} strokeWidth={1.8} />
              Build log
            </span>
            {(started || sessionId) && (
              <div className="panel-actions">
                <button className="ghost-btn" onClick={handleShare}>
                  <Icon name="link" size={14} strokeWidth={1.8} />
                  Share
                </button>
                {sessionId && (
                  <button className="ghost-btn" onClick={handleNewApp}>
                    <Icon name="plus" size={14} strokeWidth={1.9} />
                    New app
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="panel-body">
            {!started ? (
              <ExampleGallery onPick={handleBuild} />
            ) : (
              <ActivityFeed activities={activities} building={building} />
            )}
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <Icon name="alert" size={15} strokeWidth={1.8} />
              <span>{error}</span>
            </div>
          )}

          <PromptBar
            onSubmit={handleBuild}
            onStop={handleStop}
            building={building}
            hasSession={!!sessionId}
            initial={initialPrompt}
            key={sessionId ?? 'new'}
          />
        </section>

        <section className="panel panel-proof" aria-label="Result">
          <div className="tabs" role="tablist" aria-label="Result view">
            <button
              role="tab"
              id="tab-preview"
              aria-selected={tab === 'preview'}
              aria-controls="panel-preview"
              className={tab === 'preview' ? 'tab is-active' : 'tab'}
              onClick={() => setTab('preview')}
            >
              <Icon name="monitor" size={15} strokeWidth={1.8} />
              Live preview
            </button>
            <button
              role="tab"
              id="tab-code"
              aria-selected={tab === 'code'}
              aria-controls="panel-code"
              className={tab === 'code' ? 'tab is-active' : 'tab'}
              onClick={() => setTab('code')}
            >
              <Icon name="file-code" size={15} strokeWidth={1.8} />
              Code
              {files.length > 0 && <span className="tab-count">{files.length}</span>}
            </button>
          </div>

          <div className="panel-body">
            <div
              role="tabpanel"
              id="panel-preview"
              aria-labelledby="tab-preview"
              className="tabpanel"
              hidden={tab !== 'preview'}
            >
              <PreviewPane
                src={previewSrc}
                hasApp={hasApp}
                onReload={() => setPreviewVersion((v) => v + 1)}
              />
            </div>
            <div
              role="tabpanel"
              id="panel-code"
              aria-labelledby="tab-code"
              className="tabpanel"
              hidden={tab !== 'code'}
            >
              <FileExplorer sessionId={sessionId} files={files} />
            </div>
          </div>
        </section>
      </main>

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={15} strokeWidth={2} />
          {toast}
        </div>
      )}

      <footer className="footer">
        <span>
          Powered by the <strong>GitHub Copilot</strong> provider for the{' '}
          <strong>Microsoft Agent Framework</strong>
          {config && <> · {config.auth_mode.toUpperCase()} mode</>}
        </span>
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

/** Clear any still-"running" tool rows when a build stream ends without their tool_end. */
function finalizeRunning(prev: Activity[]): Activity[] {
  if (!prev.some((a) => a.running)) return prev
  return prev.map((a) => (a.running ? { ...a, running: false, ok: false } : a))
}

/** DEV-only fixtures for screenshots. Never referenced in production builds. */
function demoActivities(): Activity[] {
  return [
    { key: 'd0', kind: 'user', text: 'A Pomodoro focus timer with work/break cycles and a session counter.' },
    { key: 'd1', kind: 'phase', agent: 'planner', label: 'Planning the build' },
    { key: 'd2', kind: 'text', agent: 'planner', text: 'A single-page timer: 25-minute focus, 5-minute break, start/pause, and a counter of completed rounds.' },
    { key: 'd3', kind: 'phase', agent: 'builder', label: 'Writing the app' },
    { key: 'd4', kind: 'tool', tool: 'write', summary: 'write index.html', running: false, ok: true },
    { key: 'd5', kind: 'tool', tool: 'write', summary: 'write styles.css', running: false, ok: true },
    { key: 'd6', kind: 'tool', tool: 'docs', summary: 'Microsoft Learn · setInterval timing accuracy', running: false, ok: true },
    { key: 'd7', kind: 'tool', tool: 'write', summary: 'write app.js', running: false, ok: true },
    { key: 'd8', kind: 'phase', agent: 'fixer', label: 'Validating & self-healing' },
    { key: 'd9', kind: 'validation', agent: 'fixer', green: false, issues: ['app.js:42 — timer drifts on background tabs'] },
    { key: 'd10', kind: 'tool', tool: 'edit', summary: 'edit app.js — switch to timestamp-based ticks', running: false, ok: true },
    { key: 'd11', kind: 'validation', agent: 'fixer', green: true },
  ]
}

function demoFiles(): FileEntry[] {
  return [
    { path: 'index.html', size: 1284 },
    { path: 'styles.css', size: 2361 },
    { path: 'app.js', size: 3820 },
  ]
}

function demoConfig(): AppConfig {
  return {
    auth_mode: 'pat',
    model: 'gpt-4.1',
    agents: ['planner', 'builder', 'fixer'],
    mcp_grounding: ['Microsoft Learn'],
    max_concurrent_sessions: 3,
    max_fix_attempts: 2,
    session_timeout_seconds: 300,
    observability: true,
  }
}
