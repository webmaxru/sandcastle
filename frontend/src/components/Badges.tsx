import type { AgentLane } from '../types'

export const AGENTS: Record<AgentLane, { icon: string; name: string; blurb: string }> = {
  planner: { icon: '🧭', name: 'Planner', blurb: 'designs the build' },
  builder: { icon: '🔨', name: 'Builder', blurb: 'writes the code' },
  fixer: { icon: '🩹', name: 'Fixer', blurb: 'self-heals errors' },
}

export function AgentBadge({ agent }: { agent: AgentLane }) {
  const a = AGENTS[agent]
  return (
    <span className={`agent-badge agent-${agent}`}>
      <span className="agent-ico">{a.icon}</span>
      {a.name}
    </span>
  )
}

export function Chip({ label, value, on }: { label: string; value: string; on?: boolean }) {
  return (
    <span className={`chip ${on === false ? 'chip-off' : ''}`}>
      <span className="chip-label">{label}</span>
      <span className="chip-value">{value}</span>
    </span>
  )
}
