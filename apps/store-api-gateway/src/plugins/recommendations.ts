/**
 * Recommendations plugin boundary — decorates `app.recommendations` with
 * a `RecommendationEngineRegistry` that always has the honest fallback
 * engine registered (`recommendations/engines/trendingFallbackEngine.ts`).
 * A future real engine registers itself here too, ahead of the fallback,
 * per `RecommendationEngineRegistry`'s own "first-registered-that-
 * supports-it wins" resolution rule.
 */
import type { FastifyInstance } from 'fastify';
import { RecommendationEngineRegistry } from '../recommendations/registry.js';
import { createTrendingFallbackEngine } from '../recommendations/engines/trendingFallbackEngine.js';
import type { BackendClient } from '../backend/client.js';
import type { Env } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    recommendations: RecommendationEngineRegistry;
  }
}

export function registerRecommendationsPlugin(app: FastifyInstance, backend: BackendClient, env: Env): void {
  const registry = new RecommendationEngineRegistry();
  registry.register(createTrendingFallbackEngine(backend, env, app.log));
  app.decorate('recommendations', registry);
}
