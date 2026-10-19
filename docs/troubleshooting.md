# Troubleshooting

## Bot receives no activity

- Confirm Azure Bot endpoint is `https://<host>/api/messages`.
- Confirm the Teams channel is enabled on the Azure Bot resource.
- Confirm the public endpoint is reachable over HTTPS.
- Check AKS service external IP and ingress host mapping.

## Bot receives activity but does not reply

- Check `sendActivity start` without matching `sendActivity end`.
- Search for `bot request failed`, `adapter onTurnError`, and `ECONNRESET`.
- Confirm egress from AKS to Microsoft endpoints is allowed.
- Check pod restarts and previous logs.

## HTTP 500

- Inspect the stack trace in pod logs.
- Correlate `requestId`, `activityId`, and `conversationId`.
- Compare failure mode with expected controlled behavior.

## AKS health

```powershell
kubectl top pods -n teams-bot-poc
kubectl describe pod -n teams-bot-poc -l app=teams-bot
kubectl get events -n teams-bot-poc --sort-by=.lastTimestamp
```

