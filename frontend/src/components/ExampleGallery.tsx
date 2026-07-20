import { AGENTS } from './agents'
import { Icon, type IconName } from './icons'
import { track } from '../analytics'

interface Props {
  onPick: (prompt: string) => void
}

interface Starter {
  name: string
  icon: IconName
  prompt: string
  desc?: string
}

const FEATURED: Starter = {
  name: 'Weather dashboard',
  icon: 'globe',
  desc: 'Grounded in real API docs via Microsoft Learn — current conditions plus a 5-day forecast.',
  prompt:
    'A weather dashboard that shows current conditions and a 5-day forecast for a city, using a real public weather API. Ground the API usage in official docs.',
}

const STARTERS: Starter[] = [
  { name: 'Pomodoro timer', icon: 'timer', prompt: 'A Pomodoro focus timer with 25/5 work-break cycles, a start/pause control, a chime, and a completed-session counter.' },
  { name: 'Markdown notes', icon: 'docs', prompt: 'A markdown note-taking app with a split-pane live preview and autosave to local storage.' },
  { name: 'Kanban board', icon: 'grid', prompt: 'A drag-and-drop kanban board with To-do / Doing / Done columns, cards you can add and move, and due dates.' },
  { name: 'Expense splitter', icon: 'sparkle', prompt: 'A trip expense splitter: add people and expenses, then show who owes whom to settle up.' },
  { name: 'Typing speed test', icon: 'bolt', prompt: 'A typing-speed test that measures words-per-minute and accuracy against a sample paragraph, with a live result.' },
]

export function ExampleGallery({ onPick }: Props) {
  const lanes = Object.keys(AGENTS) as (keyof typeof AGENTS)[]

  return (
    <div className="onboard">
      <div className="onboard-lede">
        <h2 className="onboard-title">Watch an AI team build a running app</h2>
        <p className="onboard-sub">
          Describe an app in plain language. Three Copilot agents take it from a plan to a live,
          self-healed build — right here, in the open.
        </p>
        <p className="onboard-note">
          <Icon name="monitor" size={13} strokeWidth={1.9} />
          <span>Every build is a <b>web frontend app</b> — vanilla HTML/CSS/JS that runs in the browser. No backend, no databases.</span>
        </p>
      </div>

      <ol className="how-steps" aria-label="How Sandcastle works">
        {lanes.map((lane) => {
          const a = AGENTS[lane]
          return (
            <li key={lane} className={`how-step lane-${lane}`}>
              <span className="how-node">
                <Icon name={a.icon} size={18} strokeWidth={1.8} />
              </span>
              <span className="how-copy">
                <span className="how-name">{a.name}</span>
                <span className="how-blurb">{a.blurb}</span>
              </span>
            </li>
          )
        })}
      </ol>

      <div className="starters">
        <div className="starters-head">Start from a prompt</div>

        <button
          className="starter starter-featured"
          onClick={() => {
            track('example_pick', { name: FEATURED.name, featured: true })
            onPick(FEATURED.prompt)
          }}
        >
          <span className="starter-icon starter-icon-ground">
            <Icon name={FEATURED.icon} size={20} strokeWidth={1.7} />
          </span>
          <span className="starter-text">
            <span className="starter-name">
              {FEATURED.name}
              <span className="starter-tag">grounded</span>
            </span>
            <span className="starter-desc">{FEATURED.desc}</span>
          </span>
          <Icon name="arrow-right" size={17} />
        </button>

        <div className="starter-chips">
          {STARTERS.map((s) => (
            <button
              key={s.name}
              className="starter-chip"
              onClick={() => {
                track('example_pick', { name: s.name, featured: false })
                onPick(s.prompt)
              }}
              title={s.prompt}
            >
              <Icon name={s.icon} size={15} strokeWidth={1.7} />
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
