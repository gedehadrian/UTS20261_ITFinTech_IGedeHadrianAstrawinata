import { connectDB } from "@/server/db";
import { PaymentModel, type PaymentRecord } from "@/server/models/Payment";
import { WebhookLogModel } from "@/server/models/WebhookLog";
import { capturePayPalOrder } from "@/server/paypal";
import { settlePayment } from "@/server/settlement";

export type PayPalOutcome = "marked_paid" | "already_paid" | "not_completed" | "amount_mismatch" | "unknown_payment" | "ignored_event";

function sameAmount(payment: PaymentRecord, currency: string | null, value: string | null) {
  return currency === payment.gatewayCurrency && Number(value) === Number(payment.gatewayAmount);
}

/** Runs when PayPal sends the buyer back to us after approving: capture the money, then mark the order LUNAS. */
export async function completePayPalReturn(orderId: string): Promise<{ outcome: PayPalOutcome; checkoutId: string | null }> {
  await connectDB();
  const payment = await PaymentModel.findOne({ gateway: "PAYPAL", invoiceId: orderId });
  if (!payment) return { outcome: "unknown_payment", checkoutId: null };
  const checkoutId = payment.checkout.toString();
  if (payment.status === "PAID") return { outcome: "already_paid", checkoutId };

  const capture = await capturePayPalOrder(orderId);
  // PENDING captures (e.g. under review) are settled later by the PAYMENT.CAPTURE.COMPLETED webhook.
  if (capture.status !== "COMPLETED") return { outcome: "not_completed", checkoutId };
  if (!sameAmount(payment, capture.currency, capture.amount)) return { outcome: "amount_mismatch", checkoutId };

  const outcome = await settlePayment(payment._id, {
    paidAt: new Date(),
    paidAmount: payment.amount,
    paymentChannel: "PAYPAL",
    gatewayMethod: "PAYPAL",
    gatewayRef: orderId,
  });
  return { outcome, checkoutId };
}

interface PayPalWebhookEvent {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    amount?: { currency_code?: string; value?: string };
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
}

/** Applies a verified PayPal webhook. Only PAYMENT.CAPTURE.COMPLETED changes anything. */
export async function handlePayPalWebhook(event: PayPalWebhookEvent): Promise<{ outcome: PayPalOutcome; checkoutId?: string }> {
  await connectDB();
  const resource = event.resource ?? {};
  const orderId = resource.supplementary_data?.related_ids?.order_id ?? null;

  const log = await WebhookLogModel.create({
    provider: "PAYPAL",
    event: event.event_type ?? "unknown",
    externalId: resource.custom_id ?? null,
    invoiceId: orderId,
    status: resource.status ?? null,
    payload: event,
  });
  const finish = async (outcome: PayPalOutcome, checkoutId?: string) => {
    await WebhookLogModel.updateOne({ _id: log._id }, { $set: { outcome } });
    return { outcome, checkoutId };
  };

  if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") return finish("ignored_event");

  const payment = resource.custom_id
    ? await PaymentModel.findOne({ externalId: resource.custom_id })
    : orderId
      ? await PaymentModel.findOne({ gateway: "PAYPAL", invoiceId: orderId })
      : null;
  if (!payment) return finish("unknown_payment");
  const checkoutId = payment.checkout.toString();
  if (!sameAmount(payment, resource.amount?.currency_code ?? null, resource.amount?.value ?? null)) {
    return finish("amount_mismatch", checkoutId);
  }

  const outcome = await settlePayment(payment._id, {
    paidAt: new Date(),
    paidAmount: payment.amount,
    paymentChannel: "PAYPAL",
    gatewayMethod: "PAYPAL",
    gatewayRef: orderId,
  });
  return finish(outcome, checkoutId);
}
