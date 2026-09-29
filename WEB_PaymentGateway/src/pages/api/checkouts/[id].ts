import type { NextApiRequest, NextApiResponse } from "next";
import { getCheckoutView } from "@/server/checkout";
import { allowMethods, sendApiError } from "@/server/errors";

// GET /api/checkouts/:id  ->  checkout with its latest payment (used by the order page to poll status)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  try {
    const checkout = await getCheckoutView(String(req.query.id));
    if (!checkout) {
      res.status(404).json({ error: "Checkout not found." });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ checkout });
  } catch (err) {
    sendApiError(res, err);
  }
}
