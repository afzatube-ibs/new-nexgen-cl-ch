import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listStockItemReservations, reserveStock, releaseReservation } from './reservations.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('reservations', () => {
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

  const reservationDto = {
    id: 'r1',
    stockItemId: 'si1',
    quantity: 5,
    referenceType: null,
    referenceId: null,
    status: 'active',
    expiresAt: null,
    createdAt: '2026-08-12T00:00:00Z',
  };

  it('listStockItemReservations() hits the real per-item endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [reservationDto], meta: { current_page: 1, last_page: 1 } }));

    await listStockItemReservations(client, 'si1', { page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stock-items/si1/reservations?page=1');
  });

  it('reserveStock() maps camelCase input to the exact snake_case ReserveStockRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: reservationDto }, 201));

    await reserveStock(client, 'si1', { quantity: 5, referenceType: 'manual_hold', referenceId: 'Phone order #42' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stock-items/si1/reservations');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      quantity: 5,
      reference_type: 'manual_hold',
      reference_id: 'Phone order #42',
    });
  });

  it('releaseReservation() posts to the real release endpoint with no body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...reservationDto, status: 'released' } }));

    await releaseReservation(client, 'r1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/reservations/r1/release');
    expect(init.method).toBe('POST');
  });
});
