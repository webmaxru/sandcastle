# Cookieless analytics (Real User Monitoring)

Sandcastle's frontend is instrumented with **cookieless** Real User Monitoring via
[`@webmaxru/cookieless-insights`](https://www.npmjs.com/package/@webmaxru/cookieless-insights).
It sends page views and key interactions to **Azure Application Insights** using a tiny
dependency-free **beacon** — no cookies, no `localStorage`/`sessionStorage`, and only an
in-memory session id. Because nothing persistent is stored, **no cookie/GDPR consent banner
is required**. Everything runs on the Azure **free tier**.

## Azure resources (free tier)

All in the existing project resource group **`rg-sandcastle`** (`eastus2`), kept separate from
the backend's server-side telemetry:

| Resource | Name | Notes |
| --- | --- | --- |
| Log Analytics workspace | `sandcastle-law` | 30-day retention, **0.16 GB/day** ingestion cap (stays under the 5 GB/month free grant) |
| Application Insights | `sandcastle-ai` | Workspace-based (RUM sink) |
| Portal dashboard | `cookieless-insights-dashboard` | Engagement tiles (page views, sessions, dwell, key events, geo, browser/OS) |

Re-provision (idempotent) with the CLI, or the raw `az` commands it prints:

```bash
npx @webmaxru/cookieless-insights setup --name sandcastle --location eastus2   # print the az commands
npx @webmaxru/cookieless-insights dashboard \
  --app-insights-id /subscriptions/<sub>/resourceGroups/rg-sandcastle/providers/microsoft.insights/components/sandcastle-ai
```

## The connection string is a public client key

The App Insights **connection string** is a write-only, client-side ingestion key that is meant
to ship in the browser bundle. It is **not a secret** — provide it at **build time**:

- **Locally:** copy `frontend/.env.example` → `frontend/.env` and set
  `VITE_APPINSIGHTS_CONNECTION_STRING=...`. (`.env` is git-ignored.)
- **In CI:** it's a repo **variable** (Settings → Secrets and variables → Actions → *Variables*)
  named `VITE_APPINSIGHTS_CONNECTION_STRING`, passed to the frontend build step in
  `.github/workflows/deploy.yml`. **Never** store it as a secret or commit it as source.

## Wiring

`initAnalytics()` (in `src/analytics.ts`) is called once at startup in `src/main.tsx`:

```ts
init({
  connectionString: import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING,
  enabled: import.meta.env.VITE_ANALYTICS_ENABLED !== 'false',
  cloudRole: 'sandcastle-web',
})
```

`autoPageView` (default on) sends a **page view** on load. Key interactions are tracked with
`track(name, props)` and typing is debounced with `trackTyping(key)`:

| Event | Where | Properties |
| --- | --- | --- |
| _(page view)_ | auto on load | — |
| `opened_via_shared_link` | `App.tsx` — `?prompt=` present | — |
| `example_pick` | `ExampleGallery.tsx` — starter/featured | `name`, `featured` |
| `prompt_typing` | `PromptBar.tsx` — textarea (debounced) | — |
| `build_started` | `App.tsx` — every build/refine | `mode`, `prompt_length` |
| `build_done` | `App.tsx` — stream complete | `has_app` |
| `build_stopped` | `App.tsx` — Stop | — |
| `new_app` | `App.tsx` — New app | — |
| `go_home` | `App.tsx` — brand/logo | — |
| `share_link` | `App.tsx` — Share | — |
| `dev_mode_toggle` | `App.tsx` — Developer mode | `on` |
| `result_tab` | `App.tsx` — Live preview / Code | `tab` |
| `preview_reload` / `preview_open_newtab` | `PreviewPane.tsx` | — |
| `file_select` | `FileExplorer.tsx` — file row | `ext` |
| `outbound_click` | `App.tsx` — footer links | `target` (`github` / `linkedin`) |

### Kill switch

Telemetry is a safe no-op when the connection string is absent (e.g. local dev without `.env`).
To force it off even when a connection string is present, set `VITE_ANALYTICS_ENABLED=false`.

## Engagement report

Print engagement to the terminal (and open the Portal dashboard with `--open`):

```bash
npm --prefix frontend run analytics:report          # rg-sandcastle / sandcastle-ai, last 30 days, --open
# or directly:
npx @webmaxru/cookieless-insights report --resource-group rg-sandcastle --app-insights sandcastle-ai --days 30 --open
```

Data typically appears **1–3 minutes** after a visit. The report covers page views, sessions,
events/session, dwell time, key events, top pages, top countries, and browser/OS.
