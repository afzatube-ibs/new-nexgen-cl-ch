import { afterEach, describe, expect, it, vi } from 'vitest';
import { getReviews, getReviewSummary, submitReview } from '../src/gateway/reviews.js';
import { GatewayRequestError } from '../src/gateway/errors.js';

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))),
  );
}

describe('gateway/reviews', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getReviews sends product_id and unwraps the real list envelope', async () => {
    stubFetch(200, {
      data: [{ id: 'r1', authorName: 'Jamie', rating: 5, body: 'Great!', createdAt: '2026-08-30T00:00:00Z', verifiedPurchase: true }],
      meta: { requestId: 'req-1', pagination: { currentPage: 1, lastPage: 1, perPage: 20, total: 1 } },
    });
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;

    const result = await getReviews('product-1');

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.authorName).toBe('Jamie');
    expect(result.pagination?.total).toBe(1);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain('product_id=product-1');
  });

  it('getReviewSummary unwraps the real single-item envelope unchanged', async () => {
    stubFetch(200, { data: { averageRating: 4.3, totalCount: 3, distribution: [{ stars: 5, count: 2 }] }, meta: { requestId: 'req-1' } });

    const result = await getReviewSummary('product-1');

    expect(result).toEqual({ averageRating: 4.3, totalCount: 3, distribution: [{ stars: 5, count: 2 }] });
  });

  it('submitReview forwards the caller\'s own token as a Bearer header, never a cookie', async () => {
    stubFetch(200, {
      data: { id: 'r1', authorName: 'Jamie', rating: 4, body: 'Solid product.', createdAt: '2026-08-30T00:00:00Z', verifiedPurchase: false },
    });
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;

    const review = await submitReview('real-customer-token', { productId: 'product-1', rating: 4, body: 'Solid product.' });

    expect(review.id).toBe('r1');
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer real-customer-token');
  });

  it('submitReview throws a structured GatewayRequestError on a real error response (e.g. a duplicate review)', async () => {
    stubFetch(409, { error: { code: 'conflict', message: 'You have already reviewed this product.' }, meta: { requestId: 'req-2' } });

    await expect(submitReview('real-customer-token', { productId: 'product-1', rating: 4, body: 'Solid product.' })).rejects.toThrow(GatewayRequestError);
  });
});
