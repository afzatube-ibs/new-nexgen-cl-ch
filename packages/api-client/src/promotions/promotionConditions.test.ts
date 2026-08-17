import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { addPromotionCondition, updatePromotionCondition, removePromotionCondition } from './promotionConditions.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('promotionConditions', () => {
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

  it('addPromotionCondition() posts to the nested endpoint with the parent Promotion expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'cond1' } }, 201));

    await addPromotionCondition(client, 'promo1', { conditionType: 'minimum_order_amount', numericValue: '50', expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/promo1/conditions');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      condition_type: 'minimum_order_amount',
      reference_id: null,
      numeric_value: '50',
      expected_version: 1,
    });
  });

  it('updatePromotionCondition() patches the specific condition', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'cond1' } }));

    await updatePromotionCondition(client, 'promo1', 'cond1', { conditionType: 'product', referenceId: 'prod1', expectedVersion: 2 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/promo1/conditions/cond1');
  });

  it('removePromotionCondition() sends a DELETE with the parent Promotion expected_version', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await removePromotionCondition(client, 'promo1', 'cond1', 3);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/promo1/conditions/cond1');
    expect((init as RequestInit).method).toBe('DELETE');
  });
});
