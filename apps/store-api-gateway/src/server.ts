/**
 * Builds the Fastify instance implementing the Gateway Pipeline, extended
 * for Slice 1.5's own Platform Services. Full pipeline order:
 *
 *   Incoming Request
 *     -> Request ID + Logging      (Fastify's own genReqId + pino, Slice 1)
 *     -> Tracing                    (plugins/tracing.ts — Trace ID, timing — Slice 1.5)
 *     -> Rate Limit                 (plugins/security.ts, Slice 1)
 *     -> Guest Session               (plugins/context.ts, Slice 1 — cheap, before Cache)
 *     -> Personalization              (plugins/personalization.ts — Slice 1.5, depends on Guest Session)
 *     -> [per-route] Cache -> Localization/Currency -> Forward -> Response
 *        Normalization              (lib/cacheHelper.ts + routes/*.ts)
 *
 * Platform Services decorated onto `app` (not per-request pipeline
 * stages, but real, boundary-respecting capabilities every route may
 * consume — Gateway Plugin Architecture, this slice's own requirement):
 * `app.events` (Event Pipeline), `app.flags` (Feature Flags), `app.preview`
 * (Preview Framework), `app.recommendations` (Recommendation Engine
 * Registry). See plugins/index.ts for the full boundary manifest.
 */
import Fastify, { type FastifyError, type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { randomUUID } from 'node:crypto';
import type { Env } from './config/env.js';
import { BackendClient } from './backend/client.js';
import { CheckoutBackendClient } from './backend/checkoutClient.js';
import { createInMemoryCacheStore, createRedisCacheStore, type CacheStore } from './lib/cacheStore.js';
import { registerSecurityPlugins } from './plugins/security.js';
import { registerGuestSessionHook } from './plugins/context.js';
import { registerOpenApi } from './plugins/openapi.js';
import { registerTracingPlugin } from './plugins/tracing.js';
import { registerPersonalizationPlugin } from './plugins/personalization.js';
import { registerFlagsPlugin } from './plugins/flags.js';
import { registerPreviewPlugin } from './plugins/preview.js';
import { registerEventsPlugin, registerTestEventsPlugin } from './plugins/events.js';
import { registerRecommendationsPlugin } from './plugins/recommendations.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerCatalogRoutes } from './routes/catalog.js';
import { registerBrandingRoutes } from './routes/branding.js';
import { registerEventRoutes } from './routes/events.js';
import { registerRecommendationRoutes } from './routes/recommendations.js';
import { registerPreviewRoutes } from './routes/preview.js';
import { registerCheckoutRoutes } from './routes/checkout.js';
import { registerOrderLookupRoutes } from './routes/orders.js';
import { registerVersionedRoutes, CURRENT_VERSION } from './versioning/apiVersion.js';
import { GatewayError, toGatewayError } from './lib/errors.js';

export interface GatewayServices {
  env: Env;
  backend: BackendClient;
  /** Beta Sprint 5 — the real, separately-credentialed write path to Checkout/Shipping/Payments/Orders. See backend/checkoutClient.ts's own docblock. */
  checkoutBackend: CheckoutBackendClient;
  cache: CacheStore;
}

export interface BuildServerOptions {
  env: Env;
  /** Injectable for tests — defaults to a real Redis-backed store. */
  cache?: CacheStore;
  /** Injectable for tests — defaults to a real BackendClient. */
  backend?: BackendClient;
  /** Injectable for tests — defaults to a real CheckoutBackendClient. */
  checkoutBackend?: CheckoutBackendClient;
  /** When true, the Event Pipeline uses an in-memory queue and never starts its background worker — set automatically by `buildTestServer`. */
  testMode?: boolean;
}

export async function buildServer(options: BuildServerOptions): Promise<FastifyInstance> {
  const { env } = options;

  const app = Fastify({
    // Request ID + structured Logging pipeline stages: Fastify's own
    // built-in pino logger, with a UUIDv7-shaped id (mirrors the real
    // backend's own DomainEvent::$eventId convention, API:CORRELATION
    // applied to this Gateway) rather than Fastify's default incrementing
    // counter — meaningful across restarts and safe to expose externally.
    genReqId: () => randomUUID(),
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } : undefined,
    },
    trustProxy: true,
  });

  // Every response carries its own request id, both for the caller's own
  // tracing and so a support conversation can reference one concrete
  // identifier — API:CORRELATION's requirement made literal at this layer.
  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Request-Id', request.id);
  });

  const services: GatewayServices = {
    env,
    cache: options.cache ?? createRedisCacheStore(env.REDIS_URL, env.REDIS_KEY_PREFIX, app.log),
    backend: options.backend ?? new BackendClient({ baseUrl: env.BACKEND_BASE_URL, serviceToken: env.BACKEND_SERVICE_TOKEN, logger: app.log }),
    checkoutBackend:
      options.checkoutBackend ?? new CheckoutBackendClient({ baseUrl: env.BACKEND_BASE_URL, serviceToken: env.BACKEND_CHECKOUT_SERVICE_TOKEN, logger: app.log }),
  };

  // --- Pipeline stages, in order ---
  registerTracingPlugin(app);
  await app.register(fastifyCookie);
  await registerSecurityPlugins(app, env);
  registerGuestSessionHook(app, env);
  registerPersonalizationPlugin(app, env);

  // --- Platform Services (Gateway Plugin Architecture — decorated capabilities, not per-request pipeline stages) ---
  registerFlagsPlugin(app);
  registerPreviewPlugin(app, env);
  if (options.testMode) {
    registerTestEventsPlugin(app, env);
  } else {
    registerEventsPlugin(app, { env });
  }
  registerRecommendationsPlugin(app, services.backend);

  await registerOpenApi(app);

  // Response Normalization for the failure path — every thrown error,
  // whether a GatewayError this Gateway raised itself or an unexpected
  // exception, is normalized to the same structured shape
  // (lib/errors.ts's GatewayErrorBody), never a raw stack trace or a bare
  // Fastify default error page reaching a caller.
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error.validation) {
      const gatewayError = GatewayError.validation(
        error.validation.map((issue) => {
          const missingProperty = (issue.params as Record<string, unknown> | undefined)?.['missingProperty'];
          const field = issue.instancePath || (typeof missingProperty === 'string' ? missingProperty : 'unknown');
          return { field, message: issue.message ?? 'Invalid value' };
        }),
      );
      reply.code(gatewayError.statusCode).send(gatewayError.toBody(request.id));
      return;
    }
    const gatewayError = toGatewayError(error);
    if (gatewayError.statusCode >= 500) {
      request.log.error({ err: error }, 'Unhandled Gateway error');
    } else {
      request.log.info({ err: error, code: gatewayError.code }, 'Gateway request rejected');
    }
    reply.code(gatewayError.statusCode).send(gatewayError.toBody(request.id));
  });

  app.setNotFoundHandler((request, reply) => {
    const gatewayError = GatewayError.notFound(`No route matches ${request.method} ${request.url}.`);
    reply.code(gatewayError.statusCode).send(gatewayError.toBody(request.id));
  });

  registerHealthRoutes(app, services); // unversioned — health/readiness/liveness are operational, not part of the public API surface API:VERSIONING governs

  registerVersionedRoutes(app, CURRENT_VERSION, (versionedApp, prefix) => {
    registerCatalogRoutes(versionedApp, services, prefix);
    registerBrandingRoutes(versionedApp, services, prefix);
    registerEventRoutes(versionedApp, prefix);
    registerRecommendationRoutes(versionedApp, prefix, env);
    registerPreviewRoutes(versionedApp, prefix);
    registerCheckoutRoutes(versionedApp, services.checkoutBackend, services.backend, prefix);
    registerOrderLookupRoutes(versionedApp, services.checkoutBackend, prefix);
  });

  app.addHook('onClose', async () => {
    await services.cache.close();
  });

  return app;
}

/** Test-only convenience: an app wired to fully in-memory dependencies, no real Redis/backend required. */
export async function buildTestServer(env: Env, backend: BackendClient, checkoutBackend: CheckoutBackendClient): Promise<FastifyInstance> {
  return buildServer({ env, backend, checkoutBackend, cache: createInMemoryCacheStore(), testMode: true });
}
