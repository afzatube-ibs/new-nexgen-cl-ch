import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { createProduct, publishProduct, listProducts } from './products.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const fakeProduct = {
  id: '1',
  brandId: null,
  sku: 'SKU-1',
  barcode: null,
  name: 'Widget',
  slug: 'widget',
  description: null,
  shortDescription: null,
  productType: 'simple',
  status: 'draft',
  visibility: 'catalog_search',
  metaTitle: null,
  metaDescription: null,
  metaKeywords: null,
  metadata: null,
  publishedAt: null,
  version: 1,
  createdAt: null,
  updatedAt: null,
};

describe('products', () => {
  const fetchMock = vi.fn();
  let client: ApiClient;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createProduct() maps camelCase input to the exact snake_case CreateProductRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: fakeProduct }));

    await createProduct(client, { sku: 'SKU-1', name: 'Widget', productType: 'simple' });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init.body as string)).toMatchObject({ sku: 'SKU-1', name: 'Widget', product_type: 'simple' });
  });

  it('publishProduct() POSTs /products/{id}/publish with expected_version and unwraps `data`', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...fakeProduct, status: 'active' } }));

    const result = await publishProduct(client, '1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/products/1/publish');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
    expect(result.status).toBe('active');
  });

  it('listProducts() maps camelCase query fields to the real snake_case query params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await listProducts(client, { brandId: 'b1', categoryId: 'c1', perPage: 25 });

    const [url] = fetchMock.mock.calls[0]!;
    const parsed = new URL(url as string);
    expect(parsed.searchParams.get('brand_id')).toBe('b1');
    expect(parsed.searchParams.get('category_id')).toBe('c1');
    expect(parsed.searchParams.get('per_page')).toBe('25');
  });
});
