import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatDateTime, formatIDR } from "@/lib/format";
import type { OrderListItem } from "@/lib/types";
import { listOrders } from "@/server/checkout";

interface OrdersPageProps {
  orders: OrderListItem[];
}

export const getServerSideProps: GetServerSideProps<OrdersPageProps> = async () => ({
  props: { orders: await listOrders() },
});

export default function OrdersPage({ orders }: OrdersPageProps) {
  return (
    <>
      <Head>
        <title>Orders · Goresan</title>
      </Head>
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <h1 className="font-display text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-muted">Latest orders and their payment status.</p>

        {orders.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
            {orders.map((order) => (
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
      </main>
    </>
  );
}
