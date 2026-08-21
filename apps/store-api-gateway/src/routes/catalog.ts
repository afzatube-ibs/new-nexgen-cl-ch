/**
 * Public Catalog APIs — read-only, per this slice's own scope. Every
 * handler: resolves locale/currency/store (Localization stage), builds a
 * deterministic cache key, and serves through `serveCacheable` (Cache
 * stage, now with real stale-while-revalidate — Slice 1.5), which calls
 * the real backend via `services.backend` only on a miss (Forward stage).
 * Response Normalization is `serveCacheable`'s own `envelope()` call —
 * every route returns the identical `{ data, meta }` shape, per
 * API:RESPONSE_ENVELOPE.
 *
 * "Gateway performs composition only" (this slice's own Rule): every
 * field returned here traces directly to a real backend response via
 * composition/mappers.ts — nothing is computed, priced, or invented.
 */
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { GatewayServices } from '../server.js';
import { serveCacheable, buildCacheKey } from '../lib/cacheHelper.js';
import { resolveLocale, resolveCurrency, resolveStore } from '../context/localization.js';
import { toGatewayError, GatewayError } from '../lib/errors.js';
import { resolveIdentifierKind } from '../backend/identifier.js';
import {
  toBrandSummary,
  toCategorySummary,
  toCollectionSummary,
  toProductDetail,
  toProductSummary,
  toSearchResultSummary,
} from '../composition/mappers.js';
import type { BackendBrand, BackendCategory, BackendCollection, BackendProduct, BackendSearchResult } from '../backend/types.js';

const identifierParamSchema = z.object({ id: z.string().min(1).max(255) });
const localeQuerySchema = z.object({
  locale: z.string().optional(),
  currency: z.string().optional(),
});
const listQuerySchema = localeQuerySchema.extend({
  page: z.coerce.number().int().positive().optional(),
  per_page: z.coerce.number().int().positive().max(100).optional(),
});
const searchQuerySchema = localeQuerySchema.extend({
  q: z.string().max(255).optional(),
  brand_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
});
const productListQuerySchema = listQuerySchema.extend({
  category_id: z.string().uuid().optional(),
  brand_id: z.string().uuid().optional(),
  sort: z.enum(['name', 'sku', 'created_at', 'published_at']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

/**
 * Every product/category/brand detail route calls this first —
 * GATEWAY_SLUG_READINESS.md §5's own prepared seam. A slug-shaped
 * identifier gets one clear, honest, actionable error today; the day the
 * backend gains a `?slug=` filter (that document's §3 Option A), this one
 * function's `slug` branch becomes a real fetch instead of an error —
 * no route/caching/composition code changes.
 */
function assertUuidSupported(identifier: string, entityName: string): void {
  if (resolveIdentifierKind(identifier) === 'slug') {
    throw new GatewayError(
      501,
      'upstream_unavailable',
      `Looking up a ${entityName} by slug is not yet supported — the real backend has no slug lookup today. See planning/architecture/GATEWAY_SLUG_READINESS.md. Use the real ${entityName} id instead.`,
    );
  }
}

export function registerCatalogRoutes(app: FastifyInstance, services: GatewayServices, prefix: string): void {
  const { env, backend, cache } = services;

  function context(request: { query: { locale?: string; currency?: string } }, hostHeader: string | undefined, acceptLanguage: string | undefined) {
    return {
      store: resolveStore(hostHeader),
      locale: resolveLocale(env, request.query.locale, acceptLanguage),
      currency: resolveCurrency(env, request.query.currency),
    };
  }

  // --- GET /homepage — composed convenience read (§ docblock: no real backend "homepage" concept exists yet, absent real CMS; this is an honest composition of existing Catalog lists, not a fabricated capability) ---
  app.get(`${prefix}/homepage`, async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey('homepage', { locale: ctx.locale, currency: ctx.currency, store: ctx.store });

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 120, staleWhileRevalidateSeconds: 300, browserMaxAgeSeconds: 60, tags: ['catalog:categories', 'catalog:brands', 'catalog:products'] },
      async () => {
        try {
          const [categories, brands, products] = await Promise.all([
            backend.getList<BackendCategory>({ module: 'catalog', path: 'categories', query: { status: 'active', per_page: 8 }, correlationId: request.id }),
            backend.getList<BackendBrand>({ module: 'catalog', path: 'brands', query: { status: 'active', per_page: 8 }, correlationId: request.id }),
            backend.getList<BackendProduct>({ module: 'catalog', path: 'products', query: { status: 'active', visibility: 'catalog_search', sort: 'published_at', direction: 'desc', per_page: 12 }, correlationId: request.id }),
          ]);
          return {
            data: {
              categories: categories.data.map(toCategorySummary),
              brands: brands.data.map(toBrandSummary),
              products: products.data.map(toProductSummary),
            },
          };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

  // --- GET /categories ---
  app.get(`${prefix}/categories`, async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey('categories', { ...query, locale: ctx.locale });

    await serveCacheable(request, reply, cache, { key: cacheKey, ttlSeconds: 300, staleWhileRevalidateSeconds: 600, browserMaxAgeSeconds: 120, tags: ['catalog:categories'] }, async () => {
      try {
        const response = await backend.getList<BackendCategory>({
          module: 'catalog',
          path: 'categories',
          query: { status: 'active', page: query.page, per_page: query.per_page },
          correlationId: request.id,
        });
        return {
          data: response.data.map(toCategorySummary),
          pagination: response.meta
            ? {
                currentPage: response.meta.current_page ?? response.meta.currentPage ?? 1,
                lastPage: response.meta.last_page ?? response.meta.lastPage ?? 1,
                perPage: response.meta.per_page ?? response.meta.perPage ?? response.data.length,
                total: response.meta.total ?? response.data.length,
              }
            : undefined,
        };
      } catch (error) {
        throw toGatewayError(error);
      }
    });
  });

  // --- GET /categories/:id ---
  app.get(`${prefix}/categories/:id`, async (request, reply) => {
    const params = identifierParamSchema.parse(request.params);
    assertUuidSupported(params.id, 'category');
    const query = localeQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey(`categories/${params.id}`, { locale: ctx.locale });

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 300, staleWhileRevalidateSeconds: 600, browserMaxAgeSeconds: 120, tags: ['catalog:categories', `catalog:category:${params.id}`] },
      async () => {
        try {
          const response = await backend.getItem<BackendCategory>({ module: 'catalog', path: `categories/${params.id}`, correlationId: request.id });
          return { data: toCategorySummary(response.data) };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

  // --- GET /brands ---
  app.get(`${prefix}/brands`, async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey('brands', { ...query, locale: ctx.locale });

    await serveCacheable(request, reply, cache, { key: cacheKey, ttlSeconds: 300, staleWhileRevalidateSeconds: 600, browserMaxAgeSeconds: 120, tags: ['catalog:brands'] }, async () => {
      try {
        const response = await backend.getList<BackendBrand>({
          module: 'catalog',
          path: 'brands',
          query: { status: 'active', page: query.page, per_page: query.per_page },
          correlationId: request.id,
        });
        return {
          data: response.data.map(toBrandSummary),
          pagination: response.meta
            ? {
                currentPage: response.meta.current_page ?? response.meta.currentPage ?? 1,
                lastPage: response.meta.last_page ?? response.meta.lastPage ?? 1,
                perPage: response.meta.per_page ?? response.meta.perPage ?? response.data.length,
                total: response.meta.total ?? response.data.length,
              }
            : undefined,
        };
      } catch (error) {
        throw toGatewayError(error);
      }
    });
  });

  // --- GET /brands/:id ---
  app.get(`${prefix}/brands/:id`, async (request, reply) => {
    const params = identifierParamSchema.parse(request.params);
    assertUuidSupported(params.id, 'brand');
    const cacheKey = buildCacheKey(`brands/${params.id}`, {});

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 300, staleWhileRevalidateSeconds: 600, browserMaxAgeSeconds: 120, tags: ['catalog:brands', `catalog:brand:${params.id}`] },
      async () => {
        try {
          const response = await backend.getItem<BackendBrand>({ module: 'catalog', path: `brands/${params.id}`, correlationId: request.id });
          return { data: toBrandSummary(response.data) };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

  // --- GET /collections — real metadata only; see composition/mappers.ts
  // docblock on CollectionSummary for why member products can't be listed
  // through this Gateway yet (Beta Milestone 1 finding, not fixed here). ---
  app.get(`${prefix}/collections`, async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey('collections', { ...query, locale: ctx.locale });

    await serveCacheable(request, reply, cache, { key: cacheKey, ttlSeconds: 300, staleWhileRevalidateSeconds: 600, browserMaxAgeSeconds: 120, tags: ['catalog:collections'] }, async () => {
      try {
        const response = await backend.getList<BackendCollection>({
          module: 'catalog',
          path: 'collections',
          query: { status: 'active', page: query.page, per_page: query.per_page },
          correlationId: request.id,
        });
        return {
          data: response.data.map(toCollectionSummary),
          pagination: response.meta
            ? {
                currentPage: response.meta.current_page ?? response.meta.currentPage ?? 1,
                lastPage: response.meta.last_page ?? response.meta.lastPage ?? 1,
                perPage: response.meta.per_page ?? response.meta.perPage ?? response.data.length,
                total: response.meta.total ?? response.data.length,
              }
            : undefined,
        };
      } catch (error) {
        throw toGatewayError(error);
      }
    });
  });

  // --- GET /collections/:id ---
  app.get(`${prefix}/collections/:id`, async (request, reply) => {
    const params = identifierParamSchema.parse(request.params);
    assertUuidSupported(params.id, 'collection');
    const cacheKey = buildCacheKey(`collections/${params.id}`, {});

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 300, staleWhileRevalidateSeconds: 600, browserMaxAgeSeconds: 120, tags: ['catalog:collections', `catalog:collection:${params.id}`] },
      async () => {
        try {
          const response = await backend.getItem<BackendCollection>({ module: 'catalog', path: `collections/${params.id}`, correlationId: request.id });
          return { data: toCollectionSummary(response.data) };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

  // --- GET /products — list, filterable by category_id/brand_id ---
  // Added for Beta Milestone 1 (Storefront Foundation): Category/Brand
  // listing pages need a real "products in this category/brand" read, and
  // none existed — Slice 1 only built /products/:id (detail) plus
  // /homepage's own curated composition and /search. This is a genuine,
  // additive completion of the Gateway's own already-intended public
  // Catalog surface (STORE_API_GATEWAY_ARCHITECTURE.md §1), not a new
  // capability: the real backend's ProductController::index() already
  // supports every filter below (confirmed by direct code read) — the
  // Gateway was simply never asked to expose a list route for it yet.
  app.get(`${prefix}/products`, async (request, reply) => {
    const query = productListQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey('products', { ...query, locale: ctx.locale });

    const tags = ['catalog:products'];
    if (query.category_id) tags.push(`catalog:category:${query.category_id}`);
    if (query.brand_id) tags.push(`catalog:brand:${query.brand_id}`);

    await serveCacheable(request, reply, cache, { key: cacheKey, ttlSeconds: 180, staleWhileRevalidateSeconds: 420, browserMaxAgeSeconds: 60, tags }, async () => {
      try {
        const response = await backend.getList<BackendProduct>({
          module: 'catalog',
          path: 'products',
          query: {
            status: 'active',
            visibility: 'catalog_search',
            category_id: query.category_id,
            brand_id: query.brand_id,
            sort: query.sort ?? 'published_at',
            direction: query.direction ?? 'desc',
            page: query.page,
            per_page: query.per_page,
          },
          correlationId: request.id,
        });
        return {
          data: response.data.map(toProductSummary),
          pagination: response.meta
            ? {
                currentPage: response.meta.current_page ?? response.meta.currentPage ?? 1,
                lastPage: response.meta.last_page ?? response.meta.lastPage ?? 1,
                perPage: response.meta.per_page ?? response.meta.perPage ?? response.data.length,
                total: response.meta.total ?? response.data.length,
              }
            : undefined,
        };
      } catch (error) {
        throw toGatewayError(error);
      }
    });
  });

  // --- GET /products/:id ---
  // NOTE (found Slice 1, deepened in GATEWAY_SLUG_READINESS.md): the real
  // Catalog backend has no slug-based lookup — only UUID `show()`. A
  // slug-shaped identifier here gets a clear 501, per `assertUuidSupported`
  // above, never a confusing generic validation error.
  app.get(`${prefix}/products/:id`, async (request, reply) => {
    const params = identifierParamSchema.parse(request.params);
    assertUuidSupported(params.id, 'product');
    const cacheKey = buildCacheKey(`products/${params.id}`, {});

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 180, staleWhileRevalidateSeconds: 420, browserMaxAgeSeconds: 60, tags: ['catalog:products', `catalog:product:${params.id}`] },
      async () => {
        try {
          const response = await backend.getItem<BackendProduct>({ module: 'catalog', path: `products/${params.id}`, correlationId: request.id });
          if (response.data.status !== 'active') {
            // A draft/archived product is real backend data, but never a
            // legitimate public-storefront response — the same "results
            // filtered to what a caller may lawfully see" rule
            // SEARCH_ARCHITECTURE.md §1 already confirms Search enforces,
            // applied here at the Gateway layer for direct product reads.
            throw GatewayError.notFound();
          }
          return { data: toProductDetail(response.data) };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

  // --- GET /search ---
  app.get(`${prefix}/search`, async (request, reply) => {
    const query = searchQuerySchema.parse(request.query);
    const cacheKey = buildCacheKey('search', { q: query.q, brand_id: query.brand_id, page: query.page });

    await serveCacheable(request, reply, cache, { key: cacheKey, ttlSeconds: 60, staleWhileRevalidateSeconds: 120, browserMaxAgeSeconds: 30, tags: ['catalog:products', 'search'] }, async () => {
      try {
        const response = await backend.getList<BackendSearchResult>({
          module: 'search',
          path: 'search/products',
          query: { q: query.q, brand_id: query.brand_id, page: query.page },
          correlationId: request.id,
        });
        return {
          data: response.data.map(toSearchResultSummary),
          pagination: response.meta
            ? {
                currentPage: response.meta.current_page ?? response.meta.currentPage ?? 1,
                lastPage: response.meta.last_page ?? response.meta.lastPage ?? 1,
                perPage: response.meta.per_page ?? response.meta.perPage ?? response.data.length,
                total: response.meta.total ?? response.data.length,
              }
            : undefined,
        };
      } catch (error) {
        throw toGatewayError(error);
      }
    });
  });
}
