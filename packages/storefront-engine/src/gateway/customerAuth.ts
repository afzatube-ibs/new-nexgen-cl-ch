import 'server-only';
import { GatewayRequestError } from './errors.js';
import { GATEWAY_BASE_URL } from './client.js';
import type { GatewayErrorBody, PaginationMeta } from './types.js';
import type { Order } from '../order/types.js';
import type { AddressInput, CustomerAddress, CustomerProfile, MyOrderSummary, RegisterCustomerInput, UpdateMyProfileInput } from './customerTypes.js';

export type { CustomerAddress, CustomerProfile, RegisterCustomerInput, UpdateMyProfileInput, AddressInput, MyOrderSummary } from './customerTypes.js';

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — the
 * Storefront's real client for the Gateway's new Category C surface
 * (`apps/store-api-gateway/src/routes/customers.ts`). `import 'server-
 * only'` for the identical reason `gateway/client.ts` declares it: this
 * module is the one place a real customer bearer token is ever read from
 * or written to a fetch call, and it must never reach a client bundle —
 * see `customerTypes.ts`'s own docblock for why the response SHAPES live
 * in a separate, non-`server-only` file a Client Component can safely
 * import.
 *
 * Deliberately separate from `gateway/client.ts` (GET-only, fixed public
 * cache semantics) — every function here can mutate, and every
 * authenticated one takes an explicit `token` parameter rather than
 * reading a cookie itself, so this module stays framework-call-site-
 * agnostic exactly like `gateway/client.ts`'s own `cookie` option: the
 * one real place `next/headers`' `cookies()` is ever called is
 * `apps/storefront/src/lib/customerSession.ts` and the `app/api/auth/*`
 * Route Handlers, never here.
 */

const REQUEST_TIMEOUT_MS = 8000;

async function gatewayRequest<T>(path: string, options: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; token?: string; body?: unknown; query?: Record<string, string | number | undefined> }): Promise<T> {
  const url = new URL(path.replace(/^\/+/, ''), `${GATEWAY_BASE_URL}/`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: options.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => undefined)) as GatewayErrorBody | undefined;
      throw new GatewayRequestError(response.status, body);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function registerCustomer(input: RegisterCustomerInput): Promise<CustomerProfile> {
  const envelope = await gatewayRequest<{ data: CustomerProfile }>('v1/customers/register', {
    method: 'POST',
    body: { name: input.name, email: input.email, password: input.password, password_confirmation: input.passwordConfirmation, phone: input.phone },
  });
  return envelope.data;
}

export async function loginCustomer(email: string, password: string): Promise<{ customer: CustomerProfile; token: string }> {
  const envelope = await gatewayRequest<{ data: CustomerProfile; meta: { requestId: string; token: string } }>('v1/customers/login', {
    method: 'POST',
    body: { email, password, device_name: 'storefront' },
  });
  return { customer: envelope.data, token: envelope.meta.token };
}

export async function logoutCustomer(token: string): Promise<void> {
  await gatewayRequest('v1/customers/logout', { method: 'POST', token });
}

/** Production Completion Plan v2, Milestone 5b (Password Reset). Always resolves — the real backend's own anti-enumeration response is identical whether or not the email matches a real account (see `RequestPasswordResetAction`'s own docblock). */
export async function requestPasswordReset(email: string): Promise<void> {
  await gatewayRequest('v1/customers/password/forgot', { method: 'POST', body: { email } });
}

export async function resetPassword(email: string, token: string, password: string): Promise<void> {
  await gatewayRequest('v1/customers/password/reset', {
    method: 'POST',
    body: { email, token, password, password_confirmation: password },
  });
}

export async function getMyProfile(token: string): Promise<CustomerProfile> {
  const envelope = await gatewayRequest<{ data: CustomerProfile }>('v1/customers/me', { method: 'GET', token });
  return envelope.data;
}

export async function updateMyProfile(token: string, input: UpdateMyProfileInput): Promise<CustomerProfile> {
  const envelope = await gatewayRequest<{ data: CustomerProfile }>('v1/customers/me', {
    method: 'PATCH',
    token,
    body: { name: input.name, email: input.email, phone: input.phone, expected_version: input.expectedVersion },
  });
  return envelope.data;
}

export async function listMyAddresses(token: string): Promise<CustomerAddress[]> {
  const envelope = await gatewayRequest<{ data: CustomerAddress[] }>('v1/customers/me/addresses', { method: 'GET', token });
  return envelope.data;
}

function addressBody(input: AddressInput): Record<string, unknown> {
  return {
    label: input.label,
    recipient_name: input.recipientName,
    phone: input.phone,
    address_line1: input.addressLine1,
    address_line2: input.addressLine2,
    city: input.city,
    region: input.region,
    postal_code: input.postalCode,
    country_code: input.countryCode,
    is_default_shipping: input.isDefaultShipping,
    is_default_billing: input.isDefaultBilling,
    expected_version: input.expectedVersion,
  };
}

export async function addMyAddress(token: string, input: AddressInput): Promise<CustomerAddress> {
  const envelope = await gatewayRequest<{ data: CustomerAddress }>('v1/customers/me/addresses', { method: 'POST', token, body: addressBody(input) });
  return envelope.data;
}

export async function updateMyAddress(token: string, addressId: string, input: Partial<AddressInput> & { expectedVersion: number }): Promise<CustomerAddress> {
  const envelope = await gatewayRequest<{ data: CustomerAddress }>(`v1/customers/me/addresses/${addressId}`, {
    method: 'PATCH',
    token,
    body: addressBody(input as AddressInput),
  });
  return envelope.data;
}

export async function deleteMyAddress(token: string, addressId: string, expectedVersion: number): Promise<void> {
  await gatewayRequest(`v1/customers/me/addresses/${addressId}`, { method: 'DELETE', token, body: { expected_version: expectedVersion } });
}

export async function getMyOrders(token: string, page = 1): Promise<{ data: MyOrderSummary[]; pagination?: PaginationMeta }> {
  const envelope = await gatewayRequest<{ data: MyOrderSummary[]; meta: { pagination?: PaginationMeta } }>('v1/orders/mine', { method: 'GET', token, query: { page } });
  return { data: envelope.data, pagination: envelope.meta.pagination };
}

/** Full detail mode — field-for-field the same real `Order` shape `OrderConfirmationSummary` already renders. */
export async function getMyOrder(token: string, orderId: string): Promise<Order> {
  const envelope = await gatewayRequest<{ data: Order }>(`v1/orders/mine/${orderId}`, { method: 'GET', token });
  return envelope.data;
}
