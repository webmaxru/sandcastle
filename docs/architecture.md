# Sandcastle — Architecture

> Companion to the implementation plan. This doc captures the *verified* technical design
> after Phase 0. Deep rationale and the phase-by-phase roadmap live in the session plan.

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
- **BYOK**: `COPILOT_PROVIDER_BASE_URL` + `COPILOT_PROVIDER_API_KEY` → no GitHub auth required
  for model requests; the agentic runtime (shell/file/URL) still works. This is the
  ToS-compliant path for the public hosted demo (Copilot is licensed per user).

## Live preview strategy

- **Hosted demo**: steer generation to **static/SPA output** (vanilla HTML/canvas, or
  `vite build` → `dist/`). Backend serves the artifact at `/api/preview/{session}/…` → iframe.
- **Local-first**: any stack; run its dev server and reverse-proxy the preview.

## Sandbox / security (hosted)

Agents run with `approve_all`, so containment matters: non-root user, per-session scratch dir,
timeouts, rate limits, concurrency caps, output caps, workdir cleanup. Hardening upgrade:
**Azure Container Apps Dynamic Sessions** (Hyper-V isolated) or the CLI's native
`/sandbox enable` / `--cloud`.

## Status

- ✅ **Phase 0** — foundations: backend skeleton, venv + deps, container image, agent smoke
  test verified (`Sandcastle smoke test OK`).
- ⏭️ **Phase 1** — core single-agent build loop (session manager, SSE streaming, preview).
