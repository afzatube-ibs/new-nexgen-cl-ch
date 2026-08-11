import { lazy } from 'react';
import { Warehouse } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute } from '../../registry/types.js';

/**
 * Inventory — Phase 2.3 Slice 1, on top of the real, already-complete
 * backend Inventory module (`apps/backend/app/Domains/Commerce/Inventory/`).
 * Registered through the identical `registerModule()` mechanism Catalog's
 * own `module.ts` uses — no Admin Shell/router/Sidebar change required.
 *
 * Slice 1 scope (approved via `planning/architecture/
 * PHASE_2_3_INVENTORY_ARCHITECTURE.md`): Warehouses CRUD, Stock Levels
 * (StockItem list + Manual Stock Adjustment), and Activity / Movement
 * History. Reservations and Transfers have real backend endpoints too but
 * are explicitly Slice 2/3 — no routes for them yet.
 */

const routes: ModuleRoute[] = [
  {
    path: 'inventory/stock-levels',
    element: lazy(() => import('./stockLevels/StockLevelsPage.js').then((m) => ({ default: m.StockLevelsPage }))),
    breadcrumb: 'Stock Levels',
    permissions: ['inventory.stock.view'],
  },
  {
    path: 'inventory/activity',
    element: lazy(() => import('./activity/InventoryActivityPage.js').then((m) => ({ default: m.InventoryActivityPage }))),
    breadcrumb: 'Activity',
    permissions: ['inventory.audit_log.view'],
  },
  {
    path: 'inventory/warehouses',
    element: lazy(() => import('./warehouses/WarehousesListPage.js').then((m) => ({ default: m.WarehousesListPage }))),
    breadcrumb: 'Warehouses',
    permissions: ['inventory.warehouses.view'],
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Warehouse,
    children: [
      { id: 'inventory-stock-levels', label: 'Stock Levels', path: 'inventory/stock-levels', permissions: ['inventory.stock.view'] },
      { id: 'inventory-activity', label: 'Activity', path: 'inventory/activity', permissions: ['inventory.audit_log.view'] },
      { id: 'inventory-warehouses', label: 'Warehouses', path: 'inventory/warehouses', permissions: ['inventory.warehouses.view'] },
    ],
  },
];

registerModule({ id: 'inventory', navigation, routes });
