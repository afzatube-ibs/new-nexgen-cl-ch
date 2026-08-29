import type { ApiClient } from './client.js';
import type { DataEnvelope, UserDTO } from './types.js';

/**
 * Milestone 6 (Identity & Access Admin UI). `UserRoleController`
 * (`apps/backend/.../IdentityAccess/Http/Controllers/UserRoleController.php`)
 * — modeled as its own nested resource under a user, distinct from
 * `updateUser()`'s own field updates, matching the real backend's own
 * separation (a materially more sensitive operation, its own permission
 * `identity_access.user_roles.manage`).
 */

export function assignRole(client: ApiClient, userId: string, roleId: string): Promise<UserDTO> {
  return client.post<DataEnvelope<UserDTO>>(`/users/${userId}/roles`, { role_id: roleId }).then((r) => r.data);
}

export function revokeRole(client: ApiClient, userId: string, roleId: string): Promise<void> {
  return client.delete<void>(`/users/${userId}/roles/${roleId}`);
}
