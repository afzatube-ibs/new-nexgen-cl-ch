import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';

/**
 * Module Registration Framework — the concrete mechanism behind Phase 2.1's
 * explicit instruction: "business modules must register themselves. No
 * hardcoded navigation. No hardcoded routes." A future Catalog/Orders/
 * Customers module ships one `ModuleDefinition` object and calls
 * `registerModule()`; the Admin Engine itself never changes.
 *
 *   Catalog Module
 *        ├── navigation
 *        ├── routes
 *        ├── permissions
 *        ├── dashboardWidgets
 *        └── settingsPanels
 *               ▼
 *      Admin Engine Registry (this file + moduleRegistry.ts)
 *               ▼
 *   Sidebar / Router / Breadcrumbs / Dashboard / Settings — all built
 *   dynamically from what's registered, never from a name hardcoded here.
 */

export interface ModuleNavItem {
  id: string;
  label: string;
  /** Lucide icon component — top-level entries should set this; sub-entries typically don't. */
  icon?: ComponentType<{ className?: string }>;
  /** Route path this entry links to (relative to `/`). Omit for a group header with only `children`. */
  path?: string;
  /** `module.resource.action` — at least one required to see this entry (empty/omitted = visible to any authenticated operator). Hidden, never disabled-but-shown, per ADMIN_SHELL_ARCHITECTURE.md §4. */
  permissions?: string[];
  children?: ModuleNavItem[];
}

export interface ModuleRoute {
  /** Path relative to `/` — e.g. `catalog/products`. */
  path: string;
  /** Route-level code splitting (PERFORMANCE_FOUNDATION.md) — every module route is its own lazy chunk. */
  element: LazyExoticComponent<ComponentType> | ComponentType;
  /** Breadcrumb label for this route — Breadcrumbs are derived from the route tree, never hand-maintained per screen (ADMIN_SHELL_ARCHITECTURE.md §5). */
  breadcrumb: string;
  /** At least one required — an unauthorized deep link renders `ForbiddenPage`, never a 404 (which would leak that the route exists). Empty/omitted = any authenticated operator. */
  permissions?: string[];
}

export interface DashboardWidgetDefinition {
  id: string;
  /** Grid span, in the Dashboard's 12-column layout — Phase 2.1's own pluggable-widget contract. */
  span: 4 | 6 | 8 | 12;
  permissions?: string[];
  component: ComponentType;
}

export interface SettingsPanelDefinition {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  permissions?: string[];
  component: ComponentType;
}

export interface ModuleDefinition {
  id: string;
  navigation?: ModuleNavItem[];
  routes?: ModuleRoute[];
  dashboardWidgets?: DashboardWidgetDefinition[];
  settingsPanels?: SettingsPanelDefinition[];
}

export interface BreadcrumbEntry {
  label: string;
  path: string;
  isCurrent: boolean;
}

export type { ReactNode };
