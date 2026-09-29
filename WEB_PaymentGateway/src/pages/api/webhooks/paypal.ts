import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods } from "@/server/errors";
import { verifyPayPalWebhook } from "@/server/paypal";
import { handlePayPalWebhook } from "@/server/paypal-flow";

// The raw body is needed: PayPal verifies the event only if it is posted back exactly as received.
export const config = { api: { bodyParser: false } };

const MAX_BODY_BYTES = 1_000_000;

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer);
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw new Error("Webhook body too large");
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// POST /api/webhooks/paypal  — subscribe this URL to PAYMENT.CAPTURE.COMPLETED in the PayPal developer dashboard.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["POST"])) return;

  if (!process.env.PAYPAL_WEBHOOK_ID) {
    res.status(500).json({ error: "PAYPAL_WEBHOOK_ID is not configured on the server." });
    return;
  }

  try {
    const rawBody = await readRawBody(req);
    if (!(await verifyPayPalWebhook(req.headers, rawBody))) {
      console.warn("[paypal webhook] rejected: signature verification failed");
      res.status(401).json({ error: "Invalid webhook signature." });
      return;
    }
    const event = JSON.parse(rawBody);
    const result = await handlePayPalWebhook(event);
    console.info("[paypal webhook]", event.event_type, event.resource?.custom_id, "->", result.outcome);
    res.status(200).json({ received: true, ...result });
  } catch (err) {
    // A non-2xx answer makes PayPal retry the webhook later.
    console.error("[paypal webhook] failed", err);
    res.status(500).json({ error: "Webhook processing failed." });
  }
}
