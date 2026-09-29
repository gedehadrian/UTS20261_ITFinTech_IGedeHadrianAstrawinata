/** PPN (Indonesian VAT) applied to the item subtotal. */
export const TAX_RATE = 0.11;

/** Flat-rate insured shipping for framed art and ceramics. */
export const SHIPPING_FEE = 25_000;

export interface Totals {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export function calcTotals(subtotal: number, { withShipping = false } = {}): Totals {
  const tax = Math.round(subtotal * TAX_RATE);
  const shipping = withShipping && subtotal > 0 ? SHIPPING_FEE : 0;
  return { subtotal, tax, shipping, total: subtotal + tax + shipping };
}
