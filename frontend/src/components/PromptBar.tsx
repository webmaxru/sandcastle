import { useState } from 'react'

interface Props {
  onSubmit: (prompt: string) => void
  building: boolean
  hasSession: boolean
  initial?: string
}

export function PromptBar({ onSubmit, building, hasSession, initial }: Props) {
  const [value, setValue] = useState(initial ?? '')

  function submit() {
    const p = value.trim()
    if (!p || building) return
    onSubmit(p)
    setValue('')
  }

  return (
    <div className="promptbar">
      <textarea
        className="prompt-input"
        placeholder={
          hasSession
            ? 'Iterate — e.g. “add dark mode”, “add a high-score board”…'
            : 'Describe an app — e.g. “a snake game with neon styling”…'
        }
        value={value}
        rows={2}
        disabled={building}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
      />
      <button className="build-btn" onClick={submit} disabled={building || !value.trim()}>
        {building ? 'Building…' : hasSession ? 'Send' : 'Build it'}
      </button>
    </div>
  )
}
