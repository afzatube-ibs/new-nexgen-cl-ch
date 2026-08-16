import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient } from './resourceClient.js';
import type { ShippingZoneDTO, CreateShippingZoneInput, UpdateShippingZoneInput, ListShippingZonesQuery } from './types.js';

/** `apps/backend/.../Shipping/routes.php` — `shipping-zones`, `shipping.zones.{view|manage}`. */
const BASE_PATH = '/shipping-zones';

/**
 * `region: ''` (a genuinely blank, country-wide zone) must be OMITTED from
 * the request body entirely, never sent as an empty string — identical
 * reasoning to Pricing's `taxZones.ts` (this platform's global
 * `ConvertEmptyStringsToNull` middleware turns an empty-string input into
 * `null` before `Create/UpdateShippingZoneRequest`'s own
 * `'region' => ['sometimes', 'string', 'max:100']` rule runs, and a
 * present-but-null value fails that rule). `CreateShippingZoneAction`
 * already defaults `region` to `''` itself when the key is missing.
 */
function toCreateBody(input: CreateShippingZoneInput): Record<string, unknown> {
  return { name: input.name, country_code: input.countryCode, region: input.region ? input.region : undefined };
}

function toUpdateBody(input: UpdateShippingZoneInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { name: rest.name, country_code: rest.countryCode, region: rest.region ? rest.region : undefined, expected_version: expectedVersion };
}

/** `ShippingZoneController::index` — `status` and `page` only, hardcoded `orderBy('country_code')->orderBy('region')`. */
export function listShippingZones(client: ApiClient, query?: ListShippingZonesQuery): Promise<ListEnvelope<ShippingZoneDTO>> {
  return createResourceClient<ShippingZoneDTO>(client, BASE_PATH).list(query && { status: query.status, page: query.page });
}

export function getShippingZone(client: ApiClient, id: string): Promise<ShippingZoneDTO> {
  return createResourceClient<ShippingZoneDTO>(client, BASE_PATH).get(id);
}

export function createShippingZone(client: ApiClient, input: CreateShippingZoneInput): Promise<ShippingZoneDTO> {
  return createResourceClient<ShippingZoneDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateShippingZone(client: ApiClient, id: string, input: UpdateShippingZoneInput): Promise<ShippingZoneDTO> {
  return createResourceClient<ShippingZoneDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archiveShippingZone(client: ApiClient, id: string, expectedVersion: number): Promise<ShippingZoneDTO> {
  return createResourceClient<ShippingZoneDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyShippingZone(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<ShippingZoneDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}
