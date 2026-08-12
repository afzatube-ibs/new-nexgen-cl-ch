import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient } from './resourceClient.js';
import type { PriceListDTO, CreatePriceListInput, UpdatePriceListInput, ListPriceListsQuery } from './types.js';

/** `apps/backend/.../Pricing/routes.php` — `price-lists`, `pricing.price_lists.{view|manage}`. */
const BASE_PATH = '/price-lists';

function toCreateBody(input: CreatePriceListInput): Record<string, unknown> {
  return { name: input.name, currency_code: input.currencyCode };
}

function toUpdateBody(input: UpdatePriceListInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return {
    name: rest.name,
    currency_code: rest.currencyCode,
    is_default: rest.isDefault,
    expected_version: expectedVersion,
  };
}

/** `PriceListController::index` (apps/backend) reads `status`/`currency_code` and Laravel's own `page` param only — no `per_page`, no free-text `search` (confirmed by reading the controller directly). */
export function listPriceLists(client: ApiClient, query?: ListPriceListsQuery): Promise<ListEnvelope<PriceListDTO>> {
  return createResourceClient<PriceListDTO>(client, BASE_PATH).list(
    query && { status: query.status, currency_code: query.currencyCode, page: query.page },
  );
}

/** `PriceListController::show` — the only endpoint that returns `entries` (`$priceList->load('entries')`, unpaginated: every entry in the list, in one response). */
export function getPriceList(client: ApiClient, id: string): Promise<PriceListDTO> {
  return createResourceClient<PriceListDTO>(client, BASE_PATH).get(id);
}

export function createPriceList(client: ApiClient, input: CreatePriceListInput): Promise<PriceListDTO> {
  return createResourceClient<PriceListDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updatePriceList(client: ApiClient, id: string, input: UpdatePriceListInput): Promise<PriceListDTO> {
  return createResourceClient<PriceListDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archivePriceList(client: ApiClient, id: string, expectedVersion: number): Promise<PriceListDTO> {
  return createResourceClient<PriceListDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyPriceList(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<PriceListDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}
