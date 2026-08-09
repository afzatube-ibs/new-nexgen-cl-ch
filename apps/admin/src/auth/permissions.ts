import type { UserDTO } from '@nexgen/api-client';

/**
 * Flattens a UserDTO's roles→permissions into a single lookup set — computed
 * once per user object, not per check. `user.roles` is defensively treated
 * as possibly absent: `AuthController::login()` (apps/backend) does not
 * eager-load the relation the way `GET /api/v1/auth/me` does, so
 * `UserResource`'s `whenLoaded('roles')` omits the key entirely from a
 * fresh login response — confirmed live (a real "Cannot read properties of
 * undefined (reading 'flatMap')" crash immediately after login), not a
 * hypothetical. `useAuth.ts`'s `login()` also fixes this at the source by
 * re-fetching `/auth/me` right after login so the session is always fully
 * populated; this fallback exists so the function itself is correct
 * regardless of which caller's data happens to be incomplete.
 */
export function permissionSet(user: UserDTO | null): Set<string> {
  if (!user?.roles) return new Set();
  const keys = user.roles.flatMap((role) => role.permissions.map((permission) => permission.key));
  return new Set(keys);
}

/** `module.resource.action` shape, per 06_API_STANDARD.md / 08_SECURITY_STANDARD.md — mirrors the backend's own `EnsurePermission` middleware philosophy: a denial is explicit and structural. */
export function hasPermission(permissions: Set<string>, key: string): boolean {
  return permissions.has(key);
}

/** True if the user holds at least one of the given keys — used for a nav entry/route guarded by several equally-sufficient permissions. */
export function hasAnyPermission(permissions: Set<string>, keys: string[]): boolean {
  if (keys.length === 0) return true;
  return keys.some((key) => permissions.has(key));
}
