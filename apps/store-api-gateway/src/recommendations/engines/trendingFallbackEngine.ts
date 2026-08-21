/**
 * The default, always-registered engine — real Catalog data, an honestly
 * naive algorithm (recency), never a fabricated "smart" result. This is
 * the concrete referent of this slice's own "no hardcoded algorithm" rule
 * read correctly: the ROUTE never hardcodes an algorithm; this ENGINE is
 * explicitly one interchangeable, clearly-labeled implementation of it,
 * the same relationship `STOREFRONT_COMPONENT_ENGINE.md` §3's default
 * primitive implementations have to a future Theme Package's own real
 * designs — a genuine, functional fallback, not a placeholder that lies
 * about being more sophisticated than it is.
 */
import type { BackendClient } from '../../backend/client.js';
import type { BackendProduct } from '../../backend/types.js';
import { toProductSummary, type ProductSummary } from '../../composition/mappers.js';
import type { RecommendationEngineContract, RecommendationRequest, RecommendationSlot } from '../contract.js';

const SUPPORTED: RecommendationSlot[] = ['trending', 'related', 'frequently-bought-together', 'recommended', 'recently-viewed'];

export function createTrendingFallbackEngine(backend: BackendClient): RecommendationEngineContract {
  return {
    id: 'trending-fallback',
    supportedSlots: SUPPORTED,

    async recommend(request: RecommendationRequest): Promise<ProductSummary[]> {
      if (request.slot === 'recently-viewed') {
        // Genuinely no view-history capability is wired yet (would
        // require querying the CDP warehouse for this deviceId's own
        // `product_viewed` events) — an honest empty result, never
        // fabricated products, per this engagement's own "never invent
        // data" discipline applied to a recommendation slot specifically.
        return [];
      }

      const response = await backend.getList<BackendProduct>({
        module: 'catalog',
        path: 'products',
        query: { status: 'active', visibility: 'catalog_search', sort: 'published_at', direction: 'desc', per_page: Math.min(request.limit * 2, 50) },
        correlationId: request.deviceId ?? 'recommendation-fallback',
      });

      const excluded = request.productId;
      return response.data
        .filter((product) => product.id !== excluded)
        .slice(0, request.limit)
        .map(toProductSummary);
    },
  };
}
