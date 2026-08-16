import { Check, Loader2 } from 'lucide-react';
import { Text } from '@nexgen/ui';
import type { ShipmentDTO } from '@nexgen/api-client';

/**
 * The Shipment Status Lifecycle's main "happy path," visualized — mirrors
 * `Models\Shipment::ALLOWED_TRANSITIONS`' own docblock shape (confirmed by
 * reading it directly): `pending → picking → picked → packing → packed →
 * dispatched → in_transit → delivered`. `failed`/`cancelled` are real,
 * separate terminal branches reachable from several points, not additional
 * stops on this rail — shown instead as a distinct banner on the detail
 * page (see `ShipmentDetailPage.tsx`), the same treatment Slice 1 already
 * gave `failed`.
 *
 * "Reached" per milestone is derived honestly from the real, persisted
 * timestamps (`pickedAt`/`packedAt`/`dispatchedAt`/`deliveredAt`) rather
 * than from `status` alone — a shipment that failed partway through packing
 * still correctly shows Picked as complete and Packed as not reached, since
 * `Shipment` genuinely has no separate "furthest stage reached" field to
 * read instead.
 */

type MilestoneKey = 'pending' | 'picked' | 'packed' | 'dispatched' | 'delivered';

const MILESTONES: { key: MilestoneKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'picked', label: 'Picked' },
  { key: 'packed', label: 'Packed' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered', label: 'Delivered' },
];

/** The milestone index a real `status` value is currently working toward or has reached, and whether it's mid-flight (an "ing"/"in_transit" state) rather than settled. */
function currentMilestone(status: ShipmentDTO['status']): { index: number; inProgress: boolean } {
  switch (status) {
    case 'pending':
      return { index: 0, inProgress: false };
    case 'picking':
      return { index: 1, inProgress: true };
    case 'picked':
      return { index: 1, inProgress: false };
    case 'packing':
      return { index: 2, inProgress: true };
    case 'packed':
      return { index: 2, inProgress: false };
    case 'dispatched':
      return { index: 3, inProgress: false };
    case 'in_transit':
      return { index: 4, inProgress: true };
    case 'delivered':
      return { index: 4, inProgress: false };
    // failed/cancelled: the rail freezes at whatever was really reached
    // (via timestamps, computed by the caller) — this function is only
    // consulted for the non-terminal statuses above.
    default:
      return { index: 0, inProgress: false };
  }
}

export interface ShipmentStatusRailProps {
  shipment: ShipmentDTO;
}

export function ShipmentStatusRail({ shipment }: ShipmentStatusRailProps) {
  const isTerminalBranch = shipment.status === 'failed' || shipment.status === 'cancelled';

  const reached: Record<MilestoneKey, boolean> = {
    pending: true,
    picked: shipment.pickedAt !== null,
    packed: shipment.packedAt !== null,
    dispatched: shipment.dispatchedAt !== null,
    delivered: shipment.deliveredAt !== null,
  };

  const { index: currentIndex, inProgress } = isTerminalBranch
    ? { index: MILESTONES.map((m) => reached[m.key]).lastIndexOf(true), inProgress: false }
    : currentMilestone(shipment.status);

  return (
    <div className="flex items-center" role="list" aria-label="Shipment status progression">
      {MILESTONES.map((milestone, i) => {
        const isReached = reached[milestone.key];
        const isCurrent = i === currentIndex && !isTerminalBranch;
        const isCurrentInProgress = isCurrent && inProgress;
        const isPastCurrent = isTerminalBranch && i <= currentIndex;

        return (
          <div key={milestone.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                role="listitem"
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-caption font-medium ${
                  isReached && !isTerminalBranch
                    ? 'border-brand bg-brand text-white'
                    : isPastCurrent
                      ? 'border-text-secondary bg-surface-subtle text-text-secondary'
                      : isCurrentInProgress
                        ? 'border-brand bg-surface text-brand'
                        : 'border-border bg-surface text-text-secondary'
                }`}
              >
                {isCurrentInProgress ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : isReached ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
              </div>
              <Text variant="caption" className={isCurrent ? 'font-medium text-text-primary' : 'text-text-secondary'}>
                {milestone.label}
              </Text>
            </div>
            {i < MILESTONES.length - 1 && (
              <div className={`mx-1.5 h-0.5 flex-1 ${reached[MILESTONES[i + 1]!.key] && !isTerminalBranch ? 'bg-brand' : 'bg-border'}`} aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}
