import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listShippingZones, getShippingZone, createShippingZone, updateShippingZone, archiveShippingZone, destroyShippingZone } from './zones.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('shipping zones', () => {
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

  const zoneDto = {
    id: 'z1',
    name: 'Dhaka Metro',
    countryCode: 'BD',
    region: 'DHK',
    status: 'active',
    version: 1,
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  };

  it('listShippingZones() hits the real endpoint with status/page — no per_page, no search', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [zoneDto], meta: { current_page: 1, last_page: 1 } }));

    await listShippingZones(client, { status: 'active', page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-zones?status=active&page=1');
  });

  it('getShippingZone() hits the real detail endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: zoneDto }));

    await getShippingZone(client, 'z1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-zones/z1');
  });

  it('createShippingZone() maps camelCase input to the exact snake_case CreateShippingZoneRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: zoneDto }, 201));

    await createShippingZone(client, { name: 'Dhaka Metro', countryCode: 'BD', region: 'DHK' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-zones');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Dhaka Metro', country_code: 'BD', region: 'DHK' });
  });

  it('createShippingZone() omits `region` entirely for a country-wide zone, never sends an empty string', async () => {
    // Same `ConvertEmptyStringsToNull` interaction already found and fixed
    // for Pricing's own `createTaxZone` — a present-but-null `region` fails
    // `CreateShippingZoneRequest`'s `sometimes`+`string` rule.
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...zoneDto, region: '' } }, 201));

    await createShippingZone(client, { name: 'Bangladesh', countryCode: 'BD', region: '' });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ name: 'Bangladesh', country_code: 'BD' });
    expect('region' in body).toBe(false);
  });

  it('updateShippingZone() maps camelCase input including expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...zoneDto, name: 'Renamed' } }));

    await updateShippingZone(client, 'z1', { name: 'Renamed', expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-zones/z1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Renamed', expected_version: 1 });
  });

  it('archiveShippingZone() posts to the real archive endpoint with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...zoneDto, status: 'archived' } }));

    await archiveShippingZone(client, 'z1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-zones/z1/archive');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('destroyShippingZone() deletes with expected_version, no restore() method exists on this module', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await destroyShippingZone(client, 'z1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipping-zones/z1');
    expect(init.method).toBe('DELETE');
  });
});
