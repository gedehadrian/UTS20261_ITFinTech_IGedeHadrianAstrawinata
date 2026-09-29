import { MinusIcon, PlusIcon } from "@/components/Icons";

interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

export default function QuantityStepper({ value, max, onChange, label }: QuantityStepperProps) {
  return (
    <div className="inline-flex h-9 items-center rounded-lg border border-ink/15 bg-white" role="group" aria-label={`Quantity for ${label}`}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="grid h-full w-9 place-items-center rounded-l-lg hover:bg-ink/5"
        aria-label={`Decrease ${label}`}
      >
        <MinusIcon width={16} height={16} />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="grid h-full w-9 place-items-center rounded-r-lg hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={`Increase ${label}`}
      >
        <PlusIcon width={16} height={16} />
      </button>
    </div>
  );
}
