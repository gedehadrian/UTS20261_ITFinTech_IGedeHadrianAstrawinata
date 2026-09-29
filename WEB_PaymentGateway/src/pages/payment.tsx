import Head from "next/head";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LockIcon } from "@/components/Icons";
import OrderSummary from "@/components/OrderSummary";
import PageHeader from "@/components/PageHeader";
import PaymentMethodPicker from "@/components/PaymentMethodPicker";
import ShippingForm from "@/components/ShippingForm";
import { useCart } from "@/lib/cart";
import type { PaymentMethod } from "@/lib/payment-methods";
import { calcTotals } from "@/lib/pricing";
import { EMPTY_SHIPPING, validateShipping, type ShippingErrors } from "@/lib/validation";

export default function PaymentPage() {
  const cart = useCart();
  const [shipping, setShipping] = useState(EMPTY_SHIPPING);
  const [errors, setErrors] = useState<ShippingErrors>({});
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [notice, setNotice] = useState<string | null>(null);

  const totals = calcTotals(cart.subtotal, { withShipping: true });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateShipping(shipping);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setNotice("Order details look good. The payment gateway is connected in the next step.");
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
        {cart.hydrated && cart.items.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-display text-2xl">Nothing to pay for yet.</p>
            <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-semibold text-white">
              Browse artwork
            </Link>
          </div>
        ) : (
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
                items={cart.items.map((i) => ({ key: i.slug, name: i.name, image: i.image, price: i.price, quantity: i.quantity }))}
                totals={totals}
              />
              <button
                type="submit"
                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-ink text-sm font-semibold text-white transition hover:bg-ink/85"
              >
                Confirm &amp; Pay
              </button>
              {notice && <p className="mt-3 rounded-lg bg-success-soft px-3 py-2 text-xs text-success">{notice}</p>}
            </aside>
          </form>
        )}
      </main>
    </>
  );
}
