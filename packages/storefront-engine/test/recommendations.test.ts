import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRecommendations } from '../src/gateway/recommendations.js';

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))),
  );
}

describe('gateway/recommendations', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the real Gateway /v1/recommendations/:slot route and unwraps the envelope', async () => {
    stubFetch(200, { data: [{ id: 'p1', name: 'Widget' }], meta: { requestId: 'req-1', engine: 'trending-fallback' } });
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const result = await getRecommendations({ slot: 'trending', limit: 8 });
    expect(result).toEqual([{ id: 'p1', name: 'Widget' }]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/v1/recommendations/trending');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('limit=8');
  });

  it('passes productId through for the related slot', async () => {
    stubFetch(200, { data: [], meta: { requestId: 'req-1' } });
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    await getRecommendations({ slot: 'related', productId: 'prod-123' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('productId=prod-123');
  });

  it('honestly returns an empty array for recently-viewed when the Gateway has no view-history data (never fabricated)', async () => {
    stubFetch(200, { data: [], meta: { requestId: 'req-1', engine: 'trending-fallback' } });
    const result = await getRecommendations({ slot: 'recently-viewed' });
    expect(result).toEqual([]);
  });
});
