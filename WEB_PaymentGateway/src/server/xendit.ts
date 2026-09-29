// Minimal client for the Xendit Invoice API (https://docs.xendit.co/apidocs/create-invoice).
const XENDIT_API = "https://api.xendit.co";

export class XenditConfigError extends Error {}

export class XenditApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorCode?: string,
  ) {
    super(message);
  }
}

export type XenditInvoiceStatus = "PENDING" | "PAID" | "SETTLED" | "EXPIRED";

export interface XenditInvoice {
  id: string;
  external_id: string;
  status: XenditInvoiceStatus;
  amount: number;
  invoice_url: string;
  expiry_date: string;
}

/** Body Xendit POSTs to our webhook when an invoice is paid or expires. */
export interface XenditInvoiceCallback {
  id: string;
  external_id: string;
  status: XenditInvoiceStatus;
  amount: number;
  paid_amount?: number;
  paid_at?: string;
  payment_method?: string;
  payment_channel?: string;
  bank_code?: string;
  currency?: string;
}

function authHeader() {
  const key = process.env.XENDIT_SECRET_KEY;
  if (!key) throw new XenditConfigError("XENDIT_SECRET_KEY is not set.");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

async function xenditRequest<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${XENDIT_API}${path}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new XenditApiError(String(data.message ?? `Xendit request failed (${res.status})`), res.status, data.error_code as string | undefined);
  }
  return data as T;
}

/** Converts 0812…, 62812… or +62812… into the E.164 format Xendit expects. */
export function toE164(phone: string) {
  if (phone.startsWith("+")) return phone;
  if (phone.startsWith("62")) return `+${phone}`;
  if (phone.startsWith("0")) return `+62${phone.slice(1)}`;
  return phone;
}

export interface CreateInvoiceInput {
  externalId: string;
  amount: number;
  description: string;
  customer: { fullName: string; email: string; phone: string; address: string; area?: string; city: string; postalCode: string };
  items: { name: string; quantity: number; price: number; category: string }[];
  fees: { type: string; value: number }[];
  paymentMethods?: readonly string[];
  successRedirectUrl: string;
  failureRedirectUrl: string;
  durationSeconds: number;
  metadata?: Record<string, string>;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<XenditInvoice> {
  const [givenNames, ...rest] = input.customer.fullName.split(/\s+/);
  const body = {
    external_id: input.externalId,
    amount: input.amount,
    currency: "IDR",
    description: input.description,
    payer_email: input.customer.email,
    invoice_duration: input.durationSeconds,
    success_redirect_url: input.successRedirectUrl,
    failure_redirect_url: input.failureRedirectUrl,
    customer: {
      given_names: givenNames,
      surname: rest.join(" ") || undefined,
      email: input.customer.email,
      mobile_number: toE164(input.customer.phone),
      addresses: [
        {
          street_line1: input.customer.address,
          street_line2: input.customer.area || undefined,
          city: input.customer.city,
          postal_code: input.customer.postalCode,
          country: "Indonesia",
        },
      ],
    },
    items: input.items,
    fees: input.fees,
    payment_methods: input.paymentMethods,
    metadata: input.metadata,
  };

  try {
    return await xenditRequest<XenditInvoice>("/v2/invoices", body);
  } catch (err) {
    // Test accounts don't always have every channel activated. Rather than failing the order,
    // fall back to an invoice that offers whichever methods the account does have.
    const unavailable = err instanceof XenditApiError && /PAYMENT_METHOD|CHANNEL/i.test(`${err.errorCode} ${err.message}`);
    if (input.paymentMethods && unavailable) {
      return xenditRequest<XenditInvoice>("/v2/invoices", { ...body, payment_methods: undefined });
    }
    throw err;
  }
}
