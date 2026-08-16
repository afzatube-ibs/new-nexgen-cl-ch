import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { startPicking, markPicked, startPacking, markPacked, dispatchShipment, markInTransit, markDelivered, markFailed, cancelShipment } from './workflow.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('fulfillment workflow', () => {
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

  it('startPicking() posts to the real pick/start endpoint with expected_version only', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', status: 'picking' } }));
    await startPicking(client, 's1', { expectedVersion: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/pick/start');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('markPicked() posts to pick/complete', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', status: 'picked' } }));
    await markPicked(client, 's1', { expectedVersion: 2 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/pick/complete');
  });

  it('startPacking() posts to pack/start', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', status: 'packing' } }));
    await startPacking(client, 's1', { expectedVersion: 3 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/pack/start');
  });

  it('markPacked() posts to pack/complete', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', status: 'packed' } }));
    await markPacked(client, 's1', { expectedVersion: 4 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/pack/complete');
  });

  it('dispatchShipment() maps camelCase input to the exact snake_case DispatchShipmentRequest fields, omitting empty strings', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', status: 'dispatched' } }));
    await dispatchShipment(client, 's1', { shippingMethodId: 'm1', trackingNumber: 'TRK-1', expectedVersion: 5 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/dispatch');
    expect(JSON.parse(init.body as string)).toEqual({ shipping_method_id: 'm1', tracking_number: 'TRK-1', expected_version: 5 });
  });

  it('dispatchShipment() omits shipping_method_id/tracking_number entirely when not supplied', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', status: 'dispatched' } }));
    await dispatchShipment(client, 's1', { expectedVersion: 5 });
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ expected_version: 5 });
    expect('shipping_method_id' in body).toBe(false);
    expect('tracking_number' in body).toBe(false);
  });

  it('markInTransit() posts to in-transit', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', status: 'in_transit' } }));
    await markInTransit(client, 's1', { expectedVersion: 6 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/in-transit');
  });

  it('markDelivered() posts to deliver', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', status: 'delivered' } }));
    await markDelivered(client, 's1', { expectedVersion: 7 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/deliver');
  });

  it('markFailed() requires and sends a real reason', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', status: 'failed' } }));
    await markFailed(client, 's1', { reason: 'Item damaged in warehouse', expectedVersion: 3 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/fail');
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Item damaged in warehouse', expected_version: 3 });
  });

  it('cancelShipment() sends an optional reason, omitted when blank', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', status: 'cancelled' } }));
    await cancelShipment(client, 's1', { expectedVersion: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/cancel');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ expected_version: 1 });
    expect('reason' in body).toBe(false);
  });
});
