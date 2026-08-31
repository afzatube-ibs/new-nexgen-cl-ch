import { describe, expect, it } from 'vitest';
import type { NotificationDTO } from '@nexgen/api-client';
import { mergeNotifications } from './mergeNotifications.js';

function notification(overrides: Partial<NotificationDTO>): NotificationDTO {
  return {
    id: 'n1',
    templateId: null,
    channel: 'email',
    recipient: 'shopper@example.test',
    subject: null,
    status: 'sent',
    relatedType: 'order',
    relatedId: 'order-1',
    providerCode: null,
    attemptsCount: 1,
    maxAttempts: 3,
    nextRetryAt: null,
    lastAttemptedAt: null,
    sentAt: null,
    failedAt: null,
    cancelledAt: null,
    failureReason: null,
    version: 1,
    deliveryAttempts: [],
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

describe('mergeNotifications', () => {
  it('combines order, shipment, and payment notification lists into one', () => {
    const order = [notification({ id: 'o1', relatedType: 'order' })];
    const shipments = [[notification({ id: 's1', relatedType: 'shipment', relatedId: 'shipment-1' })]];
    const payments = [[notification({ id: 'p1', relatedType: 'payment', relatedId: 'payment-1' })]];

    const result = mergeNotifications(order, shipments, payments);

    expect(result.map((n) => n.id).sort()).toEqual(['o1', 'p1', 's1']);
  });

  it('sorts the merged list newest first, regardless of which source it came from', () => {
    const order = [notification({ id: 'oldest', createdAt: '2026-08-01T00:00:00Z' })];
    const shipments = [[notification({ id: 'newest', relatedType: 'shipment', createdAt: '2026-08-03T00:00:00Z' })]];
    const payments = [[notification({ id: 'middle', relatedType: 'payment', createdAt: '2026-08-02T00:00:00Z' })]];

    const result = mergeNotifications(order, shipments, payments);

    expect(result.map((n) => n.id)).toEqual(['newest', 'middle', 'oldest']);
  });

  it('flattens multiple shipments/payments (an order can genuinely have more than one of each)', () => {
    const shipments = [
      [notification({ id: 's1', relatedType: 'shipment' })],
      [notification({ id: 's2', relatedType: 'shipment' })],
    ];
    const payments = [
      [notification({ id: 'p1', relatedType: 'payment' })],
      [notification({ id: 'p2', relatedType: 'payment' })],
    ];

    const result = mergeNotifications([], shipments, payments);

    expect(result.map((n) => n.id).sort()).toEqual(['p1', 'p2', 's1', 's2']);
  });

  it('handles a null createdAt without throwing, never crashing the sort', () => {
    const order = [notification({ id: 'no-date', createdAt: null })];
    const shipments = [[notification({ id: 'has-date', relatedType: 'shipment', createdAt: '2026-08-01T00:00:00Z' })]];

    expect(() => mergeNotifications(order, shipments, [])).not.toThrow();
  });

  it('returns an empty list when every source is empty, never throwing', () => {
    expect(mergeNotifications([], [], [])).toEqual([]);
  });
});
