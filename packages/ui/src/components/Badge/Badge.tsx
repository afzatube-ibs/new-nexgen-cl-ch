import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn.js';

/**
 * Solid, not tinted, backgrounds for `success`/`warning`/`danger`/`info` —
 * the tinted `bg-feedback-{color}` (10% opacity) + `text-feedback-{color}`
 * treatment this component shipped with originally measures 2.85–4.13:1
 * against caption-text-size
 * WCAG AA's 4.5:1 floor (confirmed repeatedly via `@axe-core/playwright`
 * scans across the Inventory, Catalog, and Pricing modules). Every one of
 * those findings was patched at its own call site with a manual
 * `className="bg-feedback-success text-black"` override (still true today
 * in ~15 places — `TransferStatusBadge`, `StockHealthBadge`,
 * `PriceListsListPage`, ...) rather than fixed here, at the source — which
 * left every *other*, not-yet-audited default-variant usage silently
 * broken (confirmed live: `FilterBar`'s own active-filter-count badge,
 * `BulkOperationDialog`'s "Failed" count, and three Catalog call sites all
 * still rendered the inaccessible tint at Design Foundation Refresh time).
 * `success`/`warning`/`info` pair with black text, `danger` with white —
 * the exact split every one of those ~15 manual overrides already
 * independently settled on; encoding it here means every future Badge
 * usage is correct by default, and the existing manual overrides become
 * harmless, redundant duplicates of what the default now already does
 * (left in place rather than stripped out, to avoid touching ~15 unrelated
 * module files in a pass scoped to shared UI only).
 */
export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-caption font-medium',
  {
    variants: {
      variant: {
        default: 'bg-surface-subtle text-text-primary',
        success: 'bg-feedback-success text-black',
        warning: 'bg-feedback-warning text-black',
        danger: 'bg-feedback-danger text-white',
        info: 'bg-feedback-info text-black',
        outline: 'border border-border text-text-primary',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

/** DESIGN_SYSTEM.md §2 — Badge. Per §5's "color is never the only signal," pair with an icon/text label at the call site, never color alone. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge({ className, variant, ...props }, ref) {
  return <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
});
