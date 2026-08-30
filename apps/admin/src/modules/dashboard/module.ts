import { lazy } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { DashboardWidgetDefinition } from '../../registry/types.js';

/**
 * Production Completion Plan v2, Milestone 12 (Production Readiness
 * Indicators) — the one real, cross-cutting dashboard widget with no
 * single owning business module (it reads Payments, Shipping,
 * Notifications, and Catalog together), registered by the Dashboard
 * module itself for that reason, first in registration order
 * (`modules/index.ts`) so it renders at the top of the grid — the first
 * thing a merchant sees. Unlike every other widget's own single
 * `permissions` entry, this one declares none: it is visible to every
 * staff member with Dashboard access, and each of its own rows degrades
 * to an honest "couldn't check" state individually if the caller lacks
 * that row's specific permission, rather than hiding the whole widget
 * behind an all-or-nothing gate that doesn't fit its cross-cutting shape.
 */
const dashboardWidgets: DashboardWidgetDefinition[] = [
  {
    id: 'production-readiness',
    span: 12,
    component: lazy(() => import('./widgets/ProductionReadinessWidget.js').then((m) => ({ default: m.ProductionReadinessWidget }))),
  },
];

/** The Admin Engine's own Dashboard, registered through the same framework a future Catalog/Orders module uses — proof the framework needs no special-casing for "built-in" vs. "business" modules. */
registerModule({
  id: 'dashboard',
  navigation: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' }],
  routes: [
    {
      path: '',
      element: lazy(() => import('./DashboardPage.js').then((m) => ({ default: m.DashboardPage }))),
      breadcrumb: 'Dashboard',
    },
  ],
  dashboardWidgets,
});
