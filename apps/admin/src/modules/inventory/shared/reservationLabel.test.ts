import { describe, expect, it } from 'vitest';
import { reservationReferenceLabel, MANUAL_HOLD_REFERENCE_TYPE } from './reservationLabel.js';

describe('reservationReferenceLabel', () => {
  it('renders a bare reservation with no reference as an honest "none added"', () => {
    expect(reservationReferenceLabel({ referenceType: null, referenceId: null })).toBe('No reference added');
  });

  it('renders a reservation with its reference, prefixed for scannability', () => {
    expect(reservationReferenceLabel({ referenceType: MANUAL_HOLD_REFERENCE_TYPE, referenceId: 'Phone order #42' })).toBe(
      'Reference: Phone order #42',
    );
  });

  it('treats a null referenceType the same as the manual-hold literal', () => {
    expect(reservationReferenceLabel({ referenceType: null, referenceId: 'Reference only' })).toBe('Reference: Reference only');
  });

  it('renders a real system reference type/id pair verbatim', () => {
    expect(reservationReferenceLabel({ referenceType: 'App\\Domains\\Commerce\\Checkout\\Models\\CheckoutSession', referenceId: 'cs_123' })).toBe(
      'App\\Domains\\Commerce\\Checkout\\Models\\CheckoutSession · cs_123',
    );
  });

  it('renders a system reference type with no id', () => {
    expect(reservationReferenceLabel({ referenceType: 'SomeFutureSystem', referenceId: null })).toBe('SomeFutureSystem');
  });
});
