import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRightIcon, TrashIcon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import QuantityStepper from "@/components/QuantityStepper";
import SummaryRow from "@/components/SummaryRow";
import { useCart } from "@/lib/cart";
import { formatIDR } from "@/lib/format";
import { calcTotals } from "@/lib/pricing";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const totals = calcTotals(cart.subtotal);

  return (
    <>
      <Head>
        <title>Checkout · Goresan</title>
      </Head>
      <PageHeader title="Checkout" backHref="/" />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-2">
        {!cart.hydrated ? (
          <div className="mt-6 h-40 animate-pulse rounded-2xl bg-line/60" />
        ) : cart.items.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-display text-2xl">Your cart is empty.</p>
            <p className="mt-2 text-sm text-muted">Pick a piece or two from the shop first.</p>
            <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-semibold text-white">
              Browse artwork
            </Link>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-10">
            <ul className="divide-y divide-line">
              {cart.items.map((item) => (
                <li key={item.slug} className="flex gap-4 py-4">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={96}
                    height={96}
                    className="h-20 w-20 shrink-0 rounded-lg bg-line object-cover sm:h-24 sm:w-24"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{item.name}</p>
                        <p className="text-sm text-muted">{item.artist}</p>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums">{formatIDR(item.price * item.quantity)}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                      <QuantityStepper
                        value={item.quantity}
                        max={item.stock}
                        onChange={(quantity) => cart.setQuantity(item.slug, quantity)}
                        label={item.name}
                      />
                      <button
                        type="button"
                        onClick={() => cart.remove(item.slug)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-accent-soft hover:text-accent"
                      >
                        <TrashIcon width={15} height={15} /> Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="mt-2 rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-20 lg:mt-4">
              <dl className="space-y-2">
                <SummaryRow label="Subtotal" amount={totals.subtotal} />
                <SummaryRow label="Tax (PPN 11%)" amount={totals.tax} />
                <div className="border-t border-line pt-3">
                  <SummaryRow label="Total" amount={totals.total} strong />
                </div>
              </dl>
              <p className="mt-2 text-xs text-muted">Shipping is added on the next step.</p>
              <button
                type="button"
                onClick={() => router.push("/payment")}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-white transition hover:bg-ink/85"
              >
                Continue to Payment <ArrowRightIcon width={18} height={18} />
              </button>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
