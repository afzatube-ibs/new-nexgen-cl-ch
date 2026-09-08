/**
 * The default, always-registered recommendation engine: real Catalog data,
 * a deliberately simple recency fallback, and the same real Pricing and
 * Inventory composition used by every other product card.
 */
import type { FastifyBaseLogger } from 'fastify';
import type { BackendClient } from '../../backend/client.js';
import type { BackendProduct } from '../../backend/types.js';
import type { Env } from '../../config/env.js';
import { fetchComposedAvailability } from '../../composition/availability.js';
import { fetchComposedPrices } from '../../composition/pricing.js';
import { toProductSummary, type ProductSummary } from '../../composition/mappers.js';
import type { RecommendationEngineContract, RecommendationRequest, RecommendationSlot } from '../contract.js';

const SUPPORTED: RecommendationSlot[] = ['trending', 'related', 'frequently-bought-together', 'recommended', 'recently-viewed'];

export function createTrendingFallbackEngine(backend: BackendClient, env: Env, logger?: FastifyBaseLogger): RecommendationEngineContract {
  return {
    id: 'trending-fallback',
    supportedSlots: SUPPORTED,

    async recommend(request: RecommendationRequest): Promise<ProductSummary[]> {
      if (request.slot === 'recently-viewed') return [];

      const correlationId = request.deviceId ?? 'recommendation-fallback';
      const response = await backend.getList<BackendProduct>({
        module: 'catalog',
        path: 'products',
        query: {
          status: 'active',
          visibility: 'catalog_search',
          sort: 'published_at',
          direction: 'desc',
          per_page: Math.min(request.limit * 2, 50),
        },
        correlationId,
      });

      const excluded = request.productId;
      const products = response.data.filter((product) => product.id !== excluded).slice(0, request.limit);
      const skus = products.map((product) => product.sku);
      const [prices, availability] = await Promise.all([
        fetchComposedPrices(backend, skus, env.DEFAULT_CURRENCY, correlationId, logger),
        fetchComposedAvailability(backend, skus, correlationId, logger),
      ]);

      return products.map((product) =>
        toProductSummary(
          product,
          prices.get(product.sku.toUpperCase()) ?? null,
          availability.get(product.sku.toUpperCase()) ?? null,
        ),
      );
    },
  };
}
