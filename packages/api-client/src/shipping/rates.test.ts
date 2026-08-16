import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listShippingRates, getShippingRate, createShippingRate, updateShippingRate, archiveShippingRate, destroyShippingRate } from './rates.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('shipping rates', () => {
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

  const rateDto = {
    id: 'r1',
    shippingZoneId: 'z1',
    shippingMethodId: 'm1',
    minWeightGrams: 0,
    maxWeightGrams: 500,
    amount: '60.0000',
    currencyCode: 'BDT',
    status: 'active',
    version: 1,
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  };

  it('listShippingRates() hits the real endpoint with status/shipping_zone_id/shipping_method_id/page', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [rateDto], meta: { current_page: 1, last_page: 1 } }));

    await listShippingRates(client, { status: 'active', shippingZoneId: 'z1', shippingMethodId: 'm1', page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-rates?status=active&shipping_zone_id=z1&shipping_method_id=m1&page=1');
  });

  it('getShippingRate() hits the real detail endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: rateDto }));

    await getShippingRate(client, 'r1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-rates/r1');
  });

  it('createShippingRate() maps camelCase input to the exact snake_case CreateShippingRateRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: rateDto }, 201));

    await createShippingRate(client, { shippingZoneId: 'z1', shippingMethodId: 'm1', minWeightGrams: 0, maxWeightGrams: 500, amount: '60.0000', currencyCode: 'BDT' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-rates');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      shipping_zone_id: 'z1',
      shipping_method_id: 'm1',
      min_weight_grams: 0,
      max_weight_grams: 500,
      amount: '60.0000',
      currency_code: 'BDT',
    });
  });

  it('updateShippingRate() maps camelCase input including expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...rateDto, amount: '75.0000' } }));

    await updateShippingRate(client, 'r1', { amount: '75.0000', expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-rates/r1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ amount: '75.0000', expected_version: 1 });
  });

  it('archiveShippingRate() posts to the real archive endpoint with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...rateDto, status: 'archived' } }));

    await archiveShippingRate(client, 'r1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-rates/r1/archive');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('destroyShippingRate() deletes with expected_version, no restore() method exists on this module', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await destroyShippingRate(client, 'r1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-rates/r1');
    expect(init.method).toBe('DELETE');
  });
});
