param(
  [Parameter(Mandatory = $true)][string]$SubscriptionId,
  [string]$Location = "westus2",
  [string]$ResourceGroupName = "rg-teams-bot-pwc-poc",
  [string]$NamePrefix = "tbpwcpoc",
  [string]$BotEndpointHost = "replace-after-ingress-is-known"
)

$ErrorActionPreference = "Stop"

az account set --subscription $SubscriptionId

$providers = @(
  "Microsoft.ContainerService",
  "Microsoft.ContainerRegistry",
  "Microsoft.BotService",
  "Microsoft.Insights",
  "Microsoft.KeyVault",
  "Microsoft.ManagedIdentity",
  "Microsoft.Network",
  "Microsoft.OperationsManagement",
  "Microsoft.OperationalInsights"
)

foreach ($provider in $providers) {
  az provider register --namespace $provider | Out-Null
}

# Required for AKS standard-load-balancer public IPs in some subscriptions.
try {
  az feature register --namespace Microsoft.Network --name AllowBringYourOwnPublicIpAddress 2>$null
} catch {
  Write-Output "Feature registration warning (non-fatal): $($_.Exception.Message)"
}
az provider register --namespace Microsoft.Network | Out-Null

az deployment sub create `
  --name "teams-bot-aks-poc-$((Get-Date).ToString('yyyyMMddHHmmss'))" `
  --location $Location `
  --template-file ".\infra\main.bicep" `
  --parameters resourceGroupName=$ResourceGroupName location=$Location namePrefix=$NamePrefix botEndpointHost=$BotEndpointHost `
  --output json

