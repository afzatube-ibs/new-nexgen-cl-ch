import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listProducts } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

export interface CatalogProductMatch {
  id: string;
  name: string;
}

/**
 * Product ↔ Inventory integration (Slice 1) — a `StockItem.sku` is a plain
 * string, never a Catalog foreign key (see `planning/architecture/
 * PHASE_2_3_INVENTORY_ARCHITECTURE.md` §1.2/§4.2: "deliberately keyed by
 * `sku`... no schema-level awareness of Catalog's tables at all"), so the
 * only way to show a merchant "this SKU is *Blue T-Shirt*" is a client-side
 * join against Catalog's own already-public `GET /products` endpoint —
 * exactly the same headless-first pattern the Organization card already
 * uses to join Products ↔ Categories/Collections/Tags.
 *
 * `ProductController::index` (apps/backend) supports `search`, which
 * matches against `name LIKE %term%` OR `sku LIKE %term%` — confirmed by
 * reading the controller directly, not assumed. That's a substring match on
 * the *Product's own* `sku` column only; it does not reach into
 * `ProductVariant.sku` (variants aren't loaded or searchable from the list
 * endpoint at all). So a StockItem SKU that belongs to a configurable
 * product's *variant* — rather than a simple/digital product's own SKU —
 * will not resolve here and falls back to showing the bare SKU, exactly as
 * documented as a known, honest limitation in the architecture doc's §9.
 *
 * Results are filtered here to an *exact* SKU match (not "contains") before
 * being treated as a real match, since the backend's own filter is a
 * substring search and a false "Product A" label on the wrong row would be
 * actively misleading — worse than showing nothing.
 */
export function useCatalogProductBySku(sku: string | undefined): UseQueryResult<CatalogProductMatch | null> {
  const term = sku?.trim();
  return useQuery({
    queryKey: ['inventory', 'catalog-sku-lookup', term],
    queryFn: async () => {
      const result = await listProducts(apiClient, { search: term, perPage: 5 });
      const match = result.data.find((product) => product.sku === term);
      return match ? { id: match.id, name: match.name } : null;
    },
    enabled: Boolean(term),
    staleTime: 5 * 60 * 1000,
  });
}
