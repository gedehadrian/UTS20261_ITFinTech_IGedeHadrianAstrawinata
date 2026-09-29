import Image from "next/image";
import QuantityStepper from "@/components/QuantityStepper";
import { PlusIcon } from "@/components/Icons";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatIDR } from "@/lib/format";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onQuantityChange: (quantity: number) => void;
}

export default function ProductCard({ product, quantity, onAdd, onQuantityChange }: ProductCardProps) {
  const soldOut = product.stock < 1;

  return (
    <article className="group flex gap-4 border-b border-line py-4 last:border-b-0 sm:flex-col sm:gap-3 sm:rounded-2xl sm:border sm:bg-white sm:p-3 sm:last:border-b">
      <div className="relative aspect-square w-28 shrink-0 self-start overflow-hidden rounded-xl bg-line sm:w-full sm:self-auto">
        <Image
          src={product.image}
          alt={product.name}
          width={600}
          height={600}
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${soldOut ? "opacity-50 grayscale" : ""}`}
        />
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-white">
            Sold out
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          {CATEGORY_LABELS[product.category]}
        </p>
        <h3 className="font-display text-lg leading-snug">{product.name}</h3>
        <p className="text-sm text-muted">{product.artist}</p>
        <p className="mt-1 font-semibold tabular-nums">{formatIDR(product.price)}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{product.description}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-xs text-muted">
            {product.medium} · {product.size}
          </span>
          {quantity > 0 ? (
            <QuantityStepper value={quantity} max={product.stock} onChange={onQuantityChange} label={product.name} />
          ) : (
            <button
              type="button"
              onClick={onAdd}
              disabled={soldOut}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-ink/20 px-3 text-sm font-medium transition hover:border-ink hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
            >
              Add <PlusIcon width={15} height={15} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
