import { lazy } from 'react';
import { Star } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute } from '../../registry/types.js';

/**
 * Reviews — Production Completion Plan v2, Milestone 13 (Reviews Admin
 * Moderation UI). Milestone 11 built the real backend domain and
 * Storefront submission/display path but deliberately left the Admin
 * moderation UI unbuilt (a disclosed, named gap in that milestone's own
 * completion report) — this module closes it, on top of the real,
 * already-complete backend `app/Domains/Commerce/Reviews`. Registered
 * through the identical `registerModule()` mechanism every prior module
 * uses — no Admin Shell/router/Sidebar change required.
 */

const routes: ModuleRoute[] = [
  {
    path: 'reviews',
    element: lazy(() => import('./list/ReviewsListPage.js').then((m) => ({ default: m.ReviewsListPage }))),
    breadcrumb: 'Reviews',
    permissions: ['reviews.reviews.view'],
  },
  {
    path: 'reviews/activity',
    element: lazy(() => import('./activity/ReviewsAuditLogPage.js').then((m) => ({ default: m.ReviewsAuditLogPage }))),
    breadcrumb: 'Reviews Activity',
    permissions: ['reviews.audit_log.view'],
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'reviews',
    label: 'Reviews',
    icon: Star,
    children: [
      { id: 'reviews-list', label: 'Reviews', path: 'reviews', permissions: ['reviews.reviews.view'] },
      { id: 'reviews-activity', label: 'Reviews Activity', path: 'reviews/activity', permissions: ['reviews.audit_log.view'] },
    ],
  },
];

registerModule({ id: 'reviews', navigation, routes });
