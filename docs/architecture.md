# Sandcastle — Architecture

> Companion to the implementation plan. This doc captures the *verified* technical design
> after Phase 7 (feature-complete). Deep rationale and the phase-by-phase roadmap live in the session plan.

## Concept

A **Live App Builder**: the user describes an app; a multi-agent team scaffolds it in an
isolated sandbox, runs it, self-heals errors, and serves a live preview the user iterates on
conversationally. It showcases the GitHub Copilot provider for Microsoft Agent Framework.

## Components

- **Frontend** — React + Vite SPA on **Azure Static Web Apps** (free). Prompt/chat, streaming
  agent-activity feed, live file tree + code viewer, live preview `<iframe>`, share/remix.
- **Backend** — **FastAPI** on **Azure Container Apps** (free grant). Docker image includes
  Node 22 + `@github/copilot`. Hosts the agent team, session manager, MCP, OTel, and the
  preview server.

## Verified provider API (agent-framework-github-copilot 1.0.0rc3)

- `from agent_framework.github import GitHubCopilotAgent, GitHubCopilotOptions, GitHubCopilotSettings, RawGitHubCopilotAgent`
- `GitHubCopilotAgent(instructions, *, client=None, tools=None, context_providers=None, default_options=None, ...)`
- `await agent.run("...")` → `AgentResponse` (has `.text`); `agent.run("...", stream=True)` → async stream.
- `agent.create_session(session_id=None)` → `AgentSession`; pass `session=...` to `run` for memory.
- `async with agent: ...` starts/stops the underlying Copilot runtime.
- **`default_options`** (all optional): `model`, `timeout`, `log_level`, `cli_path`,
  `base_directory`, `on_permission_request`, `mcp_servers`, `provider`,
  `instruction_directories`, `skill_directories`, `on_pre_tool_use`, `on_function_approval`,
  `system_message`.
- **Per-session sandbox** = a **`CopilotClient`** per session (there is no `working_directory`
  in `default_options`). `CopilotClient(*, working_directory, github_token, base_directory,
  env, use_logged_in_user, mode='copilot-cli', ...)`.
  - `working_directory` → the session's scratch dir (where file/shell ops happen).
  - `use_logged_in_user=True` → reuse the machine's Copilot login (used by the smoke test).
  - `github_token` / `env` → inject auth or BYOK provider env per session.
- **Permissions**: `from copilot.session import PermissionHandler` → `PermissionHandler.approve_all`
  for the trusted sandbox.
- **MCP**: `default_options["mcp_servers"] = {"microsoft-learn": {"type": "http", "url":
  "https://learn.microsoft.com/api/mcp", "tools": ["*"]}}` (types: `MCPHTTPServerConfig`,
  `MCPStdioServerConfig`).
- **Observability**: `from agent_framework.observability import configure_otel_providers`;
  call once at startup (supports console + OTLP exporters).

## Authentication (verified from GitHub docs)

- CLI resolves credentials in order: `COPILOT_GITHUB_TOKEN` → `GH_TOKEN` → `GITHUB_TOKEN` →
  OS keychain (OAuth) → `gh auth token`.
- Token types: fine-grained PAT (personal, **Copilot Requests** permission), GitHub App
  user-to-server (`ghu_`), OAuth (`gho_`). **Classic PAT (`ghp_`) not supported.**
- **BYOK** (activated by `COPILOT_PROVIDER_BASE_URL`): model requests route to your own
  OpenAI-compatible provider — **no GitHub auth required** — while the agentic runtime
  (shell/file/URL/MCP) still works. Two non-obvious requirements: (1) the CLI needs an
  **explicit model at startup** (`COPILOT_MODEL`, set from `GITHUB_COPILOT_MODEL`), and
  (2) each session must be created **with a `provider` config** (base_url + api_key/bearer +
  model), not just the process env. `sessions.py` handles both. This is the ToS-compliant path
  for the public hosted demo (Copilot is licensed per user). The live demo uses the **free
  GitHub Models** endpoint; Azure OpenAI (`COPILOT_PROVIDER_TYPE=azure`) is the paid, higher-limit option.

## Backend API & streaming events (Phases 1–2)

Endpoints (all under `/api`):

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/sessions` | Create a session → `{id, preview}`. Spins up a per-session sandbox + agent team. |
| `POST` | `/sessions/{id}/build` | Send a build/iterate prompt. Returns an **SSE** stream of activity events. |
| `GET` | `/sessions/{id}/files` | List generated files (`path`, `size`). |
| `GET` | `/sessions/{id}/files/{path}` | Read a text file's contents. |
| `GET` | `/preview/{id}/{path}` | Serve the built static app (default `index.html`) for the iframe. Path-traversal guarded. |
| `DELETE` | `/sessions/{id}` | Stop the agents and delete the workspace. |
| `GET` | `/config`, `/health` | Public config / liveness. |

**SSE event schema** (`data:` is JSON; every agent event carries an `agent` lane —
`planner`/`builder`/`fixer`):

- `status` `{state}` · `phase` `{agent, label}`
- `tool_start` `{agent, id, tool, summary, args}` · `tool_end` `{agent, id, success, error}`
- `text` `{agent, text}` · `usage` `{agent, model}`
- `validation` `{attempt, issues[], green}` · `error` `{agent, message, fatal}`
- `done` `{preview, has_index, green, issues[]}`

Events are produced by mapping each `AgentResponseUpdate.raw_representation.data`
(`ToolExecutionStartData` / `ToolExecutionCompleteData` / `AssistantUsageData` /
`AssistantMessageDeltaData`) in `app/agents/stream_map.py`.

## Multi-agent orchestration (Planner → Builder → Fixer)

`app/agents/orchestrator.py` runs a **manual** sequential orchestration (chosen over the
Agent Framework `WorkflowBuilder` so every underlying Copilot tool/text delta streams live,
tagged by agent). All three personas **share one per-session `CopilotClient`/workspace** and
run sequentially — verified that multiple `GitHubCopilotAgent`s can share a client.

1. **Planner** (`app/agents/personas.py`) — emits a short text plan only (no tools).
2. **Builder** — implements/edits the app; holds an `AgentSession` for conversational memory
   (iteration edits the same files instead of rebuilding).
3. **Fixer** — self-healing loop: `app/validation.py` produces a **real signal** (inline/local
   JS run through `node --check`; referenced local assets must exist; `index.html` must exist).
   On issues, the Fixer edits in place; re-validate; repeat up to `SANDCASTLE_MAX_FIX_ATTEMPTS`.

Verified end-to-end: build → green preview; a second turn adds `localStorage` + a pause key by
editing the existing app; and the real Fixer repairs a deliberately broken app back to green.

## Live preview strategy

- **Hosted demo**: steer generation to **static/SPA output** (vanilla HTML/canvas, or
  `vite build` → `dist/`). Backend serves the artifact at `/api/preview/{session}/…` → iframe.
- **Local-first**: any stack; run its dev server and reverse-proxy the preview.

## Sandbox / security (hosted)

Agents run with `approve_all`, so containment matters: non-root user, per-session scratch dir,
timeouts, rate limits, concurrency caps, output caps, workdir cleanup. Hardening upgrade:
**Azure Container Apps Dynamic Sessions** (Hyper-V isolated) or the CLI's native
`/sandbox enable` / `--cloud`.

## Observability (Phase 5)

`app/observability.py` calls Agent Framework's `configure_otel_providers()` once at startup, so
every agent invocation, tool call, and model request is traced automatically (spans carry
`gen_ai.*` attributes incl. token usage). **Exporter auto-selection** (first match wins): Azure
**Application Insights** (`APPLICATIONINSIGHTS_CONNECTION_STRING`, free tier) → **OTLP**
(`OTEL_EXPORTER_OTLP_ENDPOINT`) → **console** (`SANDCASTLE_OTEL_CONSOLE`, dev) → **disabled**
(default). Every path is defensive; sensitive telemetry is off by default. Status is exposed at
`/api/observability` and reflected by an OTEL chip in the UI.

## Hardening (Phase 6)

The hosted demo runs the agent with `approve_all`, so it is throttled (off by default for the
local repo): a per-client sliding-window **rate limiter** (`app/ratelimit.py`, `X-Forwarded-For`
aware) returns **429 + `Retry-After`** on `POST /sessions` (per hour) and `/build` (per minute);
SSE frames truncate oversized fields with a total-event cap; the file endpoint enforces a max
byte size + `nosniff`. The container runs **non-root**. Tunables: `SANDCASTLE_RATELIMIT`,
`SANDCASTLE_RATE_*`, `SANDCASTLE_MAX_*`.

## Deployment (Phase 7)

`infra/main.bicep` provisions, on **Azure free tiers only** (no paid ACR): Log Analytics +
Application Insights + a Container Apps environment & app (public **ghcr.io** image; **single
replica** so the in-memory session map + rate limiter stay correct; scale-to-zero) + a **Static
Web App (Free)**. `.github/workflows/deploy.yml` ships on push to `main` (ghcr build/push → OIDC
`az containerapp update` → frontend build → `static-web-apps-deploy`). One-command local run via
`docker compose up` or the Dev Container. Full guide: [`deploy.md`](deploy.md).

## Status

- ✅ **Phase 0** — foundations: backend skeleton, venv + deps, container image, agent smoke
  test verified (`Sandcastle smoke test OK`).
- ✅ **Phase 1** — core build loop: session manager, SSE streaming, static preview. E2E verified
  (build a Snake game → live canvas preview).
- ✅ **Phase 2** — multi-agent Planner→Builder→Fixer + self-healing; conversational iteration.
  E2E verified (two-turn build+iterate; real Fixer repairs a broken app to green).
- ✅ **Phase 3** — MCP grounding: Microsoft Learn HTTP MCP wired into all agents. E2E verified
  (a Dynamic Sessions cheat-sheet build made 8 Microsoft Learn lookups; grounded content, green).
- ✅ **Phase 4** — polished React/Vite frontend (activity feed with agent lanes, file tree + code
  viewer, live preview iframe, example gallery, share/remix). Verified via a full live build
  through the real UI (headless render + preview iframe rendering the generated app; 0 errors).
- ✅ **Phase 5** — observability: OpenTelemetry → App Insights/OTLP/console. Verified real
  `invoke_agent` spans with token-usage metrics.
- ✅ **Phase 6** — hardening: rate limiting, output caps, file guards, non-root. Verified via
  unit + HTTP integration tests.
- ✅ **Phase 7** — deploy & CI/CD: Bicep (SWA + ACA free) + GitHub Actions deploy-on-push + local
  compose/devcontainer. Verified bicep build, YAML, and a non-root backend container serving.
- ⏭️ **Phase 8** — docs & launch (README + screenshots + launch kit).
