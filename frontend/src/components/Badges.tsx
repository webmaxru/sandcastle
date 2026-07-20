import type { AgentLane } from '../types'
import { Icon } from './icons'
import { AGENTS } from './agents'

/** Inline lane tag: colored icon + name. Color survives grayscale via the icon+label. */
export function AgentBadge({ agent }: { agent: AgentLane }) {
  const a = AGENTS[agent]
  return (
    <span className={`agent-badge lane-${agent}`}>
      <Icon name={a.icon} size={15} strokeWidth={1.8} />
      {a.name}
    </span>
  )
}

/** A key/value metadata item for the run-config rail. */
export function Chip({ label, value, on }: { label: string; value: string; on?: boolean }) {
  return (
    <span className={`chip ${on === false ? 'is-off' : ''} ${on === true ? 'is-on' : ''}`}>
      <span className="chip-label">{label}</span>
      <span className="chip-value">{value}</span>
    </span>
  )
}
