import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** Every verified webhook call, kept for auditing and debugging payment updates. */
const WebhookLogSchema = new Schema(
  {
    provider: { type: String, default: "XENDIT" },
    event: { type: String, default: "invoice" },
    externalId: { type: String, default: null, index: true },
    invoiceId: { type: String, default: null },
    status: { type: String, default: null },
    outcome: { type: String, default: "received" },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export type WebhookLogRecord = InferSchemaType<typeof WebhookLogSchema>;

export const WebhookLogModel: Model<WebhookLogRecord> =
  (models.WebhookLog as Model<WebhookLogRecord> | undefined) ?? model<WebhookLogRecord>("WebhookLog", WebhookLogSchema);
