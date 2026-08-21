import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { lookupPrice } from './lookup.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('lookupPrice', () => {
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

  it('hits GET /pricing/lookup with sku and currency_code', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null }));

    await lookupPrice(client, { sku: 'ABC-123', currencyCode: 'usd' });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/pricing/lookup?sku=ABC-123&currency_code=usd');
  });

  it('returns the entry when one is found', async () => {
    const entry = {
      id: 'entry1',
      priceListId: 'pl1',
      sku: 'ABC-123',
      basePrice: '19.9900',
      compareAtPrice: null,
      salePrice: null,
      saleStartsAt: null,
      saleEndsAt: null,
      isSaleActive: false,
      effectivePrice: '19.9900',
      version: 1,
      createdAt: '2026-08-13T00:00:00Z',
      updatedAt: '2026-08-13T00:00:00Z',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: entry }));

    const result = await lookupPrice(client, { sku: 'ABC-123', currencyCode: 'USD' });

    expect(result).toEqual(entry);
  });

  it('returns null when the backend responds with { data: null } — no default list, or no entry for the SKU', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null }));

    const result = await lookupPrice(client, { sku: 'MISSING-SKU', currencyCode: 'EUR' });

    expect(result).toBeNull();
  });
});
