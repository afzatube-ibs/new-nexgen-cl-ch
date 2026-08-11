import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';

export interface VersionedDTO {
  id: string;
  version: number;
}

export interface ListQuery {
  page?: number;
  perPage?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * `Warehouse` is Inventory's one entity that follows the platform's
 * standard list/get/create/update/archive/destroy/restore REST shape
 * (`apps/backend/.../Inventory/routes.php`) — the same shape Catalog's own
 * `catalog/resourceClient.ts` factors out. Kept as Inventory's own small
 * copy rather than importing Catalog's, matching this codebase's
 * established "each module owns its own copy of shared-shaped
 * infrastructure" convention (see e.g. `AuditLogger`/`PermissionRegistry`/
 * `HasOptimisticLocking` each existing once per backend module). Stock
 * Items, Adjustments, and Audit Logs don't fit this shape (no create/
 * archive/destroy of their own) and are implemented directly in their own
 * files instead.
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
    restore: (id: string) => client.post<DataEnvelope<TDTO>>(`${basePath}/${id}/restore`).then((r) => r.data),
  };
}
