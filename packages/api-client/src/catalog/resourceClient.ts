import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';

export interface VersionedDTO {
  id: string;
  version: number;
}

export interface ListQuery {
  search?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * The seven Catalog taxonomy entities (Brands, Categories, Collections,
 * Tags, Attribute Groups, Attributes, Options) — and Products — all share
 * one REST shape (`apps/backend/.../Catalog/routes.php`): list/get/create/
 * update, plus `destroy`+`restore`, plus `archive` on the entities that
 * actually have a `status` column. This factory implements that shape once;
 * each entity's own file in this folder supplies only its typed field
 * mapping (camelCase DTO <-> the exact snake_case body the real
 * Create/Update FormRequest expects), never re-implementing the HTTP verbs.
 */
export function createResourceClient<TDTO extends VersionedDTO>(client: ApiClient, basePath: string) {
  return {
    list: (query?: ListQuery) => client.get<ListEnvelope<TDTO>>(basePath, { query }),
    get: (id: string) => client.get<DataEnvelope<TDTO>>(`${basePath}/${id}`).then((r) => r.data),
    create: (body: Record<string, unknown>) => client.post<DataEnvelope<TDTO>>(basePath, body).then((r) => r.data),
    update: (id: string, body: Record<string, unknown>) =>
      client.patch<DataEnvelope<TDTO>>(`${basePath}/${id}`, body).then((r) => r.data),
    /** `catalog.audit_log.view`-adjacent optimistic-lock guard shared by every archive/destroy — `ExpectedVersionRequest`, apps/backend. */
    archive: (id: string, expectedVersion: number) =>
      client.post<DataEnvelope<TDTO>>(`${basePath}/${id}/archive`, { expected_version: expectedVersion }).then((r) => r.data),
    destroy: (id: string, expectedVersion: number) =>
      client.delete<void>(`${basePath}/${id}`, { expected_version: expectedVersion }),
    restore: (id: string) => client.post<DataEnvelope<TDTO>>(`${basePath}/${id}/restore`).then((r) => r.data),
  };
}
