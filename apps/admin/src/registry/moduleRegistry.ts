import type {
  ModuleDefinition,
  ModuleNavItem,
  ModuleRoute,
  DashboardWidgetDefinition,
  SettingsPanelDefinition,
} from './types.js';

const modules = new Map<string, ModuleDefinition>();

/**
 * Every module — including the Admin Engine's own built-in Dashboard and
 * Settings "modules" (`src/modules/`) — calls this exactly once, typically
 * from a top-level `src/modules/index.ts` that simply imports every
 * module's own `module.ts` for its side effect. This is the entire
 * boilerplate a future business module needs: one file, one call.
 */
export function registerModule(definition: ModuleDefinition): void {
  if (modules.has(definition.id)) {
    throw new Error(`A module with id "${definition.id}" is already registered.`);
  }
  modules.set(definition.id, definition);
}

/** Test-only escape hatch — production code never needs to unregister a module. */
export function _resetRegistryForTests(): void {
  modules.clear();
}

function hasAccess(permissions: Set<string>, required: string[] | undefined): boolean {
  if (!required || required.length === 0) return true;
  return required.some((key) => permissions.has(key));
}

function filterNavItems(items: ModuleNavItem[], permissions: Set<string>): ModuleNavItem[] {
  return items
    .filter((item) => hasAccess(permissions, item.permissions))
    .map((item) => ({
      ...item,
      children: item.children ? filterNavItems(item.children, permissions) : undefined,
    }))
    .filter((item) => item.path !== undefined || (item.children && item.children.length > 0));
}

/** The Sidebar's entire data source (docs/frontend/ADMIN_SHELL_ARCHITECTURE.md §4) — permission-filtered, hide-not-disable. */
export function getNavigationTree(permissions: Set<string>): ModuleNavItem[] {
  return [...modules.values()].flatMap((module) => filterNavItems(module.navigation ?? [], permissions));
}

/** The router's entire route table — no route is hardcoded in `App.tsx`/`routes.tsx` beyond the shell's own login/404/403. */
export function getAllRoutes(): ModuleRoute[] {
  return [...modules.values()].flatMap((module) => module.routes ?? []);
}

export function getDashboardWidgets(permissions: Set<string>): DashboardWidgetDefinition[] {
  return [...modules.values()]
    .flatMap((module) => module.dashboardWidgets ?? [])
    .filter((widget) => hasAccess(permissions, widget.permissions));
}

export function getSettingsPanels(permissions: Set<string>): SettingsPanelDefinition[] {
  return [...modules.values()]
    .flatMap((module) => module.settingsPanels ?? [])
    .filter((panel) => hasAccess(permissions, panel.permissions));
}

export function getRegisteredModuleIds(): string[] {
  return [...modules.keys()];
}
