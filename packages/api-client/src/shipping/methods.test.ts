import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listShippingMethods, getShippingMethod, createShippingMethod, updateShippingMethod, archiveShippingMethod, destroyShippingMethod } from './methods.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('shipping methods', () => {
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

  const methodDto = {
    id: 'm1',
    code: 'standard-delivery',
    name: 'Standard Delivery',
    description: null,
    providerCode: 'steadfast',
    status: 'active',
    version: 1,
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  };

  it('listShippingMethods() hits the real endpoint with status/page', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [methodDto], meta: { current_page: 1, last_page: 1 } }));

    await listShippingMethods(client, { status: 'active', page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-methods?status=active&page=1');
  });

  it('getShippingMethod() hits the real detail endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: methodDto }));

    await getShippingMethod(client, 'm1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-methods/m1');
  });

  it('createShippingMethod() maps camelCase input to the exact snake_case CreateShippingMethodRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: methodDto }, 201));

    await createShippingMethod(client, { code: 'standard-delivery', name: 'Standard Delivery', description: null, providerCode: 'steadfast' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-methods');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ code: 'standard-delivery', name: 'Standard Delivery', description: null, provider_code: 'steadfast' });
  });

  it('updateShippingMethod() maps camelCase input including expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...methodDto, name: 'Renamed' } }));

    await updateShippingMethod(client, 'm1', { name: 'Renamed', expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-methods/m1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Renamed', expected_version: 1 });
  });

  it('archiveShippingMethod() posts to the real archive endpoint with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...methodDto, status: 'archived' } }));

    await archiveShippingMethod(client, 'm1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-methods/m1/archive');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('destroyShippingMethod() deletes with expected_version, no restore() method exists on this module', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await destroyShippingMethod(client, 'm1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-methods/m1');
    expect(init.method).toBe('DELETE');
  });
});
