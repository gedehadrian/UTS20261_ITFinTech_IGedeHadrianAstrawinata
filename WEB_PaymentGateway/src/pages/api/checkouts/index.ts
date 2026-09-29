import type { NextApiRequest, NextApiResponse } from "next";
import { createCheckout, parseCartLines } from "@/server/checkout";
import { allowMethods, sendApiError } from "@/server/errors";

// POST /api/checkouts  { items: [{ slug, quantity }] }  ->  201 { id, code, total }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["POST"])) return;
  try {
    const checkout = await createCheckout(parseCartLines(req.body));
    res.status(201).json({ id: checkout.id, code: checkout.code, total: checkout.total });
  } catch (err) {
    sendApiError(res, err);
  }
}
