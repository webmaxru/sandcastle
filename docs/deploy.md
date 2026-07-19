# Deploying Sandcastle to Azure (free tiers)

Sandcastle runs on two free Azure services:

| Component | Service | SKU |
| --- | --- | --- |
| Frontend (React/Vite) | **Azure Static Web Apps** | Free |
| Backend (FastAPI + Copilot agents) | **Azure Container Apps** | Consumption (free monthly grant) |
| Telemetry | **Application Insights** + Log Analytics | Pay-as-you-go with a free data cap |

The backend image is published to **GitHub Container Registry (ghcr.io)** — public and
free — so there is **no paid Azure Container Registry** in the loop.

---

## 1. One-time provisioning

```bash
# Pick a region that offers the Static Web Apps Free SKU (eastus2, westus2, centralus, westeurope, eastasia).
az group create -n rg-sandcastle -l eastus2

az deployment group create \
  -g rg-sandcastle \
  -f infra/main.bicep \
  -p namePrefix=sandcastle \
     swaLocation=eastus2 \
     providerBaseUrl="https://<your-aoai>.openai.azure.com/openai/v1" \
     providerApiKey="<azure-openai-key>"
```

> **Auth model.** The hosted demo uses **BYOK** (`providerBaseUrl` + `providerApiKey`,
> e.g. Azure OpenAI) so it never resells a GitHub Copilot seat. Alternatively pass
> `githubToken=<fine-grained PAT with "Copilot Requests">` to run in Copilot-model mode.

Note the deployment outputs — you'll need them below:

```bash
az deployment group show -g rg-sandcastle -n main \
  --query "properties.outputs.{backend:BACKEND_URL.value, app:CONTAINERAPP_NAME.value, swa:SWA_NAME.value, url:SWA_URL.value}" -o table
```

## 2. Wire up deploy-on-push (GitHub Actions)

`.github/workflows/deploy.yml` builds the backend image → pushes to ghcr → rolls the
Container App → builds the frontend → publishes to Static Web Apps, on every push to
`main`.

**Repo secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `AZURE_CLIENT_ID` | App registration (federated credential) client id |
| `AZURE_TENANT_ID` | Directory (tenant) id |
| `AZURE_SUBSCRIPTION_ID` | Subscription id |
| `SWA_DEPLOYMENT_TOKEN` | `az staticwebapp secrets list -n <SWA_NAME> --query properties.apiKey -o tsv` |

**Repo variables:**

| Variable | Value |
| --- | --- |
| `AZURE_RESOURCE_GROUP` | `rg-sandcastle` |
| `BACKEND_CONTAINERAPP_NAME` | `CONTAINERAPP_NAME` output |
| `BACKEND_URL` | `BACKEND_URL` output (used as `VITE_API_BASE`) |

Set up OIDC (passwordless) login once:

```bash
az ad app create --display-name sandcastle-deployer
# create a federated credential for subject repo:<owner>/<repo>:ref:refs/heads/main
# then grant the app's service principal Contributor on rg-sandcastle
```

> **Heads-up — immutable OIDC subject.** Some accounts present the federated subject in
> the *immutable* form `repo:<owner>@<owner_id>/<repo>@<repo_id>:ref:refs/heads/main`
> instead of `repo:<owner>/<repo>:...`. If `azure/login` fails with **AADSTS700213
> "No matching federated identity record"**, copy the exact `subject` from the error and
> add a second federated credential with that value.

Push to `main` → the app ships. 🎉

## 3. Alternative: Azure Developer CLI

The resources carry `azd-service-name` tags (`web`, `backend`), so `azd up` can also
provision + deploy. The ghcr + Actions path above is the default because it stays
strictly on free tiers.

## 4. Run locally

```bash
# One command — backend (Copilot agents) + frontend dev server:
docker compose up --build
# open http://localhost:5173
```

Provide auth via a local `.env` (`COPILOT_GITHUB_TOKEN=...`) or log in once inside the
container: `docker compose exec backend copilot` → `/login`. See `.env.example`.

Or use the **Dev Container** (`.devcontainer/`) and run the two dev servers directly:

```bash
# backend
PYTHONPATH=. uvicorn backend.app.main:app --port 8099
# frontend
npm --prefix frontend run dev
```
