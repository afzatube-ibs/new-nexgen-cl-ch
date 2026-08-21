import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient } from './resourceClient.js';
import type { TaxRateDTO, CreateTaxRateInput, UpdateTaxRateInput, ListTaxRatesQuery } from './types.js';

/** `apps/backend/.../Pricing/routes.php` — `tax-rates`, `pricing.tax.{view|manage}`. No `restore()` — see `taxZones.ts`'s own note; no restore route exists. */
const BASE_PATH = '/tax-rates';

function toCreateBody(input: CreateTaxRateInput): Record<string, unknown> {
  return { tax_zone_id: input.taxZoneId, tax_class_id: input.taxClassId, rate: input.rate };
}

function toUpdateBody(input: UpdateTaxRateInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { tax_zone_id: rest.taxZoneId, tax_class_id: rest.taxClassId, rate: rest.rate, expected_version: expectedVersion };
}

/** `TaxRateController::index` (apps/backend) reads `status`/`tax_zone_id`/`tax_class_id`/`page` — no free-text `search`, no `sort` param (default insertion order). */
export function listTaxRates(client: ApiClient, query?: ListTaxRatesQuery): Promise<ListEnvelope<TaxRateDTO>> {
  return createResourceClient<TaxRateDTO>(client, BASE_PATH).list(
    query && { status: query.status, tax_zone_id: query.taxZoneId, tax_class_id: query.taxClassId, page: query.page },
  );
}

export function getTaxRate(client: ApiClient, id: string): Promise<TaxRateDTO> {
  return createResourceClient<TaxRateDTO>(client, BASE_PATH).get(id);
}

export function createTaxRate(client: ApiClient, input: CreateTaxRateInput): Promise<TaxRateDTO> {
  return createResourceClient<TaxRateDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateTaxRate(client: ApiClient, id: string, input: UpdateTaxRateInput): Promise<TaxRateDTO> {
  return createResourceClient<TaxRateDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archiveTaxRate(client: ApiClient, id: string, expectedVersion: number): Promise<TaxRateDTO> {
  return createResourceClient<TaxRateDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyTaxRate(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<TaxRateDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}
