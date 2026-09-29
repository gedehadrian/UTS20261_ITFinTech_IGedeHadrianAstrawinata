export const PAYMENT_METHODS = [
  { value: "CARD", label: "Credit/Debit Card", hint: "Visa, Mastercard, JCB" },
  { value: "EWALLET", label: "E-Wallet & QRIS", hint: "OVO, DANA, ShopeePay, LinkAja, QRIS" },
  { value: "BANK_TRANSFER", label: "Bank Transfer", hint: "Virtual account: BCA, BNI, BRI, Mandiri, Permata" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.some((m) => m.value === value);
}
