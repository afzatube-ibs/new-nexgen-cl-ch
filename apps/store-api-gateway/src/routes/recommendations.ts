/**
 * GET /v1/recommendations/:slot — this slice's own "contracts only...
 * pluggable engine... no hardcoded algorithm" requirement. The route
 * itself never decides HOW a recommendation is produced — it resolves
 * `app.recommendations` (the registry) to whichever engine currently
 * supports the requested slot, exactly like `routes/catalog.ts` never
 * decides how a product is priced.
 */
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { GatewayError } from '../lib/errors.js';
import type { RecommendationSlot } from '../recommendations/contract.js';
import type { Env } from '../config/env.js';

const SLOTS: RecommendationSlot[] = ['trending', 'related', 'recently-viewed', 'frequently-bought-together', 'recommended'];

const paramsSchema = z.object({ slot: z.enum(['trending', 'related', 'recently-viewed', 'frequently-bought-together', 'recommended']) });
const querySchema = z.object({
  productId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

export function registerRecommendationRoutes(app: FastifyInstance, prefix: string, env: Env): void {
  app.get(`${prefix}/recommendations/:slot`, async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const query = querySchema.parse(request.query);

    const flagResult = app.flags.evaluate('recommendations.enabled', {
      environment: env.NODE_ENV,
      storeId: request.personalization.store.storeId,
      bucketingKey: request.guestIdentity.deviceId,
    });
    if (!flagResult.value) {
      reply.code(200);
      return { data: [], meta: { requestId: request.id, flagReason: flagResult.reason } };
    }

    if ((params.slot === 'related' || params.slot === 'frequently-bought-together') && !query.productId) {
      throw GatewayError.validation([{ field: 'productId', message: `productId is required for the "${params.slot}" slot.` }]);
    }
    if (params.slot === 'recently-viewed' && !request.guestIdentity.deviceId) {
      throw GatewayError.validation([{ field: 'deviceId', message: 'A resolved guest identity is required for "recently-viewed".' }]);
    }

    const engine = app.recommendations.resolve(params.slot);
    if (!engine) {
      // A real, structured 501 — this slot has a valid contract but no
      // engine currently implements it, never a silent empty array
      // pretending to be a real "no recommendations" answer.
      throw new GatewayError(501, 'upstream_unavailable', `No recommendation engine currently supports the "${params.slot}" slot.`);
    }

    const results = await engine.recommend({ slot: params.slot, productId: query.productId, deviceId: request.guestIdentity.deviceId, limit: query.limit });
    return { data: results, meta: { requestId: request.id, engine: engine.id } };
  });

  app.get(`${prefix}/recommendations`, (request) => ({
    data: { slots: SLOTS },
    meta: { requestId: request.id },
  }));
}
