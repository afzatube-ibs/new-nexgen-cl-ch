import { lazy } from 'react';
import { Truck } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute } from '../../registry/types.js';

/**
 * Shipping & Fulfillment — Phase 2.8 (`planning/architecture/
 * PHASE_2_8_SHIPPING_ARCHITECTURE.md`), on top of the real, already-complete
 * backend `app/Domains/Operations/{Shipping,Fulfillment}`. Registered
 * through the identical `registerModule()` mechanism every prior module
 * uses — no Admin Shell/router/Sidebar change required.
 *
 * Built across three slices, all frozen: **Slice 1** — Shipping Zones/
 * Methods/Rates full CRUD (mirrors Pricing's own Tax Engine slice — same
 * "fetch once, client-filter" shape, same "no restore endpoint" gap),
 * Shipments read-only List + Detail, and both modules' own Audit Logs.
 * **Slice 2** — the real Pick/Pack/Dispatch/In-Transit/Deliver/Fail/Cancel
 * workflow action bar, status rail, and dispatch dialog, permission-gated
 * per Fulfillment's own granular `.pick`/`.pack`/`.dispatch`/`.cancel` keys.
 * **Slice 3** — Destination + weight editing (one combined dialog, since
 * they're the same backend endpoint), item add/remove, notes, and the
 * shipment-preparation readiness checklist. See
 * `planning/reviews/PHASE_2_8_SLICE_{1,2,3}_*_REPORT.md` and
 * `PHASE_2_8_SHIPPING_FREEZE_REPORT.md` for what each slice built and its
 * own honest, documented backend limitations.
 */

const routes: ModuleRoute[] = [
  {
    path: 'shipping/zones',
    element: lazy(() => import('./zones/ZonesListPage.js').then((m) => ({ default: m.ZonesListPage }))),
    breadcrumb: 'Shipping Zones',
    permissions: ['shipping.zones.view'],
  },
  {
    path: 'shipping/methods',
    element: lazy(() => import('./methods/MethodsListPage.js').then((m) => ({ default: m.MethodsListPage }))),
    breadcrumb: 'Shipping Methods',
    permissions: ['shipping.methods.view'],
  },
  {
    path: 'shipping/rates',
    element: lazy(() => import('./rates/RatesListPage.js').then((m) => ({ default: m.RatesListPage }))),
    breadcrumb: 'Shipping Rates',
    permissions: ['shipping.rates.view'],
  },
  {
    path: 'shipping/shipments',
    element: lazy(() => import('./shipments/ShipmentsListPage.js').then((m) => ({ default: m.ShipmentsListPage }))),
    breadcrumb: 'Shipments',
    permissions: ['fulfillment.shipments.view'],
  },
  {
    path: 'shipping/shipments/:id',
    element: lazy(() => import('./shipments/ShipmentDetailPage.js').then((m) => ({ default: m.ShipmentDetailPage }))),
    breadcrumb: 'Shipment Detail',
    permissions: ['fulfillment.shipments.view'],
  },
  {
    path: 'shipping/activity',
    element: lazy(() => import('./activity/ShippingAuditLogPage.js').then((m) => ({ default: m.ShippingAuditLogPage }))),
    breadcrumb: 'Shipping Activity',
    permissions: ['shipping.audit_log.view'],
  },
  {
    path: 'shipping/fulfillment-activity',
    element: lazy(() => import('./activity/FulfillmentAuditLogPage.js').then((m) => ({ default: m.FulfillmentAuditLogPage }))),
    breadcrumb: 'Fulfillment Activity',
    permissions: ['fulfillment.audit_log.view'],
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'shipping',
    label: 'Shipping',
    icon: Truck,
    children: [
      { id: 'shipping-shipments', label: 'Shipments', path: 'shipping/shipments', permissions: ['fulfillment.shipments.view'] },
      { id: 'shipping-zones', label: 'Zones', path: 'shipping/zones', permissions: ['shipping.zones.view'] },
      { id: 'shipping-methods', label: 'Methods', path: 'shipping/methods', permissions: ['shipping.methods.view'] },
      { id: 'shipping-rates', label: 'Rates', path: 'shipping/rates', permissions: ['shipping.rates.view'] },
      { id: 'shipping-activity', label: 'Shipping Activity', path: 'shipping/activity', permissions: ['shipping.audit_log.view'] },
      { id: 'shipping-fulfillment-activity', label: 'Fulfillment Activity', path: 'shipping/fulfillment-activity', permissions: ['fulfillment.audit_log.view'] },
    ],
  },
];

registerModule({ id: 'shipping', navigation, routes });
