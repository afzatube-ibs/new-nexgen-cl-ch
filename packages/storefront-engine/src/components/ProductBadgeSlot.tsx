import type { ReactNode } from 'react';
import { cn } from '@nexgen/ui';

export interface ProductBadgeSlotItem {
  id: string;
  node: ReactNode;
}

export interface ProductBadgeSlotProps {
  badges: ProductBadgeSlotItem[];
  maxVisible?: number;
  className?: string;
}

export function ProductBadgeSlot({ badges, maxVisible = 3, className }: ProductBadgeSlotProps) {
  const visible = badges.filter((badge) => badge.node !== null && badge.node !== undefined && badge.node !== false).slice(0, maxVisible);
  if (visible.length === 0) return null;

  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      {visible.map((badge) => (
        <div key={badge.id}>{badge.node}</div>
      ))}
    </div>
  );
}
