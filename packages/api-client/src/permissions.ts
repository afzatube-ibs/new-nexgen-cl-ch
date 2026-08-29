import type { ApiClient } from './client.js';
import type { ListEnvelope, PermissionDTO } from './types.js';

/**
 * Milestone 6 (Identity & Access Admin UI). `GET /api/v1/permissions` —
 * `PermissionController`, read-only per that controller's own docblock
 * ("the catalog is code-registered, never admin-created — this
 * controller exists only so the admin surface can list available
 * permissions when composing a role"). No pagination on the real
 * backend route (`Permission::query()->...->get()`, not `paginate()`) —
 * this returns the real, complete list directly, never a
 * `ListEnvelope`-shaped partial page.
 */
export async function listPermissions(client: ApiClient): Promise<PermissionDTO[]> {
  const response = await client.get<ListEnvelope<PermissionDTO>>('/permissions');
  return response.data;
}
