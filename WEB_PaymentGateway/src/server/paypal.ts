// Minimal client for the PayPal REST API: Orders v2 (create + capture) and webhook signature verification.
// https://developer.paypal.com/docs/api/orders/v2/
import type { IncomingHttpHeaders } from "node:http";
import { DEFAULT_IDR_PER_USD } from "@/lib/currency";

const DEFAULT_API_BASE = "https://api-m.sandbox.paypal.com";

export class PayPalConfigError extends Error {}

export class PayPalApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public issue?: string,
  ) {
    super(message);
  }
}

export function isPayPalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

/** Rupiah per US dollar used to price PayPal orders. */
export function paypalIdrPerUsd(): number {
  const rate = Number(process.env.PAYPAL_IDR_PER_USD);
  return rate > 0 ? rate : DEFAULT_IDR_PER_USD;
}

function apiBase() {
  return (process.env.PAYPAL_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new PayPalConfigError("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set.");
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new PayPalApiError(data.error_description ?? `PayPal authentication failed (${res.status})`, res.status);
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in ?? 0) * 1000 };
  return cachedToken.value;
}

async function paypalRequest<T>(path: string, init: { method: "GET" | "POST"; body?: string; requestId?: string }): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      // Idempotency key: a retried create/capture returns the original result instead of charging twice
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
    body: init.body,
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    name?: string;
    message?: string;
    details?: { issue?: string; description?: string }[];
  };
  if (!res.ok) {
    const detail = data.details?.[0];
    throw new PayPalApiError(detail?.description ?? data.message ?? `PayPal request failed (${res.status})`, res.status, detail?.issue ?? data.name);
  }
  return data as T;
}

interface PayPalOrder {
  id: string;
  status: string;
  links?: { rel: string; href: string }[];
  purchase_units?: {
    custom_id?: string;
    payments?: { captures?: { id: string; status: string; custom_id?: string; amount?: { currency_code: string; value: string } }[] };
  }[];
}

export interface CreateOrderInput {
  referenceId: string;
  customId: string;
  description: string;
  amountUsd: string;
  returnUrl: string;
  cancelUrl: string;
}

/** Creates a PayPal order and returns the URL where the buyer approves it. */
export async function createPayPalOrder(input: CreateOrderInput): Promise<{ id: string; approveUrl: string }> {
  const order = await paypalRequest<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    requestId: input.customId,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.referenceId,
          custom_id: input.customId,
          invoice_id: input.customId,
          description: input.description,
          amount: { currency_code: "USD", value: input.amountUsd },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Goresan",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
          },
        },
      },
    }),
  });
  const approveUrl = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  if (!approveUrl) throw new PayPalApiError("PayPal did not return an approval link.", 502);
  return { id: order.id, approveUrl };
}

export interface CaptureResult {
  orderId: string;
  status: string;
  captureId: string | null;
  amount: string | null;
  currency: string | null;
  customId: string | null;
}

function toCaptureResult(order: PayPalOrder): CaptureResult {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    orderId: order.id,
    status: capture?.status ?? order.status,
    captureId: capture?.id ?? null,
    amount: capture?.amount?.value ?? null,
    currency: capture?.amount?.currency_code ?? null,
    customId: capture?.custom_id ?? unit?.custom_id ?? null,
  };
}

/** Captures an approved order. If it was already captured (e.g. a double return), reads the existing capture. */
export async function capturePayPalOrder(orderId: string): Promise<CaptureResult> {
  const path = `/v2/checkout/orders/${encodeURIComponent(orderId)}`;
  try {
    return toCaptureResult(await paypalRequest<PayPalOrder>(`${path}/capture`, { method: "POST", body: "{}", requestId: `capture-${orderId}` }));
  } catch (err) {
    if (err instanceof PayPalApiError && err.issue === "ORDER_ALREADY_CAPTURED") {
      return toCaptureResult(await paypalRequest<PayPalOrder>(path, { method: "GET" }));
    }
    throw err;
  }
}

/**
 * Asks PayPal whether a webhook really came from PayPal.
 * The event has to be posted back byte-for-byte, so the raw body is spliced in rather than re-serialised.
 */
export async function verifyPayPalWebhook(headers: IncomingHttpHeaders, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new PayPalConfigError("PAYPAL_WEBHOOK_ID is not set.");
  const header = (name: string) => (typeof headers[name] === "string" ? (headers[name] as string) : "");
  const fields: Record<string, string> = {
    auth_algo: header("paypal-auth-algo"),
    cert_url: header("paypal-cert-url"),
    transmission_id: header("paypal-transmission-id"),
    transmission_sig: header("paypal-transmission-sig"),
    transmission_time: header("paypal-transmission-time"),
    webhook_id: webhookId,
  };
  if (Object.values(fields).some((v) => !v)) return false;

  const prefix = Object.entries(fields)
    .map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`)
    .join(",");
  const result = await paypalRequest<{ verification_status?: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: `{${prefix},"webhook_event":${rawBody}}`,
  });
  return result.verification_status === "SUCCESS";
}
