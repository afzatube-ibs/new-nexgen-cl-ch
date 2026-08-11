import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { createWarehouse, updateWarehouse, listWarehouses } from './warehouses.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('warehouses', () => {
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

  const warehouseDto = {
    id: '1',
    code: 'MAIN',
    name: 'Main Warehouse',
    address: { line1: null, line2: null, city: null, region: null, postalCode: null, countryCode: null },
    isDefault: true,
    status: 'active',
    version: 1,
    createdAt: null,
    updatedAt: null,
  };

  it('createWarehouse() maps camelCase input to the exact snake_case CreateWarehouseRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: warehouseDto }));

    await createWarehouse(client, { code: 'MAIN', name: 'Main Warehouse', city: 'Dhaka', isDefault: true });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/warehouses');
    expect(JSON.parse(init.body as string)).toEqual({
      code: 'MAIN',
      name: 'Main Warehouse',
      address_line1: undefined,
      address_line2: undefined,
      city: 'Dhaka',
      region: undefined,
      postal_code: undefined,
      country_code: undefined,
      is_default: true,
    });
  });

  it('updateWarehouse() includes expected_version alongside the mapped fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...warehouseDto, version: 2 } }));

    await updateWarehouse(client, '1', { name: 'Renamed', expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/warehouses/1');
    expect(init.method).toBe('PATCH');
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe('Renamed');
    expect(body.expected_version).toBe(1);
  });

  it('listWarehouses() sends only status and page — WarehouseController::index has no per_page support', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [warehouseDto], meta: { current_page: 1, last_page: 1 } }));

    await listWarehouses(client, { status: 'active', page: 2 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/warehouses?status=active&page=2');
  });
});
