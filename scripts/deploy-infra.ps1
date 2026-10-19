param(
  [Parameter(Mandatory = $true)][string]$SubscriptionId,
  [string]$Location = "eastus",
  [string]$ResourceGroupName = "rg-teams-bot-aks-poc",
  [string]$NamePrefix = "tbakspoc",
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
  "Microsoft.Network"
)

foreach ($provider in $providers) {
  az provider register --namespace $provider | Out-Null
}

az deployment sub create `
  --name "teams-bot-aks-poc-$((Get-Date).ToString('yyyyMMddHHmmss'))" `
  --location $Location `
  --template-file ".\infra\main.bicep" `
  --parameters resourceGroupName=$ResourceGroupName location=$Location namePrefix=$NamePrefix botEndpointHost=$BotEndpointHost `
  --output json

