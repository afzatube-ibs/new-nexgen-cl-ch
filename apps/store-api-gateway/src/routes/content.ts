import type { FastifyInstance } from 'fastify';
import type { GatewayServices } from '../server.js';
import { buildCacheKey, serveCacheable } from '../lib/cacheHelper.js';
import { GatewayError, toGatewayError } from '../lib/errors.js';

interface BackendStoreListItem {
  id: string;
}

export interface PublishedContentPage {
  id: string;
  slug: string;
  title: string;
  locale: string;
  content: Array<{ type: string; configuration: Record<string, unknown>; key?: string | null }>;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
}

async function resolveStoreId(services: GatewayServices, correlationId: string): Promise<string> {
  const stores = await services.backend.getList<BackendStoreListItem>({ module: 'cms', path: 'stores', correlationId });
  const store = stores.data[0];
  if (!store) throw GatewayError.notFound('No store is configured.');
  return store.id;
}

/**
 * Customer-facing CMS read boundary. Resolves the same active store as
 * Branding, then asks MODULE:CMS only for its published snapshots using the
 * storefront-service's narrow `cms.published.view` permission. Draft CMS
 * endpoints are never called by this Gateway.
 */
export function registerContentRoutes(app: FastifyInstance, services: GatewayServices, prefix: string): void {
  const { backend, cache } = services;

  app.get<{ Querystring: { locale?: string } }>(`${prefix}/content/pages`, async (request, reply) => {
    const locale = request.query.locale;
    const cacheKey = buildCacheKey('content-pages', { locale });

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 60, staleWhileRevalidateSeconds: 300, browserMaxAgeSeconds: 30, tags: ['cms'] },
      async () => {
        try {
          const storeId = await resolveStoreId(services, request.id);
          const pages = await backend.getList<PublishedContentPage>({
            module: 'cms',
            path: `stores/${storeId}/cms/published`,
            query: { locale },
            correlationId: request.id,
          });
          return { data: pages.data };
        } catch (error) {
          if (error instanceof GatewayError) throw error;
          throw toGatewayError(error, 'cms');
        }
      },
    );
  });

  app.get<{ Params: { slug: string }; Querystring: { locale?: string } }>(`${prefix}/content/pages/:slug`, async (request, reply) => {
    const { slug } = request.params;
    const locale = request.query.locale;
    const cacheKey = buildCacheKey('content-page', { slug, locale });

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 60, staleWhileRevalidateSeconds: 300, browserMaxAgeSeconds: 30, tags: ['cms', `cms:page:${slug}`] },
      async () => {
        try {
          const storeId = await resolveStoreId(services, request.id);
          const page = await backend.getItem<PublishedContentPage>({
            module: 'cms',
            path: `stores/${storeId}/cms/published/${encodeURIComponent(slug)}`,
            query: { locale },
            correlationId: request.id,
          });
          return { data: page.data };
        } catch (error) {
          if (error instanceof GatewayError) throw error;
          throw toGatewayError(error, 'cms');
        }
      },
    );
  });
}
