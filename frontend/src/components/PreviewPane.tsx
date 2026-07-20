import { Icon } from './icons'

interface Props {
  src: string | null
  hasApp: boolean
  onReload: () => void
}

export function PreviewPane({ src, hasApp, onReload }: Props) {
  if (!src || !hasApp) {
    return (
      <div className="proof-empty">
        <span className="proof-empty-mark">
          <Icon name="monitor" size={26} strokeWidth={1.5} />
        </span>
        <p className="proof-empty-title">No running app yet</p>
        <p className="proof-empty-sub">
          Describe an app and the Builder will boot it here — a real, running preview, not a mockup.
        </p>
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
          <button className="icon-btn" onClick={onReload} aria-label="Reload preview" title="Reload">
            <Icon name="reload" size={15} strokeWidth={1.8} />
          </button>
          <a
            className="icon-btn"
            href={src}
            target="_blank"
            rel="noreferrer"
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
