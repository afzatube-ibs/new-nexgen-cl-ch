import { Icon, Text, cn } from '@nexgen/ui';
import type { LucideIcon } from 'lucide-react';

/**
 * Store Components library — a single trust-signal tile (used in the
 * Homepage "Trust Features" strip and, later, the Product Detail page's
 * own delivery/return signals). Deliberately generic, merchant-configured
 * text — "Free delivery over ৳2,000", "7-day return policy" — real UI
 * copy a merchant sets, never a fabricated claim about this specific
 * store's own real policies (which don't exist as data anywhere yet;
 * every call site here passes explicit, honestly-labeled placeholder
 * copy until a real Store Settings/Policy backend exists — see
 * `MISSING_ECOMMERCE_FEATURES_AUDIT.md`).
 */
export interface TrustBadgeProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  className?: string;
}

export function TrustBadge({ icon, label, description, className }: TrustBadgeProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-brand">
        <Icon icon={icon} size="standalone" />
      </span>
      <div className="flex flex-col gap-0.5">
        <Text as="p" variant="body-strong">
          {label}
        </Text>
        {description && (
          <Text as="p" variant="caption" className="text-text-secondary">
            {description}
          </Text>
        )}
      </div>
    </div>
  );
}
