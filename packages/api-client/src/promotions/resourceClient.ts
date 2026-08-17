import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';

export interface VersionedDTO {
  id: string;
  version: number;
}

export interface ListQuery {
  status?: string;
  page?: number;
  perPage?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Promotions' own REST shape (`apps/backend/.../Promotions/routes.php`) —
 * list/get/create/update/archive/destroy, confirmed identical for both
 * Promotion and Coupon. Duplicated from Catalog's own `resourceClient.ts`
 * rather than imported, per this codebase's established per-module
 * convention. Deliberately has **no `restore`** — neither entity exposes a
 * restore route on this real backend, confirmed by reading `routes.php`
 * directly; callers of this factory never call a `restore` method that
 * doesn't exist here, rather than one being wired to a 404.
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
    destroy: (id: string, expectedVersion: number) => client.delete<void>(`${basePath}/${id}`, { expected_version: expectedVersion }),
  };
}
