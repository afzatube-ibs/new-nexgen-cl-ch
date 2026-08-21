import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@nexgen/ui';
import type { StockTransferStatus } from '@nexgen/api-client';

const STATUS_INFO: Record<StockTransferStatus, { label: string; icon: typeof Clock; className: string }> = {
  // Solid (not tinted) treatment, matching the contrast-safe pattern
  // `StockHealthBadge`/`DeltaBadge`/`ReservationStatusBadge` already
  // established for this module — applied pre-emptively here rather than
  // waiting to rediscover the same WCAG AA failure a third time.
  pending: { label: 'Pending', icon: Clock, className: 'bg-feedback-info text-black' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-feedback-success text-black' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'bg-surface-subtle text-text-primary' },
};

export interface TransferStatusBadgeProps {
  status: StockTransferStatus;
}

/** "Is action required?" — Pending is the only status a merchant can act on (complete or cancel it); Completed/Cancelled are terminal, rendered with neutral or success weight so the one row that needs attention stands out. */
export function TransferStatusBadge({ status }: TransferStatusBadgeProps) {
  const info = STATUS_INFO[status];
  const Icon = info.icon;
  return (
    <Badge className={`gap-1 ${info.className}`}>
      <Icon className="size-3" aria-hidden="true" />
      {info.label}
    </Badge>
  );
}
