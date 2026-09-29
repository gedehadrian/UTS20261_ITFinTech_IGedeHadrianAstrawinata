import type { NextApiRequest, NextApiResponse } from "next";
import { listOrders } from "@/server/checkout";
import { allowMethods, sendApiError } from "@/server/errors";

// GET /api/orders  ->  latest orders (no personal data)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  try {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ orders: await listOrders() });
  } catch (err) {
    sendApiError(res, err);
  }
}
