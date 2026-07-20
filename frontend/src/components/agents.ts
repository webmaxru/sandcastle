import type { AgentLane } from '../types'
import type { IconName } from './icons'

/** The three agent personas: icon + display name + one-line role blurb. */
export const AGENTS: Record<AgentLane, { icon: IconName; name: string; blurb: string }> = {
  planner: { icon: 'planner', name: 'Planner', blurb: 'designs the build' },
  builder: { icon: 'builder', name: 'Builder', blurb: 'writes the code' },
  fixer: { icon: 'fixer', name: 'Fixer', blurb: 'self-heals errors' },
}
