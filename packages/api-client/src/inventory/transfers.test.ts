import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listStockTransfers, getStockTransfer, initiateStockTransfer, completeStockTransfer, cancelStockTransfer } from './transfers.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('transfers', () => {
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

  const transferDto = {
    id: 't1',
    fromWarehouseId: 'w1',
    toWarehouseId: 'w2',
    sku: 'SKU-100',
    quantity: 5,
    status: 'pending',
    createdAt: '2026-08-13T00:00:00Z',
    updatedAt: '2026-08-13T00:00:00Z',
  };

  it('listStockTransfers() hits the real endpoint with only status/page — no per_page', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [transferDto], meta: { current_page: 1, last_page: 1 } }));

    await listStockTransfers(client, { status: 'pending', page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stock-transfers?status=pending&page=1');
  });

  it('getStockTransfer() hits the real detail endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: transferDto }));

    await getStockTransfer(client, 't1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stock-transfers/t1');
  });

  it('initiateStockTransfer() maps camelCase input to the exact snake_case InitiateStockTransferRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: transferDto }, 201));

    await initiateStockTransfer(client, { fromWarehouseId: 'w1', toWarehouseId: 'w2', sku: 'SKU-100', quantity: 5 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stock-transfers');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      from_warehouse_id: 'w1',
      to_warehouse_id: 'w2',
      sku: 'SKU-100',
      quantity: 5,
    });
  });

  it('completeStockTransfer() posts to the real complete endpoint with no body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...transferDto, status: 'completed' } }));

    await completeStockTransfer(client, 't1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stock-transfers/t1/complete');
    expect(init.method).toBe('POST');
  });

  it('cancelStockTransfer() posts to the real cancel endpoint with no body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...transferDto, status: 'cancelled' } }));

    await cancelStockTransfer(client, 't1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stock-transfers/t1/cancel');
    expect(init.method).toBe('POST');
  });
});
