import { isValidObjectId } from "mongoose";
import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods } from "@/server/errors";
import { completePayPalReturn } from "@/server/paypal-flow";

// GET /api/paypal/return?checkoutId=...&token=<PayPal order id>
// PayPal redirects the buyer here after approval; we capture the payment and send them to their bill.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;

  const orderId = typeof req.query.token === "string" ? req.query.token : "";
  const fallbackId = typeof req.query.checkoutId === "string" && isValidObjectId(req.query.checkoutId) ? req.query.checkoutId : null;
  const billUrl = (id: string | null, query: string) => (id ? `/orders/${id}?${query}` : "/orders");

  if (!orderId) {
    res.redirect(303, billUrl(fallbackId, "paypal=error"));
    return;
  }

  try {
    const { outcome, checkoutId } = await completePayPalReturn(orderId);
    console.info("[paypal return]", orderId, "->", outcome);
    const ok = outcome === "marked_paid" || outcome === "already_paid" || outcome === "not_completed";
    res.redirect(303, billUrl(checkoutId ?? fallbackId, ok ? "paid=1" : "paypal=error"));
  } catch (err) {
    console.error("[paypal return] capture failed", err);
    res.redirect(303, billUrl(fallbackId, "paypal=error"));
  }
}
