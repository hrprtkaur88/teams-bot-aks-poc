import { ActivityHandler, MessageFactory, TurnContext } from "botbuilder";
import type { FailureMode } from "./config.js";
import { applyAfterReceiveFailure, applyBeforeReplyFailure, applyReplyFailure } from "./failureModes.js";
import { error, getCorrelationFields, info } from "./logging.js";

export class FailurePocBot extends ActivityHandler {
  public constructor(private readonly failureMode: FailureMode) {
    super();

    this.onMessage(async (context, next) => {
      const fields = getCorrelationFields(context, { failureMode: this.failureMode });
      info("bot logic start", fields);

      applyAfterReceiveFailure(this.failureMode);
      await applyBeforeReplyFailure(this.failureMode);

      const text = context.activity.text?.trim() || "empty message";
      await this.sendInstrumentedReply(context, `POC bot received: ${text}`);

      info("bot logic end", fields);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      await this.sendInstrumentedReply(context, "POC bot installed. Send a message to test normal and failure modes.");
      await next();
    });
  }

  private async sendInstrumentedReply(context: TurnContext, text: string): Promise<void> {
    const fields = getCorrelationFields(context, { failureMode: this.failureMode });
    info("sendActivity start", fields);

    try {
      applyReplyFailure(this.failureMode);
      await context.sendActivity(MessageFactory.text(text));
      info("sendActivity end", fields);
    } catch (err) {
      error("sendActivity failed", err, fields);
      throw err;
    }
  }
}

