import { timingSafeEqual } from "node:crypto";
import { connectDB } from "@/server/db";
import { CheckoutModel } from "@/server/models/Checkout";
import { PaymentModel } from "@/server/models/Payment";
import { WebhookLogModel } from "@/server/models/WebhookLog";
import { settlePayment } from "@/server/settlement";
import type { XenditInvoiceCallback } from "@/server/xendit";

/** Compares the x-callback-token header with the verification token from the Xendit dashboard. */
export function isValidCallbackToken(header: string | string[] | undefined): boolean {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expected || typeof header !== "string") return false;
  const given = Buffer.from(header);
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export type CallbackOutcome =
  | "marked_paid"
  | "already_paid"
  | "marked_expired"
  | "ignored_status"
  | "amount_mismatch"
  | "unknown_payment";

/**
 * Applies a Xendit invoice callback. Safe to call repeatedly: Xendit retries until it gets a 2xx,
 * and a PAID invoice may be followed by a SETTLED one.
 */
export async function handleInvoiceCallback(body: unknown): Promise<{ outcome: CallbackOutcome; checkoutId?: string }> {
  const payload = (body ?? {}) as Partial<XenditInvoiceCallback>;
  await connectDB();

  const log = await WebhookLogModel.create({
    provider: "XENDIT",
    externalId: payload.external_id ?? null,
    invoiceId: payload.id ?? null,
    status: payload.status ?? null,
    payload: body ?? {},
  });
  const finish = async (outcome: CallbackOutcome, checkoutId?: string) => {
    await WebhookLogModel.updateOne({ _id: log._id }, { $set: { outcome } });
    return { outcome, checkoutId };
  };

  const payment = payload.external_id ? await PaymentModel.findOne({ externalId: payload.external_id }) : null;
  if (!payment) return finish("unknown_payment"); // e.g. the dashboard's "Test and save" sample payload
  const checkoutId = payment.checkout.toString();

  if (payload.status === "PAID" || payload.status === "SETTLED") {
    const paidAmount = Number(payload.paid_amount ?? payload.amount ?? 0);
    if (paidAmount < payment.amount) return finish("amount_mismatch", checkoutId);

    const outcome = await settlePayment(payment._id, {
      paidAt: payload.paid_at ? new Date(payload.paid_at) : new Date(),
      paidAmount,
      paymentChannel: payload.payment_channel ?? payload.bank_code ?? null,
      gatewayMethod: payload.payment_method ?? null,
      gatewayRef: payload.id ?? null,
    });
    return finish(outcome, checkoutId);
  }

  if (payload.status === "EXPIRED") {
    await PaymentModel.updateOne({ _id: payment._id, status: "PENDING" }, { $set: { status: "EXPIRED" } });
    // Only expire the order if this was its current bill (a newer invoice may still be open).
    await CheckoutModel.updateOne(
      { _id: payment.checkout, status: "PENDING_PAYMENT", payment: payment._id },
      { $set: { status: "EXPIRED" } },
    );
    return finish("marked_expired", checkoutId);
  }

  return finish("ignored_status", checkoutId);
}
