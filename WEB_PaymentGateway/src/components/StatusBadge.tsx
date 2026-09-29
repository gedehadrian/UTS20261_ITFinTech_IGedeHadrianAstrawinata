import { CHECKOUT_STATUS_UI, type CheckoutStatus } from "@/lib/status";

interface StatusBadgeProps {
  status: CheckoutStatus;
  large?: boolean;
}

export default function StatusBadge({ status, large = false }: StatusBadgeProps) {
  const ui = CHECKOUT_STATUS_UI[status];
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tracking-wide ${ui.className} ${
        large ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-[11px]"
      }`}
    >
      {ui.label}
    </span>
  );
}
