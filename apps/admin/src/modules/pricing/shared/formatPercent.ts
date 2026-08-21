/**
 * `TaxRate.rate` arrives as a decimal string (e.g. `"8.5000"`, `decimal(8,4)`
 * server-side, a percentage per the migration's own docblock) — formats it
 * for merchant display without padding or truncating real precision:
 * `"8.5000"` → `"8.5%"`, `"8.5678"` → `"8.5678%"`, `"10.0000"` → `"10%"`.
 * Falls back to the raw string (never a crash) if the value is malformed —
 * defensive only, since a `TaxRate` is already server-validated by the time
 * one exists.
 */
export function formatPercent(rate: string): string {
  const amount = Number(rate);
  if (!Number.isFinite(amount)) return rate;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(amount)}%`;
}
