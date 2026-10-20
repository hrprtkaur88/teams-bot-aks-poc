import type { TurnContext } from "@microsoft/agents-hosting";
import { randomUUID } from "node:crypto";

export type LogFields = Record<string, unknown>;

export function getCorrelationFields(context?: TurnContext, extra: LogFields = {}): LogFields {
  const activity = context?.activity;
  return {
    operationId: extra.operationId ?? activity?.id ?? randomUUID(),
    activityId: activity?.id,
    conversationId: activity?.conversation?.id,
    tenantId: activity?.channelData?.tenant?.id,
    serviceUrl: activity?.serviceUrl,
    requestId: extra.requestId,
    podName: process.env.POD_NAME ?? "local",
    nodeName: process.env.NODE_NAME ?? "local",
    ...extra
  };
}

export function info(message: string, fields: LogFields = {}): void {
  console.log(JSON.stringify({ severity: "INFO", message, timestamp: new Date().toISOString(), ...fields }));
}

export function error(message: string, err: unknown, fields: LogFields = {}): void {
  const normalized = err instanceof Error
    ? {
        errorMessage: err.message,
        errorName: err.name,
        errorStack: err.stack,
        errorCode: (err as NodeJS.ErrnoException).code
      }
    : { errorMessage: String(err) };

  console.error(JSON.stringify({ severity: "ERROR", message, timestamp: new Date().toISOString(), ...fields, ...normalized }));
}

