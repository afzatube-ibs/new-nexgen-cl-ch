import { Text } from '@nexgen/ui';
import type { StockItemDTO } from '@nexgen/api-client';

export interface AvailabilityCellProps {
  item: StockItemDTO;
}

/** Available is the number a merchant actually decides from — shown large and first; on-hand/reserved demoted to a supporting caption so the row answers "how much can I sell right now" at a glance, per `planning/architecture/PHASE_2_3_INVENTORY_ARCHITECTURE.md` §2.1. */
export function AvailabilityCell({ item }: AvailabilityCellProps) {
  return (
    <div className="text-right">
      <Text variant="body-strong" className="tabular-nums leading-tight">
        {item.quantityAvailable}
      </Text>
      <Text variant="caption" className="tabular-nums text-text-secondary">
        {item.quantityOnHand} on hand
        {item.quantityReserved > 0 && <> · {item.quantityReserved} reserved</>}
      </Text>
    </div>
  );
}
