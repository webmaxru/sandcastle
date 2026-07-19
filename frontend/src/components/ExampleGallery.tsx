interface Props {
  onPick: (prompt: string) => void
}

const EXAMPLES: { emoji: string; title: string; prompt: string }[] = [
  {
    emoji: '🐍',
    title: 'Neon Snake game',
    prompt:
      'Build a classic Snake game playable with the arrow keys, with a polished dark neon look and a score counter.',
  },
  {
    emoji: '🌦️',
    title: 'Weather dashboard',
    prompt:
      'Build a clean weather dashboard UI with a search box, a current-conditions card, and a 5-day forecast row (use nice mock data).',
  },
  {
    emoji: '🧮',
    title: 'Retro calculator',
    prompt: 'Build a retro-styled calculator with keyboard support and a calculation history panel.',
  },
  {
    emoji: '☁️',
    title: 'Azure cheat-sheet',
    prompt:
      'Build a single-page interactive cheat-sheet about Azure Container Apps, grounded in official Microsoft Learn docs, with a card layout.',
  },
  {
    emoji: '🎨',
    title: 'Particle playground',
    prompt:
      'Build an interactive canvas particle playground that reacts to the mouse, with sliders to tweak count, speed, and color.',
  },
  {
    emoji: '✅',
    title: 'Todo app',
    prompt:
      'Build a delightful todo app with add/complete/delete, filters, and localStorage persistence, in a modern minimal style.',
  },
]

export function ExampleGallery({ onPick }: Props) {
  return (
    <div className="gallery">
      <h2 className="gallery-title">Try one of these</h2>
      <div className="gallery-grid">
        {EXAMPLES.map((e) => (
          <button key={e.title} className="gallery-card" onClick={() => onPick(e.prompt)}>
            <span className="gallery-emoji">{e.emoji}</span>
            <span className="gallery-name">{e.title}</span>
            <span className="gallery-prompt">{e.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
