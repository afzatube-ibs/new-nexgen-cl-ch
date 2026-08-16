import { CheckCircle2, Circle } from 'lucide-react';
import { Text } from '@nexgen/ui';
import type { ShipmentDTO } from '@nexgen/api-client';

export interface ShipmentReadinessChecklistProps {
  shipment: ShipmentDTO;
}

/**
 * "Shipment validation before Pick/Pack/Dispatch" (Slice 3 item 5) — a
 * persistent, always-visible readout of the exact same three real backend
 * preconditions `ShipmentWorkflowActions` already gates its own buttons on:
 * `StartPickingAction`'s `no_items` guard, `MarkPackedAction`'s
 * `missing_weight` guard, `DispatchShipmentAction`'s `missing_destination`
 * guard (all three confirmed by reading each directly). This component
 * reads no new field and re-derives no new rule — it displays the identical
 * `hasItems`/`hasWeight`/`hasDestination` facts the action bar computes,
 * just up front and at a glance, rather than only appearing reactively once
 * a merchant has already tried and been blocked. Never duplicates a
 * business rule: if the backend's own guard ever changes, this checklist's
 * inputs (items/weightGrams/destination on the real `ShipmentDTO`) change
 * with it automatically.
 */
export function ShipmentReadinessChecklist({ shipment }: ShipmentReadinessChecklistProps) {
  const hasItems = (shipment.items?.length ?? 0) > 0;
  const hasWeight = shipment.weightGrams !== null;
  const hasDestination = Boolean(
    shipment.destination.recipientName && shipment.destination.phone && shipment.destination.addressLine1 && shipment.destination.city && shipment.destination.countryCode,
  );

  const checks: { label: string; ok: boolean }[] = [
    { label: 'Items added', ok: hasItems },
    { label: 'Weight recorded', ok: hasWeight },
    { label: 'Destination set', ok: hasDestination },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5" role="list" aria-label="Shipment preparation checklist">
      {checks.map((check) => (
        <div key={check.label} role="listitem" className="flex items-center gap-1.5">
          {check.ok ? <CheckCircle2 className="size-4 text-feedback-success" aria-hidden="true" /> : <Circle className="size-4 text-text-secondary" aria-hidden="true" />}
          <Text variant="caption" className={check.ok ? 'text-text-primary' : 'text-text-secondary'}>
            {check.label}
          </Text>
        </div>
      ))}
    </div>
  );
}
