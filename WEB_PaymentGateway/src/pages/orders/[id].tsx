import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ArrowRightIcon, CheckIcon } from "@/components/Icons";
import OrderSummary from "@/components/OrderSummary";
import SiteHeader from "@/components/SiteHeader";
import StatusBadge from "@/components/StatusBadge";
import { rememberOrder } from "@/lib/device";
import { formatDateTime, formatIDR } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/payment-methods";
import type { CheckoutView } from "@/lib/types";
import { getCheckoutView } from "@/server/checkout";

const POLL_INTERVAL_MS = 4000;

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

/** Keeps the order in sync with the database while it is waiting for Xendit's webhook. */
function useLiveCheckout(initial: CheckoutView) {
  const [checkout, setCheckout] = useState(initial);

  useEffect(() => {
    if (checkout.status !== "PENDING_PAYMENT") return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkouts/${checkout.id}`, { cache: "no-store" });
        if (res.ok) setCheckout((await res.json()).checkout);
      } catch {
        // offline for a moment: try again on the next tick
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [checkout.id, checkout.status]);

  return checkout;
}

function OrderView({ initial }: { initial: CheckoutView }) {
  const { query } = useRouter();
  const checkout = useLiveCheckout(initial);
  const payment = checkout.payment;
  const methodLabel = PAYMENT_METHODS.find((m) => m.value === checkout.paymentMethod)?.label;
  const pending = checkout.status === "PENDING_PAYMENT";
  const returnedFromGateway = query.paid === "1";
  const payPalFailed = query.paypal === "error";
  const gatewayName = payment?.gateway === "PAYPAL" ? "PayPal" : "Xendit";

  // Opening a bill (e.g. straight back from the gateway) adds it to "My orders" on this device.
  useEffect(() => {
    rememberOrder({ id: checkout.id, code: checkout.code, createdAt: checkout.createdAt });
  }, [checkout.id, checkout.code, checkout.createdAt]);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <section className="rounded-2xl border border-line bg-white p-6 text-center sm:p-8">
        <p className="text-xs text-muted">
          Order <span className="font-mono font-medium text-ink">{checkout.code}</span>
        </p>

        {checkout.status === "PAID" && (
          <div className="mx-auto mt-4 grid h-14 w-14 place-items-center rounded-full bg-success text-white">
            <CheckIcon width={28} height={28} strokeWidth={2.4} />
          </div>
        )}
        <div className="mt-3">
          <StatusBadge status={checkout.status} large />
        </div>
        <h1 className="mt-4 font-display text-2xl sm:text-3xl">{HEADLINES[checkout.status]}</h1>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{formatIDR(checkout.total)}</p>
        {payment?.gatewayAmount && (
          <p className="mt-1 text-sm text-muted">
            Charged by {gatewayName} as {payment.gatewayCurrency} {payment.gatewayAmount}
          </p>
        )}

        {pending && payPalFailed && (
          <p role="alert" className="mx-auto mt-4 max-w-md rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
            PayPal couldn&apos;t complete the payment. Try again, or choose another payment method.
          </p>
        )}

        {pending && payment?.invoiceUrl && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href={payment.invoiceUrl}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-ink px-6 text-sm font-semibold text-white transition hover:bg-ink/85"
            >
              {returnedFromGateway ? `Open ${gatewayName} again` : `Pay now with ${gatewayName}`} <ArrowRightIcon width={18} height={18} />
            </a>
            <Link
              href={`/payment/${checkout.id}`}
              className="inline-flex h-12 items-center rounded-xl border border-line px-5 text-sm hover:border-ink/30"
            >
              Change payment method
            </Link>
          </div>
        )}
        {pending && (
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted" aria-live="polite">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
            </span>
            {returnedFromGateway
              ? `Confirming your payment with ${gatewayName}… this page updates by itself.`
              : `Waiting for payment. This page updates by itself once ${gatewayName} confirms it.`}
          </p>
        )}
        {(checkout.status === "EXPIRED" || checkout.status === "FAILED") && (
          <Link
            href={`/payment/${checkout.id}`}
            className="mt-5 inline-flex h-12 items-center rounded-xl bg-ink px-6 text-sm font-semibold text-white hover:bg-ink/85"
          >
            Create a new bill
          </Link>
        )}

        <dl className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 text-left text-sm">
          {methodLabel && (
            <>
              <dt className="text-muted">Method</dt>
              <dd>
                {methodLabel}
                {payment?.paymentChannel && payment.paymentChannel.toLowerCase() !== methodLabel.toLowerCase() && (
                  <span className="text-muted"> · {payment.paymentChannel}</span>
                )}
              </dd>
            </>
          )}
          {payment && (
            <>
              <dt className="text-muted">Payment ref.</dt>
              <dd className="break-all font-mono text-xs leading-5">{payment.externalId}</dd>
            </>
          )}
          {pending && payment?.expiresAt && (
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

        <p className="mx-auto mt-6 max-w-md rounded-lg bg-paper px-4 py-3 text-xs leading-relaxed text-muted">
          Keep your order code <span className="font-mono font-medium text-ink">{checkout.code}</span>. You can track this
          order any time from <Link href="/orders" className="text-ink underline underline-offset-2">My orders</Link> with
          the email you used at checkout.
        </p>
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
  );
}

export default function OrderPage({ initialCheckout }: OrderPageProps) {
  return (
    <>
      <Head>
        <title>{`Order ${initialCheckout.code} · Goresan`}</title>
      </Head>
      <SiteHeader />
      {/* key: navigating to another order remounts the view instead of keeping the old order's state */}
      <OrderView key={initialCheckout.id} initial={initialCheckout} />
    </>
  );
}
