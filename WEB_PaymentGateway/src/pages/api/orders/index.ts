import type { NextApiRequest, NextApiResponse } from "next";
import { listOrdersByIds } from "@/server/checkout";
import { allowMethods, sendApiError } from "@/server/errors";

// GET /api/orders?ids=a,b,c  ->  status summaries for the orders placed on this device (no personal data)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  try {
    const ids = typeof req.query.ids === "string" ? req.query.ids.split(",") : [];
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ orders: await listOrdersByIds(ids) });
  } catch (err) {
    sendApiError(res, err);
  }
}
