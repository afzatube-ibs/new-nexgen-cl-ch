// Inventory — Phase 2.3 Slice 1. One barrel for every Inventory resource
// area used by Slice 1 (Warehouses, Stock Items/Levels, Manual Adjustment,
// Activity), mirroring `catalog/index.ts`'s own barrel convention.
export * from './types.js';

export { listWarehouses, getWarehouse, createWarehouse, updateWarehouse, archiveWarehouse, destroyWarehouse, restoreWarehouse } from './warehouses.js';
export { listStockItems, getStockItem, adjustStock, listStockItemAdjustments } from './stockItems.js';
export { listInventoryAuditLogs } from './auditLogs.js';
