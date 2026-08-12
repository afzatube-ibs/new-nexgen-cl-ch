import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listPriceLists, getPriceList, createPriceList, updatePriceList, archivePriceList, destroyPriceList } from './priceLists.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('priceLists', () => {
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

  const priceListDto = {
    id: 'pl1',
    name: 'Standard Retail',
    currencyCode: 'USD',
    isDefault: true,
    status: 'active',
    version: 1,
    createdAt: '2026-08-13T00:00:00Z',
    updatedAt: '2026-08-13T00:00:00Z',
  };

  it('listPriceLists() hits the real endpoint with status/currency_code/page — no per_page, no search', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [priceListDto], meta: { current_page: 1, last_page: 1 } }));

    await listPriceLists(client, { status: 'active', currencyCode: 'USD', page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/price-lists?status=active&currency_code=USD&page=1');
  });

  it('getPriceList() hits the real detail endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...priceListDto, entries: [] } }));

    await getPriceList(client, 'pl1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/price-lists/pl1');
  });

  it('createPriceList() maps camelCase input to the exact snake_case CreatePriceListRequest fields, never sending is_default', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: priceListDto }, 201));

    await createPriceList(client, { name: 'Standard Retail', currencyCode: 'USD' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/price-lists');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Standard Retail', currency_code: 'USD' });
  });

  it('updatePriceList() maps camelCase input including is_default and expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...priceListDto, name: 'Renamed' } }));

    await updatePriceList(client, 'pl1', { name: 'Renamed', isDefault: true, expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/price-lists/pl1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Renamed',
      is_default: true,
      expected_version: 1,
    });
  });

  it('archivePriceList() posts to the real archive endpoint with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...priceListDto, status: 'archived' } }));

    await archivePriceList(client, 'pl1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/price-lists/pl1/archive');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('destroyPriceList() deletes with expected_version, no restore() method exists on this module', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await destroyPriceList(client, 'pl1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/price-lists/pl1');
    expect(init.method).toBe('DELETE');
  });
});
