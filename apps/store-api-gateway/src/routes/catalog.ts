import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { GatewayServices } from '../server.js';
import { serveCacheable, buildCacheKey } from '../lib/cacheHelper.js';
import { resolveLocale, resolveCurrency, resolveStore } from '../context/localization.js';
import { toGatewayError, GatewayError } from '../lib/errors.js';
import { resolveIdentifierKind } from '../backend/identifier.js';
import { fetchComposedAvailability } from '../composition/availability.js';
import { fetchComposedPrices } from '../composition/pricing.js';
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
const localeQuerySchema = z.object({ locale: z.string().optional(), currency: z.string().optional() });
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
  collection_id: z.string().uuid().optional(),
  sort: z.enum(['name', 'sku', 'created_at', 'published_at']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

function assertUuidSupported(identifier: string, entityName: string): void {
  if (resolveIdentifierKind(identifier) === 'slug') {
    throw new GatewayError(
      501,
      'upstream_unavailable',
      `Looking up a ${entityName} by slug is not yet supported — use the real ${entityName} id instead.`,
    );
  }
}

function pagination(response: { data: unknown[]; meta?: Record<string, number | undefined> }) {
  if (!response.meta) return undefined;
  return {
    currentPage: response.meta.current_page ?? response.meta.currentPage ?? 1,
    lastPage: response.meta.last_page ?? response.meta.lastPage ?? 1,
    perPage: response.meta.per_page ?? response.meta.perPage ?? response.data.length,
    total: response.meta.total ?? response.data.length,
  };
}

export function registerCatalogRoutes(app: FastifyInstance, services: GatewayServices, prefix: string): void {
  const { env, backend, cache } = services;

  function context(
    request: { query: { locale?: string; currency?: string } },
    hostHeader: string | undefined,
    acceptLanguage: string | undefined,
  ) {
    return {
      store: resolveStore(hostHeader),
      locale: resolveLocale(env, request.query.locale, acceptLanguage),
      currency: resolveCurrency(env, request.query.currency),
    };
  }

  app.get(`${prefix}/homepage`, async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey('homepage', { locale: ctx.locale, currency: ctx.currency, store: ctx.store });

    await serveCacheable(
      request,
      reply,
      cache,
      {
        key: cacheKey,
        ttlSeconds: 120,
        staleWhileRevalidateSeconds: 300,
        browserMaxAgeSeconds: 60,
        tags: ['catalog:categories', 'catalog:brands', 'catalog:products'],
      },
      async () => {
        try {
          const [categories, brands, products] = await Promise.all([
            backend.getList<BackendCategory>({ module: 'catalog', path: 'categories', query: { status: 'active', per_page: 8 }, correlationId: request.id }),
            backend.getList<BackendBrand>({ module: 'catalog', path: 'brands', query: { status: 'active', per_page: 8 }, correlationId: request.id }),
            backend.getList<BackendProduct>({
              module: 'catalog',
              path: 'products',
              query: { status: 'active', visibility: 'catalog_search', sort: 'published_at', direction: 'desc', per_page: 12 },
              correlationId: request.id,
            }),
          ]);
          const skus = products.data.map((product) => product.sku);
          const [prices, availability] = await Promise.all([
            fetchComposedPrices(backend, skus, ctx.currency, request.id, request.log),
            fetchComposedAvailability(backend, skus, request.id, request.log),
          ]);

          return {
            data: {
              categories: categories.data.map(toCategorySummary),
              brands: brands.data.map(toBrandSummary),
              products: products.data.map((product) =>
                toProductSummary(
                  product,
                  prices.get(product.sku.toUpperCase()) ?? null,
                  availability.get(product.sku.toUpperCase()) ?? null,
                ),
              ),
            },
          };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

  app.get(`${prefix}/categories`, async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey('categories', { ...query, locale: ctx.locale });

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 300, staleWhileRevalidateSeconds: 600, browserMaxAgeSeconds: 120, tags: ['catalog:categories'] },
      async () => {
        try {
          const response = await backend.getList<BackendCategory>({
            module: 'catalog',
            path: 'categories',
            query: { status: 'active', page: query.page, per_page: query.per_page },
            correlationId: request.id,
          });
          return { data: response.data.map(toCategorySummary), pagination: pagination(response) };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

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

  app.get(`${prefix}/brands`, async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey('brands', { ...query, locale: ctx.locale });

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 300, staleWhileRevalidateSeconds: 600, browserMaxAgeSeconds: 120, tags: ['catalog:brands'] },
      async () => {
        try {
          const response = await backend.getList<BackendBrand>({
            module: 'catalog',
            path: 'brands',
            query: { status: 'active', page: query.page, per_page: query.per_page },
            correlationId: request.id,
          });
          return { data: response.data.map(toBrandSummary), pagination: pagination(response) };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

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

  app.get(`${prefix}/collections`, async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey('collections', { ...query, locale: ctx.locale });

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 300, staleWhileRevalidateSeconds: 600, browserMaxAgeSeconds: 120, tags: ['catalog:collections'] },
      async () => {
        try {
          const response = await backend.getList<BackendCollection>({
            module: 'catalog',
            path: 'collections',
            query: { status: 'active', page: query.page, per_page: query.per_page },
            correlationId: request.id,
          });
          return { data: response.data.map(toCollectionSummary), pagination: pagination(response) };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

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

  app.get(`${prefix}/products`, async (request, reply) => {
    const query = productListQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey('products', { ...query, locale: ctx.locale, currency: ctx.currency });
    const tags = ['catalog:products'];
    if (query.category_id) tags.push(`catalog:category:${query.category_id}`);
    if (query.brand_id) tags.push(`catalog:brand:${query.brand_id}`);
    if (query.collection_id) tags.push(`catalog:collection:${query.collection_id}`);

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 180, staleWhileRevalidateSeconds: 420, browserMaxAgeSeconds: 60, tags },
      async () => {
        try {
          const response = await backend.getList<BackendProduct>({
            module: 'catalog',
            path: 'products',
            query: {
              status: 'active',
              visibility: 'catalog_search',
              category_id: query.category_id,
              brand_id: query.brand_id,
              collection_id: query.collection_id,
              sort: query.sort ?? 'published_at',
              direction: query.direction ?? 'desc',
              page: query.page,
              per_page: query.per_page,
            },
            correlationId: request.id,
          });
          const skus = response.data.map((product) => product.sku);
          const [prices, availability] = await Promise.all([
            fetchComposedPrices(backend, skus, ctx.currency, request.id, request.log),
            fetchComposedAvailability(backend, skus, request.id, request.log),
          ]);

          return {
            data: response.data.map((product) =>
              toProductSummary(
                product,
                prices.get(product.sku.toUpperCase()) ?? null,
                availability.get(product.sku.toUpperCase()) ?? null,
              ),
            ),
            pagination: pagination(response),
          };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

  app.get(`${prefix}/products/:id`, async (request, reply) => {
    const params = identifierParamSchema.parse(request.params);
    assertUuidSupported(params.id, 'product');
    const query = localeQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey(`products/${params.id}`, { currency: ctx.currency });

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 180, staleWhileRevalidateSeconds: 420, browserMaxAgeSeconds: 60, tags: ['catalog:products', `catalog:product:${params.id}`] },
      async () => {
        try {
          const response = await backend.getItem<BackendProduct>({ module: 'catalog', path: `products/${params.id}`, correlationId: request.id });
          if (response.data.status !== 'active') throw GatewayError.notFound();

          const sku = response.data.sku;
          const [prices, availability] = await Promise.all([
            fetchComposedPrices(backend, [sku], ctx.currency, request.id, request.log),
            fetchComposedAvailability(backend, [sku], request.id, request.log),
          ]);
          return {
            data: toProductDetail(
              response.data,
              prices.get(sku.toUpperCase()) ?? null,
              availability.get(sku.toUpperCase()) ?? null,
            ),
          };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });

  app.get(`${prefix}/search`, async (request, reply) => {
    const query = searchQuerySchema.parse(request.query);
    const ctx = context({ query }, request.headers.host, request.headers['accept-language']);
    const cacheKey = buildCacheKey('search', { q: query.q, brand_id: query.brand_id, page: query.page, currency: ctx.currency });

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 60, staleWhileRevalidateSeconds: 120, browserMaxAgeSeconds: 30, tags: ['catalog:products', 'search'] },
      async () => {
        try {
          const response = await backend.getList<BackendSearchResult>({
            module: 'search',
            path: 'search/products',
            query: { q: query.q, brand_id: query.brand_id, page: query.page },
            correlationId: request.id,
          });
          const skus = response.data.map((result) => result.sku);
          const [prices, availability] = await Promise.all([
            fetchComposedPrices(backend, skus, ctx.currency, request.id, request.log),
            fetchComposedAvailability(backend, skus, request.id, request.log),
          ]);

          return {
            data: response.data.map((result) =>
              toSearchResultSummary(
                result,
                prices.get(result.sku.toUpperCase()) ?? null,
                availability.get(result.sku.toUpperCase()) ?? null,
              ),
            ),
            pagination: pagination(response),
          };
        } catch (error) {
          throw toGatewayError(error);
        }
      },
    );
  });
}
