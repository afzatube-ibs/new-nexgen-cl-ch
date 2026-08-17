import { lazy } from 'react';
import { CreditCard } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute } from '../../registry/types.js';

/**
 * Payments — Phase 2.9 Slice 1 ("Merchant Payment Management",
 * `planning/architecture/PHASE_2_9_PAYMENTS_ARCHITECTURE.md`), on top of
 * the real, already-complete backend `app/Domains/Commerce/Payments`.
 * Registered through the identical `registerModule()` mechanism every
 * prior module uses — no Admin Shell/router/Sidebar change required.
 *
 * Strictly read-only, per this slice's own explicit scope: Payments List
 * (server-filtered by `order_id`/`customer_id`/`status`), Payment Detail
 * (Overview, real Transaction Timeline from `PaymentAttempt`, Customer
 * link, Order link), and Payments' own Audit Log. No Initiate/Capture/
 * Cancel/Void/Refund/Bank-Transfer-verification action is built — those
 * are real, existing backend capabilities deliberately left unwrapped,
 * per this slice's own "DO NOT BUILD" list.
 */

const routes: ModuleRoute[] = [
  {
    path: 'payments/payments',
    element: lazy(() => import('./payments/PaymentsListPage.js').then((m) => ({ default: m.PaymentsListPage }))),
    breadcrumb: 'Payments',
    permissions: ['payments.payments.view'],
  },
  {
    path: 'payments/payments/:id',
    element: lazy(() => import('./payments/PaymentDetailPage.js').then((m) => ({ default: m.PaymentDetailPage }))),
    breadcrumb: 'Payment Detail',
    permissions: ['payments.payments.view'],
  },
  {
    path: 'payments/activity',
    element: lazy(() => import('./activity/PaymentAuditLogPage.js').then((m) => ({ default: m.PaymentAuditLogPage }))),
    breadcrumb: 'Payments Activity',
    permissions: ['payments.audit_log.view'],
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'payments',
    label: 'Payments',
    icon: CreditCard,
    children: [
      { id: 'payments-payments', label: 'Payments', path: 'payments/payments', permissions: ['payments.payments.view'] },
      { id: 'payments-activity', label: 'Activity', path: 'payments/activity', permissions: ['payments.audit_log.view'] },
    ],
  },
];

registerModule({ id: 'payments', navigation, routes });
