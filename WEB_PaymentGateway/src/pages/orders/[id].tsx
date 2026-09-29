import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import OrderSummary from "@/components/OrderSummary";
import SiteHeader from "@/components/SiteHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatDateTime, formatIDR } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/payment-methods";
import type { CheckoutView } from "@/lib/types";
import { getCheckoutView } from "@/server/checkout";

interface OrderPageProps {
  initialCheckout: CheckoutView;
}

export const getServerSideProps: GetServerSideProps<OrderPageProps> = async ({ params }) => {
  const checkout = await getCheckoutView(String(params?.id));
  if (!checkout) return { notFound: true };
  return { props: { initialCheckout: checkout } };
};

const HEADLINES: Record<CheckoutView["status"], string> = {
  OPEN: "This order hasn't been confirmed yet.",
  PENDING_PAYMENT: "Your bill is ready.",
  PAID: "Payment received. Thank you!",
  EXPIRED: "This bill has expired.",
  FAILED: "The payment didn't go through.",
};

export default function OrderPage({ initialCheckout: checkout }: OrderPageProps) {
  const payment = checkout.payment;
  const methodLabel = PAYMENT_METHODS.find((m) => m.value === checkout.paymentMethod)?.label;

  return (
    <>
      <Head>
        <title>{`Order ${checkout.code} · Goresan`}</title>
      </Head>
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <section className="rounded-2xl border border-line bg-white p-6 text-center sm:p-8">
          <p className="text-xs text-muted">
            Order <span className="font-mono font-medium text-ink">{checkout.code}</span>
          </p>
          <div className="mt-3">
            <StatusBadge status={checkout.status} large />
          </div>
          <h1 className="mt-4 font-display text-2xl sm:text-3xl">{HEADLINES[checkout.status]}</h1>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatIDR(checkout.total)}</p>

          <dl className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 text-left text-sm">
            {methodLabel && (
              <>
                <dt className="text-muted">Method</dt>
                <dd>{methodLabel}</dd>
              </>
            )}
            {payment && (
              <>
                <dt className="text-muted">Payment ref.</dt>
                <dd className="break-all font-mono text-xs leading-5">{payment.externalId}</dd>
              </>
            )}
            {checkout.status === "PENDING_PAYMENT" && payment?.expiresAt && (
              <>
                <dt className="text-muted">Pay before</dt>
                <dd>{formatDateTime(payment.expiresAt)}</dd>
              </>
            )}
            {checkout.paidAt && (
              <>
                <dt className="text-muted">Paid at</dt>
                <dd>{formatDateTime(checkout.paidAt)}</dd>
              </>
            )}
            <dt className="text-muted">Ordered</dt>
            <dd>{formatDateTime(checkout.createdAt)}</dd>
          </dl>
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-4 font-display text-xl">Items</h2>
          <OrderSummary
            items={checkout.items.map((i) => ({ key: i.slug, name: i.name, image: i.image, price: i.price, quantity: i.quantity }))}
            totals={{ subtotal: checkout.subtotal, tax: checkout.tax, shipping: checkout.shippingFee, total: checkout.total }}
          />
          {checkout.recipient && (
            <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
              Ships to <span className="text-ink">{checkout.recipient.fullName}</span>, {checkout.recipient.city}
            </p>
          )}
        </section>

        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/" className="rounded-xl bg-ink px-5 py-2.5 font-semibold text-white hover:bg-ink/85">
            Continue shopping
          </Link>
          <Link href="/orders" className="rounded-xl border border-line px-5 py-2.5 hover:border-ink/30">
            All orders
          </Link>
        </div>
      </main>
    </>
  );
}
