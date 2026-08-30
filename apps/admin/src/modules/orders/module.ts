import { lazy } from 'react';
import { Package } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute, DashboardWidgetDefinition } from '../../registry/types.js';

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

/**
 * Production Completion Plan v2, Milestone 8 (Dashboard Real Widgets) —
 * Orders' own contribution to the real, pluggable Dashboard
 * (`registry/types.ts`'s own `dashboardWidgets` contract, unused by any
 * module until this milestone). Every widget reads a real endpoint — no
 * fabricated KPI stands in for data that doesn't exist. `RecentActivity`
 * is gated by `orders.audit_log.view`, distinct from every other widget
 * here's `orders.orders.view` — it reads a more sensitive endpoint.
 */
const dashboardWidgets: DashboardWidgetDefinition[] = [
  {
    id: 'orders-pending',
    span: 4,
    permissions: ['orders.orders.view'],
    component: lazy(() => import('./widgets/PendingOrdersWidget.js').then((m) => ({ default: m.PendingOrdersWidget }))),
  },
  {
    id: 'orders-today',
    span: 4,
    permissions: ['orders.orders.view'],
    component: lazy(() => import('./widgets/TodaysOrdersWidget.js').then((m) => ({ default: m.TodaysOrdersWidget }))),
  },
  {
    id: 'orders-revenue-today',
    span: 4,
    permissions: ['orders.orders.view'],
    component: lazy(() => import('./widgets/TodaysRevenueWidget.js').then((m) => ({ default: m.TodaysRevenueWidget }))),
  },
  {
    id: 'orders-revenue-month',
    span: 6,
    permissions: ['orders.orders.view'],
    component: lazy(() => import('./widgets/ThisMonthRevenueWidget.js').then((m) => ({ default: m.ThisMonthRevenueWidget }))),
  },
  {
    id: 'orders-top-products',
    span: 6,
    permissions: ['orders.orders.view'],
    component: lazy(() => import('./widgets/TopSellingProductsWidget.js').then((m) => ({ default: m.TopSellingProductsWidget }))),
  },
  {
    id: 'orders-recent',
    span: 8,
    permissions: ['orders.orders.view'],
    component: lazy(() => import('./widgets/RecentOrdersWidget.js').then((m) => ({ default: m.RecentOrdersWidget }))),
  },
  {
    id: 'orders-recent-activity',
    span: 4,
    permissions: ['orders.audit_log.view'],
    component: lazy(() => import('./widgets/RecentActivityWidget.js').then((m) => ({ default: m.RecentActivityWidget }))),
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

registerModule({ id: 'orders', navigation, routes, dashboardWidgets });
