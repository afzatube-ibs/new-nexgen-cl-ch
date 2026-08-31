import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { approveReview, rejectReview, respondToReview } from './workflow.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('reviews workflow', () => {
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

  it('approveReview() posts to the real approve endpoint with expected_version only', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', status: 'approved' } }));
    await approveReview(client, 'r1', { expectedVersion: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/reviews/r1/approve');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('rejectReview() requires and sends a real reason', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', status: 'rejected' } }));
    await rejectReview(client, 'r1', { reason: 'Spam content.', expectedVersion: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/reviews/r1/reject');
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Spam content.', expected_version: 1 });
  });

  it('respondToReview() sends the real merchant response body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1' } }));
    await respondToReview(client, 'r1', { body: 'Thanks for the feedback!', expectedVersion: 2 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/reviews/r1/respond');
    expect(JSON.parse(init.body as string)).toEqual({ body: 'Thanks for the feedback!', expected_version: 2 });
  });
});
