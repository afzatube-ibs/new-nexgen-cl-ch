import type { Money } from '../components/PriceBlock.js';
import type { ComposedPrice } from '../gateway/types.js';

/**
 * neXgen Production Sprint — Milestone 2 (Pricing → Storefront). The one
 * place a real, Gateway-composed `ComposedPrice` (real decimal strings,
 * e.g. `"2490.0000"`, major units) becomes the `Money` shape (integer
 * minor units) `PriceBlock`/`ProductCard`/`StickyMobileBuyBar` already
 * expect and have expected since they were first built — a pure unit
 * conversion, not a pricing decision: it decides nothing about what a
 * shopper pays, it only reshapes an already-resolved real number for a UI
 * primitive's own established contract, the same category of work as
 * currency-symbol formatting.
 *
 * `compareAtPrice` is derived, honestly, from the same three real fields
 * every "sale" concept in this platform's own Pricing module already
 * defines (`PriceListEntry.effectivePrice()`/`isSaleActive()`, mirrored
 * exactly): when a real sale is active, the crossed-out price is the real
 * standing `basePrice`; when it is not, the crossed-out price is the real
 * `compareAtPrice` the operator set — but only when it is genuinely higher
 * than what the shopper pays (never a "was" price that doesn't actually
 * represent a discount). Nothing here invents a comparison price that
 * doesn't already exist as a real, operator-set field.
 */
export interface MoneyPricePair {
  price: Money | null;
  compareAtPrice: Money | null;
}

function toMinorUnits(decimalString: string): number {
  return Math.round(Number.parseFloat(decimalString) * 100);
}

export function toMoney(entry: ComposedPrice | null | undefined): MoneyPricePair {
  if (!entry) return { price: null, compareAtPrice: null };

  const price: Money = { amountMinor: toMinorUnits(entry.effectivePrice), currencyCode: entry.currencyCode };

  const crossedOutDecimal = entry.isSaleActive ? entry.basePrice : entry.compareAtPrice;
  if (crossedOutDecimal === null) return { price, compareAtPrice: null };

  const crossedOutMinor = toMinorUnits(crossedOutDecimal);
  if (crossedOutMinor <= price.amountMinor) return { price, compareAtPrice: null };

  return { price, compareAtPrice: { amountMinor: crossedOutMinor, currencyCode: entry.currencyCode } };
}
