# Runbook

1. Confirm Azure CLI is logged into the target tenant and subscription.
2. Register required providers with `scripts/deploy-infra.ps1`.
3. Deploy Bicep infrastructure.
4. Build and push the bot image to ACR.
5. Deploy Kubernetes manifests.
6. Update the Azure Bot endpoint to `https://<public-host>/api/messages`.
7. Enable the Teams channel.
8. Install or sideload the Teams app package.
9. Test `FAILURE_MODE=none` first.
10. Reproduce with `econnreset-on-reply` or `http500-before-reply`.
11. Collect logs with `scripts/collect-logs.ps1`.

## Common commands

```powershell
kubectl get pods -n teams-bot-poc -o wide
kubectl logs deployment/teams-bot -n teams-bot-poc --timestamps
kubectl logs deployment/teams-bot -n teams-bot-poc --previous --timestamps
kubectl get events -n teams-bot-poc --sort-by=.lastTimestamp
kubectl describe deployment teams-bot -n teams-bot-poc
kubectl get svc,endpoints,ingress -n teams-bot-poc -o wide
```

