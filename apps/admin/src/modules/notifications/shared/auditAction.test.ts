import { describe, expect, it } from 'vitest';
import { humanizeAuditAction, shortTargetType } from './auditAction.js';

describe('humanizeAuditAction', () => {
  it('maps every real Notifications lifecycle action to merchant-facing copy', () => {
    expect(humanizeAuditAction('notification_template.created')).toBe('Template created');
    expect(humanizeAuditAction('notification_template.updated')).toBe('Template updated');
    expect(humanizeAuditAction('notification.queued')).toBe('Notification queued');
    expect(humanizeAuditAction('notification.sent')).toBe('Sent');
    expect(humanizeAuditAction('notification.failed')).toBe('Failed');
    expect(humanizeAuditAction('notification.retry_scheduled')).toBe('Retry scheduled');
    expect(humanizeAuditAction('notification.retry_requested')).toBe('Retry requested');
    expect(humanizeAuditAction('notification.cancelled')).toBe('Cancelled');
  });

  it('falls back to a generic humanizer for any action not in the known list, never rendering the raw string', () => {
    expect(humanizeAuditAction('notification.some_future_action')).toBe('Notification Some Future Action');
  });
});

describe('shortTargetType', () => {
  it('extracts the short class name from a fully-qualified target_type', () => {
    expect(shortTargetType('App\\Domains\\Operations\\Notifications\\Models\\Notification')).toBe('Notification');
  });

  it('returns an em dash for a null target_type', () => {
    expect(shortTargetType(null)).toBe('—');
  });
});
