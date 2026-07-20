---
name: Sandcastle
description: Describe an app; watch a team of GitHub Copilot agents build, run, and self-heal it — live, in a sandbox.
colors:
  deep-navy: "#080b12"
  navy-lift: "#0c111c"
  panel: "#141b2bb8"
  panel-solid: "#101726"
  border: "#ffffff14"
  border-strong: "#ffffff24"
  ink: "#e7ecf6"
  muted: "#8b95ab"
  sand: "#f6c177"
  azure: "#38bdf8"
  green: "#4ade80"
  red: "#f87171"
  violet: "#a78bfa"
typography:
  brand:
    fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.3px"
  title:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.5px"
  mono:
    fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace"
    fontSize: "11.5px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  pill: "999px"
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
components:
  button-primary:
    backgroundColor: "{colors.azure}"
    textColor: "#06121f"
    rounded: "{rounded.md}"
    padding: "0 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "5px 12px"
  chip:
    backgroundColor: "#ffffff08"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  input:
    backgroundColor: "#ffffff08"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "11px 13px"
  card:
    backgroundColor: "#ffffff05"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
---

# Design System: Sandcastle

## 1. Overview

**Creative North Star: "The Lit Control Room"**

Sandcastle is a dark, calm operations surface built to be *watched*. The frame recedes — deep navy
glass panels, hairline borders, dense compact type — so the live activity inside them (agents
streaming plans, tool calls, a self-heal loop going green, an app rendering) is the only thing that
draws the eye. It is a two-pane workspace, not a landing page: the left pane is the agent theatre,
the right pane is the proof (live preview + real source). The mood is a quiet, backlit control room
where a small team is visibly at work.

Color here is **information, not decoration**. Each agent owns a hue — Planner azure, Builder sand,
Fixer green — and the sand→azure brand gradient appears in exactly two brand moments (the wordmark
and the primary Build button) and nowhere else. Depth is tonal, not heavy: translucent panels over a
radial-lit background, `backdrop-filter` blur on the chrome, 1px white-alpha borders. Almost no drop
shadows. The result reads credible and technical without going sterile.

It explicitly rejects the plain-LLM-chatbox reflex (no single reply bubble that hides the work), the
sterile enterprise dashboard (no KPI-card grids, no hero-metric template), and any "magic black box"
polish that would hide the agents doing their job. If it ever looks like a generic SaaS admin panel,
it has failed its own thesis: *show, don't tell.*

**Key Characteristics:**
- Dark, backlit, glass-paneled two-pane workspace; frame recedes, live content leads.
- Semantic per-agent color (azure / sand / green), always paired with icon + label.
- One brand gradient (sand→azure), scoped to wordmark + primary CTA only.
- Flat, tonal depth: translucency + hairline borders + backdrop blur, not shadow ramps.
- Compact, fixed-px product scale; Inter for UI, JetBrains Mono for anything "real" (tools, code).

## 2. Colors: The Backlit Console Palette

A deep-navy console under two soft spotlights (an azure wash top-left, a sand wash top-right), with
a small set of saturated, load-bearing signal colors.

### Primary
- **Azure** (`#38bdf8`): The primary interactive accent. Focus borders on inputs, the active tab
  underline, the Planner lane, selection tints, and one half of the brand gradient. This is the
  "system is live / this is interactive" color.
- **Sand** (`#f6c177`): The warm brand counterweight and the Builder lane. Pairs with azure in the
  135° brand gradient (wordmark + Build button) and marks "warn" validation states.

### Secondary
- **Green** (`#4ade80`): Success and the Fixer lane — the self-heal loop and the "Validation passed"
  banner. Green appearing is the money moment; treat its arrival as an event.
- **Violet** (`#a78bfa`): Grounding + the human. Tags the Microsoft Learn MCP tool rows and the
  user's own message bubble (an azure→violet gradient). Signals "external knowledge / you."

### Tertiary
- **Red** (`#f87171`): Errors only — the error banner and failed tool/validation rows. Never
  decorative.

### Neutral
- **Deep Navy** (`#080b12`): The base body background, under two radial spotlights (azure at 12%/-8%,
  sand at 100%/0%).
- **Navy Lift** (`#0c111c`): Secondary surfaces that must recede — the code view and the empty
  preview placeholder.
- **Panel** (`#141b2b` @ 72% / `panel-solid #101726`): The glass workspace panels and the solid toast
  base.
- **Ink** (`#e7ecf6`): Primary text — a cool near-white, never pure `#fff`.
- **Muted** (`#8b95ab`): Secondary text, labels, metadata. Sits near the 4.5:1 contrast floor —
  treat as the contrast risk, not a free "elegance" gray.
- **Border** (`#ffffff` @ 8% / **border-strong** @ 14%): Hairline dividers and control strokes. The
  only structural line in the system.

### Named Rules
**The One Gradient Rule.** The sand→azure brand gradient (`linear-gradient(135deg, #f6c177, #38bdf8)`)
appears in exactly two places: the wordmark and the primary Build button. It is never used as text
fill anywhere else, never on body or data, and never as a decorative panel wash.

**The Color-Is-Meaning Rule.** Azure = Planner/interactive, Sand = Builder, Green = Fixer/success,
Violet = grounding/user, Red = error. A hue's presence tells you *which agent or state* you are
looking at — so color is never spent on decoration, and every colored element also carries an icon
or label so the meaning survives grayscale and color-blindness.

## 3. Typography

**Display / UI Font:** Inter (with `'Segoe UI', system-ui, -apple-system, sans-serif` fallback)
**Mono Font:** JetBrains Mono (with `'Cascadia Code', monospace` fallback)

**Character:** One workhorse sans for everything human-facing, one monospace for everything "real."
The mono font is a deliberate signal: tool-call summaries, the preview URL, and generated source all
render in JetBrains Mono so machine output *looks* like machine output. No display or serif faces —
this is a tool, not a poster. (Note: neither webfont is bundled; both rely on a locally installed
copy or the system fallback. If brand-consistent type matters cross-machine, self-host Inter +
JetBrains Mono — see Do's.)

### Hierarchy
- **Brand** (800, 20px, `-0.3px`): The "Sandcastle" wordmark only — the single heaviest, tightest
  type in the app, filled with the brand gradient.
- **Title** (700, 14px): Section and card headings — gallery card names, panel headers.
- **Body** (400, 12.5–13.5px, 1.4–1.5): Feed text, prompts, descriptions. Compact by design.
- **Mono** (400, 11.5–12px, 1.55): Tool summaries, preview URL, code view. `word-break` +
  `white-space: pre-wrap` so long machine strings wrap instead of overflowing.
- **Label** (600, 10–11px, `+0.5px`, uppercase): Chip labels and metadata (`MODEL`, `TEAM`). The
  only uppercase in the system; reserved for terse key/value chrome.

### Named Rules
**The Mono-Means-Real Rule.** If a string came from a machine — a shell/tool summary, a URL,
generated source — it is set in JetBrains Mono. Human prose is set in Inter. The font is a truth
signal; don't blur the two.

## 4. Elevation

Flat by default, with tonal layering instead of a shadow ramp. Depth is built from three materials:
(1) translucent panels (`rgba(20,27,43,0.72)`) floating over a radial-lit deep-navy background, (2)
`backdrop-filter: blur(8–10px)` on the chrome (topbar and both workspace panels), and (3) 1px
white-alpha hairline borders that separate surfaces. There is no elevation scale — surfaces don't
"lift" on hover; they shift border color and background tint instead.

### Shadow Vocabulary (deliberately minimal)
- **Brand glow** (`filter: drop-shadow(0 3px 8px rgba(56,189,248,0.4))`): Azure halo under the 🏰
  brand mark only. A single spotlight touch.
- **Toast lift** (`box-shadow: 0 8px 30px rgba(0,0,0,0.5)`): The only true drop shadow, lifting the
  transient toast above the workspace.

### Named Rules
**The Flat-Glass Rule.** Surfaces are flat translucent glass at rest. Convey depth with
translucency, blur, and hairline borders — not box-shadow. The two shadows above are the whole
budget; adding a third is almost always wrong.

## 5. Components

### Buttons
- **Shape:** Rounded rectangles — primary/input `12px` (`rounded.md`), ghost/icon `8px`
  (`rounded.sm`).
- **Primary (Build):** The brand gradient (`linear-gradient(135deg, sand, azure)`) with dark ink
  text (`#06121f`), full-height, weight 700. Hover `filter: brightness(1.08)`, active
  `transform: scale(0.97)`, disabled `opacity: 0.5`. The one loud control in the app — there is
  exactly one primary action on screen at a time.
- **Ghost:** Transparent with a `border-strong` stroke and ink text; hover fills to
  `rgba(255,255,255,0.06)`. Used for Share / New app.
- **Icon:** 30×30, `8px`, `border-strong` stroke, transparent; hover `rgba(255,255,255,0.07)`,
  disabled `opacity: 0.4`.

### Chips & Agent Badges
- **Chip:** Pill (`999px`), `rgba(255,255,255,0.03)` fill, `border`, with an uppercase muted label +
  ink value. Status/metadata only (model, team, self-heal, otel), never a control.
- **Agent badge:** Pill with the agent's own hue at ~12% fill + 35% border + full-strength text,
  icon-led (🧭 Planner azure / 🔨 Builder sand / 🩹 Fixer green). The load-bearing signal of the
  activity feed.

### Cards (Example Gallery)
- **Corner:** `12px` (`rounded.md`).
- **Background:** `rgba(255,255,255,0.02)` over the panel; hover tints azure
  (`rgba(56,189,248,0.07)`) and lifts `translateY(-2px)` with a `border-strong` edge.
- **Elevation:** No shadow — see Flat-Glass Rule.
- **Padding:** `14px`. Emoji + name + prompt, left-aligned. Used only for the empty-state gallery;
  not a general layout crutch.

### Inputs / Fields
- **Style:** `rgba(255,255,255,0.03)` fill, `border-strong` stroke, `12px` radius, ink text.
- **Focus:** Border shifts to **azure** (`--azure`), no glow. Quiet and precise.
- **Disabled:** Carried on the Build button (`opacity: 0.5`), not the field.

### Tabs & Navigation
- **Tabs:** Text tabs with a transparent bottom border that becomes **azure** when active; inactive
  is muted, active is ink. A count pill (`999px`, azure-tinted) rides the Code tab.
- **Top bar:** Glass, `blur(10px)`, hairline bottom border. Brand cluster left, status chips right.
  No nav links — the whole app is one screen.

### Signature Component — The Activity Feed
The heart of the product: a vertical stream of typed rows tagged by agent lane. Phase rows carry an
agent badge; tool rows are indented and mono-set (Learn/MCP rows tinted violet); validation rows go
green (ok) or sand (warn); error rows go red; the user's message is a right-aligned azure→violet
gradient bubble with a chat tail (`14px 14px 4px 14px`). A three-dot `blink` typing indicator shows
the active agent thinking. This component *is* the "show, don't tell" thesis — design every change
to keep it legible and lane-tagged.

## 6. Do's and Don'ts

### Do:
- **Do** keep color semantic: azure = Planner/interactive, sand = Builder, green = Fixer/success,
  violet = grounding/user, red = error. Pair every colored element with an icon or label.
- **Do** confine the sand→azure gradient to the wordmark and the primary Build button.
- **Do** set anything machine-generated (tool summaries, URLs, source) in JetBrains Mono, and human
  prose in Inter.
- **Do** build depth from translucency, `backdrop-filter` blur, and 1px hairline borders — flat glass,
  not shadows.
- **Do** keep transitions quick and state-conveying (120–200ms): focus, hover, active, reveal.
- **Do** keep exactly one primary (Build) action on screen at a time; everything else is ghost/icon.
- **Do** treat muted `#8b95ab` as the contrast risk — verify ≥4.5:1 for any body/label text on its
  actual surface before shipping.
- **Do** self-host Inter + JetBrains Mono if cross-machine brand fidelity matters (currently neither
  webfont is bundled).

### Don't:
- **Don't** collapse the agent process into a single chat bubble or a plain LLM text box — the work
  must stay visible and lane-tagged (*"a plain LLM call returns text… not just a text box"*).
- **Don't** turn it into a sterile enterprise SaaS dashboard: no identical KPI-card grids, no
  hero-metric template, no corporate blandness.
- **Don't** fake or hide the artifact — the Code tab and live preview exist to prove it's real; never
  mock them, never hide the work to look slicker.
- **Don't** use `background-clip: text` gradient fill anywhere except the wordmark; never on body,
  data, or section headings.
- **Don't** add `border-left`/`border-right` colored stripes on rows, cards, or banners — use full
  hairline borders and background tints (as the feed already does).
- **Don't** introduce drop shadows beyond the brand-mark glow and the toast; don't make surfaces
  "lift" on hover.
- **Don't** add display or serif fonts, or spend a saturated signal hue (green/red/violet) on
  decoration.
- **Don't** ship motion without a `prefers-reduced-motion` fallback (a current gap — close it, don't
  extend it).
