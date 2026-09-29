/** Fallback IDR→USD rate for PayPal, which cannot charge in Rupiah. Override with PAYPAL_IDR_PER_USD. */
export const DEFAULT_IDR_PER_USD = 16_500;

/** Converts a Rupiah amount to a USD string with two decimals, rounded up so the shop never undercharges. */
export function idrToUsd(amountIdr: number, idrPerUsd: number): string {
  return (Math.ceil((amountIdr / idrPerUsd) * 100) / 100).toFixed(2);
}
