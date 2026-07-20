- ALWAYS update this instructions file if you found any gotchas, solutions, needed clarifications while running development session - to make sure next time you will not waste time on the same issues
- After every operation send email report on what was done to salnikov@gmail.com
- Host on Azure using free tiers of either Azure Static Webapps or Azure Container Apps
- In case of internet connection failure, try again in 5 minutes
- If possible, use JavaScript based frameworks and libraries both for frontend and backend

---

## Phased delivery methodology (reusable playbook)

Build every project as a sequence of **thin, independently-verified phases**. Each phase ends with a
concrete, end-to-end proof *before* the next one starts — never advance on unverified work. This is the
approach that shipped Sandcastle (a live multi-agent app on Azure free tiers) and it generalizes to any
project. Copy this section into new repos and adapt the phase contents.

### The phases

| # | Phase | Goal | Exit gate (must pass before the next phase) |
|---|-------|------|----------------------------------------------|
| 0 | **Foundations & de-risk** | Scaffold the repo, pin dependencies, containerize, and prove the *riskiest* integration (auth / SDK / provider / external API) with a minimal smoke test. | A smoke test exercises the core integration end-to-end and passes. |
| 1 | **Walking skeleton** | The single most important user flow, thinnest possible slice, wired end-to-end (UI → API → core → result). | One real request produces a real result E2E. |
| 2 | **Core feature depth** | Build out the primary value proposition on top of the skeleton. | A *realistic* scenario works E2E (not a toy). |
| 3 | **Integrations & grounding** | Connect real external data / tools / services (APIs, MCP, DBs, auth). | A real external call returns and is actually used. |
| 4 | **UX / presentation** | Polished, responsive interface for the core flow. | A full run through the *real* UI works (ideally headless-verified). |
| 5 | **Observability** | Tracing / metrics / logs so you can see what the system does. | Real telemetry is emitted and visible in a backend. |
| 6 | **Hardening & security** | Rate limits, input/output caps, least privilege, non-root, sandbox/isolation. | Controls verified; safe-by-default (opt-in locally, on for hosted). |
| 7 | **Deploy & CI/CD** | Infra-as-code on **free tiers** + deploy-on-push (OIDC, no long-lived secrets). | A push deploys and the live URL serves. |
| 8 | **Docs & launch** | README, technical article, screenshots/diagrams, launch kit. | Docs match reality; every referenced asset resolves. |
| 9 | **Compliance pass** | Cost / ToS review for anything public (e.g. don't spend a *licensed* seat — use seat-free BYOK or free tiers). | Public demo verified to consume no personal/paid quota unintentionally. |

Phases are a default order, not a straitjacket — collapse or reorder them for smaller projects, but keep
the **de-risk-first** (Phase 0) and **verify-before-advancing** discipline.

### Cross-cutting gates & principles

- **Verify before advancing.** Every phase has an explicit ✅ *E2E-verified* gate backed by a real proof
  (smoke test, e2e script, or headless UI/browser run). Keep these as reusable `scripts/` (not shipped in
  the production image).
- **De-risk first.** Prove the hardest / most uncertain integration in Phase 0 before investing in breadth.
- **Thin slice, then deepen.** Walking skeleton before features; features before polish.
- **Keep a living plan.** Track phase status + key decisions in `plan.md` (or session state); update it at
  milestones, not on every step.
- **Free-tier / cost-aware by default**, and ToS-compliant for anything public-facing.
- **Safe-by-default.** Security controls default OFF for local dev, ON for the hosted profile via env/flags.
- **Ship continuously.** When deploy-on-push exists, commit + push after each change and keep `main`
  deployable/green. Exclude docs/assets from the deploy trigger (`paths-ignore`) so they don't force
  needless redeploys.
- **Document as you go**, and update *this* file whenever a gotcha or solution would save time next session.

### Per-phase loop (repeat for each phase)

1. State the phase goal and its exit gate.
2. Implement the thinnest version that can satisfy the gate.
3. Write/keep a proof (smoke / e2e / headless script) and run it.
4. Only when green: commit, push (if deploy-on-push), update the plan, then move to the next phase.