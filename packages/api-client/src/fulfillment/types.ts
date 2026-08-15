/**
 * Phase 2.6 — Orders, Slice 2 (Order Operations & Merchant Workflow).
 * Minimal, read-only — Fulfillment's real `GET /shipments` list contract
 * only (`ShipmentController::index`, confirmed by reading it directly),
 * consumed here strictly to surface a real, existing "Fulfillment"
 * relationship on Order Detail via Fulfillment's own genuinely
 * server-supported `order_id` filter. No Fulfillment module, no shipment
 * detail/workflow-action capability is built — those belong to a distinct,
 * not-yet-built Fulfillment admin module this slice's own brief never asked
 * for ("Do NOT redesign the Admin").
 */

export type ShipmentStatus = 'pending' | 'picking' | 'picked' | 'packing' | 'packed' | 'dispatched' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';

/** The exact shape `ShipmentResource` returns from `index()` — `items`/`timeline`/`notes` are `whenLoaded()` relations, present only on `show()`, omitted here. */
export interface ShipmentDTO {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  grandTotal: string | null;
  currencyCode: string | null;
  shippingMethodId: string | null;
  courierProviderCode: string | null;
  courierConsignmentId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  destination: {
    recipientName: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    countryCode: string | null;
  };
  weightGrams: number | null;
  status: ShipmentStatus;
  failureReason: string | null;
  pickedAt: string | null;
  packedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `ShipmentController::index` — genuinely server-side `status`/`order_id`, hardcoded `orderByDesc('created_at')`, Laravel's own default pagination. */
export interface ListShipmentsQuery {
  status?: ShipmentStatus;
  orderId?: string;
  page?: number;
}
