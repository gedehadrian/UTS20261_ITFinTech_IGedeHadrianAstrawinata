import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { PAYMENT_METHODS } from "@/lib/payment-methods";
import { PAYMENT_STATUSES } from "@/lib/status";

const PaymentSchema = new Schema(
  {
    checkout: { type: Schema.Types.ObjectId, ref: "Checkout", required: true, index: true },
    externalId: { type: String, required: true, unique: true },
    gateway: { type: String, default: "XENDIT" },
    method: { type: String, enum: PAYMENT_METHODS.map((m) => m.value), required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "IDR" },
    status: { type: String, enum: PAYMENT_STATUSES, default: "PENDING", index: true },
    expiresAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    // Filled from the Xendit invoice once it is created
    invoiceId: { type: String, default: null, index: true },
    invoiceUrl: { type: String, default: null },
    // Filled from the Xendit webhook once the shopper pays
    paidAmount: { type: Number, default: null },
    paymentChannel: { type: String, default: null },
    gatewayMethod: { type: String, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true },
);

export type PaymentRecord = InferSchemaType<typeof PaymentSchema>;

export const PaymentModel: Model<PaymentRecord> =
  (models.Payment as Model<PaymentRecord> | undefined) ?? model<PaymentRecord>("Payment", PaymentSchema);
