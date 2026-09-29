import type { Category } from "@/lib/categories";
import type { PaymentGateway, PaymentMethod } from "@/lib/payment-methods";
import type { CheckoutStatus, PaymentStatus } from "@/lib/status";

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  artist: string;
  medium: string;
  size: string;
  price: number;
  stock: number;
  description: string;
  image: string;
}

/** A cart line, kept in localStorage. Prices here are for display only; the server re-prices every checkout. */
export interface CartItem {
  slug: string;
  name: string;
  artist: string;
  image: string;
  price: number;
  stock: number;
  quantity: number;
}

export interface CheckoutItemView {
  slug: string;
  name: string;
  artist: string;
  image: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface PaymentView {
  id: string;
  externalId: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  invoiceUrl: string | null;
  paymentChannel: string | null;
  gateway: PaymentGateway;
  /** Amount charged by the gateway when it is not IDR, e.g. "31.79" USD for PayPal. */
  gatewayAmount: string | null;
  gatewayCurrency: string | null;
}

/** Checkout as sent to the browser: no email, phone or street address. */
export interface CheckoutView {
  id: string;
  code: string;
  status: CheckoutStatus;
  items: CheckoutItemView[];
  subtotal: number;
  tax: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod | null;
  recipient: { fullName: string; city: string } | null;
  payment: PaymentView | null;
  createdAt: string;
  paidAt: string | null;
}

/** One kelurahan from the postal-code directory, as offered by the address search. */
export interface AreaSuggestion {
  village: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  /** Ready-to-store description, e.g. "Kel. Senayan, Kec. Kebayoran Baru, DKI Jakarta". */
  area: string;
}

export interface OrderListItem {
  id: string;
  code: string;
  status: CheckoutStatus;
  itemCount: number;
  total: number;
  createdAt: string;
}
