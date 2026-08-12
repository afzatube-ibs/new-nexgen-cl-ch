import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listProducts } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

export interface CatalogProductMatch {
  id: string;
  name: string;
}

/**
 * Product ↔ Pricing integration (Slice 1) — a `PriceListEntry.sku` is a
 * plain string, never a Catalog foreign key (`planning/architecture/
 * PHASE_2_4_PRICING_ARCHITECTURE.md` §2.2/§3.1: "deliberately keyed by
 * `sku`... no schema-level relationship to Catalog's `Product` in either
 * direction"), so the only way to show a merchant "this SKU is *Blue
 * T-Shirt*" is a client-side join against Catalog's own already-public
 * `GET /products` endpoint — the identical pattern Inventory's own
 * `shared/catalogLookup.ts` already established and proved out (duplicated
 * here rather than imported, matching this codebase's "each module owns
 * its own copy" convention).
 *
 * Results are filtered to an *exact* SKU match before being treated as a
 * real match, since the backend's own `search` filter is a substring match
 * on `name LIKE %term%' OR `sku LIKE %term%` — a false "Product A" label on
 * the wrong row would be actively misleading.
 */
export function useCatalogProductBySku(sku: string | undefined): UseQueryResult<CatalogProductMatch | null> {
  const term = sku?.trim();
  return useQuery({
    queryKey: ['pricing', 'catalog-sku-lookup', term],
    queryFn: async () => {
      const result = await listProducts(apiClient, { search: term, perPage: 5 });
      const match = result.data.find((product) => product.sku === term);
      return match ? { id: match.id, name: match.name } : null;
    },
    enabled: Boolean(term),
    staleTime: 5 * 60 * 1000,
  });
}
