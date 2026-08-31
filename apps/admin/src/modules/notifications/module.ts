import { lazy } from 'react';
import { Mail } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute } from '../../registry/types.js';

/**
 * Notifications — Production Completion Plan v2, Milestone 16 (Admin
 * Notifications UI). The real backend (`app/Domains/Operations/
 * Notifications`) has had a complete, tested Templates/Notifications/
 * Retry/Cancel/Audit surface since Phase 1, with no Admin UI at all —
 * disclosed explicitly in Milestone 3's own completion report ("Admin
 * UI for notification logs/templates: Not built this pass — descoped as
 * a separate, larger Admin-surface gap") and never picked up since.
 * Registered through the identical `registerModule()` mechanism every
 * prior module uses — no Admin Shell/router/Sidebar change required.
 */

const routes: ModuleRoute[] = [
  {
    path: 'notifications/log',
    element: lazy(() => import('./log/NotificationsListPage.js').then((m) => ({ default: m.NotificationsListPage }))),
    breadcrumb: 'Notifications',
    permissions: ['notifications.notifications.view'],
  },
  {
    path: 'notifications/log/:id',
    element: lazy(() => import('./log/NotificationDetailPage.js').then((m) => ({ default: m.NotificationDetailPage }))),
    breadcrumb: 'Notification Detail',
    permissions: ['notifications.notifications.view'],
  },
  {
    path: 'notifications/templates',
    element: lazy(() => import('./templates/NotificationTemplatesListPage.js').then((m) => ({ default: m.NotificationTemplatesListPage }))),
    breadcrumb: 'Templates',
    permissions: ['notifications.templates.view'],
  },
  {
    path: 'notifications/activity',
    element: lazy(() => import('./activity/NotificationsAuditLogPage.js').then((m) => ({ default: m.NotificationsAuditLogPage }))),
    breadcrumb: 'Notifications Activity',
    permissions: ['notifications.audit_log.view'],
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Mail,
    children: [
      { id: 'notifications-log', label: 'Notifications', path: 'notifications/log', permissions: ['notifications.notifications.view'] },
      { id: 'notifications-templates', label: 'Templates', path: 'notifications/templates', permissions: ['notifications.templates.view'] },
      { id: 'notifications-activity', label: 'Activity', path: 'notifications/activity', permissions: ['notifications.audit_log.view'] },
    ],
  },
];

registerModule({ id: 'notifications', navigation, routes });
