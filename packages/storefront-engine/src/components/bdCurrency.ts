/**
 * Store Components library — Beta Milestone 2.6's own "BDT formatting"
 * build item: a real, working currency formatter for Bangladeshi Taka,
 * including the South Asian lakh/crore digit-grouping convention
 * (৳12,34,567 — grouped in pairs after the first three digits, not the
 * international thousands convention every `Intl.NumberFormat` "en"
 * locale assumes). No `Intl` locale ships this grouping for `bn-BD`
 * reliably across runtimes, so the grouping is implemented directly
 * rather than trusted to the host environment.
 *
 * Pure formatting only — no exchange rate, no multi-currency conversion.
 * The numeric amount passed in is assumed to already be in BDT (paisa
 * are not modelled; Gateway pricing is integer-minor-unit-free today).
 */

/** Groups a non-negative integer's digits using the lakh/crore convention: last 3 digits, then pairs. */
function groupIndianDigits(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${grouped},${last3}`;
}

export interface FormatBdtOptions {
  /** Show the ৳ symbol. Defaults to true. */
  showSymbol?: boolean;
  /** Show two decimal places when the amount has a fractional part. Defaults to false (whole Taka only). */
  showDecimals?: boolean;
}

/** Formats a numeric BDT amount using the lakh/crore grouping convention, e.g. 1234567 -> "৳12,34,567". */
export function formatBdt(amount: number, options: FormatBdtOptions = {}): string {
  const { showSymbol = true, showDecimals = false } = options;
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const rounded = showDecimals ? Math.round(abs * 100) / 100 : Math.round(abs);
  const [wholePart, fractionPart] = rounded.toFixed(showDecimals ? 2 : 0).split('.');
  const grouped = groupIndianDigits(wholePart ?? '0');
  const decimals = showDecimals && fractionPart ? `.${fractionPart}` : '';
  const symbol = showSymbol ? '৳' : '';
  return `${negative ? '-' : ''}${symbol}${grouped}${decimals}`;
}

/** Renders a large BDT amount using the colloquial lakh/crore short form, e.g. 1500000 -> "15 lakh", 30000000 -> "3 crore". Falls back to `formatBdt` under 1 lakh. */
export function formatBdtShort(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_00_00_000) {
    const crore = abs / 1_00_00_000;
    return `${sign}${trimTrailingZero(crore)} crore`;
  }
  if (abs >= 1_00_000) {
    const lakh = abs / 1_00_000;
    return `${sign}${trimTrailingZero(lakh)} lakh`;
  }
  return formatBdt(amount);
}

function trimTrailingZero(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}
