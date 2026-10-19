# Architecture

The POC follows the production incident path: Teams accepts a user message, Azure Bot Service invokes the bot endpoint, AKS routes the request to a Linux Node.js pod, and the application either replies normally or fails under a controlled failure mode.

## Components

| Component | Purpose | Diagnostic value |
|---|---|---|
| Teams client | User sends message to the installed bot | Confirms user-facing symptom: no bot-authored reply |
| Teams Chat Service | Accepts and stores the user message | A successful message proves Teams delivery is not the blocker |
| Azure Bot Service | Routes Teams activities to the bot endpoint and relays replies | Separates channel delivery from backend processing |
| Bot messaging endpoint | Public HTTPS endpoint ending in `/api/messages` | Validates endpoint routing and HTTP 500 behavior |
| AKS load balancer/ingress | Routes public traffic to Kubernetes service | Correlates routing, timeout, and connection reset issues |
| Kubernetes service | Selects healthy bot pods | Shows whether traffic can hit unhealthy or terminating pods |
| Node.js/Express app | Receives HTTP POST activities | Logs request receipt and request ID |
| CloudAdapter | Authenticates/processes Bot Framework activity | Logs adapter start/end and turn errors |
| Bot business logic | Processes messages and calls `sendActivity()` | Injects controlled failures before or during reply |
| Application Insights | Central telemetry | Correlates requests, traces, exceptions, dependencies |

## Failure points

HTTP 500 can occur before adapter processing, during turn processing, from bot logic, or from an unhandled `sendActivity()` failure. `ECONNRESET` can occur during outbound calls from the bot container to Bot Framework endpoints, or can be simulated by the POC to validate logging and support workflows.

## Correlation fields

Every meaningful log line includes `activityId`, `conversationId`, `tenantId`, `serviceUrl`, `operationId`, `requestId`, `podName`, and `nodeName` when available.

