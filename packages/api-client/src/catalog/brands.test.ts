import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { createBrand, updateBrand } from './brands.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('brands', () => {
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

  it('createBrand() maps camelCase input to the exact snake_case CreateBrandRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { id: '1', name: 'Acme', slug: 'acme', description: null, logoMediaId: null, logoUrl: null, metaTitle: null, metaDescription: null, status: 'active', version: 1, createdAt: null, updatedAt: null } }),
    );

    await createBrand(client, { name: 'Acme', slug: 'acme', metaTitle: 'Acme Inc.' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/brands');
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Acme',
      slug: 'acme',
      description: undefined,
      meta_title: 'Acme Inc.',
      meta_description: undefined,
    });
  });

  it('updateBrand() includes expected_version alongside the mapped fields', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { id: '1', name: 'Acme', slug: 'acme', description: null, logoMediaId: null, logoUrl: null, metaTitle: null, metaDescription: null, status: 'active', version: 2, createdAt: null, updatedAt: null } }),
    );

    await updateBrand(client, '1', { name: 'Acme Renamed', expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/brands/1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Acme Renamed',
      slug: undefined,
      description: undefined,
      meta_title: undefined,
      meta_description: undefined,
      expected_version: 1,
    });
  });
});
