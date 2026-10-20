import appInsights from "applicationinsights";
import express from "express";
import { AuthType, CloudAdapter, type AuthConfiguration } from "@microsoft/agents-hosting";
import { randomUUID } from "node:crypto";
import { config, workloadIdentity } from "./config.js";
import { createAgentApplication } from "./bot.js";
import { authorizeBotFrameworkJwt } from "./customJwtAuth.js";
import { error, getCorrelationFields, info } from "./logging.js";

if (config.appInsightsConnectionString) {
  appInsights
    .setup(config.appInsightsConnectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectConsole(true, true)
    .start();
}

// Outbound auth (replying to Bot Framework / Teams) uses AKS Azure Workload
// Identity Federation, matching the architecture diagram:
//   AKS OIDC issuer -> projected service-account token (AZURE_FEDERATED_TOKEN_FILE)
//   -> federated token exchange with Microsoft Entra ID (scope api.botframework.com)
//   -> connector token used to call the Bot Framework Connector.
//
// We build this AuthConfiguration explicitly in code (AuthType.WorkloadIdentity)
// rather than via the SDK's loadAuthConfigFromEnv() helper, because that
// helper expects differently-named env vars ("clientId"/"tenantId"/
// "federatedTokenFile") than the ones AKS's workload identity webhook
// actually injects (AZURE_CLIENT_ID / AZURE_TENANT_ID /
// AZURE_FEDERATED_TOKEN_FILE) — in 1.6.1 that mismatch means the env
// loader silently fails to pick up workload identity.
const authConfig: AuthConfiguration = {
  authType: AuthType.WorkloadIdentity,
  clientId: workloadIdentity.clientId,
  tenantId: workloadIdentity.tenantId,
  federatedClientId: workloadIdentity.clientId,
  federatedTokenFile: workloadIdentity.federatedTokenFile,
  authorityEndpoint: workloadIdentity.authorityHost
};

const adapter = new CloudAdapter(authConfig);
const app = createAgentApplication(adapter, config.failureMode);
const server = express();

server.use(express.json());

adapter.onTurnError = async (context, err) => {
  const fields = getCorrelationFields(context, { failureMode: config.failureMode });
  error("adapter onTurnError", err, fields);
  throw err;
};

// AKS probes hit GET /messaging/healthz (ingress path "/messaging", no rewrite).
server.get(`${config.basePath}/healthz`, (_req, res) => {
  res.status(200).json({ status: "ok", failureMode: config.failureMode });
});

// Inbound activities arrive at POST /messaging/api/messages, after the AKS
// ingress forwards the full, unmodified path (no rewrite) to this pod.
server.post(
  `${config.basePath}/api/messages`,
  authorizeBotFrameworkJwt(config.microsoftAppId),
  async (req, res) => {
    const requestId = req.header("x-ms-request-id") ?? req.header("x-request-id") ?? randomUUID();
    info("request receipt", {
      requestId,
      route: `${config.basePath}/api/messages`,
      failureMode: config.failureMode,
      podName: config.podName,
      nodeName: config.nodeName
    });

    try {
      info("adapter processing start", { requestId, failureMode: config.failureMode });
      await adapter.process(req, res, async (context) => {
        info("activity received", getCorrelationFields(context, { requestId, failureMode: config.failureMode }));
        await app.run(context);
      });
      info("adapter processing end", { requestId, failureMode: config.failureMode });
    } catch (err) {
      error("bot request failed", err, { requestId, failureMode: config.failureMode });
      if (!res.headersSent) {
        res.status(500).json({ error: "controlled bot failure", requestId });
      }
    }
  }
);

server.listen(config.port, () => {
  info("server started", {
    port: config.port,
    basePath: config.basePath,
    failureMode: config.failureMode,
    podName: config.podName,
    nodeName: config.nodeName
  });
});
