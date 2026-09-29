import type { ComponentType, SVGProps } from "react";
import { BankIcon, CardIcon, PayPalIcon, WalletIcon } from "@/components/Icons";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/payment-methods";

const ICONS: Record<PaymentMethod, ComponentType<SVGProps<SVGSVGElement>>> = {
  CARD: CardIcon,
  PAYPAL: PayPalIcon,
  EWALLET: WalletIcon,
  BANK_TRANSFER: BankIcon,
};

interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  /** Methods that can't be used right now, with the reason shown instead of the hint. */
  unavailable?: Partial<Record<PaymentMethod, string>>;
}

export default function PaymentMethodPicker({ value, onChange, unavailable = {} }: PaymentMethodPickerProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Payment method</legend>
      {PAYMENT_METHODS.map((method) => {
        const Icon = ICONS[method.value];
        const checked = method.value === value;
        const reason = unavailable[method.value];
        return (
          <label
            key={method.value}
            className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition ${
              reason ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            } ${checked ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink/30"}`}
          >
            <input
              type="radio"
              name="payment-method"
              value={method.value}
              checked={checked}
              disabled={Boolean(reason)}
              onChange={() => onChange(method.value)}
              className="h-4 w-4 accent-ink"
            />
            <Icon className="shrink-0 text-muted" />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{method.label}</span>
              <span className="block text-xs text-muted">{reason ?? method.hint}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
