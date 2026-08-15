/**
 * `Order.grandTotal`/etc. arrive as decimal strings — the same shape
 * Pricing's own `formatCurrency.ts` already formats, duplicated here
 * rather than imported (each module owns its own copy of this
 * shared-shaped infrastructure, matching every prior module's own
 * precedent). Falls back to the raw numeric string, never a crash, if the
 * currency code or value is ever malformed.
 */
export function formatCurrency(value: string, currencyCode: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}
