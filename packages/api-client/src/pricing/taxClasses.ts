import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient } from './resourceClient.js';
import type { TaxClassDTO, CreateTaxClassInput, UpdateTaxClassInput, ListTaxClassesQuery } from './types.js';

/** `apps/backend/.../Pricing/routes.php` — `tax-classes`, `pricing.tax.{view|manage}`. No `restore()` — see `taxZones.ts`'s own note; no restore route exists. */
const BASE_PATH = '/tax-classes';

function toCreateBody(input: CreateTaxClassInput): Record<string, unknown> {
  return { name: input.name };
}

function toUpdateBody(input: UpdateTaxClassInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { name: rest.name, expected_version: expectedVersion };
}

/** `TaxClassController::index` (apps/backend) reads `status` and `page` only — hardcoded `orderBy('name')`. */
export function listTaxClasses(client: ApiClient, query?: ListTaxClassesQuery): Promise<ListEnvelope<TaxClassDTO>> {
  return createResourceClient<TaxClassDTO>(client, BASE_PATH).list(query && { status: query.status, page: query.page });
}

export function getTaxClass(client: ApiClient, id: string): Promise<TaxClassDTO> {
  return createResourceClient<TaxClassDTO>(client, BASE_PATH).get(id);
}

export function createTaxClass(client: ApiClient, input: CreateTaxClassInput): Promise<TaxClassDTO> {
  return createResourceClient<TaxClassDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateTaxClass(client: ApiClient, id: string, input: UpdateTaxClassInput): Promise<TaxClassDTO> {
  return createResourceClient<TaxClassDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archiveTaxClass(client: ApiClient, id: string, expectedVersion: number): Promise<TaxClassDTO> {
  return createResourceClient<TaxClassDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyTaxClass(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<TaxClassDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}
