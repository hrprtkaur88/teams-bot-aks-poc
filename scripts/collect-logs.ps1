param(
  [Parameter(Mandatory = $true)][string]$ResourceGroupName,
  [string]$OutputPath = ".\_outputs\logs"
)

$ErrorActionPreference = "Continue"

$aksName = az aks list -g $ResourceGroupName --query "[0].name" -o tsv
az aks get-credentials -g $ResourceGroupName -n $aksName --overwrite-existing

New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null

kubectl get pods -n teams-bot-poc -o wide | Tee-Object "$OutputPath\pods.txt"
kubectl get events -n teams-bot-poc --sort-by=.lastTimestamp | Tee-Object "$OutputPath\events.txt"
kubectl get svc,endpoints,ingress -n teams-bot-poc -o wide | Tee-Object "$OutputPath\networking.txt"
kubectl describe deployment teams-bot -n teams-bot-poc | Tee-Object "$OutputPath\deployment-describe.txt"

$pods = kubectl get pods -n teams-bot-poc -l app=teams-bot -o jsonpath="{.items[*].metadata.name}"
foreach ($pod in $pods.Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)) {
  kubectl logs $pod -n teams-bot-poc --timestamps | Tee-Object "$OutputPath\$pod.log"
  kubectl logs $pod -n teams-bot-poc --previous --timestamps | Tee-Object "$OutputPath\$pod.previous.log"
}

$appiName = az monitor app-insights component show -g $ResourceGroupName --query name -o tsv
Write-Output "Application Insights component: $appiName" | Tee-Object "$OutputPath\application-insights.txt"
Write-Output "Suggested query:" | Tee-Object "$OutputPath\application-insights.txt" -Append
Write-Output "traces | where timestamp > ago(2h) | where message has 'sendActivity' or message has 'bot request failed' or message has 'adapter' | order by timestamp desc" | Tee-Object "$OutputPath\application-insights.txt" -Append

Write-Output "Logs written to $OutputPath"

