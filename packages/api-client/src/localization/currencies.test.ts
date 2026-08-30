import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listCurrencies, getCurrency, createCurrency, updateCurrency, archiveCurrency, deleteCurrency } from './currencies.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('localization currencies', () => {
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

  it('listCurrencies() maps status to the real query param', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    await listCurrencies(client, { status: 'active' });
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/currencies?status=active');
  });

  it('getCurrency() hits the real show endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'c1' } }));
    await getCurrency(client, 'c1');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/currencies/c1');
  });

  it('createCurrency() never sends is_base — CreateCurrencyRequest does not accept it', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'c1' } }, 201));
    await createCurrency(client, { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: '0.92' });
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ code: 'EUR', name: 'Euro', symbol: '€', exchange_rate: '0.92' });
    expect('is_base' in body).toBe(false);
  });

  it('updateCurrency() sends is_base when supplied — the real "promote to base" path', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'c1' } }));
    await updateCurrency(client, 'c1', { isBase: true, expectedVersion: 2 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/currencies/c1');
    expect(JSON.parse(init.body as string)).toEqual({ is_base: true, expected_version: 2 });
  });

  it('archiveCurrency()/deleteCurrency() hit the real endpoints with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'c1', status: 'archived' } }));
    await archiveCurrency(client, 'c1', { expectedVersion: 1 });
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/currencies/c1/archive');

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteCurrency(client, 'c1', { expectedVersion: 1 });
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe('https://api.test/currencies/c1');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });
});
