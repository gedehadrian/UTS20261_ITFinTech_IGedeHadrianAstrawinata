import type { Types } from "mongoose";
import { CheckoutModel } from "@/server/models/Checkout";
import { PaymentModel } from "@/server/models/Payment";
import { ProductModel } from "@/server/models/Product";

export interface SettlementDetails {
  paidAt: Date;
  paidAmount: number;
  paymentChannel: string | null;
  gatewayMethod: string | null;
  /** Gateway's own id for the paid object (Xendit invoice id / PayPal order id), when known. */
  gatewayRef?: string | null;
}

async function releaseStock(items: { product: Types.ObjectId; quantity: number }[]) {
  for (const item of items) {
    const res = await ProductModel.updateOne({ _id: item.product, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } });
    // The last piece was sold twice at the same moment: clamp at zero rather than go negative.
    if (res.matchedCount === 0) await ProductModel.updateOne({ _id: item.product }, { $set: { stock: 0 } });
  }
}

/**
 * Marks a payment and its checkout as PAID (LUNAS) and takes the items out of stock.
 * Shared by every gateway. Safe to call repeatedly: only the first call changes anything,
 * which matters because gateways retry webhooks and PayPal also reports via the return redirect.
 */
export async function settlePayment(paymentId: Types.ObjectId, details: SettlementDetails): Promise<"marked_paid" | "already_paid"> {
  const payment = await PaymentModel.findOneAndUpdate(
    { _id: paymentId, status: { $ne: "PAID" } },
    {
      $set: {
        status: "PAID",
        paidAt: details.paidAt,
        paidAmount: details.paidAmount,
        paymentChannel: details.paymentChannel,
        gatewayMethod: details.gatewayMethod,
        ...(details.gatewayRef ? { invoiceId: details.gatewayRef } : {}),
      },
    },
    { returnDocument: "after" },
  );
  if (!payment) return "already_paid";

  const checkout = await CheckoutModel.findOneAndUpdate(
    { _id: payment.checkout, status: { $ne: "PAID" } },
    { $set: { status: "PAID", paidAt: details.paidAt, payment: payment._id } },
    { returnDocument: "after" },
  );
  if (checkout) await releaseStock(checkout.items);
  return "marked_paid";
}
