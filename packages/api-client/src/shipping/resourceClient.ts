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
 * Shared list/get/create/update/archive/destroy REST shape for Shipping's
 * three configuration resources (Zones/Methods/Rates) — mirrors Pricing's
 * own `resourceClient.ts` exactly, duplicated rather than imported per this
 * codebase's established "each module owns its own copy of shared-shaped
 * infrastructure" convention. **No `restore()` method** — confirmed by
 * reading `routes.php` directly: no `POST /shipping-{zones,methods,rates}/
 * {id}/restore` route exists for any of the three, the identical gap
 * Pricing's own Tax Zones/Classes/Rates and Price Lists already have.
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
