import type { ApiClient } from './client.js';
import type { DataEnvelope, ListEnvelope, StoreDTO } from './types.js';

/**
 * `GET /api/v1/stores` — Store Configuration (`MODULE:STORE_CONFIGURATION`,
 * already a real Phase 1 endpoint). Backs the Admin Shell's workspace
 * switcher (docs/frontend/ADMIN_SHELL_ARCHITECTURE.md §3): it renders the
 * current store's own name, real data, not a placeholder — only the
 * switcher's own dropdown *interaction* is a "Coming soon" placeholder,
 * pending a real multi-tenant concept to switch between.
 */
export async function listStores(client: ApiClient): Promise<StoreDTO[]> {
  const response = await client.get<ListEnvelope<StoreDTO>>('/stores');
  return response.data;
}

/** Every field `UpdateStoreRequest` (apps/backend) actually accepts. */
export interface UpdateStoreInput {
  name?: string;
  legalName?: string | null;
  currencyCode?: string;
  locale?: string;
  timezone?: string;
  contactEmail?: string;
  contactPhone?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string;
}

/**
 * `PATCH /stores/{id}` — `store_configuration.stores.manage`. Consumed for
 * the first time by Beta Experience Pack 1's own Appearance Branding
 * screen (real store name/contact/address editing) — the route itself is
 * not new; only this client wrapper is.
 */
export async function updateStore(client: ApiClient, id: string, changes: UpdateStoreInput, expectedVersion: number): Promise<StoreDTO> {
  const response = await client.patch<DataEnvelope<StoreDTO>>(`/stores/${id}`, {
    name: changes.name,
    legal_name: changes.legalName,
    currency_code: changes.currencyCode,
    locale: changes.locale,
    timezone: changes.timezone,
    contact_email: changes.contactEmail,
    contact_phone: changes.contactPhone,
    address_line1: changes.addressLine1,
    address_line2: changes.addressLine2,
    city: changes.city,
    region: changes.region,
    postal_code: changes.postalCode,
    country_code: changes.countryCode,
    expected_version: expectedVersion,
  });
  return response.data;
}
