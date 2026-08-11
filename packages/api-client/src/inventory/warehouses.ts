import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient } from './resourceClient.js';
import type { WarehouseDTO, CreateWarehouseInput, UpdateWarehouseInput, ListWarehousesQuery } from './types.js';

/** `apps/backend/.../Inventory/routes.php` — `warehouses`, `inventory.warehouses.{view|manage}`. */
const BASE_PATH = '/warehouses';

function toCreateBody(input: CreateWarehouseInput): Record<string, unknown> {
  return {
    code: input.code,
    name: input.name,
    address_line1: input.addressLine1,
    address_line2: input.addressLine2,
    city: input.city,
    region: input.region,
    postal_code: input.postalCode,
    country_code: input.countryCode,
    is_default: input.isDefault,
  };
}

function toUpdateBody(input: UpdateWarehouseInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { ...toCreateBody(rest as CreateWarehouseInput), expected_version: expectedVersion };
}

/** `WarehouseController::index` (apps/backend) supports a `status` filter and reads Laravel's own `page` query param via `paginate()` — no `per_page` support (the controller never reads it), unlike Inventory's Audit Log endpoint. */
export function listWarehouses(client: ApiClient, query?: ListWarehousesQuery): Promise<ListEnvelope<WarehouseDTO>> {
  return client.get<ListEnvelope<WarehouseDTO>>(BASE_PATH, { query: query && { status: query.status, page: query.page } });
}

export function getWarehouse(client: ApiClient, id: string): Promise<WarehouseDTO> {
  return createResourceClient<WarehouseDTO>(client, BASE_PATH).get(id);
}

export function createWarehouse(client: ApiClient, input: CreateWarehouseInput): Promise<WarehouseDTO> {
  return createResourceClient<WarehouseDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateWarehouse(client: ApiClient, id: string, input: UpdateWarehouseInput): Promise<WarehouseDTO> {
  return createResourceClient<WarehouseDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archiveWarehouse(client: ApiClient, id: string, expectedVersion: number): Promise<WarehouseDTO> {
  return createResourceClient<WarehouseDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyWarehouse(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<WarehouseDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}

export function restoreWarehouse(client: ApiClient, id: string): Promise<WarehouseDTO> {
  return createResourceClient<WarehouseDTO>(client, BASE_PATH).restore(id);
}
