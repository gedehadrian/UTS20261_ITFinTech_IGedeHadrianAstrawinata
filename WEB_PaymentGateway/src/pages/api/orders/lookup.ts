import type { NextApiRequest, NextApiResponse } from "next";
import { findCheckoutIdByEmailAndCode } from "@/server/checkout";
import { allowMethods, sendApiError } from "@/server/errors";

// POST /api/orders/lookup  { email, code }  ->  200 { id } | 404
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["POST"])) return;
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const id = await findCheckoutIdByEmailAndCode(body.email, body.code);
    if (!id) {
      // Same answer for "no such code" and "wrong email", so codes can't be probed.
      res.status(404).json({ error: "We couldn't find an order with that email and order code." });
      return;
    }
    res.status(200).json({ id });
  } catch (err) {
    sendApiError(res, err);
  }
}
