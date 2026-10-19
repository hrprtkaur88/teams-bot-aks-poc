param(
  [Parameter(Mandatory = $true)][string]$ResourceGroupName,
  [string]$ImageName = "teams-bot-aks-failure-poc",
  [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

$acrName = az acr list -g $ResourceGroupName --query "[0].name" -o tsv
if (-not $acrName) {
  throw "No Azure Container Registry found in $ResourceGroupName."
}

$loginServer = az acr show -g $ResourceGroupName -n $acrName --query loginServer -o tsv
az acr login -n $acrName

docker build -t "$loginServer/$ImageName`:$Tag" ".\src"
docker push "$loginServer/$ImageName`:$Tag"

Write-Output "$loginServer/$ImageName`:$Tag"

