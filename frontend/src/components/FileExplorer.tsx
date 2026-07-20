import { useEffect, useState } from 'react'
import type { FileEntry } from '../types'
import { getFileContent } from '../api'
import { Icon, type IconName } from './icons'
import { track } from '../analytics'

interface Props {
  sessionId: string | null
  files: FileEntry[]
}

function iconFor(path: string): IconName {
  if (path.endsWith('.html')) return 'file-code'
  if (path.endsWith('.css')) return 'file-style'
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.ts')) return 'braces'
  if (path.endsWith('.json')) return 'braces'
  if (path.endsWith('.md')) return 'docs'
  return 'file'
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(1)} KB`
}

export function FileExplorer({ sessionId, files }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  // Auto-select the entry point (or first file) when the file set changes.
  useEffect(() => {
    if (files.length === 0) {
      setSelected(null)
      setContent('')
      return
    }
    const pick = selected && files.some((f) => f.path === selected)
      ? selected
      : files.find((f) => f.path.endsWith('index.html'))?.path ?? files[0].path
    setSelected(pick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  useEffect(() => {
    if (!sessionId || !selected) return
    let alive = true
    setLoading(true)
    getFileContent(sessionId, selected)
      .then((t) => {
        if (alive) setContent(t)
      })
      .catch(() => {
        if (alive) setContent('// could not load file')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [sessionId, selected])

  if (files.length === 0) {
    return (
      <div className="proof-empty">
        <span className="proof-empty-mark">
          <Icon name="file-code" size={24} strokeWidth={1.5} />
        </span>
        <p className="proof-empty-title">No files yet</p>
        <p className="proof-empty-sub">Source files appear here as the Builder writes them.</p>
      </div>
    )
  }

  return (
    <div className="explorer">
      <ul className="file-list" role="listbox" aria-label="Generated files">
        {files.map((f) => (
          <li key={f.path}>
            <button
              type="button"
              role="option"
              aria-selected={selected === f.path}
              className={`file-row ${selected === f.path ? 'is-active' : ''}`}
              onClick={() => {
                track('file_select', { ext: f.path.split('.').pop() ?? '' })
                setSelected(f.path)
              }}
            >
              <Icon name={iconFor(f.path)} size={15} strokeWidth={1.7} />
              <span className="file-name">{f.path}</span>
              <span className="file-size">{fmtSize(f.size)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="code-view">
        {loading ? (
          <div className="code-skeleton" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="sk-line" style={{ width: `${40 + ((i * 37) % 55)}%` }} />
            ))}
          </div>
        ) : (
          <pre className="code-pre" tabIndex={0} aria-label={selected ? `Contents of ${selected}` : undefined}>
            <code>{content}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
