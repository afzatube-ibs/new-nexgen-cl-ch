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
 * `Customer` follows the platform's standard list/get/create/update/
 * archive/destroy REST shape (`apps/backend/.../Customers/routes.php`) —
 * but, like every one of Pricing's own archivable entities audited this
 * engagement (`packages/api-client/src/pricing/resourceClient.ts`'s own
 * docblock), **no `restore()` method exists here**: confirmed by reading
 * `routes.php` directly, no `POST /customers/{id}/restore` route exists.
 * Omitted rather than included-but-unused, for the identical reason
 * Pricing's own copy gives — including it would invite a future caller to
 * wire a "Restore" button against an endpoint that doesn't exist. Kept as
 * Customers' own small copy rather than importing Catalog's or Pricing's,
 * matching this codebase's established "each module owns its own copy of
 * shared-shaped infrastructure" convention.
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
