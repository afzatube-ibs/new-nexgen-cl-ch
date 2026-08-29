import { lazy } from 'react';
import { ShieldCheck } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute } from '../../registry/types.js';

/**
 * Production Completion Plan v2, Milestone 6 — Identity & Access Admin
 * UI. The real backend RBAC (`apps/backend/app/Domains/Platform/
 * IdentityAccess/`) has been mature and complete since Phase 1; this
 * module is its first-ever Admin surface — before this, the only way to
 * invite a second staff member, assign a role, or view the permission
 * catalog was a direct API call or database access, confirmed absent by
 * `find apps/admin/src/modules -maxdepth 1` returning no `identity-
 * access`/`users`/`roles` directory anywhere in this codebase.
 *
 * Registered through the identical `registerModule()` mechanism every
 * other module already uses — no Admin Shell/router/Sidebar change
 * required. Routed at `/staff`/`/roles`, not `/identity-access/*` — the
 * real, staff-facing vocabulary this module's own screens already use
 * ("Staff", "Roles"), matching how `/customers` is not `/commerce-
 * customers`.
 */

const routes: ModuleRoute[] = [
  {
    path: 'staff',
    element: lazy(() => import('./list/UsersListPage.js').then((m) => ({ default: m.UsersListPage }))),
    breadcrumb: 'Staff',
    permissions: ['identity_access.users.view'],
  },
  {
    path: 'staff/:id',
    element: lazy(() => import('./detail/UserDetailPage.js').then((m) => ({ default: m.UserDetailPage }))),
    breadcrumb: 'Staff Member',
    permissions: ['identity_access.users.view'],
  },
  {
    path: 'roles',
    element: lazy(() => import('./list/RolesListPage.js').then((m) => ({ default: m.RolesListPage }))),
    breadcrumb: 'Roles',
    permissions: ['identity_access.roles.view'],
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'identity-access',
    label: 'Access Control',
    icon: ShieldCheck,
    children: [
      { id: 'staff', label: 'Staff', path: 'staff', permissions: ['identity_access.users.view'] },
      { id: 'roles', label: 'Roles', path: 'roles', permissions: ['identity_access.roles.view'] },
    ],
  },
];

registerModule({ id: 'identity-access', navigation, routes });
