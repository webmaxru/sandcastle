# 🏖️ Sandcastle

**Describe an app. Watch a team of GitHub Copilot agents build, run, and debug it — live, in a sandbox.**

Sandcastle is a showcase for the new [**GitHub Copilot provider for Microsoft Agent Framework**](https://learn.microsoft.com/en-us/agent-framework/agents/providers/github-copilot?pivots=programming-language-python). You type *"build me a ..."*, and a multi-agent team (**Planner → Builder → Fixer**) scaffolds a real app in an isolated sandbox, runs it, self-heals build/test errors, and streams a **live preview** you can keep iterating on conversationally.

> Status: 🚧 **Early development.** Phase 0 (foundations) is complete and verified — the agent runtime, backend skeleton, and container image are in place. Build loop, multi-agent orchestration, frontend, and deployment are in progress. See [`docs/architecture.md`](docs/architecture.md).

## Why it's different

Unlike a plain LLM call, the Copilot provider gives each agent a **real, sandboxed computer**:

| Capability | In Sandcastle |
| --- | --- |
| 🖥️ Shell execution | Agents `npm install`, build, and run your app |
| 📁 File read/write | Agents scaffold the whole project; UI shows a live file tree |
| 🌐 URL fetching | Pull assets/references from URLs you paste |
| 🔌 MCP servers | Microsoft Learn MCP grounds scaffolding in current docs |
| 🔴 Streaming | Live agent-activity feed as the app takes shape |
| 🧠 Sessions | "Now add dark mode" — the agent edits the *same* app |
| 👥 Multi-agent | Planner → Builder → Fixer team, streamed distinctly |
| 📈 Observability | Built-in OpenTelemetry → Azure Monitor |

## Architecture (at a glance)

```
React/Vite SPA (Static Web Apps)  ──HTTPS/SSE──►  FastAPI (Container Apps)
  prompt · activity feed ·                         GitHubCopilotAgent team
  file tree · live preview                         per-session sandbox · MCP · OTel
```

- **Backend** (`backend/`): FastAPI + `agent-framework-github-copilot`. Ships Node 22 + `@github/copilot` in the container.
- **Frontend** (`frontend/`): React + Vite SPA _(coming next)_.
- **Infra** (`infra/`): Azure Static Web Apps + Container Apps, free tiers _(coming next)_.

## Run the backend locally

Prerequisites: **Python 3.12**, **Node.js 22+**, and the **GitHub Copilot CLI** logged in (`copilot` then `/login`), or a fine-grained PAT with the *Copilot Requests* permission.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt   # add --pre if not pinned
copy .env.example .env                                          # optional: configure model/BYOK
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Then open http://127.0.0.1:8000/api/health.

Verify the agent runtime end-to-end:

```powershell
.\.venv\Scripts\python.exe smoke_test.py   # prints "Sandcastle smoke test OK"
```

## Auth modes

- **Local-first** — use your own Copilot login or `COPILOT_GITHUB_TOKEN` (fine-grained PAT, *Copilot Requests*).
- **Hosted demo (BYOK)** — point the CLI at your own model provider via `COPILOT_PROVIDER_BASE_URL` + `COPILOT_PROVIDER_API_KEY` (e.g. Azure OpenAI), so no Copilot seat is shared. (GitHub Copilot is licensed per user.)

## License

TBD.
