import { describe, expect, it } from 'vitest';
import { humanizeAuditAction, shortTargetType } from './auditAction.js';

describe('humanizeAuditAction', () => {
  it('maps every real Customers action to merchant-facing copy', () => {
    expect(humanizeAuditAction('customer.registered')).toBe('Customer registered');
    expect(humanizeAuditAction('customer.profile_updated')).toBe('Profile updated');
    expect(humanizeAuditAction('customer.address_added')).toBe('Address added');
    expect(humanizeAuditAction('customer.exported')).toBe('Customer exported');
  });

  it('falls back to a generic humanizer for any action not in the known list, never rendering the raw string', () => {
    expect(humanizeAuditAction('customer.some_future_action')).toBe('Customer Some Future Action');
  });
});

describe('shortTargetType', () => {
  it('extracts the short class name from a fully-qualified target_type', () => {
    expect(shortTargetType('App\\Domains\\Commerce\\Customers\\Models\\Customer')).toBe('Customer');
    expect(shortTargetType('App\\Domains\\Commerce\\Customers\\Models\\CustomerAddress')).toBe('CustomerAddress');
  });

  it('returns an em dash for a null target_type', () => {
    expect(shortTargetType(null)).toBe('—');
  });
});
