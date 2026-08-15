import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import { createResourceClient } from './resourceClient.js';
import type { CustomerDTO, CreateCustomerInput, UpdateCustomerInput, ListCustomersQuery } from './types.js';

/** `apps/backend/.../Customers/routes.php` — `customers`, `customers.customers.{view|manage}`. No `restore()` — see `resourceClient.ts`'s own docblock. */
const BASE_PATH = '/customers';

function toCreateBody(input: CreateCustomerInput): Record<string, unknown> {
  return {
    name: input.name,
    email: input.email,
    password: input.password,
    password_confirmation: input.passwordConfirmation,
    phone: input.phone ? input.phone : undefined,
  };
}

function toUpdateBody(input: UpdateCustomerInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { name: rest.name, email: rest.email, phone: rest.phone, expected_version: expectedVersion };
}

/** `CustomerController::index` (apps/backend) — genuinely server-side `q`/`status`/`sort`/`direction`/`page`/`per_page`, confirmed by reading the controller directly. Never fetched-then-filtered client-side. */
export function listCustomers(client: ApiClient, query?: ListCustomersQuery): Promise<ListEnvelope<CustomerDTO>> {
  return createResourceClient<CustomerDTO>(client, BASE_PATH).list(
    query && {
      q: query.q,
      status: query.status,
      sort: query.sort,
      direction: query.direction,
      page: query.page,
      per_page: query.perPage,
    },
  );
}

/** `CustomerController::show` — the only endpoint that embeds `addresses` (`$customer->load('addresses')`). */
export function getCustomer(client: ApiClient, id: string): Promise<CustomerDTO> {
  return createResourceClient<CustomerDTO>(client, BASE_PATH).get(id);
}

export function createCustomer(client: ApiClient, input: CreateCustomerInput): Promise<CustomerDTO> {
  return createResourceClient<CustomerDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateCustomer(client: ApiClient, id: string, input: UpdateCustomerInput): Promise<CustomerDTO> {
  return createResourceClient<CustomerDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archiveCustomer(client: ApiClient, id: string, expectedVersion: number): Promise<CustomerDTO> {
  return createResourceClient<CustomerDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyCustomer(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<CustomerDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}

/**
 * `GET /customers/{customer}/export` — `CustomerController::export`,
 * `customers.customers.view` (deliberately the *view* tier, not `.manage`
 * — see this module's own architecture doc §3/§9.2 for the still-open
 * product question that leaves unresolved). Returns the same full
 * `CustomerResource` shape as `show()`, addresses included, separately
 * audited (`customer.exported`) server-side on every call — confirmed by
 * reading the controller directly.
 */
export function exportCustomer(client: ApiClient, id: string): Promise<CustomerDTO> {
  return client.get<DataEnvelope<CustomerDTO>>(`${BASE_PATH}/${id}/export`).then((r) => r.data);
}
