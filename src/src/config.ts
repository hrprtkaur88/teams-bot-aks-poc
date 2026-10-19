export type FailureMode =
  | "none"
  | "http500-before-reply"
  | "http500-after-receive"
  | "econnreset-on-reply"
  | "timeout-before-reply"
  | "random-intermittent";

const allowedFailureModes = new Set<string>([
  "none",
  "http500-before-reply",
  "http500-after-receive",
  "econnreset-on-reply",
  "timeout-before-reply",
  "random-intermittent"
]);

function getFailureMode(value: string | undefined): FailureMode {
  if (value && allowedFailureModes.has(value)) {
    return value as FailureMode;
  }

  return "none";
}

export const config = {
  port: Number(process.env.PORT ?? "3978"),
  microsoftAppId: process.env.MicrosoftAppId ?? process.env.BOT_APP_ID ?? "",
  microsoftAppPassword: process.env.MicrosoftAppPassword ?? process.env.BOT_APP_PASSWORD ?? "",
  microsoftAppTenantId: process.env.MicrosoftAppTenantId ?? process.env.BOT_APP_TENANT_ID ?? "",
  microsoftAppType: process.env.MicrosoftAppType ?? process.env.BOT_APP_TYPE ?? (process.env.MicrosoftAppId ? "UserAssignedMSI" : ""),
  appInsightsConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ?? "",
  failureMode: getFailureMode(process.env.FAILURE_MODE),
  podName: process.env.POD_NAME ?? "local",
  nodeName: process.env.NODE_NAME ?? "local"
};
