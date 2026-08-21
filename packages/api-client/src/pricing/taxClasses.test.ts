import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listTaxClasses, getTaxClass, createTaxClass, updateTaxClass, archiveTaxClass, destroyTaxClass } from './taxClasses.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('taxClasses', () => {
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

  const classDto = {
    id: 'c1',
    name: 'Standard',
    status: 'active',
    version: 1,
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  };

  it('listTaxClasses() hits the real endpoint with status/page', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [classDto], meta: { current_page: 1, last_page: 1 } }));

    await listTaxClasses(client, { status: 'active', page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-classes?status=active&page=1');
  });

  it('getTaxClass() hits the real detail endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: classDto }));

    await getTaxClass(client, 'c1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-classes/c1');
  });

  it('createTaxClass() sends only name', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: classDto }, 201));

    await createTaxClass(client, { name: 'Standard' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-classes');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Standard' });
  });

  it('updateTaxClass() sends name and expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...classDto, name: 'Renamed' } }));

    await updateTaxClass(client, 'c1', { name: 'Renamed', expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-classes/c1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Renamed', expected_version: 1 });
  });

  it('archiveTaxClass() posts to the real archive endpoint with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...classDto, status: 'archived' } }));

    await archiveTaxClass(client, 'c1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-classes/c1/archive');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('destroyTaxClass() deletes with expected_version, no restore() method exists on this module', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await destroyTaxClass(client, 'c1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/tax-classes/c1');
    expect(init.method).toBe('DELETE');
  });
});
