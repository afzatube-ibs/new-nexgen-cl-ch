import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { ShipmentDTO, SetShipmentDestinationInput } from './types.js';

/**
 * `PATCH /shipments/{id}/destination` — `fulfillment.shipments.manage`.
 * `SetShipmentDestinationAction` refuses once dispatched/in_transit/
 * delivered/failed/cancelled (`already_dispatched`, confirmed by reading it
 * directly) — this wrapper does not pre-check that; the caller decides
 * whether to even offer the control, mirroring every other workflow
 * wrapper's own division of labor in this module.
 */
export function setShipmentDestination(client: ApiClient, id: string, input: SetShipmentDestinationInput): Promise<ShipmentDTO> {
  return client
    .patch<DataEnvelope<ShipmentDTO>>(`/shipments/${id}/destination`, {
      destination_recipient_name: input.recipientName,
      destination_phone: input.phone,
      destination_address_line1: input.addressLine1,
      destination_address_line2: input.addressLine2 || undefined,
      destination_city: input.city,
      destination_region: input.region || undefined,
      destination_postal_code: input.postalCode || undefined,
      destination_country_code: input.countryCode,
      weight_grams: input.weightGrams ?? undefined,
      expected_version: input.expectedVersion,
    })
    .then((r) => r.data);
}
