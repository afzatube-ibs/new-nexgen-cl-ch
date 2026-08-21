import { Icon, Text, cn } from '@nexgen/ui';
import type { LucideIcon } from 'lucide-react';

/**
 * Store Components library — Beta Milestone 2.6's own "Trust Framework"
 * build item: one real, reusable card covering Return Policy, Warranty,
 * Authenticity, Secure Checkout, Merchant Badge, and Support Badge — six
 * near-identical "icon + heading + body" cards from the milestone brief,
 * built as one flexible, real component rather than six near-duplicates.
 *
 * **"Build the UI architecture. Do not fabricate merchant claims"** — this
 * component takes its `title`/`description` as required props; it never
 * invents policy text. Every real call site must pass real, merchant-
 * sourced copy (once a Store Settings/policy backend exists) or
 * deliberately generic, non-specific copy (the same honest-generic
 * treatment `TrustBar`'s own default items already use) — never a
 * specific claim ("30-day returns," "2-year warranty") this component
 * itself has no way to verify is true.
 */
export interface PolicyCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function PolicyCard({ icon, title, description, className }: PolicyCardProps) {
  return (
    <div className={cn('flex flex-col gap-2 rounded-lg border border-border bg-surface p-4', className)}>
      <Icon icon={icon} size="standalone" className="text-brand" />
      <Text as="p" variant="body-strong">
        {title}
      </Text>
      <Text as="p" variant="caption" className="text-text-secondary">
        {description}
      </Text>
    </div>
  );
}
