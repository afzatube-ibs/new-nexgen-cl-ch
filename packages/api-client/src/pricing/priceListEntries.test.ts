import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { createPriceListEntry, updatePriceListEntry, destroyPriceListEntry } from './priceListEntries.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('priceListEntries', () => {
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

  const entryDto = {
    id: 'e1',
    priceListId: 'pl1',
    sku: 'SKU-1',
    basePrice: '49.99',
    compareAtPrice: null,
    salePrice: null,
    saleStartsAt: null,
    saleEndsAt: null,
    isSaleActive: false,
    effectivePrice: '49.99',
    version: 1,
    createdAt: '2026-08-13T00:00:00Z',
    updatedAt: '2026-08-13T00:00:00Z',
  };

  it('createPriceListEntry() posts to the nested entries endpoint with exact snake_case fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: entryDto }, 201));

    await createPriceListEntry(client, 'pl1', { sku: 'SKU-1', basePrice: '49.99' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/price-lists/pl1/entries');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ sku: 'SKU-1', base_price: '49.99' });
  });

  it('updatePriceListEntry() patches the nested entry endpoint with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...entryDto, salePrice: '39.99' } }));

    await updatePriceListEntry(client, 'pl1', 'e1', { salePrice: '39.99', expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/price-lists/pl1/entries/e1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ sale_price: '39.99', expected_version: 1 });
  });

  it('destroyPriceListEntry() deletes the nested entry endpoint with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await destroyPriceListEntry(client, 'pl1', 'e1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/price-lists/pl1/entries/e1');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });
});
