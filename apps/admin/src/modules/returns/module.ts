import { lazy } from 'react';
import { Undo2 } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute } from '../../registry/types.js';

/**
 * Returns — Production Completion Plan v2, Milestone 7 (Admin: Fulfillment
 * & Returns UI). Fulfillment's own half was found already fully shipped
 * (inside `apps/admin/src/modules/shipping/`, registered under the
 * `shipping` module) — see that module's own docblock and this milestone's
 * completion report for the full history. This module is the genuinely
 * missing Returns half, on top of the real, already-complete backend
 * `app/Domains/Operations/Returns`. Registered through the identical
 * `registerModule()` mechanism every prior module uses — no Admin Shell/
 * router/Sidebar change required.
 */

const routes: ModuleRoute[] = [
  {
    path: 'returns/requests',
    element: lazy(() => import('./list/ReturnRequestsListPage.js').then((m) => ({ default: m.ReturnRequestsListPage }))),
    breadcrumb: 'Return Requests',
    permissions: ['returns.requests.view'],
  },
  {
    path: 'returns/requests/:id',
    element: lazy(() => import('./detail/ReturnRequestDetailPage.js').then((m) => ({ default: m.ReturnRequestDetailPage }))),
    breadcrumb: 'Return Request Detail',
    permissions: ['returns.requests.view'],
  },
  {
    path: 'returns/activity',
    element: lazy(() => import('./activity/ReturnsAuditLogPage.js').then((m) => ({ default: m.ReturnsAuditLogPage }))),
    breadcrumb: 'Returns Activity',
    permissions: ['returns.audit_log.view'],
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'returns',
    label: 'Returns',
    icon: Undo2,
    children: [
      { id: 'returns-requests', label: 'Return Requests', path: 'returns/requests', permissions: ['returns.requests.view'] },
      { id: 'returns-activity', label: 'Returns Activity', path: 'returns/activity', permissions: ['returns.audit_log.view'] },
    ],
  },
];

registerModule({ id: 'returns', navigation, routes });
