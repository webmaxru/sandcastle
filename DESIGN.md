---
name: Sandcastle
description: Describe an app; watch a team of GitHub Copilot agents build, run, and self-heal it — live, in a bright build log.
colors:
  paper: "#f5f7f9"
  surface: "#fdfdfe"
  surface-2: "#edf1f4"
  code-bg: "#eaedf1"
  ink: "#1f2734"
  ink-soft: "#4c535f"
  ink-faint: "#636975"
  line: "#dadee3"
  line-strong: "#c2c8cf"
  accent: "#3461c9"
  accent-strong: "#254dac"
  accent-tint: "#e6f1ff"
  planner: "#0065b4"
  builder: "#8d5403"
  fixer: "#007842"
  ground: "#7444b4"
  danger: "#c51d28"
  warn: "#996100"
typography:
  brand:
    fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  h1:
    fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
  mono:
    fontFamily: "'IBM Plex Mono', ui-monospace, 'Cascadia Code', Consolas, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  xs: "5px"
  sm: "8px"
  md: "11px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#fdfcff"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "4px 9px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
---

# Design System: Sandcastle

## 1. Overview

**Creative North Star: "The Build Log"**

Sandcastle is a bright, structural engineering instrument — a build log you can read across a room.
The scene it is built for: a skeptical developer, phone in hand from a conference tweet, or a
spectator glancing at a booth screen in a fluorescent hall, giving it ten seconds to prove that an
AI *team* really plans, writes, runs, and self-heals a live app. That scene forces the whole design:
**light**, high-contrast, legible on a projector, a phone, and in daylight. A tool, not a poster.

It is a two-pane workspace, not a landing page. The left pane is the **build transcript** — a real
engineering log with a timeline spine, agent lanes, and monospaced tool rows. The right pane is the
**proof** — a live preview and the actual generated source. The frame is quiet drafting-paper white
so the live activity inside it is the only thing that moves.

Color here is **information, not decoration.** Each agent owns a hue — Planner blue, Builder amber,
Fixer green — but on light these are legible *ink tags and keylines*, not neon fills. There is **no
gradient anywhere** and exactly **one committed accent** (indigo) for the single primary action
(Build). Depth is honest: flat opaque surfaces, hairline borders, and a restrained real shadow
scale. No glass, no blur, no backlight.

This design is a deliberate rejection of the reflex it would be easiest to fall into: the dark,
neon-glass "AI devtool dashboard." That look — radial neon spotlights, five glowing accents,
frosted-glass panels — is exactly what gets generated for "watch AI agents build apps," and it reads
as a mood board, not an instrument. Sandcastle instead looks like the thing it builds proof about:
a real, running, inspectable tool.

**Key Characteristics:**
- Bright drafting-paper two-pane workspace; the frame recedes, the live log leads.
- Semantic per-agent color (blue / amber / green), always paired with an icon + text label.
- **No gradient.** One committed indigo accent, reserved for the single primary (Build) action.
- Flat, opaque surfaces with hairline borders and a restrained real shadow scale — never glass.
- Real inline-SVG icon set (1.6px stroke, `currentColor`) and a custom castle mark — zero emoji.
- IBM Plex Sans for everything human; IBM Plex Mono for everything a machine produced.

## 2. Colors: Drafting Paper & Load-Bearing Ink

A cool near-white desk with crisp white sheets on it, marked up in dark structural ink and a small
set of saturated, load-bearing signal colors. All tokens are authored in **OKLCH**; the hex values
in the frontmatter are sRGB fallbacks for reference.

### Primary
- **Accent / Indigo** (`oklch(0.52 0.17 264)` · `#3461c9`): The single committed interactive accent.
  It fills exactly one thing — the primary **Build** button — and marks focus rings, links, and text
  selection. Seeing indigo means "this is the one action" or "this is interactive." `accent-strong`
  (`#254dac`) is its hover/active; `accent-tint` (`#e6f1ff`) is the selection wash.

### Semantic lanes (color = meaning)
Each agent and grounding source owns a hue, tuned to ~`L 0.5` so it stays legible **as text** on a
white sheet (all clear WCAG AA — see §6):
- **Planner — Blue** (`#0065b4`): planning phases and the user's own turn.
- **Builder — Amber** (`#8d5403`): the code-writing phase. The one warm hue; it is the only place
  the "sandcastle" warmth lives.
- **Fixer — Green** (`#007842`): validation and self-heal. Green arriving is the money moment — the
  "Validation passed" row — so treat its appearance as an event.
- **Grounding — Violet** (`#7444b4`): Microsoft Learn / MCP tool rows. Signals "external knowledge."
- **Danger — Red** (`#c51d28`): errors only — the error banner and failed rows. Never decorative.
- **Warn — Amber-deep** (`#996100`): a self-heal issue that is being worked, not a failure.

Each lane also has a derived `*-wash` (the hue mixed ~9–10% into `surface`) for the faint tint behind
a badge or bubble — computed with `color-mix` so the tint always tracks its own hue.

### Neutrals — the paper stack
- **Paper** (`#f5f7f9`): the body/desk background. A *cool* near-white (chroma toward blue, not the
  warm cream/sand AI default). Warmth in this app is carried only by the Builder amber, never the bg.
- **Surface** (`#fdfdfe`): the raised white sheets — panels, cards, inputs, chips.
- **Surface-2 / Code-bg** (`#edf1f4` / `#eaedf1`): recessed fills — the mono tool rows, code view,
  and skeletons.
- **Ink / Ink-soft / Ink-faint** (`#1f2734` / `#4c535f` / `#636975`): the three-step text ramp.
  `ink` is body and headings (~14:1), `ink-soft` is secondary (~7:1), `ink-faint` is the floor for
  small meta and hints — and even the floor clears AA at **5.1:1** on paper.
- **Line / Line-strong** (`#dadee3` / `#c2c8cf`): hairline dividers and control strokes. The only
  structural line in the system.

### Named Rules
**The No-Gradient Rule.** There is no gradient anywhere in Sandcastle — not on the wordmark, not on
the Build button, not on a bubble, not as a background wash. Emphasis comes from weight, size, a
solid fill, or a hairline. (This is the deliberate inversion of the old "one gradient" system.)

**The Color-Is-Meaning Rule.** Blue = Planner/interactive, Amber = Builder, Green = Fixer/success,
Violet = grounding, Red = error, Indigo = the one primary action. A hue's presence tells you *which
agent or state* you are looking at — so color is never spent on decoration, and every colored element
also carries an icon or text label so the meaning survives grayscale and color-blindness.

## 3. Typography

**UI / Prose Font:** IBM Plex Sans (self-hosted woff2, weights 400/500/600/700)
**Machine Font:** IBM Plex Mono (self-hosted woff2, weights 400/500/600)

**Character:** a humanist workhorse sans for everything a person reads, paired on a contrast axis with
a monospace for everything a machine produced. Both are **self-hosted** from `public/fonts/` (OFL, see
`public/fonts/LICENSE.txt`) with a robust system fallback stack, so legibility never depends on the
webfont finishing loading. No display or serif faces — this is an instrument, not a poster. IBM Plex
is deliberately *not* Inter/Geist/Space Grotesk (the currently over-generated UI sans).

### Hierarchy
- **Brand** (Sans 700, 19px, `-0.01em`): the "Sandcastle" wordmark — a solid `ink` fill beside the
  castle mark. Never gradient-filled.
- **H1** (Sans 600, ~28px, `-0.02em`, `text-wrap: balance`): the onboarding headline only.
- **Title** (Sans 600, 15px): panel headers, card and section headings.
- **Body** (Sans 400, 14px, 1.5): transcript prose, descriptions, prompts. Prose caps at ~68ch.
- **Label** (Sans 600, 11px, `0.02em`): chip keys and small meta. **Not** all-caps by default — light
  gives enough contrast without shouting.
- **Mono** (Mono 400, 12.5px, 1.55): every machine string — tool summaries, the preview URL, config
  values, generated source. `overflow-wrap: anywhere` so long strings wrap instead of overflowing.

### Named Rules
**The Mono-Means-Real Rule.** If a string came from a machine — a tool summary, a URL, a config
value, generated source — it is set in IBM Plex Mono. Human prose is set in IBM Plex Sans. The font
is a truth signal; don't blur the two.

## 4. Elevation

Flat and opaque, layered with a **restrained real shadow scale** (legitimate on light) plus hairline
borders — never glass, never `backdrop-filter`. Surfaces sit on the paper as distinct white sheets;
they are separated by tone and a 1px line, and lifted only when they genuinely float.

### Shadow Vocabulary
- **`--shadow-sm`**: a 1–2px contact shadow for resting raised controls (the Build button, chips).
- **`--shadow-md`**: a soft 8–26px lift for the two workspace panels off the paper.
- **`--shadow-lg`**: a 16–48px shadow reserved for the transient toast, the one truly floating layer.

All three are low-alpha, cool-tinted (toward the ink hue), and blur-only — no hard offset, no colored
glow. The z-index scale is semantic: `--z-sticky` → `--z-overlay` → `--z-modal` → `--z-toast` →
`--z-tooltip`, never arbitrary `9999`.

### Named Rules
**The Flat-Opaque Rule.** Surfaces are flat and opaque. Convey depth with tone, a hairline border,
and a restrained real shadow — never with translucency, blur, or a glass panel. If a surface needs to
"pop," raise its shadow one step or strengthen its border; do not frost it.

## 5. Components

### Buttons
- **Shape:** rounded rectangles, `8px` (`rounded.sm`); icon buttons `8px` square.
- **Primary (Build):** solid `accent` (indigo) fill, `on-accent` near-white text, weight 600,
  `--shadow-sm`, hairline `accent-strong` border. Hover deepens to `accent-strong`; disabled drops to
  `opacity: 0.45`. It never wraps (`white-space: nowrap`). **Exactly one primary action on screen.**
- **Stop:** the Build button's inverse while a run streams — `danger` text on `surface` with a
  danger-tinted border; hover fills `danger-wash`.
- **Ghost / Icon:** `surface` fill (or transparent) with a `line` border and `ink` text; hover tints
  `surface-2`. Used for Share, reload, external-open, New app.

### Chips & Agent Badges
- **Chip (run-config rail):** a small `surface` pill with a hairline border, a `label`-weight key in
  `ink-faint` and a **mono** value in `ink` (`model gpt-4.1`, `team planner → builder → fixer`).
  Status/metadata only, never a control.
- **Agent badge:** an icon-led tag in the agent's own hue at `*-wash` fill + hue border + full-strength
  hue text (Planner / Builder / Fixer). The load-bearing signal of the transcript; the SVG icon means
  the lane survives grayscale.

### Inputs / Fields
- **Composer:** `surface` fill, `line` border, `11px` radius, `ink` text, auto-growing textarea
  (cap ~168px). Placeholder is `ink-faint` (AA, not a washed-out gray).
- **Focus:** the shared focus system — a `2px accent` outline at `2px` offset — applies to every
  interactive element, so focus is one consistent, visible treatment.

### Onboarding (replaces the card grid)
The empty state is **not** an identical card grid. It is: one strong headline, a three-lane "how it
works" mini-timeline (Planner → Builder → Fixer on a spine), one featured *grounded* starter (the
Weather card, tagged `GROUNDED`), and a varied, non-uniform set of starter chips. First-time
spectators get what they are about to watch in one glance.

### Tabs & Navigation
- **Tabs:** real `role="tablist"` text tabs; the active tab is `ink` over a `surface` fill with an
  `accent` underline, inactive is `ink-soft`. A mono count pill rides the Code tab. Both panels stay
  mounted (`hidden` toggles) so the live preview iframe never tears down on tab switch.
- **Top bar:** solid `surface`, hairline bottom border, `--shadow-sm`. Castle mark + solid wordmark
  left; the run-config chip rail right. No nav links — the whole app is one screen.

### Signature Component — The Build Transcript
The heart of the product: an `aria-live` `<ol role="log">` rendered as a genuine engineering log. A
timeline **spine** runs down the left; each row hangs a lane-colored **marker** (a dot, a spinning
loader while a tool runs, a check when it lands). Phase rows carry an agent badge and a plain-language
title; **tool rows are mono** and indented (Learn/MCP rows tinted violet); the validation row goes
green ("the app is green") or amber (an issue being self-healed); errors go red; the user's turn is a
left-aligned blue-washed bubble. The list auto-follows only when the reader is already pinned to the
bottom, so scrolling back to inspect a step is never yanked away. This component *is* the "show,
don't tell" thesis — design every change to keep it legible, lane-tagged, and honest.

## 6. Accessibility

Target **WCAG 2.1 AA**, and the palette is built to clear it by construction (verified, not hoped):

- **Text contrast (all AA).** `ink` on paper ≈ **14:1**; `ink-soft` ≈ **7.2:1**; the floor token
  `ink-faint` ≈ **5.1:1**. Every lane hue used as text (blue/amber/green/violet/red/amber-deep) lands
  **5.0–6.4:1** on `surface`, and `on-accent` on the Build button ≈ **5.5:1**. There is no
  near-floor muted gray in this system — the old contrast risk is designed out.
- **Reduced motion is handled.** A global `prefers-reduced-motion: reduce` block neutralizes every
  transition and animation, with specific overrides that stop the infinite loaders/blink/pulse/shimmer
  and settle them to a stable state. Motion is never required to perceive content.
- **Live region.** The transcript is an `aria-live="polite"` `role="log"`, so screen-reader users
  perceive streamed progress.
- **Color is never alone.** Every lane pairs its hue with an SVG icon and a text label.
- **Keyboard.** One coherent, visible `:focus-visible` ring across all controls; the composer submits
  on Enter (Shift+Enter for newline); file rows are real `<button>`s in a `role="listbox"`.

## 7. Do's and Don'ts

### Do:
- **Do** keep color semantic: blue = Planner/interactive, amber = Builder, green = Fixer/success,
  violet = grounding, red = error, indigo = the one primary action. Pair every colored element with an
  icon or label.
- **Do** set anything machine-generated (tool summaries, URLs, config values, source) in IBM Plex
  Mono, and human prose in IBM Plex Sans.
- **Do** build depth from flat opaque surfaces, hairline borders, and the restrained real shadow
  scale (`sm`/`md`/`lg`).
- **Do** keep exactly one primary (Build) action on screen at a time; everything else is ghost/icon.
- **Do** use real inline-SVG icons (1.6px stroke, `currentColor`) and the castle mark — never an emoji.
- **Do** keep transitions quick (120–200ms) and state-conveying, and give every animation a
  `prefers-reduced-motion` fallback.
- **Do** keep the empty state varied — the how-it-works timeline + featured starter + mixed chips,
  never an identical card grid.

### Don't:
- **Don't** reach for the dark neon-glass "AI devtool dashboard" reflex — no `backdrop-filter` glass,
  no radial neon spotlights, no five-accent glow. This is a bright instrument.
- **Don't** use a gradient anywhere — not the wordmark, not the Build button, not a bubble, not a bg.
  Emphasis is weight/size/solid-fill/hairline.
- **Don't** use emoji as iconography — every glyph is a real SVG from the icon set.
- **Don't** collapse the agent process into a single chat bubble or plain LLM text box — the work must
  stay a visible, lane-tagged transcript.
- **Don't** turn it into a sterile SaaS dashboard: no identical KPI-card grids, no hero-metric
  template.
- **Don't** fake or hide the artifact — the Code tab and live preview exist to prove it's real.
- **Don't** add `border-left`/`border-right` colored stripes; use full hairline borders and `*-wash`
  background tints.
- **Don't** introduce a warm cream/sand *body* background (the 2026 AI default) — the desk is cool
  near-white; warmth lives only in the Builder amber.
- **Don't** add display or serif fonts, or spend a saturated signal hue on decoration.
