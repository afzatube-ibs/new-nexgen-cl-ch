import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listPromotions, getPromotion, createPromotion, updatePromotion, archivePromotion, destroyPromotion } from './promotions.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('promotions', () => {
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

  it('listPromotions() maps status/discountType to the real query params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await listPromotions(client, { status: 'active', discountType: 'percentage', page: 2 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions?status=active&discount_type=percentage&page=2');
  });

  it('getPromotion() hits show() and unwraps the data envelope', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'promo1', conditions: [], coupons: [] } }));

    const result = await getPromotion(client, 'promo1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/promo1');
    expect(result).toEqual({ id: 'promo1', conditions: [], coupons: [] });
  });

  it('createPromotion() posts the real snake_case body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'promo1' } }, 201));

    await createPromotion(client, { name: 'Summer Sale', discountType: 'percentage', discountValue: '10', isStackable: false, priority: 0, requiresCoupon: false });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ name: 'Summer Sale', discount_type: 'percentage', discount_value: '10' });
  });

  it('updatePromotion() sends expected_version alongside the changed fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'promo1' } }));

    await updatePromotion(client, 'promo1', {
      name: 'Renamed',
      discountType: 'percentage',
      isStackable: false,
      priority: 0,
      requiresCoupon: false,
      expectedVersion: 3,
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ name: 'Renamed', expected_version: 3 });
  });

  it('archivePromotion() posts to the real archive endpoint with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'promo1', status: 'archived' } }));

    await archivePromotion(client, 'promo1', 2);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/promo1/archive');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ expected_version: 2 });
  });

  it('destroyPromotion() sends a DELETE with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await destroyPromotion(client, 'promo1', 4);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/promo1');
    expect((init as RequestInit).method).toBe('DELETE');
  });
});
