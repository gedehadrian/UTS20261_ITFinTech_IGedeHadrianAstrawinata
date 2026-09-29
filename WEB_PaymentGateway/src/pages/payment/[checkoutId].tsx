import type { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import { LockIcon } from "@/components/Icons";
import OrderSummary from "@/components/OrderSummary";
import PageHeader from "@/components/PageHeader";
import PaymentMethodPicker from "@/components/PaymentMethodPicker";
import ShippingForm from "@/components/ShippingForm";
import { useCart } from "@/lib/cart";
import type { PaymentMethod } from "@/lib/payment-methods";
import type { CheckoutView } from "@/lib/types";
import { EMPTY_SHIPPING, validateShipping, type ShippingErrors } from "@/lib/validation";
import { getCheckoutView } from "@/server/checkout";

interface PaymentPageProps {
  checkout: CheckoutView;
}

export const getServerSideProps: GetServerSideProps<PaymentPageProps> = async ({ params }) => {
  const checkout = await getCheckoutView(String(params?.checkoutId));
  if (!checkout) return { notFound: true };
  if (checkout.status === "PAID") {
    return { redirect: { destination: `/orders/${checkout.id}`, permanent: false } };
  }
  return { props: { checkout } };
};

export default function PaymentPage({ checkout }: PaymentPageProps) {
  const router = useRouter();
  const cart = useCart();
  const [shipping, setShipping] = useState(EMPTY_SHIPPING);
  const [errors, setErrors] = useState<ShippingErrors>({});
  const [method, setMethod] = useState<PaymentMethod>(checkout.paymentMethod ?? "CARD");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const totals = {
    subtotal: checkout.subtotal,
    tax: checkout.tax,
    shipping: checkout.shippingFee,
    total: checkout.total,
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateShipping(shipping);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError("Please check the highlighted fields.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId: checkout.id, shipping, method }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        if (data.redirectUrl) {
          await router.push(data.redirectUrl);
          return;
        }
        throw new Error(data.error ?? "Payment could not be started.");
      }
      cart.clear();
      if (String(data.redirectUrl).startsWith("/")) await router.push(data.redirectUrl);
      else window.location.assign(data.redirectUrl);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Payment could not be started.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Secure Checkout · Goresan</title>
      </Head>
      <PageHeader
        backHref="/checkout"
        title={
          <>
            <LockIcon width={16} height={16} /> Secure Checkout
          </>
        }
      />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <p className="mb-6 text-xs text-muted">
          Order <span className="font-mono font-medium text-ink">{checkout.code}</span>
        </p>

        <form onSubmit={handleSubmit} noValidate className="lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-10">
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 font-display text-xl">Shipping Address</h2>
              <ShippingForm value={shipping} errors={errors} onChange={setShipping} />
            </section>
            <section>
              <h2 className="mb-3 font-display text-xl">Payment Method</h2>
              <PaymentMethodPicker value={method} onChange={setMethod} />
            </section>
          </div>

          <aside className="mt-8 rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-20 lg:mt-0">
            <h2 className="mb-4 font-display text-xl">Order Summary</h2>
            <OrderSummary
              items={checkout.items.map((i) => ({ key: i.slug, name: i.name, image: i.image, price: i.price, quantity: i.quantity }))}
              totals={totals}
            />
            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-ink text-sm font-semibold text-white transition hover:bg-ink/85 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Creating your bill…" : "Confirm & Pay"}
            </button>
            {formError && (
              <p role="alert" className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
                {formError}
              </p>
            )}
          </aside>
        </form>
      </main>
    </>
  );
}
