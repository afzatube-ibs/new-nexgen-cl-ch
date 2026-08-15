import { lazy } from 'react';
import { Package } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute } from '../../registry/types.js';

/**
 * Orders — Phase 2.6, Slice 1 (Order Management), on top of the real,
 * already-complete backend Orders module (`apps/backend/app/Domains/
 * Commerce/Orders/`). Registered through the identical `registerModule()`
 * mechanism every prior module already uses — no Admin Shell/router/
 * Sidebar change required. Continues from the approved
 * `planning/architecture/PHASE_2_6_ORDERS_ARCHITECTURE.md` research; no
 * further architecture research performed here.
 *
 * READ + LIFECYCLE MANAGEMENT ONLY: Orders List, Order Detail (Items,
 * Billing/Shipping Address, Discounts, Totals, Notes, Timeline), the five
 * real status transitions (Confirm/Start Processing/Ship/Deliver/Cancel),
 * and a dedicated Orders Audit Log screen. No manual order-entry UI —
 * `CreateOrderAction`'s own docblock and `OrderController`'s own docblock
 * both name Checkout as the only real creation path (architecture doc
 * §2.2/§6.1) — that remains an explicit, separate Product Owner decision,
 * not built in this slice.
 */

const routes: ModuleRoute[] = [
  {
    path: 'orders',
    element: lazy(() => import('./list/OrdersListPage.js').then((m) => ({ default: m.OrdersListPage }))),
    breadcrumb: 'Orders',
    permissions: ['orders.orders.view'],
  },
  {
    path: 'orders/audit-log',
    element: lazy(() => import('./activity/OrderAuditLogPage.js').then((m) => ({ default: m.OrderAuditLogPage }))),
    breadcrumb: 'Audit Log',
    permissions: ['orders.audit_log.view'],
  },
  {
    path: 'orders/:id',
    element: lazy(() => import('./detail/OrderDetailPage.js').then((m) => ({ default: m.OrderDetailPage }))),
    breadcrumb: 'Order',
    permissions: ['orders.orders.view'],
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'orders',
    label: 'Orders',
    icon: Package,
    children: [
      { id: 'orders-list', label: 'Orders', path: 'orders', permissions: ['orders.orders.view'] },
      { id: 'orders-audit-log', label: 'Audit Log', path: 'orders/audit-log', permissions: ['orders.audit_log.view'] },
    ],
  },
];

registerModule({ id: 'orders', navigation, routes });
