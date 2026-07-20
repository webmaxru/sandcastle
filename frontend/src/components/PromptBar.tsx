import { useEffect, useRef, useState } from 'react'
import { Icon } from './icons'

interface Props {
  onSubmit: (prompt: string) => void
  onStop: () => void
  building: boolean
  hasSession: boolean
  initial?: string
}

export function PromptBar({ onSubmit, onStop, building, hasSession, initial }: Props) {
  const [value, setValue] = useState(initial ?? '')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initial) setValue(initial)
  }, [initial])

  // Auto-grow the textarea up to a cap.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`
  }, [value])

  function submit() {
    const v = value.trim()
    if (!v || building) return
    onSubmit(v)
    setValue('')
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const placeholder = hasSession
    ? 'Refine it — ask for a change, a fix, or a new feature…'
    : 'Describe an app to build. Try: “a tip calculator that splits the bill”'

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label htmlFor="composer-input" className="sr-only">
        Describe the app you want the agents to build
      </label>
      <textarea
        id="composer-input"
        ref={ref}
        className="composer-input"
        rows={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        aria-describedby="composer-hint"
      />
      <div className="composer-foot">
        <span id="composer-hint" className="composer-hint">
          <kbd>Enter</kbd> to build · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line
        </span>
        {building ? (
          <button type="button" className="btn btn-stop" onClick={onStop}>
            <Icon name="stop" size={15} />
            Stop
          </button>
        ) : (
          <button type="submit" className="btn btn-build" disabled={!value.trim()}>
            <Icon name="build" size={16} strokeWidth={1.9} />
            {hasSession ? 'Send' : 'Build it'}
          </button>
        )}
      </div>
    </form>
  )
}
