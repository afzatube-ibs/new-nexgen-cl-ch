import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listReviews, getReview, getReviewSummary, deleteReview } from './reviews.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('reviews', () => {
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

  it('listReviews() sends product_id/status/customer_id/page/per_page as real query params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    await listReviews(client, { productId: 'p1', status: 'pending', page: 2 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/reviews?product_id=p1&status=pending&page=2');
  });

  it('getReview() hits the real single-item endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1' } }));
    await getReview(client, 'r1');
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/reviews/r1');
  });

  it('getReviewSummary() sends product_id and unwraps the real single-item envelope', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { averageRating: 4.3, totalCount: 3, distribution: [] } }));
    const summary = await getReviewSummary(client, 'p1');
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/reviews/summary?product_id=p1');
    expect(summary.averageRating).toBe(4.3);
  });

  it('deleteReview() sends expected_version in the real request body', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteReview(client, 'r1', { expectedVersion: 2 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/reviews/r1');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 2 });
  });
});
