import { lazy } from 'react';
import { Warehouse } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute } from '../../registry/types.js';

/**
 * Inventory — Phase 2.3, on top of the real, already-complete backend
 * Inventory module (`apps/backend/app/Domains/Commerce/Inventory/`).
 * Registered through the identical `registerModule()` mechanism Catalog's
 * own `module.ts` uses — no Admin Shell/router/Sidebar change required.
 *
 * Slice 1 (approved via `planning/architecture/
 * PHASE_2_3_INVENTORY_ARCHITECTURE.md`): Warehouses CRUD, Stock Levels
 * (StockItem list + Manual Stock Adjustment), and Activity / Movement
 * History. Slice 2 (approved): Stock Reservations — added as a tab inside
 * the existing Stock Item detail drawer, since no cross-item reservation
 * list endpoint exists to justify a new top-level page. Slice 3: Stock
 * Transfers — unlike Reservations, `GET /stock-transfers` is a real,
 * standalone, paginated list endpoint, so a new top-level "Transfers" page
 * is warranted here the same way Warehouses/Stock Levels/Activity each
 * got one in Slice 1 — this is the Inventory module's own established
 * self-registration mechanism, not a change to the Admin Shell/Navigation
 * system itself.
 */

const routes: ModuleRoute[] = [
  {
    path: 'inventory/stock-levels',
    element: lazy(() => import('./stockLevels/StockLevelsPage.js').then((m) => ({ default: m.StockLevelsPage }))),
    breadcrumb: 'Stock Levels',
    permissions: ['inventory.stock.view'],
  },
  {
    path: 'inventory/transfers',
    element: lazy(() => import('./transfers/TransfersListPage.js').then((m) => ({ default: m.TransfersListPage }))),
    breadcrumb: 'Transfers',
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
      { id: 'inventory-transfers', label: 'Transfers', path: 'inventory/transfers', permissions: ['inventory.stock.view'] },
      { id: 'inventory-activity', label: 'Activity', path: 'inventory/activity', permissions: ['inventory.audit_log.view'] },
      { id: 'inventory-warehouses', label: 'Warehouses', path: 'inventory/warehouses', permissions: ['inventory.warehouses.view'] },
    ],
  },
];

registerModule({ id: 'inventory', navigation, routes });
