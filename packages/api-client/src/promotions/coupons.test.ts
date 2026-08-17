import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listCoupons, createCoupon, updateCoupon, archiveCoupon, destroyCoupon } from './coupons.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('coupons', () => {
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

  it('listCoupons() hits the real nested endpoint scoped to one promotion', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await listCoupons(client, 'promo1', { status: 'active' });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/promo1/coupons?status=active');
  });

  it('createCoupon() posts code + usage_limit_global to the nested endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'c1' } }, 201));

    await createCoupon(client, 'promo1', { code: 'SAVE10', usageLimitGlobal: 100 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/promo1/coupons');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ code: 'SAVE10', usage_limit_global: 100 });
  });

  it('updateCoupon() sends expected_version alongside the changed fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'c1' } }));

    await updateCoupon(client, 'promo1', 'c1', { code: 'SAVE20', expectedVersion: 2 });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ code: 'SAVE20', usage_limit_global: null, expected_version: 2 });
  });

  it('archiveCoupon() posts to the real nested archive endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'c1', status: 'archived' } }));

    await archiveCoupon(client, 'promo1', 'c1', 3);

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/promo1/coupons/c1/archive');
  });

  it('destroyCoupon() sends a DELETE with expected_version to the nested endpoint', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await destroyCoupon(client, 'promo1', 'c1', 5);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/promo1/coupons/c1');
    expect((init as RequestInit).method).toBe('DELETE');
  });
});
