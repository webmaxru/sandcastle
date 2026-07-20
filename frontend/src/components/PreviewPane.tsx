import { Icon } from './icons'
import type { AppConfig } from '../types'
import { track } from '../analytics'

interface Props {
  src: string | null
  hasApp: boolean
  config?: AppConfig | null
  onReload: () => void
}

export function PreviewPane({ src, hasApp, config, onReload }: Props) {
  if (!src || !hasApp) {
    const model = config?.model ?? 'openai/gpt-4o-mini'
    const sessions = config?.max_concurrent_sessions ?? 3
    const timeoutMin = Math.max(1, Math.round((config?.session_timeout_seconds ?? 600) / 60))
    const fixes = config?.max_fix_attempts ?? 2
    return (
      <div className="proof-empty">
        <span className="proof-empty-mark">
          <Icon name="monitor" size={26} strokeWidth={1.5} />
        </span>
        <p className="proof-empty-title">No running app yet</p>
        <p className="proof-empty-sub">
          Describe an app and the Builder will boot it here — a real, running preview, not a mockup.
        </p>

        <div className="limits" role="note" aria-label="Free-tier demo limitations">
          <div className="limits-head">
            <Icon name="info" size={14} strokeWidth={1.9} />
            Heads-up — this is a live demo on free tiers
          </div>
          <p className="limits-lead">
            Sandcastle builds <b>web frontend apps only</b> — a single <code>index.html</code> of vanilla
            HTML/CSS/JS that runs entirely in the browser. <b>No backend, no server, no databases.</b>
          </p>
          <div className="limits-grid">
            <div className="limit-card">
              <div className="limit-title">
                <Icon name="sparkle" size={14} strokeWidth={1.8} />
                GitHub Models inference · <code>{model}</code>
              </div>
              <ul>
                <li>Free, seat-free tier with <b>low rate limits</b> — roughly <b>10–15 requests/min</b> and <b>~150/day</b>; bursts get throttled (HTTP&nbsp;429).</li>
                <li>Small budget per call (~<b>8k input / 4k output tokens</b>), so builds target compact, single-page apps.</li>
                <li>Shared demo key — <b>not for production</b> or sensitive data.</li>
              </ul>
            </div>
            <div className="limit-card">
              <div className="limit-title">
                <Icon name="globe" size={14} strokeWidth={1.8} />
                Azure Static Web Apps · free tier
              </div>
              <ul>
                <li>A static frontend app is exactly what the SWA <b>free</b> tier hosts — global CDN, free SSL, custom domains, <b>100&nbsp;GB</b> bandwidth/mo.</li>
                <li>Every build is a drop-in <code>index.html</code> you could publish to SWA free tier as-is (up to <b>250&nbsp;MB</b> per app).</li>
                <li>This shared demo runs <b>{sessions} builds</b> at a time; each ends after <b>{timeoutMin}&nbsp;min</b>, with up to <b>{fixes} self-heal passes</b>.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="proof">
      <div className="proof-chrome">
        <span className="proof-url">
          <Icon name="lock" size={12} strokeWidth={1.8} />
          <span className="proof-url-text">app preview · localhost</span>
        </span>
        <div className="proof-actions">
          <button className="icon-btn" onClick={() => { track('preview_reload'); onReload() }} aria-label="Reload preview" title="Reload">
            <Icon name="reload" size={15} strokeWidth={1.8} />
          </button>
          <a
            className="icon-btn"
            href={src}
            target="_blank"
            rel="noreferrer"
            onClick={() => track('preview_open_newtab')}
            aria-label="Open preview in a new tab"
            title="Open in new tab"
          >
            <Icon name="external" size={15} strokeWidth={1.8} />
          </a>
        </div>
      </div>
      <iframe
        className="proof-frame"
        src={src}
        title="Live preview of the generated app"
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
      />
    </div>
  )
}
