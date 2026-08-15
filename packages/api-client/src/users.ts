import type { ApiClient } from './client.js';
import type { ListEnvelope, UserDTO } from './types.js';

/**
 * `GET /api/v1/users` — Identity & Access's real staff directory
 * (`identity_access.users.view`), already used by Settings' own User/Role
 * management. Consumed here read-only, for exactly one purpose: resolving
 * an audit log entry's raw `actorId` (a UUID) to a real staff name for
 * display — the same client-side id→name cross-referencing this codebase
 * already established for Tax Rates' zone/class names. `per_page: 100` —
 * a merchant's real staff roster is realistically small; any actor beyond
 * that bound simply falls back to showing their raw id, not a crash or a
 * fabricated name.
 */
export async function listUsers(client: ApiClient): Promise<UserDTO[]> {
  const response = await client.get<ListEnvelope<UserDTO>>('/users', { query: { per_page: 100 } });
  return response.data;
}
