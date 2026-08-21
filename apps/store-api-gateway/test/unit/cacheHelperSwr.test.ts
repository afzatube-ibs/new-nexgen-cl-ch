import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { serveCacheable } from '../../src/lib/cacheHelper.js';
import { createInMemoryCacheStore } from '../../src/lib/cacheStore.js';

function fakeRequest(): FastifyRequest {
  return { id: 'req-1', headers: {} } as unknown as FastifyRequest;
}

function fakeReply() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let sentBody: unknown;
  const reply = {
    header(name: string, value: string) {
      headers[name.toLowerCase()] = value;
      return reply;
    },
    code(value: number) {
      statusCode = value;
      return reply;
    },
    send(body?: unknown) {
      sentBody = body;
      return reply;
    },
  };
  return { reply: reply as unknown as FastifyReply, headers, getStatus: () => statusCode, getBody: () => sentBody };
}

describe('lib/cacheHelper stale-while-revalidate (Slice 1.5)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('serves MISS then HIT within the fresh window, matching Slice 1 behavior exactly when no SWR window is configured', async () => {
    const cache = createInMemoryCacheStore();
    const compute = vi.fn().mockResolvedValue({ data: { value: 1 } });

    const first = fakeReply();
    await serveCacheable(fakeRequest(), first.reply, cache, { key: 'k', ttlSeconds: 60 }, compute);
    expect(first.headers['x-cache-status']).toBe('MISS');

    const second = fakeReply();
    await serveCacheable(fakeRequest(), second.reply, cache, { key: 'k', ttlSeconds: 60 }, compute);
    expect(second.headers['x-cache-status']).toBe('HIT');
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('serves STALE (not a blocking recompute) once past ttlSeconds but still within the SWR window, and refreshes in the background', async () => {
    const cache = createInMemoryCacheStore();
    let computeCount = 0;
    const compute = vi.fn().mockImplementation(() => {
      computeCount += 1;
      return Promise.resolve({ data: { value: computeCount } });
    });

    const first = fakeReply();
    await serveCacheable(fakeRequest(), first.reply, cache, { key: 'k2', ttlSeconds: 10, staleWhileRevalidateSeconds: 50 }, compute);
    expect(first.headers['x-cache-status']).toBe('MISS');

    vi.advanceTimersByTime(15_000); // past the 10s fresh window, still within the 50s SWR window

    const second = fakeReply();
    await serveCacheable(fakeRequest(), second.reply, cache, { key: 'k2', ttlSeconds: 10, staleWhileRevalidateSeconds: 50 }, compute);
    expect(second.headers['x-cache-status']).toBe('STALE');
    // The STALE response itself still serves the OLD value immediately — never waits on the background recompute.
    expect((second.getBody() as { data: { value: number } }).data.value).toBe(1);

    // Let the fire-and-forget background revalidation's own microtasks/promises settle.
    await vi.waitFor(() => expect(computeCount).toBe(2));

    const third = fakeReply();
    await serveCacheable(fakeRequest(), third.reply, cache, { key: 'k2', ttlSeconds: 10, staleWhileRevalidateSeconds: 50 }, compute);
    expect(third.headers['x-cache-status']).toBe('HIT'); // freshly revalidated in the background — a HIT again, not another MISS
    expect((third.getBody() as { data: { value: number } }).data.value).toBe(2);
  });

  it('serves a genuine MISS (synchronous recompute) once past both the ttl AND the SWR window', async () => {
    const cache = createInMemoryCacheStore();
    let computeCount = 0;
    const compute = vi.fn().mockImplementation(() => {
      computeCount += 1;
      return Promise.resolve({ data: { value: computeCount } });
    });

    const first = fakeReply();
    await serveCacheable(fakeRequest(), first.reply, cache, { key: 'k3', ttlSeconds: 10, staleWhileRevalidateSeconds: 20 }, compute);

    vi.advanceTimersByTime(35_000); // past ttl (10s) + SWR window (20s) = 30s

    const second = fakeReply();
    await serveCacheable(fakeRequest(), second.reply, cache, { key: 'k3', ttlSeconds: 10, staleWhileRevalidateSeconds: 20 }, compute);
    expect(second.headers['x-cache-status']).toBe('MISS');
    expect(computeCount).toBe(2); // recomputed synchronously, not served stale
  });
});
