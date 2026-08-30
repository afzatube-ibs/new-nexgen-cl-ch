import { lazy } from 'react';
import { Users } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute, DashboardWidgetDefinition } from '../../registry/types.js';

/**
 * Customers — Phase 2.5, on top of the real, already-complete backend
 * Customers module (`apps/backend/app/Domains/Commerce/Customers/`).
 * Registered through the identical `registerModule()` mechanism Catalog/
 * Inventory/Pricing already use — no Admin Shell/router/Sidebar change
 * required. Continues from the approved `PHASE_2_5_CUSTOMERS_ARCHITECTURE.md`
 * research; no further architecture research performed here.
 *
 * Slice 1: Customer CRUD (list, detail, create, edit, archive, delete) and
 * Address Book management. Customer Detail is a dedicated route
 * (`customers/:id`), not a drawer, per the architecture doc's own §5.
 *
 * Slice 2 — Customer Activity & Commerce Foundation: fills in Customer
 * Detail's own Activity section with a real, bounded read of Customers'
 * own audit log (no per-customer `target_id` filter exists on the real
 * backend — see `activity/CustomerAuditLogPage.tsx`'s own docblock for
 * that constraint and how it's handled honestly), adds the dedicated
 * module-wide "Customers Audit Log" screen registered below, a real
 * "Recent Orders" section reading Orders' own genuinely `customer_id`-
 * filterable `GET /orders` (confirmed by reading `OrderController::index`
 * directly — no Orders module is built, read-only consumption only), and
 * wires the `GET /customers/{id}/export` endpoint Slice 1 deliberately
 * deferred. No new endpoint, table, permission, or business rule anywhere
 * in this slice.
 */

const routes: ModuleRoute[] = [
  {
    path: 'customers',
    element: lazy(() => import('./list/CustomersListPage.js').then((m) => ({ default: m.CustomersListPage }))),
    breadcrumb: 'Customers',
    permissions: ['customers.customers.view'],
  },
  {
    path: 'customers/audit-log',
    element: lazy(() => import('./activity/CustomerAuditLogPage.js').then((m) => ({ default: m.CustomerAuditLogPage }))),
    breadcrumb: 'Audit Log',
    permissions: ['customers.audit_log.view'],
  },
  {
    path: 'customers/:id',
    element: lazy(() => import('./detail/CustomerDetailPage.js').then((m) => ({ default: m.CustomerDetailPage }))),
    breadcrumb: 'Customer',
    permissions: ['customers.customers.view'],
  },
];

/** Production Completion Plan v2, Milestone 8 (Dashboard Real Widgets). */
const dashboardWidgets: DashboardWidgetDefinition[] = [
  {
    id: 'customers-latest',
    span: 6,
    permissions: ['customers.customers.view'],
    component: lazy(() => import('./widgets/LatestCustomersWidget.js').then((m) => ({ default: m.LatestCustomersWidget }))),
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    children: [
      { id: 'customers-list', label: 'Customers', path: 'customers', permissions: ['customers.customers.view'] },
      { id: 'customers-audit-log', label: 'Audit Log', path: 'customers/audit-log', permissions: ['customers.audit_log.view'] },
    ],
  },
];

registerModule({ id: 'customers', navigation, routes, dashboardWidgets });
