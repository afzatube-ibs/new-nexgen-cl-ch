import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { CustomerAddressDTO, CreateCustomerAddressInput, UpdateCustomerAddressInput } from './types.js';

/**
 * `apps/backend/.../Customers/routes.php` — `customers/{customer}/addresses[/{address}]`,
 * `customers.customers.manage`. No standalone list/get endpoint exists for a
 * single address or a cross-customer address feed — every address is only
 * ever read as part of its parent Customer (`GET /customers/{id}` →
 * `.addresses`), the identical shape Pricing's own Price List Entries and
 * Inventory's own Stock Reservations already established.
 */
function basePath(customerId: string): string {
  return `/customers/${customerId}/addresses`;
}

function toCreateBody(input: CreateCustomerAddressInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return {
    label: rest.label ? rest.label : undefined,
    recipient_name: rest.recipientName,
    phone: rest.phone ? rest.phone : undefined,
    address_line1: rest.addressLine1,
    address_line2: rest.addressLine2 ? rest.addressLine2 : undefined,
    city: rest.city,
    region: rest.region ? rest.region : undefined,
    postal_code: rest.postalCode ? rest.postalCode : undefined,
    country_code: rest.countryCode,
    is_default_shipping: rest.isDefaultShipping,
    is_default_billing: rest.isDefaultBilling,
    expected_version: expectedVersion,
  };
}

function toUpdateBody(input: UpdateCustomerAddressInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return {
    label: rest.label,
    recipient_name: rest.recipientName,
    phone: rest.phone,
    address_line1: rest.addressLine1,
    address_line2: rest.addressLine2,
    city: rest.city,
    region: rest.region,
    postal_code: rest.postalCode,
    country_code: rest.countryCode,
    is_default_shipping: rest.isDefaultShipping,
    is_default_billing: rest.isDefaultBilling,
    expected_version: expectedVersion,
  };
}

export function addCustomerAddress(client: ApiClient, customerId: string, input: CreateCustomerAddressInput): Promise<CustomerAddressDTO> {
  return client.post<DataEnvelope<CustomerAddressDTO>>(basePath(customerId), toCreateBody(input)).then((r) => r.data);
}

export function updateCustomerAddress(
  client: ApiClient,
  customerId: string,
  addressId: string,
  input: UpdateCustomerAddressInput,
): Promise<CustomerAddressDTO> {
  return client.patch<DataEnvelope<CustomerAddressDTO>>(`${basePath(customerId)}/${addressId}`, toUpdateBody(input)).then((r) => r.data);
}

export function deleteCustomerAddress(client: ApiClient, customerId: string, addressId: string, expectedVersion: number): Promise<void> {
  return client.delete<void>(`${basePath(customerId)}/${addressId}`, { expected_version: expectedVersion });
}
