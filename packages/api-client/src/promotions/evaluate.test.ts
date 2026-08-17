import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { evaluatePromotions } from './evaluate.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('evaluate', () => {
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

  it('evaluatePromotions() posts the real snake_case cart shape and unwraps the data envelope', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { appliedPromotions: [], totalDiscount: '0.0000', freeShipping: false } }),
    );

    const result = await evaluatePromotions(client, {
      items: [{ productId: 'prod1', quantity: 2, unitPrice: '10.0000' }],
      subtotal: '20.0000',
      currencyCode: 'USD',
      couponCode: 'SAVE10',
    });

    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/evaluate');
    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>;
    expect(body).toEqual({
      items: [{ product_id: 'prod1', category_ids: undefined, quantity: 2, unit_price: '10.0000' }],
      subtotal: '20.0000',
      currency_code: 'USD',
      customer_id: null,
      store_id: null,
      coupon_code: 'SAVE10',
    });
    expect(result).toEqual({ appliedPromotions: [], totalDiscount: '0.0000', freeShipping: false });
  });
});
