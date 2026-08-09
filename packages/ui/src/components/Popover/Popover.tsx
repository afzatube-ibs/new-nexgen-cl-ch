import * as RadixPopover from '@radix-ui/react-popover';
import { cn } from '../../lib/cn.js';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverAnchor = RadixPopover.Anchor;

export function PopoverContent({ className, sideOffset = 4, ...props }: RadixPopover.PopoverContentProps) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-md border border-border bg-surface-overlay p-4 text-text-primary shadow-elevation-2 dark:shadow-elevation-2-dark',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-default',
          className,
        )}
        {...props}
      />
    </RadixPopover.Portal>
  );
}
