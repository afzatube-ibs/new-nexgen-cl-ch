import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn.js';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-caption font-medium',
  {
    variants: {
      variant: {
        default: 'bg-surface-subtle text-text-primary',
        success: 'bg-feedback-success/10 text-feedback-success',
        warning: 'bg-feedback-warning/10 text-feedback-warning',
        danger: 'bg-feedback-danger/10 text-feedback-danger',
        info: 'bg-feedback-info/10 text-feedback-info',
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
