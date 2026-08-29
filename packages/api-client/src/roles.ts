import type { ApiClient } from './client.js';
import type { DataEnvelope, ListEnvelope, RoleDTO } from './types.js';

/**
 * Milestone 6 (Identity & Access Admin UI). `RoleController`
 * (`apps/backend/.../IdentityAccess/Http/Controllers/RoleController.php`,
 * re-verified from source) — no `archive()` route exists for a Role
 * (only Users are archivable; a Role is created, edited, or permanently
 * deleted), so this deliberately does not offer one, per this codebase's
 * own "never include a method against a route that doesn't exist"
 * convention (`customers/resourceClient.ts`'s own docblock states the
 * identical rule for `restore()`).
 */

export interface CreateRoleInput {
  name: string;
  label: string;
  permissions?: string[];
}

export interface UpdateRoleInput {
  label?: string;
  permissions?: string[];
  expectedVersion: number;
}

export function listRoles(client: ApiClient): Promise<ListEnvelope<RoleDTO>> {
  return client.get<ListEnvelope<RoleDTO>>('/roles', { query: { per_page: 100 } });
}

export function getRole(client: ApiClient, id: string): Promise<RoleDTO> {
  return client.get<DataEnvelope<RoleDTO>>(`/roles/${id}`).then((r) => r.data);
}

export function createRole(client: ApiClient, input: CreateRoleInput): Promise<RoleDTO> {
  return client.post<DataEnvelope<RoleDTO>>('/roles', { name: input.name, label: input.label, permissions: input.permissions }).then((r) => r.data);
}

/**
 * `permissions` is omitted from the request body entirely when not
 * provided (rather than sent as `undefined`) — `UpdateRoleAction` only
 * replaces a role's permission set `$request->has('permissions')` is
 * true (confirmed by reading `RoleController::update()` directly); a
 * caller updating only `label` must not risk the backend interpreting an
 * explicit empty/undefined value as "clear every permission."
 */
export function updateRole(client: ApiClient, id: string, input: UpdateRoleInput): Promise<RoleDTO> {
  const body: Record<string, unknown> = { expected_version: input.expectedVersion };
  if (input.label !== undefined) body.label = input.label;
  if (input.permissions !== undefined) body.permissions = input.permissions;
  return client.patch<DataEnvelope<RoleDTO>>(`/roles/${id}`, body).then((r) => r.data);
}

export function deleteRole(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return client.delete<void>(`/roles/${id}`, { expected_version: expectedVersion });
}
