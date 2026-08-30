import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, stubBackendFetch, testEnv } from './testUtils.js';

const PRODUCT_ID = '44444444-4444-4444-4444-444444444444';
const REVIEW_ID = '55555555-5555-5555-5555-555555555555';
const CUSTOMER_ID = '66666666-6666-6666-6666-666666666666';

describe('routes/reviews (integration — Category A public reads, Category C authenticated submission)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /v1/reviews composes the real backend response into the public ReviewCard shape, dropping internal fields', async () => {
    stubBackendFetch([
      {
        match: 'reviews?',
        status: 200,
        body: {
          data: [
            {
              id: REVIEW_ID,
              productId: PRODUCT_ID,
              customerId: CUSTOMER_ID,
              authorName: 'Jamie Rivera',
              orderId: null,
              rating: 5,
              title: 'Great product',
              body: 'Exceeded my expectations.',
              verifiedPurchase: true,
              status: 'approved',
              rejectionReason: null,
              merchantResponse: null,
              version: 1,
              createdAt: '2026-08-30T00:00:00Z',
              updatedAt: '2026-08-30T00:00:00Z',
            },
          ],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
        },
      },
    ]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({ method: 'GET', url: `/v1/reviews?product_id=${PRODUCT_ID}` });

    expect(response.statusCode).toBe(200);
    const review = response.json().data[0];
    expect(review.id).toBe(REVIEW_ID);
    expect(review.authorName).toBe('Jamie Rivera');
    expect(review.verifiedPurchase).toBe(true);
    expect(review).not.toHaveProperty('customerId');
    expect(review).not.toHaveProperty('status');
    expect(review).not.toHaveProperty('rejectionReason');
    await app.close();
  });

  it('GET /v1/reviews always requests status=approved from the real backend, never a caller-supplied status', async () => {
    let capturedUrl: string | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL) => {
        capturedUrl = String(input);
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'content-type': 'application/json' } }));
      }),
    );
    const app = await buildTestApp(testEnv());

    // Even if a caller tried to smuggle a `status` query param, the route's
    // own zod schema doesn't accept one at all — this asserts the real
    // outgoing backend request, not just the route's declared schema.
    await app.inject({ method: 'GET', url: `/v1/reviews?product_id=${PRODUCT_ID}&status=pending` });

    expect(capturedUrl).toContain('status=approved');
    expect(capturedUrl).not.toContain('status=pending');
    await app.close();
  });

  it('GET /v1/reviews/summary returns the real average/count/distribution unchanged', async () => {
    stubBackendFetch([
      {
        match: 'reviews/summary',
        status: 200,
        body: { data: { averageRating: 4.3, totalCount: 3, distribution: [{ stars: 5, count: 2 }, { stars: 3, count: 1 }] } },
      },
    ]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({ method: 'GET', url: `/v1/reviews/summary?product_id=${PRODUCT_ID}` });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({ averageRating: 4.3, totalCount: 3, distribution: [{ stars: 5, count: 2 }, { stars: 3, count: 1 }] });
    await app.close();
  });

  it('POST /v1/reviews requires a real customer token', async () => {
    stubBackendFetch([]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/reviews',
      payload: { product_id: PRODUCT_ID, rating: 5, body: 'A genuinely great product overall.' },
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('POST /v1/reviews forwards the caller\'s own token and the real backend response, composed', async () => {
    stubBackendFetch([
      {
        match: 'reviews',
        status: 201,
        body: {
          data: {
            id: REVIEW_ID,
            productId: PRODUCT_ID,
            customerId: CUSTOMER_ID,
            authorName: 'Jamie Rivera',
            orderId: null,
            rating: 4,
            title: null,
            body: 'A genuinely great product overall.',
            verifiedPurchase: false,
            status: 'pending',
            rejectionReason: null,
            merchantResponse: null,
            version: 1,
            createdAt: '2026-08-30T00:00:00Z',
            updatedAt: '2026-08-30T00:00:00Z',
          },
        },
      },
    ]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/reviews',
      headers: { authorization: 'Bearer real-customer-token' },
      payload: { product_id: PRODUCT_ID, rating: 4, body: 'A genuinely great product overall.' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.id).toBe(REVIEW_ID);
    expect(response.json().data).not.toHaveProperty('status');
    await app.close();
  });

  it('maps a real backend 409 (e.g. a duplicate review) to a clean, specific conflict — never a fabricated 502', async () => {
    stubBackendFetch([
      {
        match: 'reviews',
        status: 409,
        body: { error: { type: 'conflict', message: 'You have already reviewed this product.' } },
      },
    ]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/reviews',
      headers: { authorization: 'Bearer real-customer-token' },
      payload: { product_id: PRODUCT_ID, rating: 4, body: 'A genuinely great product overall.' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('conflict');
    expect(response.json().error.message).toBe('You have already reviewed this product.');
    await app.close();
  });

  it('rejects a rating outside 1-5 before ever calling the real backend', async () => {
    stubBackendFetch([]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/reviews',
      headers: { authorization: 'Bearer real-customer-token' },
      payload: { product_id: PRODUCT_ID, rating: 9, body: 'A genuinely great product overall.' },
    });

    expect(response.statusCode).toBe(422);
    await app.close();
  });
});
