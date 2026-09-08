import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, stubBackendFetch, testEnv } from './testUtils.js';

const UUID = '11111111-1111-1111-1111-111111111111';

function product() {
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
  };
}

describe('Catalog Inventory composition', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('exposes Inventory-owned availability on a real product detail response', async () => {
    stubBackendFetch([
      { match: `/products/${UUID}`, status: 200, body: { data: product() } },
      { match: 'pricing/lookup-many', status: 200, body: { data: [] } },
      {
        match: 'inventory/availability-many',
        status: 200,
        body: { data: [{ sku: 'SKU-1', totalAvailable: 7, isAvailable: true }] },
      },
    ]);

    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: `/v1/products/${UUID}` });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.availability).toEqual({ isAvailable: true });
    await app.close();
  });

  it('preserves a real out-of-stock result instead of inferring from active catalog status', async () => {
    stubBackendFetch([
      { match: `/products/${UUID}`, status: 200, body: { data: product() } },
      { match: 'pricing/lookup-many', status: 200, body: { data: [] } },
      {
        match: 'inventory/availability-many',
        status: 200,
        body: { data: [{ sku: 'SKU-1', totalAvailable: 0, isAvailable: false }] },
      },
    ]);

    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: `/v1/products/${UUID}` });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe('active');
    expect(response.json().data.availability).toEqual({ isAvailable: false });
    await app.close();
  });

  it('fails open to unknown availability when Inventory is unavailable', async () => {
    stubBackendFetch([
      { match: `/products/${UUID}`, status: 200, body: { data: product() } },
      { match: 'pricing/lookup-many', status: 200, body: { data: [] } },
      { match: 'inventory/availability-many', status: 503, body: { message: 'inventory unavailable' } },
    ]);

    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: `/v1/products/${UUID}` });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.availability).toBeNull();
    await app.close();
  });
});
