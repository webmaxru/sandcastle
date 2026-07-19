interface Props {
  src: string | null
  hasApp: boolean
  onReload: () => void
}

export function PreviewPane({ src, hasApp, onReload }: Props) {
  return (
    <div className="preview">
      <div className="preview-toolbar">
        <span className="preview-url">{src ? stripQuery(src) : 'about:blank'}</span>
        <div className="preview-actions">
          <button className="icon-btn" onClick={onReload} disabled={!hasApp} title="Reload">
            ⟳
          </button>
          {src && hasApp && (
            <a className="icon-btn" href={src} target="_blank" rel="noreferrer" title="Open in new tab">
              ↗
            </a>
          )}
        </div>
      </div>
      <div className="preview-body">
        {hasApp && src ? (
          <iframe
            title="Live preview"
            src={src}
            className="preview-frame"
            sandbox="allow-scripts allow-pointer-lock allow-modals allow-forms allow-popups allow-same-origin"
          />
        ) : (
          <div className="preview-placeholder">
            <div className="preview-castle">🏖️</div>
            <p>Your live app will render here.</p>
            <p className="muted">Describe something and watch the agents build it.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function stripQuery(url: string): string {
  return url.split('?')[0]
}
