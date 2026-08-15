import { describe, expect, it } from 'vitest';
import { humanizeAuditAction, shortTargetType } from './auditAction.js';

describe('humanizeAuditAction', () => {
  it('maps every real Orders action to merchant-facing copy', () => {
    expect(humanizeAuditAction('order.placed')).toBe('Order placed');
    expect(humanizeAuditAction('order.confirmed')).toBe('Order confirmed');
    expect(humanizeAuditAction('order.shipped')).toBe('Order shipped');
    expect(humanizeAuditAction('order.cancelled')).toBe('Order cancelled');
    expect(humanizeAuditAction('order.note_added')).toBe('Note added');
  });

  it('falls back to a generic humanizer for any action not in the known list, never rendering the raw string', () => {
    expect(humanizeAuditAction('order.some_future_action')).toBe('Order Some Future Action');
  });
});

describe('shortTargetType', () => {
  it('extracts the short class name from a fully-qualified target_type', () => {
    expect(shortTargetType('App\\Domains\\Commerce\\Orders\\Models\\Order')).toBe('Order');
    expect(shortTargetType('App\\Domains\\Commerce\\Orders\\Models\\OrderNote')).toBe('OrderNote');
  });

  it('returns an em dash for a null target_type', () => {
    expect(shortTargetType(null)).toBe('—');
  });
});
