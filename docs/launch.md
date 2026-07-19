# Sandcastle — launch kit

Everything you need to launch Sandcastle: a demo script, social copy, and talking points.
The one‑line hook: **“I gave a team of GitHub Copilot agents a sandbox and told them to build an app. They did — and debugged it themselves. Live.”**

---

## The 45‑second demo (record this)

1. **Open on the home screen** — example gallery + empty preview. (1s of calm before the wow.)
2. **Type a prompt** the audience will recognize: *“Build a retro snake game with a neon theme and a high‑score counter.”*
3. **Let the lanes fill in** — the **Planner** streams a plan, the **Builder** starts writing files (point out the live file tree).
4. **Catch a self‑heal** — if validation flags something, the **Fixer** lane lights up and edits in place until the banner goes **green**. This is the money moment; don’t cut it.
5. **The preview renders** — play the game *in the iframe*. Flip to the **Code** tab to prove it’s real, readable source.
6. **Iterate by chat** — *“now add a pause key and make it faster.”* Same app, edited live. Sessions/memory in action.
7. **End on Share** — copy the `?prompt=` link. “Here — remix mine.”

**Recording tips:** capture at 1280×720+, trim dead air into a <60s GIF/MP4 for the post, keep one longer cut for YouTube/README. The green **“Validation passed”** banner + the preview rendering are the two frames that must be crisp.

## LinkedIn / X post (draft)

> Everyone’s seen an AI write code. Fewer have watched an AI **team** *run and debug* it.
>
> I built **Sandcastle** on the new **GitHub Copilot provider for Microsoft Agent Framework**. You describe an app; a **Planner → Builder → Fixer** team scaffolds it in a sandbox, runs it, **self‑heals its own errors**, grounds itself in live Microsoft Learn docs, and streams a **live preview** you refine by chat.
>
> The Copilot provider is the unlock: each agent gets a real, sandboxed computer — shell, files, MCP — not just a text box. Full OpenTelemetry traces to App Insights, and it deploys to Azure on **free tiers**.
>
> Open source. Deploy your own in minutes. 👇
>
> `#GitHubCopilot #AgentFramework #AIAgents #Azure #DeveloperTools #OpenSource`

*(Attach the <60s demo clip. Put the repo link in the first comment if you’re optimizing reach.)*

## Talking points (for comments / Q&A)

- **“Is it just prompting an LLM?”** No — the Copilot provider spawns a real Copilot CLI runtime with **shell + file + MCP** tools. The agents *execute* what they write; the Fixer loop is driven by a **real validator** (`node --check` + asset checks), not by asking the model “are you sure?”.
- **“Why three agents?”** Separation of concerns makes the stream legible and the self‑heal loop tight — you can *see* which agent is doing what, in its own lane.
- **“How is it grounded?”** The **Microsoft Learn MCP** (remote HTTP) is wired into every agent, so Microsoft/Azure/.NET scaffolding cites current docs instead of stale training data.
- **“Is the hosted demo abusing Copilot seats?”** No. The public demo runs **BYOK** (your own model provider via `COPILOT_PROVIDER_*`), rate‑limited and sandboxed. The local‑first repo uses each developer’s **own** Copilot login — fully compliant.
- **“What does it cost to run?”** Azure **Static Web Apps (Free)** + **Container Apps (free grant)** + **Application Insights** free tier, and the backend image is in **public ghcr.io** — no paid registry.
- **“Can I self‑host?”** Yes: `docker compose up --build`, or one Bicep deploy. See [`deploy.md`](deploy.md).

## Assets checklist

- [ ] <60s demo GIF/MP4 (self‑heal → green → playable preview).
- [ ] Longer walkthrough cut (2–3 min) for README/YouTube.
- [ ] Stills: `docs/media/demo-live-build.png`, `home.png`, `code-tab.png`.
- [ ] One‑liner + hashtags (above).
- [ ] Repo link + “Deploy your own” link ready to paste.
