import type { UserDTO } from '@nexgen/api-client';

/** Flattens a UserDTO's roles→permissions into a single lookup set — computed once per user object, not per check. */
export function permissionSet(user: UserDTO | null): Set<string> {
  if (!user) return new Set();
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
