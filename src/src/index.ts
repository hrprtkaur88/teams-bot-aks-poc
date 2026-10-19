import appInsights from "applicationinsights";
import express from "express";
import { CloudAdapter, ConfigurationBotFrameworkAuthentication } from "botbuilder";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { FailurePocBot } from "./bot.js";
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

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication({
  MicrosoftAppId: config.microsoftAppId,
  MicrosoftAppPassword: config.microsoftAppPassword,
  MicrosoftAppTenantId: config.microsoftAppTenantId,
  MicrosoftAppType: config.microsoftAppId ? "SingleTenant" : undefined
});

const adapter = new CloudAdapter(botFrameworkAuthentication);
const bot = new FailurePocBot(config.failureMode);
const app = express();

app.use(express.json());

adapter.onTurnError = async (context, err) => {
  const fields = getCorrelationFields(context, { failureMode: config.failureMode });
  error("adapter onTurnError", err, fields);
  throw err;
};

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/readyz", (_req, res) => {
  res.status(200).json({ status: "ready", failureMode: config.failureMode });
});

app.post("/api/messages", async (req, res) => {
  const requestId = req.header("x-ms-request-id") ?? req.header("x-request-id") ?? randomUUID();
  info("request receipt", {
    requestId,
    route: "/api/messages",
    failureMode: config.failureMode,
    podName: config.podName,
    nodeName: config.nodeName
  });

  try {
    info("adapter processing start", { requestId, failureMode: config.failureMode });
    await adapter.process(req, res, async (context) => {
      info("activity received", getCorrelationFields(context, { requestId, failureMode: config.failureMode }));
      await bot.run(context);
    });
    info("adapter processing end", { requestId, failureMode: config.failureMode });
  } catch (err) {
    error("bot request failed", err, { requestId, failureMode: config.failureMode });
    if (!res.headersSent) {
      res.status(500).json({ error: "controlled bot failure", requestId });
    }
  }
});

app.listen(config.port, () => {
  info("server started", {
    port: config.port,
    failureMode: config.failureMode,
    podName: config.podName,
    nodeName: config.nodeName
  });
});

