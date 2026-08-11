import type { ListEnvelope } from '@nexgen/api-client';

/**
 * Follows a paginated endpoint to its end and returns every record —
 * the same "list-all" logic Catalog's `useResourceListAll` (`modules/
 * catalog/shared/useResourceQueries.ts`) already proved out for taxonomy
 * selector dropdowns, extracted here as a plain function (Inventory has
 * only one entity — Warehouses — that needs this in Slice 1, so a full
 * generic hook factory would be more abstraction than the module currently
 * uses; see that file's own docblock for the full rationale behind the
 * approach itself). A merchant's warehouse list is realistically small
 * (single digits to low tens), so a handful of sequential requests is a
 * reasonable cost for guaranteeing completeness in a `<Select>` — unlike
 * Stock Items (genuinely 100k+ SKUs at scale), which keeps its own real,
 * paginated list and never calls this.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<ListEnvelope<T>>,
): Promise<T[]> {
  const firstPage = await fetchPage(1);
  const items = [...firstPage.data];
  const lastPage = firstPage.meta?.last_page ?? 1;
  for (let page = 2; page <= lastPage; page++) {
    const nextPage = await fetchPage(page);
    items.push(...nextPage.data);
  }
  return items;
}
