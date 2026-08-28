import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, stubBackendFetch, testEnv } from './testUtils.js';

const UUID = '11111111-1111-1111-1111-111111111111';

describe('routes/catalog (integration — Category A, real backend response shapes stubbed at the network boundary)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /v1/categories returns the response envelope shape (data + meta.requestId), composed from the real CategoryResource shape', async () => {
    stubBackendFetch([
      {
        match: '/categories',
        status: 200,
        body: {
          data: [{ id: UUID, parentId: null, name: 'Shoes', slug: 'shoes', description: null, position: 1, metaTitle: null, metaDescription: null, status: 'active', version: 1, createdAt: null, updatedAt: null }],
          meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
        },
      },
    ]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/categories' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toEqual([{ id: UUID, name: 'Shoes', slug: 'shoes', description: null, image: null, parentId: null, position: 1 }]);
    expect(body.meta.requestId).toBeTruthy();
    expect(body.meta.pagination.total).toBe(1);
    await app.close();
  });

  it('sets a matching ETag and reports X-Cache-Status MISS then HIT on a repeated request', async () => {
    stubBackendFetch([{ match: '/brands', status: 200, body: { data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } } }]);
    const app = await buildTestApp(testEnv());

    const first = await app.inject({ method: 'GET', url: '/v1/brands' });
    expect(first.headers['x-cache-status']).toBe('MISS');
    expect(first.headers.etag).toBeTruthy();

    const second = await app.inject({ method: 'GET', url: '/v1/brands' });
    expect(second.headers['x-cache-status']).toBe('HIT');

    await app.close();
  });

  it('returns 304 when If-None-Match matches the current ETag', async () => {
    stubBackendFetch([{ match: '/brands', status: 200, body: { data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } } }]);
    const app = await buildTestApp(testEnv());

    const first = await app.inject({ method: 'GET', url: '/v1/brands' });
    const etag = first.headers.etag as string;

    const second = await app.inject({ method: 'GET', url: '/v1/brands', headers: { 'if-none-match': etag } });
    expect(second.statusCode).toBe(304);

    await app.close();
  });

  it('GET /v1/products/:id returns a clear, structured 501 for a slug-shaped identifier — never a confusing generic validation error (Slice 1.5: GATEWAY_SLUG_READINESS.md §5)', async () => {
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/products/not-a-uuid' });
    expect(response.statusCode).toBe(501);
    expect(response.json().error.message).toMatch(/slug/i);
    await app.close();
  });

  it('GET /v1/products/:id maps a real 404 from the backend to the Gateway’s own structured not_found error', async () => {
    stubBackendFetch([{ match: `/products/${UUID}`, status: 404, body: { message: 'not found' } }]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: `/v1/products/${UUID}` });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('not_found');
    await app.close();
  });

  it('GET /v1/products/:id never exposes a draft product publicly, even though the backend returned it (real data, wrong audience)', async () => {
    stubBackendFetch([
      {
        match: `/products/${UUID}`,
        status: 200,
        body: { data: baseProduct({ status: 'draft' }) },
      },
    ]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: `/v1/products/${UUID}` });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('GET /v1/products/:id returns a fully composed ProductDetail for a real active product, including a real composed price', async () => {
    stubBackendFetch([
      { match: `/products/${UUID}`, status: 200, body: { data: baseProduct({ status: 'active' }) } },
      { match: 'pricing/lookup-many', status: 200, body: { data: [priceListEntry({ sku: 'SKU-1' })] } },
    ]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: `/v1/products/${UUID}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.name).toBe('Widget');
    expect(response.json().data.price).toEqual({ currencyCode: 'USD', basePrice: '25.0000', compareAtPrice: null, salePrice: null, effectivePrice: '25.0000', isSaleActive: false });
    await app.close();
  });

  it('GET /v1/products/:id returns an honest null price when Pricing has no configured entry for this SKU', async () => {
    stubBackendFetch([
      { match: `/products/${UUID}`, status: 200, body: { data: baseProduct({ status: 'active' }) } },
      { match: 'pricing/lookup-many', status: 200, body: { data: [] } },
    ]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: `/v1/products/${UUID}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.price).toBeNull();
    await app.close();
  });

  it('GET /v1/collections lists real collection metadata (Beta Milestone 1 addition)', async () => {
    stubBackendFetch([
      {
        match: '/collections',
        status: 200,
        body: { data: [{ id: UUID, name: 'Summer Sale', slug: 'summer-sale', description: null, position: 1, status: 'active', version: 1 }], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 } },
      },
    ]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/collections' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data[0]).toEqual({ id: UUID, name: 'Summer Sale', slug: 'summer-sale', description: null });
    await app.close();
  });

  it('GET /v1/collections/:id returns a clear 501 for a slug-shaped identifier, same seam as products/categories/brands', async () => {
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/collections/not-a-uuid' });
    expect(response.statusCode).toBe(501);
    await app.close();
  });

  it('GET /v1/products lists real products and forwards category_id/brand_id filters to the real backend (Beta Milestone 1 addition)', async () => {
    stubBackendFetch([
      {
        match: '/products',
        status: 200,
        body: { data: [baseProduct({ name: 'Widget' })], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 } },
      },
      { match: 'pricing/lookup-many', status: 200, body: { data: [priceListEntry({ sku: 'SKU-1' })] } },
    ]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: `/v1/products?category_id=${UUID}&brand_id=${UUID}&sort=name&direction=asc` });
    expect(response.statusCode).toBe(200);
    expect(response.json().data[0].name).toBe('Widget');
    expect(response.json().data[0].price.effectivePrice).toBe('25.0000');
    expect(response.json().meta.pagination.total).toBe(1);

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain(`category_id=${UUID}`);
    expect(calledUrl).toContain(`brand_id=${UUID}`);
    expect(calledUrl).toContain('sort=name');
    expect(calledUrl).toContain('direction=asc');
    await app.close();
  });

  it('GET /v1/search maps the real ProductSearchResultResource shape (productId -> id, no slug/status field) and composes a real price', async () => {
    stubBackendFetch([
      {
        match: 'search/products',
        status: 200,
        body: { data: [{ productId: UUID, sku: 'SKU-1', name: 'Widget', brandId: null, publishedAt: null, relevanceScore: 3.1 }] },
      },
      { match: 'pricing/lookup-many', status: 200, body: { data: [priceListEntry({ sku: 'SKU-1' })] } },
    ]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/search?q=widget' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data[0]).toMatchObject({ id: UUID, name: 'Widget', sku: 'SKU-1', brandId: null, publishedAt: null, relevanceScore: 3.1 });
    expect(response.json().data[0].price.effectivePrice).toBe('25.0000');
    await app.close();
  });

  it('mints and sets a guest session cookie on first contact (CDP_ARCHITECTURE.md §3.1 Device Identity, guest-only per this slice)', async () => {
    stubBackendFetch([{ match: '/brands', status: 200, body: { data: [] } }]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/brands' });
    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toBeTruthy();
    expect(String(setCookie)).toContain('nx_did=');
    await app.close();
  });

  it('degrades gracefully (503 circuit_open) after the catalog circuit trips, without crashing the Gateway', async () => {
    stubBackendFetch([{ match: '/categories', status: 500, body: { message: 'boom' } }]);
    // A generous rate limit here — this test is isolating the circuit
    // breaker specifically (§3.2), not the rate limiter (§3.1, already
    // covered by test/security/security.test.ts); the default test
    // RATE_LIMIT_MAX would otherwise trip first on the 6th request below.
    const app = await buildTestApp(testEnv({ RATE_LIMIT_MAX: '50' }));

    for (let i = 0; i < 5; i += 1) {
      await app.inject({ method: 'GET', url: `/v1/categories?page=${i + 1}` }); // distinct cache keys so each hits the backend and records a failure
    }
    const tripped = await app.inject({ method: 'GET', url: '/v1/categories?page=999' });
    expect(tripped.statusCode).toBe(503);
    expect(tripped.json().error.code).toBe('circuit_open');

    await app.close();
  });
});

function priceListEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    priceListId: '33333333-3333-3333-3333-333333333333',
    sku: 'SKU-1',
    basePrice: '25.0000',
    compareAtPrice: null,
    salePrice: null,
    saleStartsAt: null,
    saleEndsAt: null,
    isSaleActive: false,
    effectivePrice: '25.0000',
    version: 1,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function baseProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID,
    brandId: null,
    sku: 'SKU-1',
    barcode: null,
    name: 'Widget',
    slug: 'widget',
    description: 'A real widget',
    shortDescription: null,
    productType: 'simple',
    status: 'active',
    visibility: 'catalog_search',
    metaTitle: null,
    metaDescription: null,
    metaKeywords: null,
    metadata: null,
    publishedAt: null,
    images: [],
    categories: [],
    version: 1,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}
