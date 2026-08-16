/**
 * `AuditLog.action` is a raw event-name string — every value below confirmed
 * by reading the relevant Action in `apps/backend/app/Domains/Operations/
 * {Shipping,Fulfillment}/Actions/*.php` directly. The fallback formatter
 * (identical to Orders' own `humanizeAuditAction`) handles any action this
 * list doesn't yet name, so an unlisted-but-real action still reads
 * sensibly rather than showing a raw snake_case string.
 */
const KNOWN_ACTIONS: Record<string, string> = {
  'shipping_zone.created': 'Zone created',
  'shipping_zone.updated': 'Zone updated',
  'shipping_zone.archived': 'Zone archived',
  'shipping_zone.deleted': 'Zone deleted',
  'shipping_method.created': 'Method created',
  'shipping_method.updated': 'Method updated',
  'shipping_method.archived': 'Method archived',
  'shipping_method.deleted': 'Method deleted',
  'shipping_rate.created': 'Rate created',
  'shipping_rate.updated': 'Rate updated',
  'shipping_rate.archived': 'Rate archived',
  'shipping_rate.deleted': 'Rate deleted',
  'shipment.created': 'Shipment created',
  'shipment.destination_set': 'Destination set',
  'shipment.picking_started': 'Picking started',
  'shipment.picked': 'Marked picked',
  'shipment.packing_started': 'Packing started',
  'shipment.packed': 'Marked packed',
  'shipment.dispatched': 'Dispatched',
  'shipment.in_transit': 'Marked in transit',
  'shipment.delivered': 'Delivered',
  'shipment.failed': 'Marked failed',
  'shipment.cancelled': 'Cancelled',
};

export function humanizeAuditAction(action: string): string {
  const known = KNOWN_ACTIONS[action];
  if (known) return known;
  const words = action.replace(/[._]/g, ' ').trim().split(/\s+/);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** The short class name from a fully-qualified `target_type` string (`App\...\ShippingZone` → `ShippingZone`) — display only. */
export function shortTargetType(targetType: string | null): string {
  if (!targetType) return '—';
  const parts = targetType.split('\\');
  return parts[parts.length - 1] ?? targetType;
}
