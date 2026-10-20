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

// AKS's Azure Workload Identity webhook auto-injects these exact env var
// names into the pod when the ServiceAccount is annotated with
// azure.workload.identity/client-id and the pod carries the
// azure.workload.identity/use: "true" label. These are NOT the same
// names the @microsoft/agents-hosting 1.6.1 AuthConfiguration env loader
// (loadAuthConfigFromEnv) expects (it looks for "clientId"/"tenantId"/
// "federatedTokenFile"), so relying on that loader silently fails to pick
// up workload identity in this SDK version. We read the AKS-standard
// AZURE_* names directly instead and build AuthConfiguration in code.
export const workloadIdentity = {
  tenantId: process.env.AZURE_TENANT_ID ?? "",
  clientId: process.env.AZURE_CLIENT_ID ?? "",
  federatedTokenFile: process.env.AZURE_FEDERATED_TOKEN_FILE ?? "",
  authorityHost: process.env.AZURE_AUTHORITY_HOST ?? "https://login.microsoftonline.com/"
};

export const config = {
  port: Number(process.env.PORT ?? "3978"),
  // Base path matches the AKS ingress rule: path /messaging, no rewrite.
  // The app therefore owns and serves the /messaging prefix itself.
  basePath: process.env.BASE_PATH ?? "/messaging",
  microsoftAppId: process.env.MicrosoftAppId ?? workloadIdentity.clientId,
  appInsightsConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ?? "",
  failureMode: getFailureMode(process.env.FAILURE_MODE),
  podName: process.env.POD_NAME ?? "local",
  nodeName: process.env.NODE_NAME ?? "local"
};
