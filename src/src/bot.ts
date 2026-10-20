import { ActivityTypes } from "@microsoft/agents-activity";
import { AgentApplication, MessageFactory, MemoryStorage, TurnContext, TurnState } from "@microsoft/agents-hosting";
import type { CloudAdapter } from "@microsoft/agents-hosting";
import type { FailureMode } from "./config.js";
import { applyAfterReceiveFailure, applyBeforeReplyFailure, applyReplyFailure } from "./failureModes.js";
import { error, getCorrelationFields, info } from "./logging.js";

// AgentApplication-based bot matching the architecture diagram:
//   messaging pod -> CloudAdapter -> AgentApplication
//     membersAdded -> greet
//     message -> echo
export function createAgentApplication(adapter: CloudAdapter, failureMode: FailureMode): AgentApplication<TurnState> {
  const app = new AgentApplication<TurnState>({
    adapter,
    storage: new MemoryStorage()
  });

  app.onConversationUpdate("membersAdded", async (context: TurnContext) => {
    await sendInstrumentedReply(
      context,
      failureMode,
      "POC bot installed. Send a message to test normal and failure modes."
    );
  });

  app.onActivity(ActivityTypes.Message, async (context: TurnContext) => {
    const fields = getCorrelationFields(context, { failureMode });
    info("bot logic start", fields);

    applyAfterReceiveFailure(failureMode);
    await applyBeforeReplyFailure(failureMode);

    const text = context.activity.text?.trim() || "empty message";
    await sendInstrumentedReply(context, failureMode, `POC bot received: ${text}`);

    info("bot logic end", fields);
  });

  return app;
}

async function sendInstrumentedReply(context: TurnContext, failureMode: FailureMode, text: string): Promise<void> {
  const fields = getCorrelationFields(context, { failureMode });
  info("sendActivity start", fields);

  try {
    applyReplyFailure(failureMode);
    await context.sendActivity(MessageFactory.text(text));
    info("sendActivity end", fields);
  } catch (err) {
    error("sendActivity failed", err, fields);
    throw err;
  }
}
