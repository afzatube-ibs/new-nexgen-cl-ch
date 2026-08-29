import type { PermissionDTO } from '@nexgen/api-client';

/**
 * Groups the real, code-registered permission catalog by each
 * permission's own real `module` field, sorted alphabetically by module
 * name — matching `PermissionController::index()`'s own
 * `orderBy('module')->orderBy('key')`, the identical grouping/order the
 * real backend already treats as canonical. Extracted from
 * `RoleFormDialog.tsx` as its own pure function, matching this app's own
 * established "small, non-trivial transformations get their own unit
 * test" convention (`catalog/products/editor/variants/
 * variantCombinations.ts`).
 */
export function groupPermissionsByModule(permissions: PermissionDTO[]): Array<[string, PermissionDTO[]]> {
  const groups = new Map<string, PermissionDTO[]>();
  for (const permission of permissions) {
    const list = groups.get(permission.module) ?? [];
    list.push(permission);
    groups.set(permission.module, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}
