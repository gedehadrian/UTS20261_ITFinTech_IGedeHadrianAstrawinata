export const PAYMENT_METHODS = [
  {
    value: "CARD",
    label: "Credit/Debit Card",
    hint: "Visa, Mastercard, JCB",
    xenditChannels: ["CREDIT_CARD"],
  },
  {
    value: "EWALLET",
    label: "E-Wallet & QRIS",
    hint: "OVO, DANA, ShopeePay, LinkAja, QRIS",
    xenditChannels: ["OVO", "DANA", "SHOPEEPAY", "LINKAJA", "QRIS"],
  },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
    hint: "Virtual account: BCA, BNI, BRI, Mandiri, Permata",
    xenditChannels: ["BCA", "BNI", "BRI", "MANDIRI", "PERMATA", "BSI"],
  },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.some((m) => m.value === value);
}

export function xenditChannelsFor(method: PaymentMethod): readonly string[] {
  return PAYMENT_METHODS.find((m) => m.value === method)?.xenditChannels ?? [];
}
