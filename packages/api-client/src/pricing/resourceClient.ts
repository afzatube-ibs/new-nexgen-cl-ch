import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';

export interface VersionedDTO {
  id: string;
  version: number;
}

export interface ListQuery {
  page?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * `PriceList` follows the platform's standard list/get/create/update/
 * archive/destroy REST shape (`apps/backend/.../Pricing/routes.php`) — but,
 * unlike Catalog's and Inventory's own copies of this same factory, **no
 * `restore()` method exists here**. Confirmed by reading `routes.php`
 * directly: no `POST /price-lists/{id}/restore` route exists at all, for
 * any of Pricing's four archivable entities. `planning/reviews/
 * PHASE_2_4_PRICING_ARCHITECTURE_REVIEW.md`'s Task 2 finding is exactly why
 * this method is omitted rather than included-but-unused: including it
 * would invite a future caller to wire up a "Restore" button against an
 * endpoint that doesn't exist, repeating the same mistake found (and
 * already fixed once, for Inventory's Warehouse) elsewhere in this
 * engagement. Kept as Pricing's own small copy rather than importing
 * Catalog's/Inventory's, matching this codebase's established "each module
 * owns its own copy of shared-shaped infrastructure" convention.
 */
export function createResourceClient<TDTO extends VersionedDTO>(client: ApiClient, basePath: string) {
  return {
    list: (query?: ListQuery) => client.get<ListEnvelope<TDTO>>(basePath, { query }),
    get: (id: string) => client.get<DataEnvelope<TDTO>>(`${basePath}/${id}`).then((r) => r.data),
    create: (body: Record<string, unknown>) => client.post<DataEnvelope<TDTO>>(basePath, body).then((r) => r.data),
    update: (id: string, body: Record<string, unknown>) =>
      client.patch<DataEnvelope<TDTO>>(`${basePath}/${id}`, body).then((r) => r.data),
    archive: (id: string, expectedVersion: number) =>
      client.post<DataEnvelope<TDTO>>(`${basePath}/${id}/archive`, { expected_version: expectedVersion }).then((r) => r.data),
    destroy: (id: string, expectedVersion: number) =>
      client.delete<void>(`${basePath}/${id}`, { expected_version: expectedVersion }),
  };
}
