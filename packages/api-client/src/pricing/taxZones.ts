import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient } from './resourceClient.js';
import type { TaxZoneDTO, CreateTaxZoneInput, UpdateTaxZoneInput, ListTaxZonesQuery } from './types.js';

/** `apps/backend/.../Pricing/routes.php` — `tax-zones`, `pricing.tax.{view|manage}`. No `restore()` — see `resourceClient.ts`'s own docblock; confirmed by reading `routes.php` directly that no restore route exists for any of Pricing's four archivable entities, Tax Zones included. */
const BASE_PATH = '/tax-zones';

/**
 * `region: ''` (a genuinely blank, country-wide zone) must be OMITTED from
 * the request body entirely, never sent as an empty string — this
 * platform's own global `ConvertEmptyStringsToNull` middleware (Laravel's
 * default, left enabled in `bootstrap/app.php`) converts an empty-string
 * input to `null` before `Create/UpdateTaxZoneRequest`'s own
 * `'region' => ['sometimes', 'string', 'max:100']` rule ever runs — and
 * `sometimes` only skips validation when the *key* is absent, not when its
 * value is `null`, so a present-but-null `region` fails the `string` rule
 * every time (`"The region field must be a string."`, a real, live-
 * reproduced 422 caught during this slice's own live verification).
 * `CreateTaxZoneAction` already defaults `region` to `''` itself when the
 * key is missing (`$attributes['region'] ?? ''`), so omitting it here is
 * not a workaround — it's what the request's own `sometimes` rule already
 * expects the caller to do for "leave blank." `undefined` here, not `''`,
 * because `JSON.stringify` drops `undefined`-valued keys entirely.
 */
function toCreateBody(input: CreateTaxZoneInput): Record<string, unknown> {
  return { name: input.name, country_code: input.countryCode, region: input.region ? input.region : undefined };
}

function toUpdateBody(input: UpdateTaxZoneInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { name: rest.name, country_code: rest.countryCode, region: rest.region ? rest.region : undefined, expected_version: expectedVersion };
}

/** `TaxZoneController::index` (apps/backend) reads `status` and Laravel's own `page` only — no `per_page`, no free-text `search`, hardcoded `orderBy('country_code')->orderBy('region')` (confirmed by reading the controller directly). */
export function listTaxZones(client: ApiClient, query?: ListTaxZonesQuery): Promise<ListEnvelope<TaxZoneDTO>> {
  return createResourceClient<TaxZoneDTO>(client, BASE_PATH).list(query && { status: query.status, page: query.page });
}

export function getTaxZone(client: ApiClient, id: string): Promise<TaxZoneDTO> {
  return createResourceClient<TaxZoneDTO>(client, BASE_PATH).get(id);
}

export function createTaxZone(client: ApiClient, input: CreateTaxZoneInput): Promise<TaxZoneDTO> {
  return createResourceClient<TaxZoneDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateTaxZone(client: ApiClient, id: string, input: UpdateTaxZoneInput): Promise<TaxZoneDTO> {
  return createResourceClient<TaxZoneDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archiveTaxZone(client: ApiClient, id: string, expectedVersion: number): Promise<TaxZoneDTO> {
  return createResourceClient<TaxZoneDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyTaxZone(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<TaxZoneDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}
