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

## Architecture-matched branch finding: real outbound 401 root cause

On the `architecture-matched-poc` branch (AKS Workload Identity Federation,
`@microsoft/agents-hosting` AgentApplication SDK, custom JWT middleware),
end-to-end testing surfaced a **real, unplanned** HTTP 401 on every reply —
not a simulated failure mode. This is documented here because it is a
genuine example of the same class of problem the production incident
describes, found and fixed using the instrumentation this POC validates.

**Symptom:** Bot received every inbound activity correctly and passed custom
JWT validation, but `sendActivity()` always failed with
`HttpError: Request failed with status 401` from the Bot Framework
Connector, and the SDK's debug log showed:

```
agents:cloud-adapter:warn Missing identity or identity.aud when creating
connector client. Using anonymous identity
```

**Root cause:** `@microsoft/agents-hosting`'s `CloudAdapter.process()`
expects the verified caller identity on `request.user` (typed as
`JwtPayload`). The custom inbound JWT middleware (`customJwtAuth.ts`) built
for this architecture — necessary because the pinned SDK version
(1.6.1) doesn't reliably support env-var-driven `AuthConfiguration` for this
identity model — verified the token correctly but never attached it to
`request.user`. Without it, `CloudAdapter` silently falls back to an
anonymous identity when building the `ConnectorClient` used for the
*outbound* reply, so every reply went out with no valid bearer token,
and Bot Framework Connector correctly rejected it with 401.

This was confirmed, not guessed, by:
1. Manually acquiring a workload-identity-federated token inside the
   running pod (bypassing the SDK) and confirming it decoded to a
   structurally valid `aud`/`appid` for this bot — ruling out an
   Entra/Bot Channel Registration trust problem.
2. Enabling the SDK's own `DEBUG=agents:*` logging, which showed the
   "anonymous identity" fallback warning precisely on the failing path.

**Fix:** `authorizeBotFrameworkJwt` now sets
`req.user = decoded` immediately after successful verification, so
`CloudAdapter.process()` picks up the real identity for outbound calls.
After this fix, end-to-end replies succeeded, and the `econnreset-on-reply`
failure mode was re-verified to still correctly reproduce the production
symptom (HTTP 500, no bot reply, full stack trace with `code: ECONNRESET`
in logs) on top of the now-working normal path.

**Lesson for any custom JWT middleware replacing an SDK's built-in auth
middleware:** verifying the token is necessary but not sufficient — the
framework also needs the decoded identity attached wherever it expects to
find it (here, `request.user`), or downstream SDK logic (like outbound
connector client creation) can silently degrade to an unauthenticated path
instead of failing loudly.

