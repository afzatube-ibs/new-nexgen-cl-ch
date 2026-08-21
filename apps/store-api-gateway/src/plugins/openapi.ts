/**
 * OpenAPI documentation — "Generate public API documentation," this
 * slice's own explicit requirement, and the Gateway-layer application of
 * API:DOCUMENTATION's already-Accepted platform-wide rule ("a capability
 * with no OpenAPI entry does not exist as far as any consumer or reviewer
 * is concerned"). Served at /docs (interactive UI) and /docs/json (raw
 * spec) — never bundled into a route file, so every route file stays
 * focused on its own request/response logic.
 */
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

export async function registerOpenApi(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'neXgen Store API Gateway',
        description:
          'The ONLY public interface the future Storefront calls (STORE_API_GATEWAY_ARCHITECTURE.md). Read-only, Category-A catalog/search composition — no cart, checkout, or customer identity in this slice.',
        version: '0.1.0',
      },
      tags: [
        { name: 'health', description: 'Health, readiness, and liveness probes' },
        { name: 'catalog', description: 'Public, read-only Catalog composition (homepage, categories, brands, products, search)' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });
}
