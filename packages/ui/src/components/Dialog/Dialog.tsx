import { forwardRef } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn.js';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
export const DialogPortal = RadixDialog.Portal;

const dialogContentVariants = cva(
  [
    'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
    'w-full rounded-lg border border-border bg-surface-overlay p-6 text-text-primary',
    'shadow-elevation-3 dark:shadow-elevation-3-dark',
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-2xl',
        fullscreen: 'h-full max-w-full rounded-none sm:h-auto sm:max-w-2xl sm:rounded-lg',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface DialogContentProps
  extends RadixDialog.DialogContentProps,
    VariantProps<typeof dialogContentVariants> {
  /** Renders the standard top-right close button — DESIGN_SYSTEM.md §2 Dialog. */
  showCloseButton?: boolean;
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { className, size, showCloseButton = true, children, ...props },
  ref,
) {
  return (
    <DialogPortal>
      {/*
       * Both the Overlay and the Close button `stopPropagation()` on click —
       * `DialogPortal` renders outside this component's DOM parent, but
       * React re-dispatches synthetic events by walking the *component*
       * tree, not the DOM tree, so a click here still bubbles past the
       * portal boundary to whatever this Dialog happens to be nested inside
       * in JSX (a `DataTable` row with its own `onClick`, most notably).
       * Found live-verifying Milestone 16 (Notifications Admin UI,
       * 2026-09-01) via the sibling bug in `ConfirmDialog`'s own footer
       * buttons — same root cause, same fix, applied here so it can't
       * recur through this Dialog's own built-in dismiss controls either.
       */}
      <RadixDialog.Overlay
        className="fixed inset-0 z-50 bg-slate-950/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        onClick={(event) => event.stopPropagation()}
      />
      <RadixDialog.Content ref={ref} className={cn(dialogContentVariants({ size }), className)} {...props}>
        {children}
        {showCloseButton && (
          <RadixDialog.Close
            className="absolute right-4 top-4 rounded-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label="Close"
            onClick={(event) => event.stopPropagation()}
          >
            <X className="size-4" />
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </DialogPortal>
  );
});

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex flex-col gap-1', className)} {...props} />;
}

/**
 * `text-section` (20px/600), not `text-heading` — a Dialog's title is a
 * Section Title, not a Page Title, per the Design Foundation Refresh's own
 * typography scale (`packages/tokens`'s own docblock). Previously shared
 * `text-heading` with `PageHeader`'s page title, which meant the Refresh's
 * own Page-Title enlargement (24px→28px) would have inflated every dialog
 * title along with it — corrected here at the source instead.
 */
export function DialogTitle({ className, ...props }: RadixDialog.DialogTitleProps) {
  return <RadixDialog.Title className={cn('text-section text-text-primary', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: RadixDialog.DialogDescriptionProps) {
  return <RadixDialog.Description className={cn('text-body text-text-secondary', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-5 flex items-center justify-end gap-2', className)} {...props} />;
}
