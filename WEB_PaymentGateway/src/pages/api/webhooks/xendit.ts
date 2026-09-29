import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods } from "@/server/errors";
import { handleInvoiceCallback, isValidCallbackToken } from "@/server/webhook";

// POST /api/webhooks/xendit  — set this URL as the "Invoices paid" webhook in the Xendit dashboard.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["POST"])) return;

  if (!process.env.XENDIT_WEBHOOK_TOKEN) {
    res.status(500).json({ error: "XENDIT_WEBHOOK_TOKEN is not configured on the server." });
    return;
  }
  if (!isValidCallbackToken(req.headers["x-callback-token"])) {
    console.warn("[xendit webhook] rejected: invalid x-callback-token");
    res.status(401).json({ error: "Invalid callback token." });
    return;
  }

  try {
    const result = await handleInvoiceCallback(req.body);
    console.info("[xendit webhook]", req.body?.external_id, req.body?.status, "->", result.outcome);
    res.status(200).json({ received: true, ...result });
  } catch (err) {
    // A non-2xx answer makes Xendit retry the callback later.
    console.error("[xendit webhook] failed", err);
    res.status(500).json({ error: "Webhook processing failed." });
  }
}
