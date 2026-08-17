import { describe, expect, it } from 'vitest';
import { humanizeAuditAction, shortTargetType } from './auditAction.js';

describe('humanizeAuditAction', () => {
  it('maps every real Promotions action to merchant-facing copy', () => {
    expect(humanizeAuditAction('promotion.created')).toBe('Promotion created');
    expect(humanizeAuditAction('promotion.archived')).toBe('Promotion archived');
    expect(humanizeAuditAction('promotion.condition_added')).toBe('Condition added');
    expect(humanizeAuditAction('coupon.created')).toBe('Coupon created');
    expect(humanizeAuditAction('promotion.redeemed')).toBe('Promotion redeemed');
  });

  it('falls back to a generic humanizer for any action not in the known list, never rendering the raw string', () => {
    expect(humanizeAuditAction('promotion.some_future_action')).toBe('Promotion Some Future Action');
  });
});

describe('shortTargetType', () => {
  it('extracts the short class name from a fully-qualified target_type', () => {
    expect(shortTargetType('App\\Domains\\Commerce\\Promotions\\Models\\Promotion')).toBe('Promotion');
    expect(shortTargetType('App\\Domains\\Commerce\\Promotions\\Models\\Coupon')).toBe('Coupon');
  });

  it('returns an em dash for a null target_type', () => {
    expect(shortTargetType(null)).toBe('—');
  });
});
