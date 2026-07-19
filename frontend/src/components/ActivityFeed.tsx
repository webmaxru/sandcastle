import { useEffect, useRef } from 'react'
import type { Activity } from '../types'
import { AgentBadge } from './Badges'

interface Props {
  activities: Activity[]
  building: boolean
}

export function ActivityFeed({ activities, building }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activities])

  return (
    <div className="feed">
      {activities.map((a) => (
        <ActivityRow key={a.key} a={a} />
      ))}
      {building && (
        <div className="feed-row typing">
          <span className="dot" /> <span className="dot" /> <span className="dot" />
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}

function ActivityRow({ a }: { a: Activity }) {
  if (a.kind === 'user') {
    return (
      <div className="feed-user">
        <span className="user-ico">🧑</span>
        <span>{a.text}</span>
      </div>
    )
  }
  if (a.kind === 'phase') {
    return (
      <div className="feed-phase">
        {a.agent && <AgentBadge agent={a.agent} />}
        <span className="phase-label">{a.label}</span>
      </div>
    )
  }
  if (a.kind === 'tool') {
    const isLearn = (a.summary ?? '').startsWith('Microsoft Learn')
    return (
      <div className={`feed-row tool ${isLearn ? 'tool-learn' : ''}`}>
        <span className="tool-ico">
          {a.running ? '⏳' : a.ok === false ? '❌' : isLearn ? '🔎' : '✓'}
        </span>
        <code className="tool-summary">{a.summary || a.tool}</code>
      </div>
    )
  }
  if (a.kind === 'validation') {
    return (
      <div className={`feed-row validation ${a.green ? 'ok' : 'warn'}`}>
        <span className="tool-ico">{a.green ? '✅' : '🔧'}</span>
        <span>
          {a.green
            ? 'Validation passed — app is green'
            : `Found ${a.issues?.length ?? 0} issue(s) to fix:`}
        </span>
        {!a.green && a.issues && (
          <ul className="issue-list">
            {a.issues.map((i, n) => (
              <li key={n}>{i}</li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  if (a.kind === 'error') {
    return (
      <div className="feed-row error">
        <span className="tool-ico">⚠️</span>
        <span>{a.text}</span>
      </div>
    )
  }
  if (a.kind === 'text') {
    return <div className="feed-text">{a.text}</div>
  }
  return null
}
