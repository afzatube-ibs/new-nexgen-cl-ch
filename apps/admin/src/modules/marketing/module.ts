import { lazy } from 'react';
import { Megaphone } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute } from '../../registry/types.js';

/**
 * Marketing — Phase 3.0 Slice 1, on top of the real, already-complete
 * backend `app/Domains/Commerce/Promotions` (there is no module literally
 * named "Marketing" in this codebase — see `planning/architecture/
 * PHASE_3_0_MARKETING_ARCHITECTURE.md` §1 for the full rationale).
 * Registered through the identical `registerModule()` mechanism every
 * prior module uses.
 *
 * Slice 1: Promotions (full CRUD, eligibility Conditions, nested Coupons),
 * a read-only Redemption history, and Promotions' own Audit Log.
 * Slice 2 adds: a real, `promotion_id`-filtered Redemption Timeline on
 * Promotion Detail, a real "View customer" cross-link on Redemption rows
 * (never a "View order" link — `order_reference` has no real relation to
 * Orders, confirmed by reading the migration's own docblock), and a
 * Promotion/Coupon Tester tool built on the real, read-only
 * `POST /promotions/evaluate` endpoint. No Email Marketing, SMS,
 * Automation, Loyalty, Affiliate, Rewards, Referral, AI Marketing, or
 * Analytics — none of those exist on this real backend, per this slice's
 * own explicit "DO NOT BUILD" list.
 */

const routes: ModuleRoute[] = [
  {
    path: 'marketing/promotions',
    element: lazy(() => import('./promotions/PromotionsListPage.js').then((m) => ({ default: m.PromotionsListPage }))),
    breadcrumb: 'Promotions',
    permissions: ['promotions.promotions.view'],
  },
  {
    path: 'marketing/promotions/:id',
    element: lazy(() => import('./promotions/PromotionDetailPage.js').then((m) => ({ default: m.PromotionDetailPage }))),
    breadcrumb: 'Promotion Detail',
    permissions: ['promotions.promotions.view'],
  },
  {
    path: 'marketing/redemptions',
    element: lazy(() => import('./redemptions/RedemptionsPage.js').then((m) => ({ default: m.RedemptionsPage }))),
    breadcrumb: 'Redemptions',
    permissions: ['promotions.redemptions.view'],
  },
  {
    path: 'marketing/activity',
    element: lazy(() => import('./activity/PromotionsAuditLogPage.js').then((m) => ({ default: m.PromotionsAuditLogPage }))),
    breadcrumb: 'Marketing Activity',
    permissions: ['promotions.audit_log.view'],
  },
  {
    path: 'marketing/tester',
    element: lazy(() => import('./tester/PromotionTesterPage.js').then((m) => ({ default: m.PromotionTesterPage }))),
    breadcrumb: 'Promotion Tester',
    permissions: ['promotions.promotions.view'],
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    children: [
      { id: 'marketing-promotions', label: 'Promotions', path: 'marketing/promotions', permissions: ['promotions.promotions.view'] },
      { id: 'marketing-redemptions', label: 'Redemptions', path: 'marketing/redemptions', permissions: ['promotions.redemptions.view'] },
      { id: 'marketing-tester', label: 'Promotion Tester', path: 'marketing/tester', permissions: ['promotions.promotions.view'] },
      { id: 'marketing-activity', label: 'Activity', path: 'marketing/activity', permissions: ['promotions.audit_log.view'] },
    ],
  },
];

registerModule({ id: 'marketing', navigation, routes });
