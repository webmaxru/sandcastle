import { memo, useLayoutEffect, useRef } from 'react'
import type { Activity } from '../types'
import { AgentBadge } from './Badges'
import { Icon, type IconName } from './icons'

interface Props {
  activities: Activity[]
  building: boolean
}

export function ActivityFeed({ activities, building }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)

  // Track whether the user is pinned to the bottom; only auto-follow if so.
  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
  }

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight
  }, [activities, building])

  return (
    <div className="transcript-wrap" ref={scrollRef} onScroll={onScroll}>
      <ol className="transcript" role="log" aria-live="polite" aria-relevant="additions" aria-label="Agent build transcript">
        {activities.map((a) => (
          <ActivityRow key={a.key} a={a} />
        ))}
        {building && (
          <li className="trow trow-thinking" aria-hidden="true">
            <span className="marker marker-pulse" />
            <div className="tbody">
              <span className="thinking-dots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
            </div>
          </li>
        )}
      </ol>
    </div>
  )
}

const ActivityRow = memo(function ActivityRow({ a }: { a: Activity }) {
  if (a.kind === 'user') {
    return (
      <li className="trow trow-user">
        <span className="marker">
          <Icon name="user" size={14} />
        </span>
        <div className="tbody">
          <span className="user-eyebrow">You asked</span>
          <p className="user-text">{a.text}</p>
        </div>
      </li>
    )
  }

  if (a.kind === 'phase') {
    return (
      <li className={`trow trow-phase lane-${a.agent ?? 'planner'}`}>
        <span className="marker marker-lane" />
        <div className="tbody">
          {a.agent && <AgentBadge agent={a.agent} />}
          <span className="phase-label">{a.label}</span>
        </div>
      </li>
    )
  }

  if (a.kind === 'tool') {
    const isLearn = (a.summary ?? '').startsWith('Microsoft Learn')
    const state: IconName = a.running ? 'loader' : a.ok === false ? 'x' : isLearn ? 'docs' : 'check'
    const cls = a.running ? 'is-running' : a.ok === false ? 'is-fail' : isLearn ? 'is-learn' : 'is-ok'
    return (
      <li className={`trow trow-tool ${cls}`}>
        <span className={`marker marker-tool ${a.running ? 'spin' : ''}`}>
          <Icon name={state} size={13} strokeWidth={1.8} />
        </span>
        <div className="tbody">
          <code className="tool-summary">{a.summary || a.tool}</code>
        </div>
      </li>
    )
  }

  if (a.kind === 'validation') {
    return (
      <li className={`trow trow-status ${a.green ? 'is-pass' : 'is-warn'}`}>
        <span className="marker">
          <Icon name={a.green ? 'check-circle' : 'alert'} size={15} strokeWidth={1.8} />
        </span>
        <div className="tbody">
          <div className="status-head">
            {a.green ? 'Validation passed — the app is green' : `Found ${a.issues?.length ?? 0} issue(s) to self-heal`}
          </div>
          {!a.green && a.issues && a.issues.length > 0 && (
            <ul className="issue-list">
              {a.issues.map((i, n) => (
                <li key={n}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      </li>
    )
  }

  if (a.kind === 'error') {
    return (
      <li className="trow trow-status is-error">
        <span className="marker">
          <Icon name="alert" size={15} strokeWidth={1.8} />
        </span>
        <div className="tbody">
          <div className="status-head">{a.text}</div>
        </div>
      </li>
    )
  }

  if (a.kind === 'text') {
    return (
      <li className="trow trow-text">
        <span className="marker" />
        <div className="tbody">
          <p className="text-body">{a.text}</p>
        </div>
      </li>
    )
  }

  return null
})
