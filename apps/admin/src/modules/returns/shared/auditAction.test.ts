import { describe, expect, it } from 'vitest';
import { humanizeAuditAction, shortTargetType } from './auditAction.js';

describe('humanizeAuditAction', () => {
  it('maps every real Returns lifecycle action to merchant-facing copy', () => {
    expect(humanizeAuditAction('return_request.created')).toBe('Return request created');
    expect(humanizeAuditAction('return_request.approved')).toBe('Approved');
    expect(humanizeAuditAction('return_request.rejected')).toBe('Rejected');
    expect(humanizeAuditAction('return_request.resolved')).toBe('Resolved');
    expect(humanizeAuditAction('return_note.added')).toBe('Note added');
  });

  it('maps every real refund/exchange action to merchant-facing copy', () => {
    expect(humanizeAuditAction('refund_request.completed')).toBe('Refund completed');
    expect(humanizeAuditAction('refund_request.failed')).toBe('Refund failed');
    expect(humanizeAuditAction('exchange_request.shipped')).toBe('Exchange shipped');
    expect(humanizeAuditAction('exchange_request.cancelled')).toBe('Exchange cancelled');
  });

  it('falls back to a generic humanizer for any action not in the known list, never rendering the raw string', () => {
    expect(humanizeAuditAction('return_request.some_future_action')).toBe('Return Request Some Future Action');
  });
});

describe('shortTargetType', () => {
  it('extracts the short class name from a fully-qualified target_type', () => {
    expect(shortTargetType('App\\Domains\\Operations\\Returns\\Models\\ReturnRequest')).toBe('ReturnRequest');
  });

  it('returns an em dash for a null target_type', () => {
    expect(shortTargetType(null)).toBe('—');
  });
});
