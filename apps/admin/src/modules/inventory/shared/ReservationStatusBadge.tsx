import { Lock, LockOpen, CheckCircle2 } from 'lucide-react';
import { Badge } from '@nexgen/ui';
import type { StockReservationStatus } from '@nexgen/api-client';

const STATUS_INFO: Record<StockReservationStatus, { label: string; icon: typeof Lock; className: string }> = {
  // Solid (not tinted) treatment, matching the contrast-safe pattern
  // `StockHealthBadge`/`DeltaBadge` established for success/warning/danger.
  // `feedback-info` (#0284c7) turns out to fail AA with white text (4.09:1,
  // caught by this slice's own axe scan) — text-black clears the 4.5:1
  // threshold here, so `info` joins warning/success on black rather than
  // white/danger's white.
  active: { label: 'Active', icon: Lock, className: 'bg-feedback-info text-black' },
  released: { label: 'Released', icon: LockOpen, className: 'bg-surface-subtle text-text-primary' },
  committed: { label: 'Committed', icon: CheckCircle2, className: 'bg-feedback-success text-black' },
};

export interface ReservationStatusBadgeProps {
  status: StockReservationStatus;
}

/** "Is action required?" — Active is the only status a merchant can act on (release it); Released/Committed are terminal, rendered muted so the one row that needs attention stands out. */
export function ReservationStatusBadge({ status }: ReservationStatusBadgeProps) {
  const info = STATUS_INFO[status];
  const Icon = info.icon;
  return (
    <Badge className={`gap-1 ${info.className}`}>
      <Icon className="size-3" aria-hidden="true" />
      {info.label}
    </Badge>
  );
}
