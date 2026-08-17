import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listPromotionRedemptions } from './redemptions.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('redemptions', () => {
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

  it('listPromotionRedemptions() maps promotionId/customerId to the real query params — read-only history, no write action exists', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await listPromotionRedemptions(client, { promotionId: 'promo1', customerId: 'cust1' });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/redemptions?promotion_id=promo1&customer_id=cust1');
  });
});
