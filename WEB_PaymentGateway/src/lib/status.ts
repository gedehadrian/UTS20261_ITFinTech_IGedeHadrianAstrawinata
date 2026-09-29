export const CHECKOUT_STATUSES = ["OPEN", "PENDING_PAYMENT", "PAID", "EXPIRED", "FAILED"] as const;
export type CheckoutStatus = (typeof CHECKOUT_STATUSES)[number];

export const PAYMENT_STATUSES = ["PENDING", "PAID", "EXPIRED", "FAILED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CHECKOUT_STATUS_UI: Record<CheckoutStatus, { label: string; className: string }> = {
  OPEN: { label: "Draft", className: "bg-ink/5 text-muted" },
  PENDING_PAYMENT: { label: "Menunggu Pembayaran", className: "bg-warning-soft text-warning" },
  PAID: { label: "LUNAS", className: "bg-success-soft text-success" },
  EXPIRED: { label: "Kedaluwarsa", className: "bg-ink/5 text-muted" },
  FAILED: { label: "Gagal", className: "bg-accent-soft text-accent" },
};
