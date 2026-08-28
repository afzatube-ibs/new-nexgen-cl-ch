import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, stubBackendFetch, testEnv } from './testUtils.js';

const UUID = '11111111-1111-1111-1111-111111111111';

describe('Platform Services routes (Slice 1.5)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('POST /v1/events', () => {
    it('accepts a valid event and returns 202 with the destinations it was queued for', async () => {
      const app = await buildTestApp(testEnv());
      const response = await app.inject({
        method: 'POST',
        url: '/v1/events',
        payload: { name: 'page_viewed', source: 'browser', properties: { path: '/' } },
      });
      expect(response.statusCode).toBe(202);
      const body = response.json();
      expect(body.data.eventId).toMatch(/^[0-9a-f-]{36}$/);
      // The Warehouse destination is always available (its own docblock:
      // "always configured — this is the platform's own fallback sink") —
      // it should always appear, even with zero real credentials configured.
      expect(body.data.queuedFor).toContain('warehouse');
      await app.close();
    });

    it('rejects an unknown event name with a structured 422', async () => {
      const app = await buildTestApp(testEnv());
      const response = await app.inject({ method: 'POST', url: '/v1/events', payload: { name: 'not_a_real_event', source: 'browser' } });
      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe('validation_failed');
      await app.close();
    });

    it('rejects an event whose properties fail their own schema', async () => {
      const app = await buildTestApp(testEnv());
      const response = await app.inject({
        method: 'POST',
        url: '/v1/events',
        payload: { name: 'product_viewed', source: 'browser', properties: { productId: 'not-a-uuid' } },
      });
      expect(response.statusCode).toBe(422);
      await app.close();
    });

    it('GET /v1/events/health reports the queue and destination state', async () => {
      const app = await buildTestApp(testEnv());
      const response = await app.inject({ method: 'GET', url: '/v1/events/health' });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.registeredDestinations).toEqual(expect.arrayContaining(['webhook', 'warehouse', 'meta-capi', 'ga4', 'tiktok-events']));
      expect(body.data.availableDestinations).toEqual(['warehouse']); // only the always-on fallback, no credentials configured in test env
      await app.close();
    });
  });

  describe('GET /v1/recommendations', () => {
    it('lists every real slot name', async () => {
      const app = await buildTestApp(testEnv());
      const response = await app.inject({ method: 'GET', url: '/v1/recommendations' });
      expect(response.json().data.slots).toEqual(['trending', 'related', 'recently-viewed', 'frequently-bought-together', 'recommended']);
      await app.close();
    });

    it('trending returns real Catalog products via the fallback engine, honestly labeled by engine id, with a real composed price', async () => {
      stubBackendFetch([
        { match: '/products', status: 200, body: { data: [{ id: UUID, brandId: null, sku: 'SKU-1', barcode: null, name: 'Widget', slug: 'widget', description: null, shortDescription: null, productType: 'simple', status: 'active', visibility: 'catalog_search', metaTitle: null, metaDescription: null, metaKeywords: null, metadata: null, publishedAt: null, images: [], version: 1, createdAt: null, updatedAt: null }] } },
        {
          match: 'pricing/lookup-many',
          status: 200,
          body: {
            data: [
              { id: '22222222-2222-2222-2222-222222222222', priceListId: '33333333-3333-3333-3333-333333333333', sku: 'SKU-1', basePrice: '25.0000', compareAtPrice: null, salePrice: null, saleStartsAt: null, saleEndsAt: null, isSaleActive: false, effectivePrice: '25.0000', version: 1, createdAt: null, updatedAt: null },
            ],
          },
        },
      ]);
      const app = await buildTestApp(testEnv());
      const response = await app.inject({ method: 'GET', url: '/v1/recommendations/trending' });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data[0].name).toBe('Widget');
      expect(body.data[0].price.effectivePrice).toBe('25.0000');
      expect(body.meta.engine).toBe('trending-fallback');
      await app.close();
    });

    it('recently-viewed returns an honest empty array (no view-history capability wired yet), never fabricated data', async () => {
      const app = await buildTestApp(testEnv());
      const response = await app.inject({ method: 'GET', url: '/v1/recommendations/recently-viewed' });
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toEqual([]);
      await app.close();
    });

    it('related requires productId and rejects its absence with a structured 422', async () => {
      const app = await buildTestApp(testEnv());
      const response = await app.inject({ method: 'GET', url: '/v1/recommendations/related' });
      expect(response.statusCode).toBe(422);
      await app.close();
    });
  });

  describe('Preview Framework', () => {
    it('mints a token and then successfully resolves it', async () => {
      const app = await buildTestApp(testEnv());
      const mintResponse = await app.inject({ method: 'POST', url: '/v1/preview/mint', payload: { kind: 'cms', targetId: 'page-1' } });
      expect(mintResponse.statusCode).toBe(200);
      const { token } = mintResponse.json().data;

      const resolveResponse = await app.inject({ method: 'GET', url: `/v1/preview/resolve?token=${encodeURIComponent(token)}` });
      expect(resolveResponse.statusCode).toBe(200);
      expect(resolveResponse.json().data.targetId).toBe('page-1');
      await app.close();
    });

    it('returns 410 for a tampered/invalid token', async () => {
      const app = await buildTestApp(testEnv());
      const response = await app.inject({ method: 'GET', url: '/v1/preview/resolve?token=not-a-real-token' });
      expect(response.statusCode).toBe(410);
      await app.close();
    });
  });

  describe('API Versioning', () => {
    it('every catalog route lives under /v1, and an unversioned path 404s', async () => {
      stubBackendFetch([{ match: '/categories', status: 200, body: { data: [] } }]);
      const app = await buildTestApp(testEnv());
      const versioned = await app.inject({ method: 'GET', url: '/v1/categories' });
      expect(versioned.statusCode).toBe(200);
      const unversioned = await app.inject({ method: 'GET', url: '/categories' });
      expect(unversioned.statusCode).toBe(404);
      await app.close();
    });
  });

  describe('Request Tracing', () => {
    it('mints a Trace ID when none is supplied, and echoes a caller-supplied one back unchanged', async () => {
      const app = await buildTestApp(testEnv());
      const fresh = await app.inject({ method: 'GET', url: '/health/live' });
      expect(fresh.headers['x-trace-id']).toBeTruthy();

      const withTrace = await app.inject({ method: 'GET', url: '/health/live', headers: { 'x-trace-id': 'caller-supplied-trace-id' } });
      expect(withTrace.headers['x-trace-id']).toBe('caller-supplied-trace-id');
      await app.close();
    });
  });
});
