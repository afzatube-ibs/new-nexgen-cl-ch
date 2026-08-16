import type { ListEnvelope } from '@nexgen/api-client';

/**
 * Follows a paginated endpoint to its end and returns every record — the
 * same "list-all" logic Pricing's own `shared/pagination.ts` (itself
 * mirroring Inventory's/Catalog's copies) already proved out, duplicated
 * here per this codebase's "each module owns its own copy" convention.
 * Zones/Methods/Rates are the right shape for this: a merchant's real-world
 * count is realistically dozens at most (one zone per delivery jurisdiction,
 * one method per service level, one rate per zone×method×weight-band) —
 * confirmed by reading `ShippingZoneController::index`/
 * `ShippingMethodController::index`/`ShippingRateController::index`
 * directly: none of the three support a free-text `search` param, so
 * fetching the complete collection once is what makes this screen's own
 * Search genuinely search everything, not just whichever page loaded first.
 *
 * Shipments are NOT fetched this way — a merchant's real shipment volume is
 * "hundreds or thousands," the same order-of-magnitude as Orders itself, so
 * `ShipmentsListPage` uses real, server-driven pagination instead (see
 * `shipments/queries.ts`).
 */
export async function fetchAllPages<T>(fetchPage: (page: number) => Promise<ListEnvelope<T>>): Promise<T[]> {
  const firstPage = await fetchPage(1);
  const items = [...firstPage.data];
  const lastPage = firstPage.meta?.last_page ?? 1;
  for (let page = 2; page <= lastPage; page++) {
    const nextPage = await fetchPage(page);
    items.push(...nextPage.data);
  }
  return items;
}
