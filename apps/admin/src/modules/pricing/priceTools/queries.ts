import { useMutation, useQueries, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  lookupPrice,
  listProducts,
  getPriceList,
  type LookupPriceQuery,
  type PriceListEntryDTO,
  type PriceListDTO,
  type ProductDTO,
  type ListProductsQuery,
  type ListEnvelope,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';
import { useAllPriceLists } from '../priceLists/queries.js';

/**
 * Slice 2 — Merchant Pricing Tools. Every query/mutation here calls the
 * exact same, already-existing Pricing/Catalog endpoints Slice 1 and
 * Checkout itself already use — nothing new. Kept in its own file (not
 * folded into `priceLists/queries.ts`) since these four tools are read-only
 * consumers of Pricing + Catalog data, not another CRUD resource.
 */

// ---------------------------------------------------------------------------
// Price Lookup — `GET /pricing/lookup`, the exact action ReviewCheckoutAction
// itself calls per line item.
// ---------------------------------------------------------------------------

/**
 * A `useMutation`, not a `useQuery` — Price Lookup is an explicit, on-demand
 * merchant action ("look this up"), not something that should reactively
 * refetch/clear as the surrounding page re-renders the way a query keyed on
 * the current form values would.
 */
export function useLookupPrice(): UseMutationResult<PriceListEntryDTO | null, unknown, LookupPriceQuery> {
  return useMutation({ mutationFn: (query: LookupPriceQuery) => lookupPrice(apiClient, query) });
}

// ---------------------------------------------------------------------------
// Missing Price Detection — a bounded page of real Catalog products.
// ---------------------------------------------------------------------------

const PRODUCTS_QUERY_KEY = 'pricing-tools-products';

/**
 * Own copy of a read-only Products search (Pricing's own, not Catalog's
 * `useProducts` — matches this codebase's established "each module owns its
 * own copy of shared-shaped infrastructure" convention). Deliberately
 * server-paginated, never a "fetch everything" collection: `ProductController
 * ::index` (apps/backend) calls `$query->paginate()` with no `per_page`
 * override read from the request at all, so every page is a fixed 15
 * records regardless of what's requested — at a real catalog's genuine scale
 * (thousands of products), a full-collection fetch here would mean hundreds
 * of sequential requests. Missing Price Detection therefore checks whatever
 * page of the real, searchable catalog the merchant is looking at, exactly
 * like the Products list page itself already does — never a whole-catalog
 * count that would be either prohibitively expensive to compute honestly or
 * silently wrong from a partial fetch.
 */
export function usePricingProductSearch(query: ListProductsQuery): UseQueryResult<ListEnvelope<ProductDTO>> {
  return useQuery({ queryKey: [PRODUCTS_QUERY_KEY, query], queryFn: () => listProducts(apiClient, query) });
}

// ---------------------------------------------------------------------------
// Currency Coverage — every Price List's own entries, aggregated per currency.
// ---------------------------------------------------------------------------

export interface PriceListsWithEntriesResult {
  data: PriceListDTO[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Every Price List's *detail* (i.e. including `entries`) — `useAllPriceLists`
 * alone never carries entries (`PriceListController::index` doesn't return
 * them). Fetching each list's own `GET /price-lists/{id}` individually is the
 * right call at this entity's real-world scale — Price Lists are low
 * cardinality by nature (one per currency/market, `PriceListsListPage`'s own
 * docblock), unlike Products — so N parallel detail fetches (N = number of
 * lists) is cheap, not a repeat of the Products full-fetch problem above.
 */
export function usePriceListsWithEntries(): PriceListsWithEntriesResult {
  const listsQuery = useAllPriceLists();
  const lists = listsQuery.data ?? [];

  const detailQueries = useQueries({
    queries: lists.map((list) => ({
      queryKey: ['pricing-tools-currency-coverage', 'detail', list.id],
      queryFn: () => getPriceList(apiClient, list.id),
      enabled: listsQuery.isSuccess,
    })),
  });

  const isLoading = listsQuery.isLoading || (listsQuery.isSuccess && detailQueries.some((q) => q.isLoading));
  const isError = listsQuery.isError || detailQueries.some((q) => q.isError);
  const data =
    listsQuery.isSuccess && detailQueries.length === lists.length && detailQueries.every((q) => q.isSuccess)
      ? detailQueries.map((q) => q.data)
      : undefined;

  return {
    data,
    isLoading,
    isError,
    refetch: () => {
      void listsQuery.refetch();
      for (const q of detailQueries) void q.refetch();
    },
  };
}
