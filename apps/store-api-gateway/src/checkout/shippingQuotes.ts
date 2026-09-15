/**
 * neXgen Overnight Sprint — Milestone 1, Objective 1 (Checkout → Shipping
 * Integration). The Gateway-side composition seam this platform's own
 * backend architecture requires: the real backend's Commerce\Checkout
 * module is mechanically forbidden from depending on Operations\Shipping
 * in-process (tests/Arch/ArchitectureTest.php's "Checkout never depends on
 * Operations or Growth" rule, backend-side), so the Gateway — already the
 * sanctioned place this saga composes across separate real backend
 * contracts (see checkout/orchestrator.ts's own docblock) — resolves a
 * real quote here, calling nothing this module invents: Catalog's own
 * real `GET products/:id` (Category-A) for each line's real weight, then
 * Shipping's own real `POST shipping/quote-options` (Category-B) for the
 * real, destination- and weight-aware options.
 *
 * Deliberately honest about a real, named gap: if any line's product has
 * no `weightGrams` recorded yet (Catalog's own new column — see the
 * backend migration's docblock), this returns an empty list rather than
 * guessing a weight — a fabricated shipping charge is worse than an
 * honest "not available yet," per this platform's own anti-fabrication
 * rule applied to a derived money figure, not just a displayed one.
 */
import type { BackendClient } from '../backend/client.js';
import type { BackendProduct } from '../backend/types.js';
import type { CheckoutBackendClient } from '../backend/checkoutClient.js';
import type { BackendEnvelope, BackendShippingQuoteOption } from './types.js';
import { fetchComposedPrices } from '../composition/pricing.js';

export interface ShippingQuoteLine {
  productId: string;
  quantity: number;
}

export interface ShippingDestination {
  countryCode: string;
  region?: string | null;
}

export interface ResolvedShippingOption {
  id: string;
  label: string;
  amount: string;
  currencyCode: string;
}

export interface ResolveShippingOptionsParams {
  backend: BackendClient;
  checkoutBackend: CheckoutBackendClient;
  destination: ShippingDestination;
  lines: ShippingQuoteLine[];
  currencyCode: string;
  correlationId: string;
}

function decimalToScale4(value: string): bigint {
  const [whole = '0', fraction = ''] = value.split('.');
  return BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, '0').slice(0, 4));
}

function scale4ToDecimal(value: bigint): string {
  const whole = value / 10_000n;
  const fraction = (value % 10_000n).toString().padStart(4, '0');
  return `${whole}.${fraction}`;
}

/**
 * Sums each line's real, per-product weight (already-fetched products are
 * reused across duplicate line entries rather than re-fetched). Returns
 * `null` — never a guessed figure — the moment any line's product has no
 * recorded weight.
 */
async function resolveTotalWeightGrams(backend: BackendClient, lines: ShippingQuoteLine[], correlationId: string): Promise<number | null> {
  const uniqueProductIds = [...new Set(lines.map((line) => line.productId))];
  const weightByProductId = new Map<string, number>();

  for (const productId of uniqueProductIds) {
    const response = await backend.getItem<BackendProduct>({ module: 'catalog', path: `products/${productId}`, correlationId });
    const weightGrams = response.data.weightGrams;
    if (weightGrams === null || weightGrams === undefined) return null;
    weightByProductId.set(productId, weightGrams);
  }

  let total = 0;
  for (const line of lines) {
    total += (weightByProductId.get(line.productId) ?? 0) * line.quantity;
  }
  return total;
}

export async function resolveShippingOptions(params: ResolveShippingOptionsParams): Promise<ResolvedShippingOption[]> {
  const { backend, checkoutBackend, destination, lines, currencyCode, correlationId } = params;

  if (lines.length === 0) return [];

  const weightGrams = await resolveTotalWeightGrams(backend, lines, correlationId);
  if (weightGrams === null || weightGrams < 1) return [];

  const products = await Promise.all([...new Set(lines.map((line) => line.productId))].map(async (productId) => (
    await backend.getItem<BackendProduct>({ module: 'catalog', path: `products/${productId}`, correlationId })
  ).data));
  const productById = new Map(products.map((product) => [product.id, product]));
  const prices = await fetchComposedPrices(backend, products.map((product) => product.sku), currencyCode, correlationId);
  let orderAmountScaled = 0n;
  for (const line of lines) {
    const product = productById.get(line.productId);
    const price = product ? prices.get(product.sku.toUpperCase()) : undefined;
    if (!price) return [];
    orderAmountScaled += decimalToScale4(price.effectivePrice) * BigInt(line.quantity);
  }

  const response = await checkoutBackend.post<BackendEnvelope<BackendShippingQuoteOption[]>>({
    module: 'shipping',
    path: 'shipping/quote-options',
    correlationId,
    body: {
      country_code: destination.countryCode.toUpperCase(),
      region: destination.region ?? undefined,
      weight_grams: weightGrams,
      order_amount: scale4ToDecimal(orderAmountScaled),
    },
  });

  return response.data.map((option) => ({
    id: option.shippingMethodId,
    label: option.label,
    amount: option.amount,
    currencyCode: option.currencyCode,
  }));
}
