import type { NextApiRequest, NextApiResponse } from "next";
import { startPayment } from "@/server/checkout";
import { allowMethods, sendApiError } from "@/server/errors";

// POST /api/payments  { checkoutId, shipping, method }  ->  201 { paymentId, redirectUrl }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["POST"])) return;
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { payment, redirectUrl } = await startPayment({
      checkoutId: body.checkoutId,
      shipping: body.shipping,
      method: body.method,
    });
    res.status(201).json({ paymentId: payment.id, redirectUrl });
  } catch (err) {
    sendApiError(res, err);
  }
}
