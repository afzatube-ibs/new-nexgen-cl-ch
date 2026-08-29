import type { ApiClient } from './client.js';
import type { DataEnvelope, ListEnvelope, UserDTO } from './types.js';

/**
 * `GET /api/v1/users` — Identity & Access's real staff directory
 * (`identity_access.users.view`), already used by Customers' own audit
 * log actor-name resolution (`useStaffDirectory`). Consumed here read-only,
 * for exactly one purpose: resolving an audit log entry's raw `actorId`
 * (a UUID) to a real staff name for display — the same client-side
 * id→name cross-referencing this codebase already established for Tax
 * Rates' zone/class names. `per_page: 100` — a merchant's real staff
 * roster is realistically small; any actor beyond that bound simply falls
 * back to showing their raw id, not a crash or a fabricated name.
 */
export async function listUsers(client: ApiClient): Promise<UserDTO[]> {
  const response = await client.get<ListEnvelope<UserDTO>>('/users', { query: { per_page: 100 } });
  return response.data;
}

/**
 * Milestone 6 (Identity & Access Admin UI) — the real, full CRUD surface
 * `UserController` already exposes (`apps/backend/.../IdentityAccess/
 * Http/Controllers/UserController.php`, re-verified from source). Kept in
 * this same file rather than a new `identityAccess/` subfolder — this
 * module already established flat top-level files (`users.ts`, `auth.ts`)
 * before this milestone; a sibling `roles.ts`/`permissions.ts`/
 * `userRoles.ts` continues that, rather than introducing a subfolder
 * style for only half of one module.
 */

export interface ListUsersQuery {
  status?: 'active' | 'archived';
  sort?: 'name' | 'email' | 'created_at';
  direction?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  expectedVersion: number;
}

/** `UserController::index` — genuinely server-side `status`/`sort`/`direction`/`page`/`per_page`, confirmed by reading the controller directly. Never fetched-then-filtered client-side. */
export function listUsersPaginated(client: ApiClient, query?: ListUsersQuery): Promise<ListEnvelope<UserDTO>> {
  return client.get<ListEnvelope<UserDTO>>('/users', {
    query: query && { status: query.status, sort: query.sort, direction: query.direction, page: query.page, per_page: query.perPage },
  });
}

/** `UserController::show` — the only endpoint that embeds `roles` on a fresh read (`$user->load('roles')`); `auth/me`'s own `UserResource` also embeds `roles.permissions` but is a distinct endpoint. */
export function getUser(client: ApiClient, id: string): Promise<UserDTO> {
  return client.get<DataEnvelope<UserDTO>>(`/users/${id}`).then((r) => r.data);
}

/**
 * `POST /api/v1/users` — `RegisterUserAction`. Deliberately named
 * `createUser`, not `inviteUser`: the real backend issues no invitation
 * email of its own (no such Action/listener exists) — this creates a
 * real account with a real, staff-chosen password immediately, exactly
 * what the real endpoint does; naming it "invite" would promise a real-
 * time email flow that doesn't exist.
 */
export function createUser(client: ApiClient, input: CreateUserInput): Promise<UserDTO> {
  return client
    .post<DataEnvelope<UserDTO>>('/users', {
      name: input.name,
      email: input.email,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    })
    .then((r) => r.data);
}

export function updateUser(client: ApiClient, id: string, input: UpdateUserInput): Promise<UserDTO> {
  const { expectedVersion, ...rest } = input;
  return client.patch<DataEnvelope<UserDTO>>(`/users/${id}`, { name: rest.name, email: rest.email, expected_version: expectedVersion }).then((r) => r.data);
}

export function archiveUser(client: ApiClient, id: string, expectedVersion: number): Promise<UserDTO> {
  return client.post<DataEnvelope<UserDTO>>(`/users/${id}/archive`, { expected_version: expectedVersion }).then((r) => r.data);
}

/** `DELETE /api/v1/users/{user}` — `DeleteUserAction`, real, permanent, and revokes every one of that user's Sanctum tokens server-side (confirmed by reading the Action directly). Never offered next to "Archive" without making that distinction explicit — see `UserDetailPage.tsx`'s own confirmation copy. */
export function deleteUser(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return client.delete<void>(`/users/${id}`, { expected_version: expectedVersion });
}
