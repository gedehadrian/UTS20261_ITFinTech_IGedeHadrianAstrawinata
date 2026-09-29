import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import CategoryTabs from "@/components/CategoryTabs";
import { ArrowRightIcon, SearchIcon } from "@/components/Icons";
import ProductCard from "@/components/ProductCard";
import SetupNotice from "@/components/SetupNotice";
import SiteHeader from "@/components/SiteHeader";
import { CATEGORY_VALUES, type Category } from "@/lib/categories";
import { useCart } from "@/lib/cart";
import { formatIDR } from "@/lib/format";
import type { Product } from "@/lib/types";
import { listProducts } from "@/server/catalog";

interface SelectItemsProps {
  products: Product[];
  setupError: string | null;
}

export const getServerSideProps: GetServerSideProps<SelectItemsProps> = async () => {
  try {
    return { props: { products: await listProducts(), setupError: null } };
  } catch (err) {
    console.error(err);
    return { props: { products: [], setupError: err instanceof Error ? err.message : "Unknown database error." } };
  }
};

export default function SelectItemsPage({ products, setupError }: SelectItemsProps) {
  const [category, setCategory] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const cart = useCart();

  const counts = useMemo(() => {
    const result = { all: products.length } as Record<Category | "all", number>;
    for (const value of CATEGORY_VALUES) result[value] = products.filter((p) => p.category === value).length;
    return result;
  }, [products]);

  const q = query.trim().toLowerCase();
  const visible = products.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (!q || [p.name, p.artist, p.medium, p.description].some((text) => text.toLowerCase().includes(q))),
  );

  return (
    <>
      <Head>
        <title>Shop · Goresan</title>
      </Head>
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-32">
        <section className="pb-6 pt-6 sm:pt-10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Original art · Made in Indonesia</p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl leading-tight sm:text-[2.6rem]">
            Drawings, paintings and prints, straight from the studio.
          </h1>
        </section>

        <label className="relative block">
          <span className="sr-only">Search artwork</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-11 w-full rounded-xl border border-line bg-white pl-4 pr-11 text-[15px] outline-none transition placeholder:text-muted focus:border-ink/40 focus:ring-2 focus:ring-ink/5"
          />
          <SearchIcon className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
        </label>

        <div className="mt-4">
          <CategoryTabs value={category} counts={counts} onChange={setCategory} />
        </div>

        {setupError ? (
          <SetupNotice message={setupError} />
        ) : visible.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display text-xl">Nothing here matches “{query}”.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="mt-3 text-sm text-muted underline underline-offset-4 hover:text-ink"
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          <div className="sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={cart.quantityOf(product.slug)}
                onAdd={() => cart.add(product)}
                onQuantityChange={(quantity) => cart.setQuantity(product.slug, quantity)}
              />
            ))}
          </div>
        )}
      </main>

      {cart.hydrated && cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <p className="text-sm">
              <span className="font-semibold">
                {cart.count} item{cart.count > 1 ? "s" : ""}
              </span>
              <span className="text-muted"> · {formatIDR(cart.subtotal)}</span>
            </p>
            <Link
              href="/checkout"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85"
            >
              Checkout <ArrowRightIcon width={18} height={18} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
