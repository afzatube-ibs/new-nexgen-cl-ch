import { describe, expect, it } from 'vitest';
import type { InventoryAuditLogDTO } from '@nexgen/api-client';
import { humanizeAuditAction, stockAdjustedDetails, stockAdjustedSummary, warehouseSnapshot, summarizeInventoryAuditEntry } from './activityFormat.js';

function entry(overrides: Partial<InventoryAuditLogDTO>): InventoryAuditLogDTO {
  return {
    id: '1',
    actorId: 'user-1',
    action: 'stock.adjusted',
    targetType: null,
    targetId: null,
    before: null,
    after: null,
    correlationId: null,
    createdAt: '2026-08-11T00:00:00Z',
    ...overrides,
  };
}

describe('humanizeAuditAction', () => {
  it('turns a dotted, underscored action string into readable text', () => {
    expect(humanizeAuditAction('stock.adjusted')).toBe('Stock adjusted');
    expect(humanizeAuditAction('warehouse.archived')).toBe('Warehouse archived');
    expect(humanizeAuditAction('stock_transfer.completed')).toBe('Stock transfer completed');
  });
});

describe('stockAdjustedDetails / stockAdjustedSummary', () => {
  it('extracts delta/reason/quantityOnHand from a stock.adjusted entry', () => {
    const details = stockAdjustedDetails(
      entry({ action: 'stock.adjusted', after: { quantity_delta: -3, reason: 'Damaged / written off', quantity_on_hand: 7 } }),
    );
    expect(details).toEqual({ delta: -3, reason: 'Damaged / written off', quantityOnHand: 7 });
  });

  it('summary omits the delta itself (shown separately as a DeltaBadge) but keeps reason and resulting on-hand', () => {
    const details = stockAdjustedDetails(
      entry({ action: 'stock.adjusted', after: { quantity_delta: -3, reason: 'Damaged / written off', quantity_on_hand: 7 } }),
    )!;
    expect(stockAdjustedSummary(details)).toBe('Damaged / written off · now 7 on hand');
  });

  it('returns null for a non-stock-adjusted action', () => {
    expect(stockAdjustedDetails(entry({ action: 'warehouse.archived', after: { status: 'archived' } }))).toBeNull();
  });

  it('returns null when the after payload has no quantity_delta', () => {
    expect(stockAdjustedDetails(entry({ action: 'stock.adjusted', after: { reason: 'no delta here' } }))).toBeNull();
  });
});

describe('warehouseSnapshot', () => {
  it('reads name/code from a warehouse.* entry\'s after snapshot', () => {
    expect(warehouseSnapshot(entry({ action: 'warehouse.archived', before: { status: 'active' }, after: { status: 'archived', name: 'Main Warehouse', code: 'MAIN' } }))).toEqual({
      name: 'Main Warehouse',
      code: 'MAIN',
    });
  });

  it('falls back to the before snapshot when after has no name (e.g. warehouse.deleted)', () => {
    expect(warehouseSnapshot(entry({ action: 'warehouse.deleted', before: { code: 'MAIN', name: 'Main Warehouse' }, after: null }))).toEqual({
      name: 'Main Warehouse',
      code: 'MAIN',
    });
  });

  it('returns null for a non-warehouse action', () => {
    expect(warehouseSnapshot(entry({ action: 'stock.adjusted' }))).toBeNull();
  });
});

describe('summarizeInventoryAuditEntry (combined convenience form)', () => {
  it('summarizes a stock.adjusted entry', () => {
    const result = summarizeInventoryAuditEntry(
      entry({ action: 'stock.adjusted', after: { quantity_delta: 5, reason: 'Received shipment', quantity_on_hand: 15 } }),
    );
    expect(result).toBe('Received shipment · now 15 on hand');
  });

  it('summarizes a warehouse.* entry', () => {
    const result = summarizeInventoryAuditEntry(entry({ action: 'warehouse.archived', after: { status: 'archived', name: 'Main Warehouse', code: 'MAIN' } }));
    expect(result).toBe('Main Warehouse (MAIN)');
  });

  it('returns null for an unrecognized action shape rather than throwing', () => {
    expect(summarizeInventoryAuditEntry(entry({ action: 'something.unknown', after: null, before: null }))).toBeNull();
  });
});
