import type { ListEnvelope } from '@nexgen/api-client';

/**
 * Follows a paginated endpoint to its end and returns every record — the
 * same "list-all" logic Inventory's own `shared/pagination.ts` (itself
 * mirroring Catalog's `useResourceListAll`) already proved out, duplicated
 * here rather than imported, matching this codebase's "each module owns its
 * own copy" convention. Price Lists are the right shape for this: a
 * merchant's real-world count is realistically one per currency/market —
 * low tens at most, not the "thousands of products" scale the brief's own
 * merchant-productivity framing is about (that scale lives inside a single
 * list's *entries*, a genuinely large, unpaginated-by-design collection —
 * see `PriceListDetailDrawer.tsx`'s own docblock for how that's handled
 * differently). Fetching the complete Price List collection up front is
 * what makes Search/Filter/Sort on this particular screen fully honest —
 * every result really is being searched/filtered/sorted, not just
 * whichever page the server happened to return first.
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
