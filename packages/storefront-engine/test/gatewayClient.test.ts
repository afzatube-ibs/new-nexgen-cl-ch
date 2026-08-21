import { afterEach, describe, expect, it, vi } from 'vitest';
import { gatewayFetch, gatewayFetchList } from '../src/gateway/client.js';
import { GatewayRequestError } from '../src/gateway/errors.js';

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))),
  );
}

describe('gateway/client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('unwraps the real Gateway envelope, returning only `data`', async () => {
    stubFetch(200, { data: { id: '1', name: 'Widget' }, meta: { requestId: 'req-1' } });
    const result = await gatewayFetch<{ id: string; name: string }>('/v1/products/1');
    expect(result).toEqual({ id: '1', name: 'Widget' });
  });

  it('drops undefined/null/empty query params rather than sending them as literal strings', async () => {
    stubFetch(200, { data: [], meta: { requestId: 'req-1' } });
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    await gatewayFetch('/v1/products', { query: { category_id: undefined, brand_id: null, q: '', page: 2 } });
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).not.toContain('category_id');
    expect(calledUrl).not.toContain('brand_id');
    expect(calledUrl).not.toContain('q=');
    expect(calledUrl).toContain('page=2');
  });

  it('forwards the caller-supplied Cookie header for guest-session continuity', async () => {
    stubFetch(200, { data: {}, meta: { requestId: 'req-1' } });
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    await gatewayFetch('/v1/homepage', { cookie: 'nx_did=abc123' });
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((options.headers as Record<string, string>).cookie).toBe('nx_did=abc123');
  });

  it('throws a structured GatewayRequestError on a real error envelope, never a raw fetch rejection', async () => {
    stubFetch(404, { error: { code: 'not_found', message: 'Product not found' }, meta: { requestId: 'req-2' } });
    await expect(gatewayFetch('/v1/products/missing')).rejects.toThrow(GatewayRequestError);
  });

  it('GatewayRequestError.isNotFound is true only for a real 404', async () => {
    stubFetch(404, { error: { code: 'not_found', message: 'nope' }, meta: { requestId: 'req-2' } });
    try {
      await gatewayFetch('/v1/products/missing');
      expect.fail('expected a rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(GatewayRequestError);
      expect((error as GatewayRequestError).isNotFound).toBe(true);
      expect((error as GatewayRequestError).code).toBe('not_found');
      expect((error as GatewayRequestError).requestId).toBe('req-2');
    }
  });

  it('GatewayRequestError.isUnsupportedIdentifier is true only for a real 501 (a slug-shaped identifier the real backend can\'t look up yet — GATEWAY_SLUG_READINESS.md), and false for a 404', async () => {
    stubFetch(501, { error: { code: 'upstream_unavailable', message: 'slug not supported' }, meta: { requestId: 'req-3' } });
    try {
      await gatewayFetch('/v1/products/not-a-uuid');
      expect.fail('expected a rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(GatewayRequestError);
      expect((error as GatewayRequestError).isUnsupportedIdentifier).toBe(true);
      expect((error as GatewayRequestError).isNotFound).toBe(false);
    }

    stubFetch(404, { error: { code: 'not_found', message: 'nope' }, meta: { requestId: 'req-4' } });
    try {
      await gatewayFetch('/v1/products/missing');
      expect.fail('expected a rejection');
    } catch (error) {
      expect((error as GatewayRequestError).isUnsupportedIdentifier).toBe(false);
    }
  });

  it('gatewayFetchList unwraps the real list envelope — data is the array itself, pagination comes from meta (real bug found live during `next build`\'s sitemap generation: data is never nested a second time)', async () => {
    stubFetch(200, {
      data: [{ id: '1', name: 'Widget' }],
      meta: { requestId: 'req-1', pagination: { currentPage: 1, lastPage: 3, perPage: 15, total: 40 } },
    });
    const result = await gatewayFetchList<{ id: string; name: string }>('/v1/products');
    expect(result.data).toEqual([{ id: '1', name: 'Widget' }]);
    expect(result.pagination).toEqual({ currentPage: 1, lastPage: 3, perPage: 15, total: 40 });
  });

  it('gatewayFetchList leaves pagination undefined when the Gateway omits it (an unpaginated list route), never throwing on the missing field', async () => {
    stubFetch(200, { data: [], meta: { requestId: 'req-1' } });
    const result = await gatewayFetchList<{ id: string }>('/v1/products');
    expect(result.data).toEqual([]);
    expect(result.pagination).toBeUndefined();
  });

  it('passes Next.js revalidate/tags through to fetch (the real ISR mechanism)', async () => {
    stubFetch(200, { data: {}, meta: { requestId: 'req-1' } });
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    await gatewayFetch('/v1/homepage', { revalidateSeconds: 120, tags: ['catalog:products'] });
    const options = fetchMock.mock.calls[0]?.[1] as { next?: { revalidate?: number; tags?: string[] } };
    expect(options.next?.revalidate).toBe(120);
    expect(options.next?.tags).toEqual(['catalog:products']);
  });

  it('Beta Milestone 2: retries exactly once on a network-level failure (TypeError — connection refused/DNS), succeeding on the second attempt', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: '1' }, meta: { requestId: 'req-1' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await gatewayFetch<{ id: string }>('/v1/products/1');
    expect(result).toEqual({ id: '1' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('Beta Milestone 2: never retries a real GatewayRequestError (a genuine HTTP failure status) — fetch is called exactly once', async () => {
    stubFetch(500, { error: { code: 'internal_error', message: 'boom' }, meta: { requestId: 'req-1' } });
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    await expect(gatewayFetch('/v1/products/1')).rejects.toThrow(GatewayRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Beta Milestone 2: a persistent network failure across both attempts still rejects with the real underlying error, never hanging', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(gatewayFetch('/v1/products/1')).rejects.toThrow(TypeError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
