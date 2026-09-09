import 'server-only';
import { gatewayFetch } from './client.js';

export interface StorefrontAvailability {
  sku: string;
  isAvailable: boolean | null;
}

/**
 * Shopper-facing availability from the Store API Gateway.
 * `null` means Inventory could not be resolved; `false` is a real
 * out-of-stock result and must remain distinct from an upstream/read failure.
 */
export function getAvailability(sku: string): Promise<StorefrontAvailability> {
  return gatewayFetch<StorefrontAvailability[]>(`/v1/inventory/availability`, {
    query: { skus: sku },
    revalidateSeconds: 30,
    tags: [`inventory:sku:${sku}`],
  }).then((items) => items[0] ?? { sku, isAvailable: null });
}
