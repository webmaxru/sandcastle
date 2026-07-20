# Product

## Register

product

## Users

**Primary — developers and technical decision-makers** evaluating what the GitHub Copilot
provider for Microsoft Agent Framework can actually do. They want proof that agentic, tool-using
AI is real: that it can plan, write, *run*, and debug code, not just emit text.

**Secondary — demo, conference, hackathon, and devrel audiences**, plus first-time visitors who
arrive at the hosted demo from a social post. Their context: often a cold-start first visit
(~20–30s while the scale-to-zero backend wakes), watching a multi-agent team work in real time,
deciding within seconds whether this is worth their attention and a share.

**Context of use.** Two modes with different postures:
- *Hosted demo* — a spectator arrives, types one prompt, and needs a legible "wow" fast.
- *Local / own-seat* — a developer runs it with their own Copilot login to iterate on real apps
  by chat, reading the streamed source and self-heal loop as they go.

**Job to be done.** *"Show me — don't tell me — that an AI team can plan, build, run, and
self-heal a real app. Let me steer it by chat, read the real code, and share the result."*

## Product Purpose

Sandcastle is a live, spectator-friendly showcase for agentic AI. You describe an app; a
**Planner → Builder → Fixer** team scaffolds it in an isolated sandbox, runs it, self-heals its
build errors against a *real* validator (`node --check` + asset/`index.html` checks), grounds
itself in live Microsoft Learn docs via MCP, and streams a live preview you keep iterating on by
chat. Each session gets its own scratch workspace and `CopilotClient`; the three personas share it
and run sequentially so every tool and text delta streams live, tagged by agent lane.

**What success looks like:** the wow is visible and shareable within seconds; the multi-agent
process is legible and trustworthy (real execution, browsable source, real docs — not vibes); and
visitors leave having built and remixed something real. It runs entirely on free tiers and, in the
hosted demo, never consumes a GitHub Copilot seat (BYOK on the free GitHub Models endpoint).

## Brand Personality

**Three words: playful, credible, live.**

The voice is energetic and confident but technically precise — developer-native, never
hype-for-hype's-sake. Every claim is backed by something happening on screen: a streaming tool
call, a green validation banner, a rendering preview, readable source. The 🏖️ / 🏰 sandcastle
metaphor is deliberate: building something real and delightful, fast, in a sandbox, for the joy of
it.

Emotional arc, in order: **delight and surprise** ("an AI *team* is building this in front of me"),
then **trust** ("it's real — I can read the code and watch it debug itself"), then **agency**
("I can steer it and remix it").

## Anti-references

- **Not a plain LLM chatbox / ChatGPT clone.** The README's own line is the guardrail: *"A plain
  LLM call returns text… not just a text box."* The process and execution must be visible, never
  collapsed into a single reply bubble.
- **Not a sterile enterprise SaaS dashboard.** No generic KPI-card grids, no hero-metric template,
  no corporate-tool blandness. Familiarity is fine; blandness is not.
- **Not a gimmicky "toy" playground** that hides whether the output is real. The Code tab and live
  preview exist to *prove* authenticity; never fake the artifact.
- **Not an opaque "magic" black box.** The value is in *watching* the agents work, per lane — the
  interface must never hide the work to look slicker.

## Design Principles

1. **Show, don't tell.** The wow is on-screen, not described. Every capability claim is anchored to
   a live artifact — a streaming tool call, a green banner, a rendering preview.
2. **Legible teamwork.** The multi-agent process is a spectator sport. Planner, Builder, and Fixer
   each work in their own clearly-tagged lane so anyone can follow who is doing what, when.
3. **Real, not vibes.** Trust is earned by grounding in reality: a real validator drives self-heal,
   real source is browsable, real docs ground the build. The UI always lets the user verify.
4. **Built to be shared.** Assume a first-time visitor from a social post. Frictionless remix and
   share (the `?prompt=` link, the example gallery) carry them to a "wow" and a shareable result
   fast.
5. **Practice what you preach.** A tool that builds well-crafted apps must itself be visibly
   well-crafted: fast, precise, responsive, and honest about state.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**. The "Build Log" light redesign was built to clear it by construction; the
former dark-theme risks are designed out (verify anew after any change):

- **Text contrast (all AA, verified).** On the cool near-white paper, `ink` (`#1f2734`) lands ≈14:1,
  `ink-soft` (`#4c535f`) ≈7.2:1, and even the floor token `ink-faint` (`#636975`) ≈5.1:1. Every agent
  lane hue used as text (Planner blue / Builder amber / Fixer green / grounding violet / red / warn)
  clears 5.0–6.4:1 on a white sheet, and the Build button's text on indigo ≈5.5:1. There is no
  near-floor muted gray left in the system — the old `#8b95ab` contrast risk is gone.
- **Reduced motion is handled.** A global `prefers-reduced-motion: reduce` block neutralizes all
  transitions/animations, with specific overrides that settle the infinite loaders, typing blink,
  pulse, and skeleton shimmer to a stable state. Motion is never required to perceive content.
- **Streaming activity is a live region.** The build transcript is an `aria-live="polite"`
  `role="log"` ordered list, so screen-reader users perceive streamed progress.
- **Don't rely on color alone.** Agent lanes (Planner = blue, Builder = amber, Fixer = green) always
  keep an SVG icon and a text label so the distinction survives color-blindness and grayscale.
- **Keyboard.** One coherent, visible `:focus-visible` ring across all controls; the composer submits
  on Enter (Shift+Enter for a newline); tabs are a real `role="tablist"` and file rows are `<button>`s
  in a `role="listbox"`.
