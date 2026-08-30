import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import {
  approveReturnRequest,
  rejectReturnRequest,
  cancelReturnRequest,
  scheduleReturnPickup,
  markReturnReceived,
  startReturnInspection,
  resolveReturnRequest,
} from './workflow.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('returns workflow', () => {
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

  it('approveReturnRequest() posts to the real approve endpoint with expected_version only', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', status: 'approved' } }));
    await approveReturnRequest(client, 'r1', { expectedVersion: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/return-requests/r1/approve');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('rejectReturnRequest() requires and sends a real reason', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', status: 'rejected' } }));
    await rejectReturnRequest(client, 'r1', { reason: 'Item not eligible for return', expectedVersion: 2 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/return-requests/r1/reject');
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Item not eligible for return', expected_version: 2 });
  });

  it('cancelReturnRequest() posts to cancel', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', status: 'cancelled' } }));
    await cancelReturnRequest(client, 'r1', { expectedVersion: 1 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/return-requests/r1/cancel');
  });

  it('scheduleReturnPickup() sends optional provider_code/tracking_number, omitted when blank', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', status: 'pickup_scheduled' } }));
    await scheduleReturnPickup(client, 'r1', { expectedVersion: 2 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/return-requests/r1/pickup');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ expected_version: 2 });
    expect('provider_code' in body).toBe(false);
    expect('tracking_number' in body).toBe(false);
  });

  it('scheduleReturnPickup() passes provider_code/tracking_number through when supplied', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', status: 'pickup_scheduled' } }));
    await scheduleReturnPickup(client, 'r1', { providerCode: 'courier-x', trackingNumber: 'TRK-1', expectedVersion: 2 });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init.body as string)).toEqual({ provider_code: 'courier-x', tracking_number: 'TRK-1', expected_version: 2 });
  });

  it('markReturnReceived() posts to receive', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', status: 'received' } }));
    await markReturnReceived(client, 'r1', { expectedVersion: 3 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/return-requests/r1/receive');
  });

  it('startReturnInspection() posts to inspect', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', status: 'inspecting' } }));
    await startReturnInspection(client, 'r1', { expectedVersion: 4 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/return-requests/r1/inspect');
  });

  it('resolveReturnRequest() sends the real refund-specific fields for a refund resolution', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', status: 'resolution_approved' } }));
    await resolveReturnRequest(client, 'r1', {
      resolution: 'refund',
      paymentId: 'p1',
      amount: '49.99',
      currencyCode: 'USD',
      expectedVersion: 5,
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/return-requests/r1/resolve');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ resolution: 'refund', payment_id: 'p1', amount: '49.99', currency_code: 'USD', expected_version: 5 });
  });

  it('resolveReturnRequest() sends the real exchange-specific fields for an exchange resolution', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', status: 'resolution_approved' } }));
    await resolveReturnRequest(client, 'r1', {
      resolution: 'exchange',
      desiredSku: 'SKU-2',
      desiredQuantity: 1,
      expectedVersion: 5,
    });
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ resolution: 'exchange', desired_sku: 'SKU-2', desired_quantity: 1, expected_version: 5 });
  });

  it('resolveReturnRequest() sends only resolution + expected_version for a reject resolution', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', status: 'rejected' } }));
    await resolveReturnRequest(client, 'r1', { resolution: 'reject', expectedVersion: 5 });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init.body as string)).toEqual({ resolution: 'reject', expected_version: 5 });
  });
});
