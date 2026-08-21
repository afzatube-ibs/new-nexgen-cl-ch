// Inventory — Phase 2.3. One barrel for every Inventory resource area used
// so far: Slice 1 (Warehouses, Stock Items/Levels, Manual Adjustment,
// Activity), Slice 2 (Stock Reservations), and Slice 3 (Stock Transfers),
// mirroring `catalog/index.ts`'s own barrel convention.
export * from './types.js';

export { listWarehouses, getWarehouse, createWarehouse, updateWarehouse, archiveWarehouse, destroyWarehouse, restoreWarehouse } from './warehouses.js';
export { listStockItems, getStockItem, adjustStock, listStockItemAdjustments } from './stockItems.js';
export { listStockItemReservations, reserveStock, releaseReservation } from './reservations.js';
export { listStockTransfers, getStockTransfer, initiateStockTransfer, completeStockTransfer, cancelStockTransfer } from './transfers.js';
export { listInventoryAuditLogs } from './auditLogs.js';
