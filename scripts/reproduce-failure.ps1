param(
  [Parameter(Mandatory = $true)][string]$ResourceGroupName,
  [ValidateSet("none", "http500-before-reply", "http500-after-receive", "econnreset-on-reply", "timeout-before-reply", "random-intermittent")]
  [string]$FailureMode = "econnreset-on-reply"
)

$ErrorActionPreference = "Stop"

$aksName = az aks list -g $ResourceGroupName --query "[0].name" -o tsv
az aks get-credentials -g $ResourceGroupName -n $aksName --overwrite-existing
kubectl set env deployment/teams-bot -n teams-bot-poc FAILURE_MODE=$FailureMode
kubectl rollout status deployment/teams-bot -n teams-bot-poc --timeout=180s

Write-Output "Failure mode set to $FailureMode."
Write-Output "Send a Teams message to the bot, then run .\scripts\collect-logs.ps1 -ResourceGroupName $ResourceGroupName"

