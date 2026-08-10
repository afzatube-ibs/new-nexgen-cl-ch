import { describe, expect, it } from 'vitest';
import { humanizeAuditAction } from './activityFormat.js';

describe('humanizeAuditAction', () => {
  it('turns a simple dotted action into a capitalized sentence', () => {
    expect(humanizeAuditAction('product.created')).toBe('Product created');
  });

  it('turns underscores into spaces too', () => {
    expect(humanizeAuditAction('product_variant.added')).toBe('Product variant added');
  });

  it('handles a multi-segment action', () => {
    expect(humanizeAuditAction('product.categories_synced')).toBe('Product categories synced');
  });

  it('is a no-op-ish pass-through for an already-plain single word', () => {
    expect(humanizeAuditAction('archived')).toBe('Archived');
  });
});
