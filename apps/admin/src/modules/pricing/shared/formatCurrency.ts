/**
 * `PriceListEntry.base_price`/`compare_at_price`/`sale_price` arrive as
 * decimal strings (e.g. `"49.9900"`, `decimal(14,4)` server-side) — this
 * formats one for merchant display using the price list's own real
 * currency code via the browser's native `Intl.NumberFormat`, no new
 * dependency. Falls back to the raw numeric string (never a crash, never
 * a silently blank field) if the currency code or value is ever malformed —
 * defensive only; both are already server-validated by the time a
 * `PriceListEntry` exists at all.
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
