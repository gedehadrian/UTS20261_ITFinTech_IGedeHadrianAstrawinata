import { formatIDR } from "@/lib/format";

interface SummaryRowProps {
  label: string;
  amount: number;
  strong?: boolean;
}

export default function SummaryRow({ label, amount, strong = false }: SummaryRowProps) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? "text-base font-semibold" : "text-sm text-muted"}`}>
      <dt>{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-ink" : "text-ink/80"}`}>{formatIDR(amount)}</dd>
    </div>
  );
}
