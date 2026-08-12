import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { PriceListEntryDTO, CreatePriceListEntryInput, UpdatePriceListEntryInput } from './types.js';

/**
 * `apps/backend/.../Pricing/routes.php` — `price-lists/{priceList}/entries[/{entry}]`,
 * `pricing.price_lists.manage`. No standalone list/get endpoint exists for a
 * single entry or a cross-list entry feed — every entry is only ever read
 * as part of its parent `PriceList` (`GET /price-lists/{id}` → `.entries`),
 * exactly the same shape that justified Inventory's own Stock Reservations
 * living inside a parent detail view rather than a new top-level page in
 * Slice 2 (`planning/architecture/PHASE_2_3_INVENTORY_ARCHITECTURE.md` §9).
 */
function basePath(priceListId: string): string {
  return `/price-lists/${priceListId}/entries`;
}

function toCreateBody(input: CreatePriceListEntryInput): Record<string, unknown> {
  return {
    sku: input.sku,
    base_price: input.basePrice,
    compare_at_price: input.compareAtPrice,
    sale_price: input.salePrice,
    sale_starts_at: input.saleStartsAt,
    sale_ends_at: input.saleEndsAt,
  };
}

export function createPriceListEntry(client: ApiClient, priceListId: string, input: CreatePriceListEntryInput): Promise<PriceListEntryDTO> {
  return client.post<DataEnvelope<PriceListEntryDTO>>(basePath(priceListId), toCreateBody(input)).then((r) => r.data);
}

export function updatePriceListEntry(
  client: ApiClient,
  priceListId: string,
  entryId: string,
  input: UpdatePriceListEntryInput,
): Promise<PriceListEntryDTO> {
  const { expectedVersion, ...rest } = input;
  return client
    .patch<DataEnvelope<PriceListEntryDTO>>(`${basePath(priceListId)}/${entryId}`, {
      sku: rest.sku,
      base_price: rest.basePrice,
      compare_at_price: rest.compareAtPrice,
      sale_price: rest.salePrice,
      sale_starts_at: rest.saleStartsAt,
      sale_ends_at: rest.saleEndsAt,
      expected_version: expectedVersion,
    })
    .then((r) => r.data);
}

export function destroyPriceListEntry(client: ApiClient, priceListId: string, entryId: string, expectedVersion: number): Promise<void> {
  return client.delete<void>(`${basePath(priceListId)}/${entryId}`, { expected_version: expectedVersion });
}
