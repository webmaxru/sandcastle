/** Sandcastle activity event types (mirror of the backend SSE schema). */
export type AgentLane = 'planner' | 'builder' | 'fixer'

export interface SseEvent {
  type:
    | 'status'
    | 'phase'
    | 'tool_start'
    | 'tool_end'
    | 'text'
    | 'usage'
    | 'validation'
    | 'error'
    | 'files'
    | 'done'
  agent?: AgentLane
  // status
  state?: string
  // phase
  label?: string
  // tool_start
  id?: string
  tool?: string
  summary?: string
  args?: Record<string, unknown>
  // tool_end
  success?: boolean
  error?: string | null
  // text
  text?: string
  // usage
  model?: string | null
  // validation
  attempt?: number
  issues?: string[]
  green?: boolean
  // error
  message?: string
  fatal?: boolean
  // files
  files?: FileEntry[]
  // done
  preview?: string | null
  has_index?: boolean
}

export interface FileEntry {
  path: string
  size: number
}

export interface AppConfig {
  auth_mode: string
  model: string
  agents: AgentLane[]
  mcp_grounding: string[]
  max_concurrent_sessions: number
  max_fix_attempts: number
  session_timeout_seconds: number
  observability: boolean
}

/** A single rendered item in the activity feed. */
export interface Activity {
  key: string
  kind: 'phase' | 'tool' | 'text' | 'validation' | 'error' | 'status' | 'user'
  agent?: AgentLane
  label?: string
  tool?: string
  summary?: string
  running?: boolean
  ok?: boolean
  text?: string
  issues?: string[]
  green?: boolean
}
