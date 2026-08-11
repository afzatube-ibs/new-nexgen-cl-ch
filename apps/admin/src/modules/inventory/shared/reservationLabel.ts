import type { StockReservationDTO } from '@nexgen/api-client';

/** The literal `reference_type` this module writes when a merchant reserves stock by hand (see `PlaceHoldDialog`) — distinguishes merchant-entered reservations from a future system (e.g. Checkout) that would populate `referenceType`/`referenceId` with its own real aggregate class/id. */
export const MANUAL_HOLD_REFERENCE_TYPE = 'manual_hold';

/**
 * "Why is it reserved" — `StockReservation.referenceType`/`referenceId`
 * (apps/backend) are a generic, nullable external-reference pair, never a
 * foreign key (see the architecture doc §1.3). Renders the merchant-facing
 * answer honestly: the merchant's own optional reference text (entered in
 * the "Reference" field — see `PlaceHoldDialog`), a plain "No reference
 * added" when they left it blank, or the raw type/id pair for anything else
 * (a real value once a real system caller exists — never fabricated here).
 */
export function reservationReferenceLabel(reservation: Pick<StockReservationDTO, 'referenceType' | 'referenceId'>): string {
  if (!reservation.referenceType || reservation.referenceType === MANUAL_HOLD_REFERENCE_TYPE) {
    return reservation.referenceId ? `Reference: ${reservation.referenceId}` : 'No reference added';
  }
  return reservation.referenceId ? `${reservation.referenceType} · ${reservation.referenceId}` : reservation.referenceType;
}
