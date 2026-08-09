import { forwardRef } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn.js';
import { DialogHeader, DialogTitle, DialogDescription } from '../Dialog/Dialog.js';

/**
 * DESIGN_SYSTEM.md §2 — Drawer: "Radix has no separate primitive — Drawer
 * is a styled Dialog anchored to a viewport edge." Same Root/Trigger/Close
 * as Dialog — and, since a Drawer's header/title/description are visually
 * and behaviorally identical to a Dialog's own (both are `RadixDialog.Title`/
 * `Description` under the hood), re-exported directly rather than
 * redefined a second time. Only `DrawerContent` (anchor/slide direction)
 * and `DrawerFooter` (`mt-auto`, since the panel is a flex column and the
 * footer must pin to its bottom edge, not `DialogFooter`'s plain `mt-6`)
 * have a real reason to differ.
 */
export const Drawer = RadixDialog.Root;
export const DrawerTrigger = RadixDialog.Trigger;
export const DrawerClose = RadixDialog.Close;
export const DrawerPortal = RadixDialog.Portal;
export const DrawerHeader = DialogHeader;
export const DrawerTitle = DialogTitle;
export const DrawerDescription = DialogDescription;

const drawerContentVariants = cva(
  [
    'fixed inset-y-0 z-50 flex flex-col border-border bg-surface-overlay p-6 text-text-primary',
    'shadow-elevation-3 dark:shadow-elevation-3-dark',
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-fast data-[state=open]:duration-slow',
  ],
  {
    variants: {
      anchor: {
        left: 'left-0 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
        right: 'right-0 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
      },
      width: {
        sm: 'w-full max-w-xs',
        md: 'w-full max-w-md',
        lg: 'w-full max-w-xl',
      },
    },
    defaultVariants: { anchor: 'right', width: 'md' },
  },
);

export interface DrawerContentProps extends RadixDialog.DialogContentProps, VariantProps<typeof drawerContentVariants> {
  showCloseButton?: boolean;
}

export const DrawerContent = forwardRef<HTMLDivElement, DrawerContentProps>(function DrawerContent(
  { className, anchor, width, showCloseButton = true, children, ...props },
  ref,
) {
  return (
    <DrawerPortal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <RadixDialog.Content ref={ref} className={cn(drawerContentVariants({ anchor, width }), className)} {...props}>
        {children}
        {showCloseButton && (
          <RadixDialog.Close
            className="absolute right-4 top-4 rounded-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label="Close"
          >
            <X className="size-4" />
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </DrawerPortal>
  );
});

export function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-auto flex items-center justify-end gap-2 pt-6', className)} {...props} />;
}
