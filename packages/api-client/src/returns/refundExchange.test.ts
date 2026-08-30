import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listRefundRequests, getRefundRequest, retryRefundRequest } from './refundRequests.js';
import { listExchangeRequests, getExchangeRequest, startPreparingExchange, markExchangeShipped, completeExchange, cancelExchange } from './exchangeRequests.js';
import { listReturnsAuditLogs } from './auditLogs.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('returns refund/exchange/audit-log wrappers', () => {
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

  it('listRefundRequests()/getRefundRequest() hit the real endpoints', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    await listRefundRequests(client, { status: 'pending' });
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/refund-requests?status=pending');

    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'rf1' } }));
    await getRefundRequest(client, 'rf1');
    expect(fetchMock.mock.calls[1]![0]).toBe('https://api.test/refund-requests/rf1');
  });

  it('retryRefundRequest() posts with no body needed', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'rf1', status: 'pending' } }));
    await retryRefundRequest(client, 'rf1');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/refund-requests/rf1/retry');
    expect(init.method).toBe('POST');
  });

  it('listExchangeRequests()/getExchangeRequest() hit the real endpoints', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    await listExchangeRequests(client, { status: 'preparing' });
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/exchange-requests?status=preparing');

    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'ex1' } }));
    await getExchangeRequest(client, 'ex1');
    expect(fetchMock.mock.calls[1]![0]).toBe('https://api.test/exchange-requests/ex1');
  });

  it('startPreparingExchange()/markExchangeShipped()/completeExchange()/cancelExchange() hit the real endpoints, each requiring expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'ex1', status: 'preparing' } }));
    await startPreparingExchange(client, 'ex1', { expectedVersion: 1 });
    const [url0, init0] = fetchMock.mock.calls[0]!;
    expect(url0).toBe('https://api.test/exchange-requests/ex1/prepare');
    expect(JSON.parse(init0.body as string)).toEqual({ expected_version: 1 });

    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'ex1', status: 'shipped' } }));
    await markExchangeShipped(client, 'ex1', { trackingNumber: 'TRK-9', expectedVersion: 2 });
    const [url2, init2] = fetchMock.mock.calls[1]!;
    expect(url2).toBe('https://api.test/exchange-requests/ex1/ship');
    expect(JSON.parse(init2.body as string)).toEqual({ tracking_number: 'TRK-9', expected_version: 2 });

    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'ex1', status: 'completed' } }));
    await completeExchange(client, 'ex1', { expectedVersion: 3 });
    const [url3, init3] = fetchMock.mock.calls[2]!;
    expect(url3).toBe('https://api.test/exchange-requests/ex1/complete');
    expect(JSON.parse(init3.body as string)).toEqual({ expected_version: 3 });

    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'ex1', status: 'cancelled' } }));
    await cancelExchange(client, 'ex1', { expectedVersion: 1 });
    const [url4, init4] = fetchMock.mock.calls[3]!;
    expect(url4).toBe('https://api.test/exchange-requests/ex1/cancel');
    expect(JSON.parse(init4.body as string)).toEqual({ expected_version: 1 });
  });

  it('listReturnsAuditLogs() maps actorId/targetType/perPage to the real query params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    await listReturnsAuditLogs(client, { actorId: 'u1', targetType: 'App\\Domains\\Operations\\Returns\\Models\\ReturnRequest', page: 2, perPage: 25 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/returns/audit-logs?');
    expect(url).toContain('actor_id=u1');
    expect(url).toContain('page=2');
    expect(url).toContain('per_page=25');
  });
});
