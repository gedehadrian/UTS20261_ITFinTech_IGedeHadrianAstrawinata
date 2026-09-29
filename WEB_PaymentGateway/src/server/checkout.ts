import { randomBytes } from "node:crypto";
import { isValidObjectId } from "mongoose";
import { isPaymentMethod, type PaymentMethod } from "@/lib/payment-methods";
import { calcTotals, TAX_RATE } from "@/lib/pricing";
import type { CheckoutStatus, PaymentStatus } from "@/lib/status";
import type { CheckoutView, OrderListItem, PaymentView } from "@/lib/types";
import { normalizePhone, validateShipping, type ShippingDetails } from "@/lib/validation";
import { ensureCatalogSeeded } from "@/server/catalog";
import { connectDB } from "@/server/db";
import { AppError } from "@/server/errors";
import { CheckoutModel, type CheckoutRecord } from "@/server/models/Checkout";
import { PaymentModel, type PaymentRecord } from "@/server/models/Payment";
import { ProductModel } from "@/server/models/Product";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

type WithId<T> = T & { _id: { toString(): string } };

/** Human-friendly order code, e.g. GRS-260929-K7QM2. */
function newCheckoutCode(now = new Date()) {
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = Array.from(randomBytes(5), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `GRS-${date}-${suffix}`;
}

export interface CartLine {
  slug: string;
  quantity: number;
}

export function parseCartLines(body: unknown): CartLine[] {
  const items = (body as { items?: unknown } | null)?.items;
  if (!Array.isArray(items) || items.length === 0) throw new AppError("Your cart is empty.");
  if (items.length > 50) throw new AppError("Too many different items in one checkout.");

  const merged = new Map<string, number>();
  for (const raw of items) {
    const { slug, quantity } = (raw ?? {}) as { slug?: unknown; quantity?: unknown };
    if (typeof slug !== "string" || !slug || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new AppError("Your cart contains an invalid item.");
    }
    merged.set(slug, (merged.get(slug) ?? 0) + quantity);
  }
  return [...merged].map(([slug, quantity]) => ({ slug, quantity }));
}

/** Prices every line from the database (never from the browser) and stores the result as an OPEN checkout. */
export async function createCheckout(lines: CartLine[]) {
  await ensureCatalogSeeded();
  const products = await ProductModel.find({ slug: { $in: lines.map((l) => l.slug) }, isActive: true });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const problems: { slug: string; name: string; available: number }[] = [];
  const items = [];
  for (const line of lines) {
    const product = bySlug.get(line.slug);
    if (!product || product.stock < line.quantity) {
      problems.push({ slug: line.slug, name: product?.name ?? line.slug, available: product?.stock ?? 0 });
      continue;
    }
    items.push({
      product: product._id,
      slug: product.slug,
      name: product.name,
      artist: product.artist,
      image: product.image,
      price: product.price,
      quantity: line.quantity,
      lineTotal: product.price * line.quantity,
    });
  }

  if (problems.length > 0) {
    const list = problems.map((p) => (p.available > 0 ? `${p.name} (only ${p.available} left)` : `${p.name} (sold out)`)).join(", ");
    throw new AppError(`Some items changed since you added them: ${list}.`, 409, { problems });
  }

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const totals = calcTotals(subtotal, { withShipping: true });

  for (let attempt = 0; ; attempt++) {
    try {
      return await CheckoutModel.create({
        code: newCheckoutCode(),
        items,
        subtotal,
        taxRate: TAX_RATE,
        tax: totals.tax,
        shippingFee: totals.shipping,
        total: totals.total,
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000 && attempt < 2) continue; // order-code collision, retry
      throw err;
    }
  }
}

function toPaymentView(p: WithId<PaymentRecord>): PaymentView {
  return {
    id: p._id.toString(),
    externalId: p.externalId,
    method: p.method as PaymentMethod,
    amount: p.amount,
    status: p.status as PaymentStatus,
    createdAt: p.createdAt.toISOString(),
    expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
  };
}

function toCheckoutView(c: WithId<CheckoutRecord>, payment: WithId<PaymentRecord> | null): CheckoutView {
  return {
    id: c._id.toString(),
    code: c.code,
    status: c.status as CheckoutStatus,
    items: c.items.map((i) => ({
      slug: i.slug,
      name: i.name,
      artist: i.artist,
      image: i.image,
      price: i.price,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    subtotal: c.subtotal,
    tax: c.tax,
    shippingFee: c.shippingFee,
    total: c.total,
    paymentMethod: (c.paymentMethod as PaymentMethod | null) ?? null,
    recipient: c.shipping ? { fullName: c.shipping.fullName, city: c.shipping.city } : null,
    payment: payment ? toPaymentView(payment) : null,
    createdAt: c.createdAt.toISOString(),
    paidAt: c.paidAt ? c.paidAt.toISOString() : null,
  };
}

export async function getCheckoutView(id: string): Promise<CheckoutView | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const checkout = await CheckoutModel.findById(id).lean<WithId<CheckoutRecord>>();
  if (!checkout) return null;
  const payment = checkout.payment ? await PaymentModel.findById(checkout.payment).lean<WithId<PaymentRecord>>() : null;
  return toCheckoutView(checkout, payment);
}

function readShipping(raw: unknown): ShippingDetails {
  const v = (raw ?? {}) as Record<string, unknown>;
  const text = (key: keyof ShippingDetails) => (typeof v[key] === "string" ? (v[key] as string).trim().slice(0, 200) : "");
  return {
    fullName: text("fullName"),
    email: text("email").toLowerCase(),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    postalCode: text("postalCode"),
  };
}

export interface StartPaymentInput {
  checkoutId: unknown;
  shipping: unknown;
  method: unknown;
}

/** Saves shipping + method on the checkout and opens a PENDING payment (the bill) for its total. */
export async function startPayment(input: StartPaymentInput) {
  if (typeof input.checkoutId !== "string" || !isValidObjectId(input.checkoutId)) {
    throw new AppError("Checkout not found.", 404);
  }
  if (!isPaymentMethod(input.method)) throw new AppError("Choose a payment method.");
  const method = input.method;

  const shipping = readShipping(input.shipping);
  const fieldErrors = validateShipping(shipping);
  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError("Please check your shipping details.", 422, { fields: fieldErrors });
  }

  await connectDB();
  const checkout = await CheckoutModel.findById(input.checkoutId);
  if (!checkout) throw new AppError("Checkout not found.", 404);
  if (checkout.status === "PAID") {
    throw new AppError("This order has already been paid.", 409, { redirectUrl: `/orders/${checkout.id}` });
  }

  checkout.set({ shipping: { ...shipping, phone: normalizePhone(shipping.phone) }, paymentMethod: method });

  // A double-click or a return from the payment page should reuse the open bill, not create a second one.
  let payment = await PaymentModel.findOne({
    checkout: checkout._id,
    status: "PENDING",
    method,
    amount: checkout.total,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  payment ??= await PaymentModel.create({
    checkout: checkout._id,
    externalId: `${checkout.code}-${Date.now().toString(36).toUpperCase()}`,
    method,
    amount: checkout.total,
    expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MS),
  });

  checkout.set({ payment: payment._id, status: "PENDING_PAYMENT" });
  await checkout.save();

  return { checkout, payment, redirectUrl: `/orders/${checkout.id}` };
}

export async function listOrders(limit = 30): Promise<OrderListItem[]> {
  await connectDB();
  const docs = await CheckoutModel.find({ status: { $ne: "OPEN" } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<WithId<CheckoutRecord>[]>();
  return docs.map((d) => ({
    id: d._id.toString(),
    code: d.code,
    status: d.status as CheckoutStatus,
    itemCount: d.items.reduce((n, i) => n + i.quantity, 0),
    total: d.total,
    createdAt: d.createdAt.toISOString(),
  }));
}
