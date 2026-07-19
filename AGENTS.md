# AGENTS.md — working conventions for Sandcastle

Guidance for humans and AI agents contributing to this repo. Keep changes small, verified, and
consistent with the patterns already here.

## Layout

- `backend/` — FastAPI + the Copilot agent team.
  - `app/api/routes.py` — HTTP + SSE endpoints.
  - `app/sessions.py` — per‑session workspace + one `CopilotClient` shared by the personas.
  - `app/agents/` — `personas.py`, `stream_map.py`, `orchestrator.py` (manual Planner→Builder→Fixer).
  - `app/validation.py` — the self‑heal signal (`node --check` + asset/`index.html` checks).
  - `app/observability.py`, `app/ratelimit.py`, `app/config.py`.
  - `scripts/` — proof/e2e scripts (not shipped in the image).
- `frontend/` — React 19 + Vite + TS SPA.
- `infra/` — `main.bicep` (SWA + ACA + App Insights, free tiers).
- `.github/workflows/` — `deploy.yml` (deploy‑on‑push) + `ci.yml`.

## Run locally

```bash
docker compose up --build          # → http://localhost:5173  (backend on :8000)
```

Or split processes (backend on :8099, Vite proxies `/api` to it):

```bash
PYTHONPATH=. uvicorn backend.app.main:app --port 8099
npm --prefix frontend run dev
```

## Build / lint / test

```bash
npm --prefix frontend run build    # tsc -b && vite build (unused vars fail the build)
npm --prefix frontend run lint     # oxlint
python backend/scripts/ratelimit_http_test.py   # rate-limit HTTP integration
python backend/scripts/e2e_http.py              # end-to-end build via the API
```

- Prefer the **smallest** targeted check that covers your change; only run full suites when needed.
- Backend has no separate lint step; keep imports tidy and the app importable
  (`python -c "import backend.app.main"`).

## Conventions

- **Free tiers only.** No paid Azure resources; the backend image lives in public **ghcr.io**.
- **Single backend replica.** The session map + rate limiter are in‑memory, so ACA stays at
  `maxReplicas: 1`. Don’t add horizontal scaling without externalizing that state.
- **Streaming stays live.** Orchestration is intentionally manual (not `WorkflowBuilder`) so every
  Copilot tool/text delta streams, tagged by agent lane. Map new update types in
  `app/agents/stream_map.py`.
- **Self‑heal is real.** Keep validation grounded in actual checks; don’t weaken it to force green.
- **Safe by default.** Rate limits/caps default OFF for local dev, ON for the hosted demo via env.
  New limits follow the same opt‑in pattern.
- **Console output is UTF‑8.** Test scripts call `sys.stdout.reconfigure(encoding="utf-8")`
  (Windows cp1252 otherwise mangles the ✓/🔎 glyphs).
- **Never commit** an npm `strict-ssl` workaround (the local npm→registry TLS block is
  machine‑specific; CI builds the full image fine) or any secret/token.

## Environment notes

- Python 3.12 · Node 22 · the [`@github/copilot`](https://www.npmjs.com/package/@github/copilot) CLI.
- Auth: `COPILOT_GITHUB_TOKEN` (fine‑grained PAT, *Copilot Requests*) or an interactive `/login`;
  BYOK via `COPILOT_PROVIDER_BASE_URL` + `COPILOT_PROVIDER_API_KEY`. See `backend/.env.example`.

## Ship it

Push to `main` → `.github/workflows/deploy.yml` builds/pushes the backend image to ghcr, updates the
Container App (OIDC), builds the frontend, and deploys the Static Web App. Provisioning + required
secrets/variables are documented in [`docs/deploy.md`](docs/deploy.md).
