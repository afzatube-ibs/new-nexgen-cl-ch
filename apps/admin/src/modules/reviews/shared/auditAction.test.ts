import { describe, expect, it } from 'vitest';
import { humanizeAuditAction, shortTargetType } from './auditAction.js';

describe('humanizeAuditAction', () => {
  it('maps every real Reviews lifecycle action to merchant-facing copy', () => {
    expect(humanizeAuditAction('review.submitted')).toBe('Review submitted');
    expect(humanizeAuditAction('review.approved')).toBe('Approved');
    expect(humanizeAuditAction('review.rejected')).toBe('Rejected');
    expect(humanizeAuditAction('review.responded')).toBe('Merchant response added');
    expect(humanizeAuditAction('review.deleted')).toBe('Deleted');
  });

  it('falls back to a generic humanizer for any action not in the known list, never rendering the raw string', () => {
    expect(humanizeAuditAction('review.some_future_action')).toBe('Review Some Future Action');
  });
});

describe('shortTargetType', () => {
  it('extracts the short class name from a fully-qualified target_type', () => {
    expect(shortTargetType('App\\Domains\\Commerce\\Reviews\\Models\\Review')).toBe('Review');
  });

  it('returns an em dash for a null target_type', () => {
    expect(shortTargetType(null)).toBe('—');
  });
});
