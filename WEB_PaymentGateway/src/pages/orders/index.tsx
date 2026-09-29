import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";
import SiteHeader from "@/components/SiteHeader";
import StatusBadge from "@/components/StatusBadge";
import { useDeviceOrders } from "@/lib/device";
import { formatDateTime, formatIDR } from "@/lib/format";
import type { OrderListItem } from "@/lib/types";

/** Live status for the orders this browser remembers. */
function useOrderSummaries(ids: string[]) {
  const key = ids.join(",");
  const [result, setResult] = useState<{ key: string; orders: OrderListItem[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`/api/orders?ids=${encodeURIComponent(key)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data: { orders: OrderListItem[] }) => {
        if (!cancelled) setResult({ key, orders: data.orders });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, orders: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!key) return [];
  return result?.key === key ? result.orders : null; // null while loading
}

function TrackOrderForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Order not found.");
      await router.push(`/orders/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found.");
      setSearching(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px] outline-none transition placeholder:text-ink/30 focus:border-ink/40 focus:ring-2 focus:ring-ink/5";

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-white p-5">
      <h2 className="font-display text-xl">Track an order</h2>
      <p className="mt-1 text-sm text-muted">Enter the email you used at checkout and your order code.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Email</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Order code</span>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="GRS-260930-XXXXX"
            className={`${inputClass} font-mono uppercase`}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={searching}
        className="mt-4 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60"
      >
        {searching ? "Looking…" : "Find order"}
      </button>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
          {error}
        </p>
      )}
    </form>
  );
}

export default function MyOrdersPage() {
  const { orders: deviceOrders, hydrated } = useDeviceOrders();
  const summaries = useOrderSummaries(deviceOrders.map((o) => o.id));

  return (
    <>
      <Head>
        <title>My orders · Goresan</title>
      </Head>
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <h1 className="font-display text-3xl">My orders</h1>
        <p className="mt-1 text-sm text-muted">Orders placed from this browser. Ordered on another device? Track it below.</p>

        <section className="mt-6">
          {!hydrated || summaries === null ? (
            <div className="h-24 animate-pulse rounded-2xl bg-line/60" />
          ) : summaries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-8 text-center">
              <p className="text-sm text-muted">No orders on this device yet.</p>
              <Link href="/" className="mt-3 inline-block text-sm text-ink underline underline-offset-4">
                Browse artwork
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
              {summaries.map((order) => (
                <li key={order.id}>
                  <Link href={`/orders/${order.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-ink/[0.02]">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium">{order.code}</p>
                      <p className="text-xs text-muted">
                        {formatDateTime(order.createdAt)} · {order.itemCount} item{order.itemCount > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatIDR(order.total)}</p>
                      <div className="mt-1">
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <TrackOrderForm />
        </section>
      </main>
    </>
  );
}
