import { Check } from 'lucide-react';
import { Text } from '@nexgen/ui';
import type { ReturnRequestDTO } from '@nexgen/api-client';

/**
 * The Return Status Lifecycle's main "happy path," visualized — mirrors
 * `ShipmentStatusRail`'s own shape directly, adapted to
 * `Models\ReturnRequest::ALLOWED_TRANSITIONS`' own real path (confirmed by
 * reading it directly): `requested → approved → pickup_scheduled →
 * received → inspecting → resolution_approved → completed`. `rejected`/
 * `cancelled` are real, separate terminal branches reachable from several
 * points, not additional stops on this rail — shown instead as a distinct
 * banner on the detail page, the same treatment Shipment's rail gives
 * `failed`/`cancelled`.
 *
 * Unlike `Shipment`, `ReturnRequestResource` carries no per-milestone
 * timestamp for "approved" itself — only `pickup.scheduledAt`/`receivedAt`/
 * `inspectionStartedAt`/`resolvedAt`/`completedAt` (confirmed by reading the
 * Resource directly). Each later field can only ever be set once its own
 * prerequisite transition has genuinely happened (`ALLOWED_TRANSITIONS` is
 * a strict, non-skippable chain), so "approved reached" is still derived
 * honestly — as "any later real field is set, or the live `status` is
 * already at/past `approved`" — without inventing a field the backend
 * doesn't have.
 */

type MilestoneKey = 'requested' | 'approved' | 'pickup_scheduled' | 'received' | 'inspecting' | 'resolution_approved' | 'completed';

const MILESTONES: { key: MilestoneKey; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'pickup_scheduled', label: 'Pickup' },
  { key: 'received', label: 'Received' },
  { key: 'inspecting', label: 'Inspecting' },
  { key: 'resolution_approved', label: 'Resolved' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_INDEX: Record<ReturnRequestDTO['status'], number> = {
  requested: 0,
  approved: 1,
  pickup_scheduled: 2,
  received: 3,
  inspecting: 4,
  resolution_approved: 5,
  completed: 6,
  // rejected/cancelled: the rail freezes at whatever was really reached
  // (via the real fields below, computed by the caller) — this table is
  // only consulted for the non-terminal statuses above.
  rejected: 0,
  cancelled: 0,
};

export interface ReturnStatusRailProps {
  returnRequest: ReturnRequestDTO;
}

export function ReturnStatusRail({ returnRequest }: ReturnStatusRailProps) {
  const isTerminalBranch = returnRequest.status === 'rejected' || returnRequest.status === 'cancelled';

  const reached: Record<MilestoneKey, boolean> = {
    requested: true,
    approved:
      returnRequest.pickup.scheduledAt !== null ||
      returnRequest.receivedAt !== null ||
      returnRequest.inspectionStartedAt !== null ||
      returnRequest.resolvedAt !== null ||
      returnRequest.completedAt !== null ||
      !isTerminalBranch,
    pickup_scheduled: returnRequest.pickup.scheduledAt !== null,
    received: returnRequest.receivedAt !== null,
    inspecting: returnRequest.inspectionStartedAt !== null,
    resolution_approved: returnRequest.resolvedAt !== null,
    completed: returnRequest.completedAt !== null,
  };
  // Reaching a later real field always implies "approved" — but for the
  // non-terminal live states, `!isTerminalBranch` above would incorrectly
  // mark `requested` itself as having reached `approved`. Correct that one
  // case using the real, current status directly.
  if (!isTerminalBranch && returnRequest.status === 'requested') reached.approved = false;

  const currentIndex = isTerminalBranch
    ? MILESTONES.map((m) => reached[m.key]).lastIndexOf(true)
    : STATUS_INDEX[returnRequest.status];

  return (
    <div className="flex items-center" role="list" aria-label="Return request status progression">
      {MILESTONES.map((milestone, i) => {
        const isReached = reached[milestone.key];
        const isCurrent = i === currentIndex && !isTerminalBranch;
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
                      : 'border-border bg-surface text-text-secondary'
                }`}
              >
                {isReached ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
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
