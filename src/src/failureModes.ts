import type { FailureMode } from "./config.js";

export async function applyBeforeReplyFailure(mode: FailureMode): Promise<void> {
  if (mode === "http500-before-reply" || shouldRandomlyFail(mode)) {
    throw new Error("Controlled HTTP 500 before bot reply");
  }

  if (mode === "timeout-before-reply") {
    await new Promise((resolve) => setTimeout(resolve, 120_000));
  }
}

export function applyAfterReceiveFailure(mode: FailureMode): void {
  if (mode === "http500-after-receive") {
    throw new Error("Controlled HTTP 500 after activity receive");
  }
}

export function applyReplyFailure(mode: FailureMode): void {
  if (mode === "econnreset-on-reply") {
    const err = new Error("Controlled ECONNRESET during outbound reply") as NodeJS.ErrnoException;
    err.code = "ECONNRESET";
    throw err;
  }
}

function shouldRandomlyFail(mode: FailureMode): boolean {
  return mode === "random-intermittent" && Math.random() < 0.5;
}

