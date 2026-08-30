import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { ShippingProviderDTO } from './types.js';

/**
 * `GET /shipping/providers` — `ShippingProviderController::index`
 * (apps/backend), `shipping.providers.view`. Every registered courier,
 * whether or not it is currently available (credentials configured) —
 * see that controller's own docblock.
 */
export function listShippingProviders(client: ApiClient): Promise<ListEnvelope<ShippingProviderDTO>> {
  return client.get<ListEnvelope<ShippingProviderDTO>>('/shipping/providers');
}
