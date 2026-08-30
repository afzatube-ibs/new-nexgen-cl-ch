/**
 * Production Completion Plan v2, Milestone 11 (Reviews Foundation). Two
 * real, dual-audience-free public reads (`GET /reviews`, `GET
 * /reviews/summary`) through the fixed `storefront-service` Category-A
 * credential (`services.backend` — see backend/client.ts's own docblock),
 * cached exactly like every other real Catalog read in this Gateway
 * (`routes/catalog.ts`), and one customer-authenticated write (`POST
 * /reviews`) through the Category-C `customerBackend` — the identical
 * per-caller-token relay `routes/customers.ts` already establishes.
 *
 * `status=approved` is hardcoded into both GET routes' own backend query,
 * never read from the caller's own request — a shopper-facing route has
 * no legitimate reason to ask for pending/rejected reviews, so this
 * Gateway never gives it the option, rather than trusting the real
 * backend's own `reviews.reviews.view` permission alone as the only
 * defense (SECURITY:DEFENSE_IN_DEPTH).
 */
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { GatewayServices } from '../server.js';
import type { CustomerBackendClient } from '../backend/customerBackendClient.js';
import { serveCacheable, buildCacheKey } from '../lib/cacheHelper.js';
import { bearerTokenFrom } from '../lib/auth.js';
import { toGatewayError, GatewayError } from '../lib/errors.js';
import { toPublicReview, toPublicReviewSummary, toPaginationMeta, type BackendReview, type BackendReviewSummary } from '../composition/reviews.js';

const listQuerySchema = z.object({
  product_id: z.string().uuid(),
  page: z.coerce.number().int().positive().optional(),
  per_page: z.coerce.number().int().positive().max(100).optional(),
});

const summaryQuerySchema = z.object({
  product_id: z.string().uuid(),
});

const submitBodySchema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional().nullable(),
  body: z.string().min(10).max(5000),
});

export function registerReviewRoutes(app: FastifyInstance, services: GatewayServices, customerBackend: CustomerBackendClient, prefix: string): void {
  const { backend, cache } = services;

  // --- GET /reviews?product_id= — the real, public, approved-only listing ---
  app.get(`${prefix}/reviews`, async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const cacheKey = buildCacheKey('reviews', query);

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 60, staleWhileRevalidateSeconds: 180, browserMaxAgeSeconds: 30, tags: ['reviews', `reviews:product:${query.product_id}`] },
      async () => {
        try {
          const response = await backend.getList<BackendReview>({
            module: 'reviews',
            path: 'reviews',
            query: { product_id: query.product_id, status: 'approved', page: query.page, per_page: query.per_page },
            correlationId: request.id,
          });
          return {
            data: response.data.map(toPublicReview),
            pagination: toPaginationMeta(response.meta, response.data.length),
          };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

  // --- GET /reviews/summary?product_id= — real average/count/distribution over approved reviews only ---
  app.get(`${prefix}/reviews/summary`, async (request, reply) => {
    const query = summaryQuerySchema.parse(request.query);
    const cacheKey = buildCacheKey('reviews/summary', query);

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 60, staleWhileRevalidateSeconds: 180, browserMaxAgeSeconds: 30, tags: ['reviews', `reviews:product:${query.product_id}`] },
      async () => {
        try {
          const response = await backend.getItem<BackendReviewSummary>({
            module: 'reviews',
            path: 'reviews/summary',
            query: { product_id: query.product_id },
            correlationId: request.id,
          });
          return { data: toPublicReviewSummary(response.data) };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

  // --- POST /reviews — customer-authenticated only, Category C relay ---
  app.post(`${prefix}/reviews`, async (request) => {
    const customerToken = bearerTokenFrom(request);
    if (!customerToken) throw GatewayError.unauthenticated();
    const body = submitBodySchema.parse(request.body);

    try {
      const result = await customerBackend.post<{ data: BackendReview }>({
        module: 'reviews',
        path: 'reviews',
        customerToken,
        body,
        correlationId: request.id,
      });
      return { data: toPublicReview(result.data), meta: { requestId: request.id } };
    } catch (error) {
      throw toGatewayError(error, 'reviews');
    }
  });
}
