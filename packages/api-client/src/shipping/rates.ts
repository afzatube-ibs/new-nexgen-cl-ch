import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient } from './resourceClient.js';
import type { ShippingRateDTO, CreateShippingRateInput, UpdateShippingRateInput, ListShippingRatesQuery } from './types.js';

/** `apps/backend/.../Shipping/routes.php` — `shipping-rates`, `shipping.rates.{view|manage}`. */
const BASE_PATH = '/shipping-rates';

function toCreateBody(input: CreateShippingRateInput): Record<string, unknown> {
  return {
    shipping_zone_id: input.shippingZoneId,
    shipping_method_id: input.shippingMethodId,
    min_weight_grams: input.minWeightGrams,
    max_weight_grams: input.maxWeightGrams,
    amount: input.amount,
    currency_code: input.currencyCode,
  };
}

function toUpdateBody(input: UpdateShippingRateInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return {
    min_weight_grams: rest.minWeightGrams,
    max_weight_grams: rest.maxWeightGrams,
    amount: rest.amount,
    currency_code: rest.currencyCode,
    expected_version: expectedVersion,
  };
}

/** `ShippingRateController::index` — `status`/`shipping_zone_id`/`shipping_method_id`/`page`, hardcoded `orderBy('shipping_zone_id')->orderBy('min_weight_grams')`. No free-text `search`. */
export function listShippingRates(client: ApiClient, query?: ListShippingRatesQuery): Promise<ListEnvelope<ShippingRateDTO>> {
  return createResourceClient<ShippingRateDTO>(client, BASE_PATH).list(
    query && { status: query.status, shipping_zone_id: query.shippingZoneId, shipping_method_id: query.shippingMethodId, page: query.page },
  );
}

export function getShippingRate(client: ApiClient, id: string): Promise<ShippingRateDTO> {
  return createResourceClient<ShippingRateDTO>(client, BASE_PATH).get(id);
}

export function createShippingRate(client: ApiClient, input: CreateShippingRateInput): Promise<ShippingRateDTO> {
  return createResourceClient<ShippingRateDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateShippingRate(client: ApiClient, id: string, input: UpdateShippingRateInput): Promise<ShippingRateDTO> {
  return createResourceClient<ShippingRateDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archiveShippingRate(client: ApiClient, id: string, expectedVersion: number): Promise<ShippingRateDTO> {
  return createResourceClient<ShippingRateDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyShippingRate(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<ShippingRateDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}
