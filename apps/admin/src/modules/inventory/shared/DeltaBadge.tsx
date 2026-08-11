import { TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@nexgen/ui';

export interface DeltaBadgeProps {
  delta: number;
}

/**
 * Shared quantity-change chip — used by both the Stock Item ledger (detail
 * drawer) and the Activity timeline, so a `+12`/`-3` reads identically
 * everywhere it appears. Uses the same contrast-safe `className` override
 * as `StockHealthBadge` — see that component's own docblock for why
 * (`Badge`'s tinted `success`/`danger` variants both fail WCAG AA at
 * caption size, and even the solid-background fix needs black text for
 * `success` specifically, white only being safe on `danger`'s darker red;
 * not a Design System change, just this usage's own override).
 */
export function DeltaBadge({ delta }: DeltaBadgeProps) {
  const positive = delta >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <Badge
      variant={positive ? 'success' : 'danger'}
      className={`gap-1 tabular-nums ${positive ? 'bg-feedback-success text-black' : 'bg-feedback-danger text-white'}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {positive ? '+' : ''}
      {delta}
    </Badge>
  );
}
