import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export const alertVariants = cva('flex items-start gap-3 rounded-md border p-4', {
  variants: {
    variant: {
      default: 'border-border bg-surface-subtle text-text-primary',
      success: 'border-feedback-success/30 bg-feedback-success/5 text-feedback-success',
      warning: 'border-feedback-warning/30 bg-feedback-warning/5 text-feedback-warning',
      danger: 'border-feedback-danger/30 bg-feedback-danger/5 text-feedback-danger',
      info: 'border-feedback-info/30 bg-feedback-info/5 text-feedback-info',
    },
  },
  defaultVariants: { variant: 'default' },
});

const VARIANT_ICON = { default: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertCircle, info: Info };

export interface AlertProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

/** DESIGN_SYSTEM.md §2 — Alert (inline, non-dismissing banner by default; `dismissible` opts into the alternate variant). */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { className, variant = 'default', title, dismissible, onDismiss, children, ...props },
  ref,
) {
  const VariantIcon = VARIANT_ICON[variant ?? 'default'];
  return (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <VariantIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex-1 text-body">
        {title && <p className="text-body-strong text-text-primary">{title}</p>}
        {children}
      </div>
      {dismissible && (
        <button onClick={onDismiss} aria-label="Dismiss" className="text-text-secondary hover:text-text-primary">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
});
