export const PAYMENT_METHODS = [
  {
    value: "CARD",
    label: "Credit/Debit Card",
    hint: "Visa, Mastercard, JCB",
    gateway: "XENDIT",
    xenditChannels: ["CREDIT_CARD"],
  },
  {
    value: "PAYPAL",
    label: "PayPal",
    hint: "Charged in USD by PayPal",
    gateway: "PAYPAL",
    xenditChannels: [],
  },
  {
    value: "EWALLET",
    label: "E-Wallet & QRIS",
    hint: "OVO, DANA, ShopeePay, LinkAja, QRIS",
    gateway: "XENDIT",
    xenditChannels: ["OVO", "DANA", "SHOPEEPAY", "LINKAJA", "QRIS"],
  },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
    hint: "Virtual account: BCA, BNI, BRI, Mandiri, Permata",
    gateway: "XENDIT",
    xenditChannels: ["BCA", "BNI", "BRI", "MANDIRI", "PERMATA", "BSI"],
  },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];
export type PaymentGateway = (typeof PAYMENT_METHODS)[number]["gateway"];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.some((m) => m.value === value);
}

export function gatewayFor(method: PaymentMethod): PaymentGateway {
  return PAYMENT_METHODS.find((m) => m.value === method)?.gateway ?? "XENDIT";
}

export function xenditChannelsFor(method: PaymentMethod): readonly string[] {
  return PAYMENT_METHODS.find((m) => m.value === method)?.xenditChannels ?? [];
}
