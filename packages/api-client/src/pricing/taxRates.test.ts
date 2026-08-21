import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listTaxRates, getTaxRate, createTaxRate, updateTaxRate, archiveTaxRate, destroyTaxRate } from './taxRates.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('taxRates', () => {
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
    taxZoneId: 'z1',
    taxClassId: 'c1',
    rate: '8.5000',
    status: 'active',
    version: 1,
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  };

  it('listTaxRates() hits the real endpoint with status/tax_zone_id/tax_class_id/page', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [rateDto], meta: { current_page: 1, last_page: 1 } }));

    await listTaxRates(client, { status: 'active', taxZoneId: 'z1', taxClassId: 'c1', page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-rates?status=active&tax_zone_id=z1&tax_class_id=c1&page=1');
  });

  it('getTaxRate() hits the real detail endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: rateDto }));

    await getTaxRate(client, 'r1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-rates/r1');
  });

  it('createTaxRate() maps camelCase input to the exact snake_case CreateTaxRateRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: rateDto }, 201));

    await createTaxRate(client, { taxZoneId: 'z1', taxClassId: 'c1', rate: '8.5000' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-rates');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ tax_zone_id: 'z1', tax_class_id: 'c1', rate: '8.5000' });
  });

  it('updateTaxRate() maps camelCase input including expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...rateDto, rate: '9.0000' } }));

    await updateTaxRate(client, 'r1', { rate: '9.0000', expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-rates/r1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ rate: '9.0000', expected_version: 1 });
  });

  it('archiveTaxRate() posts to the real archive endpoint with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...rateDto, status: 'archived' } }));

    await archiveTaxRate(client, 'r1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-rates/r1/archive');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('destroyTaxRate() deletes with expected_version, no restore() method exists on this module', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await destroyTaxRate(client, 'r1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-rates/r1');
    expect(init.method).toBe('DELETE');
  });
});
