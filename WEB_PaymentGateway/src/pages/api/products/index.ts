import type { NextApiRequest, NextApiResponse } from "next";
import { listProducts } from "@/server/catalog";
import { allowMethods, sendApiError } from "@/server/errors";

// GET /api/products?category=print&q=kawung
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  try {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : undefined;
    res.status(200).json({ products: await listProducts({ category, q }) });
  } catch (err) {
    sendApiError(res, err);
  }
}
