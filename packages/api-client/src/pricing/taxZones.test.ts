import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listTaxZones, getTaxZone, createTaxZone, updateTaxZone, archiveTaxZone, destroyTaxZone } from './taxZones.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('taxZones', () => {
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
    name: 'California',
    countryCode: 'US',
    region: 'CA',
    status: 'active',
    version: 1,
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  };

  it('listTaxZones() hits the real endpoint with status/page — no per_page, no search', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [zoneDto], meta: { current_page: 1, last_page: 1 } }));

    await listTaxZones(client, { status: 'active', page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-zones?status=active&page=1');
  });

  it('getTaxZone() hits the real detail endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: zoneDto }));

    await getTaxZone(client, 'z1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-zones/z1');
  });

  it('createTaxZone() maps camelCase input to the exact snake_case CreateTaxZoneRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: zoneDto }, 201));

    await createTaxZone(client, { name: 'California', countryCode: 'US', region: 'CA' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-zones');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'California', country_code: 'US', region: 'CA' });
  });

  it('createTaxZone() omits `region` entirely for a country-wide zone, never sends an empty string', async () => {
    // Live-reproduced: this platform's global `ConvertEmptyStringsToNull`
    // middleware converts `region: ""` to `null` before
    // `CreateTaxZoneRequest`'s own `sometimes`+`string` rule runs, which
    // then rejects the present-but-null value — the only way to express
    // "no region" is to omit the key, which `CreateTaxZoneAction` already
    // defaults to `''` itself.
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...zoneDto, region: '' } }, 201));

    await createTaxZone(client, { name: 'United States', countryCode: 'US', region: '' });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ name: 'United States', country_code: 'US' });
    expect('region' in body).toBe(false);
  });

  it('updateTaxZone() maps camelCase input including expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...zoneDto, name: 'Renamed' } }));

    await updateTaxZone(client, 'z1', { name: 'Renamed', expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-zones/z1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Renamed', expected_version: 1 });
  });

  it('archiveTaxZone() posts to the real archive endpoint with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...zoneDto, status: 'archived' } }));

    await archiveTaxZone(client, 'z1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-zones/z1/archive');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('destroyTaxZone() deletes with expected_version, no restore() method exists on this module', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await destroyTaxZone(client, 'z1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-zones/z1');
    expect(init.method).toBe('DELETE');
  });
});
