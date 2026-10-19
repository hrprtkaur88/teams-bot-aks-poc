# Failure Analysis Mapping

This POC maps directly to the Severity A pattern:

| Incident observation | POC behavior |
|---|---|
| Teams accepts the message | User sends message to installed Teams bot |
| Teams is not the blocker | Azure Bot Service invokes `/api/messages` |
| Bot backend receives activity | `activity received` log appears with correlation fields |
| Application throws exception | Failure modes intentionally throw controlled exceptions |
| Bot does not return response | `sendActivity end` is absent or exception is raised before reply |
| HTTP 500 appears | Express catch block returns controlled 500 when headers are not sent |
| ECONNRESET appears | `econnreset-on-reply` throws an error with `code=ECONNRESET` |
| Need AKS/app logs for root cause | `collect-logs.ps1` captures pod logs, previous logs, events, and service state |

The diagnostic objective is to prove that channel delivery and backend processing are separate. Teams can successfully accept and deliver the inbound user message while the AKS-hosted application fails during turn handling or outbound reply.

