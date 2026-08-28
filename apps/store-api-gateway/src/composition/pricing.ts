/**
 * neXgen Production Sprint — Milestone 2 (Pricing → Storefront). Composes
 * the real backend's own `GET pricing/lookup-many` (a real, batched
 * companion to the pre-existing single-SKU `pricing/lookup`, built for
 * this exact milestone — see that backend module's own commit) into the
 * Storefront's `ProductSummary`/`ProductDetail`/`SearchResultSummary`
 * shapes, via `BackendClient` (Category-A) exactly like every other real
 * Catalog composition in `routes/catalog.ts` — no new client, no new
 * credential, per this milestone's own "reuse existing BackendClient
 * patterns" rule.
 *
 * "Gateway composes, Storefront renders, Backend owns calculations": this
 * module computes nothing about a price — `ComposedPrice` is a direct,
 * unmodified pass-through of the real backend's own resolved
 * `PriceListEntry` fields. A discount percentage, a "you save" amount, and
 * every other *display* derivation stays in the Storefront's own
 * presentation layer (`packages/storefront-engine`'s `PriceBlock`, already
 * built and already computing exactly that from real numbers) — this file
 * only fetches and attaches, never decides what a shopper pays.
 *
 * **Fails open, never fails the whole page** — a real, live-verified
 * finding: a Pricing-layer failure (a misconfigured permission, a
 * timeout, the module itself briefly down) must never take down primary
 * Catalog browsing, which is real, independent data a Pricing outage has
 * no bearing on. `fetchComposedPrices` therefore catches its own real
 * backend call and degrades to an empty Map — every product simply shows
 * `PriceBlock`'s own honest "Price coming soon" state, exactly like a
 * genuinely unpriced SKU — while logging the real failure so it is never
 * silently invisible to an operator.
 */
import type { FastifyBaseLogger } from 'fastify';
import type { BackendClient } from '../backend/client.js';
import type { BackendPriceListEntry } from '../backend/types.js';

export interface ComposedPrice {
  currencyCode: string;
  basePrice: string;
  compareAtPrice: string | null;
  salePrice: string | null;
  effectivePrice: string;
  isSaleActive: boolean;
}

function toComposedPrice(entry: BackendPriceListEntry, currencyCode: string): ComposedPrice {
  return {
    currencyCode,
    basePrice: entry.basePrice,
    compareAtPrice: entry.compareAtPrice,
    salePrice: entry.salePrice,
    effectivePrice: entry.effectivePrice,
    isSaleActive: entry.isSaleActive,
  };
}

/**
 * One real backend call for however many real SKUs a page needs priced —
 * never one call per product (the exact N+1 this milestone's own
 * Performance requirement forbids). Returns an empty Map — never a thrown
 * error — for an empty `skus` input (a page with no products has nothing
 * to price) and for a real backend failure alike (see this module's own
 * "fails open" docblock above); `logger`, when supplied, records the real
 * failure at `warn` so it stays visible without ever reaching a shopper.
 */
export async function fetchComposedPrices(backend: BackendClient, skus: string[], currencyCode: string, correlationId: string, logger?: FastifyBaseLogger): Promise<Map<string, ComposedPrice>> {
  const uniqueSkus = [...new Set(skus.filter((sku) => sku.length > 0).map((sku) => sku.toUpperCase()))];
  if (uniqueSkus.length === 0) return new Map();

  try {
    const response = await backend.getList<BackendPriceListEntry>({
      module: 'pricing',
      path: 'pricing/lookup-many',
      query: { skus: uniqueSkus.join(','), currency_code: currencyCode },
      correlationId,
    });

    const prices = new Map<string, ComposedPrice>();
    for (const entry of response.data) {
      prices.set(entry.sku.toUpperCase(), toComposedPrice(entry, currencyCode));
    }
    return prices;
  } catch (error) {
    logger?.warn({ err: error, correlationId }, 'Pricing composition failed — degrading to no price shown, Catalog browsing continues');
    return new Map();
  }
}

/**
 * Merges a real, already-fetched price Map onto any real SKU-bearing
 * summary — one small, generic helper reused across `/homepage`,
 * `/products`, `/products/:id`, `/search`, and the recommendations engine,
 * rather than five separate ad hoc merges. `null` (never omitted) when a
 * product has no real configured price — `PriceBlock`'s own honest "Price
 * coming soon" state, not a missing field.
 */
export function attachPrices<T extends { sku: string }>(items: T[], prices: Map<string, ComposedPrice>): Array<T & { price: ComposedPrice | null }> {
  return items.map((item) => ({ ...item, price: prices.get(item.sku.toUpperCase()) ?? null }));
}
