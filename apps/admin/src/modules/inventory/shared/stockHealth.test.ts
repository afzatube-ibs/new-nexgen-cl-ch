import { describe, expect, it } from 'vitest';
import { stockHealth, LOW_STOCK_THRESHOLD } from './stockHealth.js';

describe('stockHealth', () => {
  it('is out_of_stock when available is zero or negative', () => {
    expect(stockHealth({ quantityAvailable: 0 }).status).toBe('out_of_stock');
    expect(stockHealth({ quantityAvailable: -1 }).status).toBe('out_of_stock');
  });

  it('is low_stock when available is above zero but at or below the threshold', () => {
    expect(stockHealth({ quantityAvailable: 1 }).status).toBe('low_stock');
    expect(stockHealth({ quantityAvailable: LOW_STOCK_THRESHOLD }).status).toBe('low_stock');
  });

  it('is healthy above the threshold', () => {
    expect(stockHealth({ quantityAvailable: LOW_STOCK_THRESHOLD + 1 }).status).toBe('healthy');
  });

  it('is archived when the warehouse is archived, regardless of quantity', () => {
    expect(stockHealth({ quantityAvailable: 500 }, 'archived').status).toBe('archived');
    expect(stockHealth({ quantityAvailable: 0 }, 'archived').status).toBe('archived');
  });

  it('maps each status to a Badge variant that never relies on color alone (label always present)', () => {
    for (const info of [stockHealth({ quantityAvailable: 0 }), stockHealth({ quantityAvailable: 5 }), stockHealth({ quantityAvailable: 100 }), stockHealth({ quantityAvailable: 1 }, 'archived')]) {
      expect(info.label.length).toBeGreaterThan(0);
      expect(['success', 'warning', 'danger', 'default']).toContain(info.badgeVariant);
    }
  });
});
