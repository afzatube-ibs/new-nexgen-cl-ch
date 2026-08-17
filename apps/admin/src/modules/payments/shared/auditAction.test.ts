import { describe, expect, it } from 'vitest';
import { humanizeAuditAction, shortTargetType } from './auditAction.js';

describe('humanizeAuditAction', () => {
  it('maps every real Payments action to merchant-facing copy', () => {
    expect(humanizeAuditAction('payment.initiated')).toBe('Payment initiated');
    expect(humanizeAuditAction('payment.captured')).toBe('Payment captured');
    expect(humanizeAuditAction('payment.refunded')).toBe('Payment refunded');
    expect(humanizeAuditAction('payment.bank_transfer_proof_attached')).toBe('Bank transfer proof attached');
  });

  it('falls back to a generic humanizer for any action not in the known list, never rendering the raw string', () => {
    expect(humanizeAuditAction('payment.some_future_action')).toBe('Payment Some Future Action');
  });
});

describe('shortTargetType', () => {
  it('extracts the short class name from a fully-qualified target_type', () => {
    expect(shortTargetType('App\\Domains\\Commerce\\Payments\\Models\\Payment')).toBe('Payment');
  });

  it('returns an em dash for a null target_type', () => {
    expect(shortTargetType(null)).toBe('—');
  });
});
