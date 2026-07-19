// Sandcastle — Azure infrastructure (free tiers only).
//
//   * Log Analytics workspace        (backs App Insights + the ACA environment)
//   * Application Insights            (OpenTelemetry sink; free data cap)
//   * Container Apps environment      (Consumption; free monthly grant)
//   * Container App  (backend)        (pulls a PUBLIC ghcr.io image — no paid ACR)
//   * Static Web App (frontend)       (Free SKU)
//
// Deploy at resource-group scope:
//   az group create -n rg-sandcastle -l eastus2
//   az deployment group create -g rg-sandcastle -f infra/main.bicep \
//     -p backendImage=ghcr.io/<owner>/<repo>-backend:latest \
//        providerBaseUrl=https://models.github.ai/inference \   // free GitHub Models (BYOK, no Copilot seat)
//        providerApiKey=<github-token-with-models-access> \
//        providerModel=openai/gpt-4o-mini
//   # For a stronger public demo use Azure OpenAI instead:
//   #    providerType=azure providerBaseUrl=https://<resource>.openai.azure.com \
//   #    providerApiKey=<key> providerModel=<deployment-name>
//
// The GitHub Actions workflow later swaps in the freshly built image tag and
// deploys the frontend build to the Static Web App.

@description('Base name used to derive resource names.')
param namePrefix string = 'sandcastle'

@description('Location for the backend + monitoring resources.')
param location string = resourceGroup().location

@description('Static Web App location (Free SKU is region-limited).')
@allowed([
  'centralus'
  'eastus2'
  'eastasia'
  'westeurope'
  'westus2'
])
param swaLocation string = 'eastus2'

@description('Public backend container image (ghcr.io/...). A placeholder is used until CI pushes the real one.')
param backendImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('BYOK model provider base URL (e.g. Azure OpenAI). Leave empty to use a GitHub token instead.')
param providerBaseUrl string = ''

@description('BYOK model provider API key. Stored as a Container App secret.')
@secure()
param providerApiKey string = ''

@description('BYOK provider type: "openai" (default, works for any OpenAI-compatible endpoint incl. GitHub Models), "azure", or "anthropic".')
param providerType string = 'openai'

@description('BYOK model name — REQUIRED for BYOK (the CLI needs it at startup). E.g. "openai/gpt-4o-mini" for GitHub Models, or your Azure OpenAI deployment/model.')
param providerModel string = ''

@description('Optional GitHub token (fine-grained PAT with "Copilot Requests") for Copilot-model mode.')
@secure()
param githubToken string = ''

@description('Enable per-client rate limiting on the hosted backend.')
param enableRateLimit bool = true

var resourceToken = uniqueString(resourceGroup().id)
var tags = { project: 'sandcastle', 'azd-env-name': namePrefix }

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${namePrefix}-${resourceToken}'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    features: { searchVersion: 1 }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${namePrefix}-${resourceToken}'
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
  }
}

resource acaEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${namePrefix}-${resourceToken}'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource swa 'Microsoft.Web/staticSites@2024-04-01' = {
  name: 'swa-${namePrefix}-${resourceToken}'
  location: swaLocation
  tags: union(tags, { 'azd-service-name': 'web' })
  sku: { name: 'Free', tier: 'Free' }
  properties: {
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
  }
}

// Secrets + env are assembled conditionally so unset auth values are omitted.
var secrets = concat(
  empty(providerApiKey) ? [] : [ { name: 'provider-api-key', value: providerApiKey } ],
  empty(githubToken) ? [] : [ { name: 'github-token', value: githubToken } ]
)

var baseEnv = [
  { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
  { name: 'SANDCASTLE_RATELIMIT', value: string(enableRateLimit) }
  { name: 'SANDCASTLE_CORS_ORIGINS', value: 'https://${swa.properties.defaultHostname}' }
  { name: 'PORT', value: '8000' }
]
var containerEnv = concat(
  baseEnv,
  empty(providerBaseUrl) ? [] : [ { name: 'COPILOT_PROVIDER_BASE_URL', value: providerBaseUrl } ],
  empty(providerBaseUrl) ? [] : [ { name: 'COPILOT_PROVIDER_TYPE', value: providerType } ],
  empty(providerModel) ? [] : [ { name: 'GITHUB_COPILOT_MODEL', value: providerModel } ],
  empty(providerApiKey) ? [] : [ { name: 'COPILOT_PROVIDER_API_KEY', secretRef: 'provider-api-key' } ],
  empty(githubToken) ? [] : [ { name: 'COPILOT_GITHUB_TOKEN', secretRef: 'github-token' } ]
)

resource backend 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${namePrefix}-${resourceToken}'
  location: location
  tags: union(tags, { 'azd-service-name': 'backend' })
  properties: {
    managedEnvironmentId: acaEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: secrets
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: backendImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: containerEnv
        }
      ]
      // Single replica keeps the in-memory session map + rate limiter correct.
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
    }
  }
}

output BACKEND_URL string = 'https://${backend.properties.configuration.ingress.fqdn}'
output BACKEND_FQDN string = backend.properties.configuration.ingress.fqdn
output CONTAINERAPP_NAME string = backend.name
output SWA_NAME string = swa.name
output SWA_HOSTNAME string = swa.properties.defaultHostname
output SWA_URL string = 'https://${swa.properties.defaultHostname}'
output RESOURCE_GROUP string = resourceGroup().name
output APPINSIGHTS_NAME string = appInsights.name
