import Image from "next/image";
import SummaryRow from "@/components/SummaryRow";
import { formatIDR } from "@/lib/format";
import type { Totals } from "@/lib/pricing";

export interface SummaryItem {
  key: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

interface OrderSummaryProps {
  items: SummaryItem[];
  totals: Totals;
}

export default function OrderSummary({ items, totals }: OrderSummaryProps) {
  return (
    <div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3">
            <Image src={item.image} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-md bg-line object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted">
                {item.quantity} × {formatIDR(item.price)}
              </p>
            </div>
            <p className="text-sm tabular-nums">{formatIDR(item.price * item.quantity)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 border-t border-line pt-4">
        <SummaryRow label="Item(s)" amount={totals.subtotal} />
        <SummaryRow label="Tax (PPN 11%)" amount={totals.tax} />
        <SummaryRow label="Shipping" amount={totals.shipping} />
        <div className="border-t border-line pt-3">
          <SummaryRow label="Total" amount={totals.total} strong />
        </div>
      </dl>
    </div>
  );
}
