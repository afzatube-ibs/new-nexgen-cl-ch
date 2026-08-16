import { describe, expect, it } from 'vitest';
import { humanizeAuditAction, shortTargetType } from './auditAction.js';

describe('humanizeAuditAction', () => {
  it('maps every real Shipping action to merchant-facing copy', () => {
    expect(humanizeAuditAction('shipping_zone.created')).toBe('Zone created');
    expect(humanizeAuditAction('shipping_zone.archived')).toBe('Zone archived');
    expect(humanizeAuditAction('shipping_method.deleted')).toBe('Method deleted');
    expect(humanizeAuditAction('shipping_rate.updated')).toBe('Rate updated');
  });

  it('maps every real Fulfillment action to merchant-facing copy', () => {
    expect(humanizeAuditAction('shipment.created')).toBe('Shipment created');
    expect(humanizeAuditAction('shipment.dispatched')).toBe('Dispatched');
    expect(humanizeAuditAction('shipment.delivered')).toBe('Delivered');
    expect(humanizeAuditAction('shipment.cancelled')).toBe('Cancelled');
  });

  it('falls back to a generic humanizer for any action not in the known list, never rendering the raw string', () => {
    expect(humanizeAuditAction('shipment.some_future_action')).toBe('Shipment Some Future Action');
  });
});

describe('shortTargetType', () => {
  it('extracts the short class name from a fully-qualified target_type', () => {
    expect(shortTargetType('App\\Domains\\Operations\\Shipping\\Models\\ShippingZone')).toBe('ShippingZone');
    expect(shortTargetType('App\\Domains\\Operations\\Fulfillment\\Models\\Shipment')).toBe('Shipment');
  });

  it('returns an em dash for a null target_type', () => {
    expect(shortTargetType(null)).toBe('—');
  });
});
