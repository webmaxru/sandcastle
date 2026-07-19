import { useEffect, useState } from 'react'
import type { FileEntry } from '../types'
import { getFileContent } from '../api'

interface Props {
  sessionId: string | null
  files: FileEntry[]
}

export function FileExplorer({ sessionId, files }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Auto-select index.html when files first appear.
    if (!selected && files.length > 0) {
      const idx = files.find((f) => f.path === 'index.html') ?? files[0]
      setSelected(idx.path)
    }
  }, [files, selected])

  useEffect(() => {
    if (!sessionId || !selected) return
    setLoading(true)
    getFileContent(sessionId, selected)
      .then(setContent)
      .catch(() => setContent('// (unable to read file)'))
      .finally(() => setLoading(false))
  }, [sessionId, selected])

  if (files.length === 0) {
    return <div className="empty-hint">Files the agents create will appear here.</div>
  }

  return (
    <div className="explorer">
      <ul className="file-list">
        {files.map((f) => (
          <li
            key={f.path}
            className={f.path === selected ? 'active' : ''}
            onClick={() => setSelected(f.path)}
          >
            <span className="file-name">{fileIcon(f.path)} {f.path}</span>
            <span className="file-size">{fmtSize(f.size)}</span>
          </li>
        ))}
      </ul>
      <pre className="code-view">{loading ? 'Loading…' : content}</pre>
    </div>
  )
}

function fileIcon(path: string): string {
  if (path.endsWith('.html')) return '📄'
  if (path.endsWith('.css')) return '🎨'
  if (path.endsWith('.js') || path.endsWith('.mjs')) return '📜'
  if (/\.(png|jpg|jpeg|svg|gif|webp)$/.test(path)) return '🖼️'
  return '📁'
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(1)} KB`
}
