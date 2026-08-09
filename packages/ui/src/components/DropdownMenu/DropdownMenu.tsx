import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/** DESIGN_SYSTEM.md §2 — Dropdown Menu, Radix `DropdownMenu` primitive (icons, destructive styling, nested submenus). */
export const DropdownMenu = RadixDropdownMenu.Root;
export const DropdownMenuTrigger = RadixDropdownMenu.Trigger;
export const DropdownMenuGroup = RadixDropdownMenu.Group;
export const DropdownMenuPortal = RadixDropdownMenu.Portal;
export const DropdownMenuSub = RadixDropdownMenu.Sub;
export const DropdownMenuRadioGroup = RadixDropdownMenu.RadioGroup;

export function DropdownMenuContent({ className, sideOffset = 4, ...props }: RadixDropdownMenu.DropdownMenuContentProps) {
  return (
    <RadixDropdownMenu.Portal>
      <RadixDropdownMenu.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[10rem] overflow-hidden rounded-md border border-border bg-surface-overlay p-1 text-text-primary',
          'shadow-elevation-2 dark:shadow-elevation-2-dark',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          className,
        )}
        {...props}
      />
    </RadixDropdownMenu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: RadixDropdownMenu.DropdownMenuItemProps & { destructive?: boolean }) {
  return (
    <RadixDropdownMenu.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-body outline-none',
        'data-[highlighted]:bg-surface-subtle',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        destructive && 'text-feedback-danger data-[highlighted]:bg-feedback-danger/10',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: RadixDropdownMenu.DropdownMenuCheckboxItemProps) {
  return (
    <RadixDropdownMenu.CheckboxItem
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-body outline-none',
        'data-[highlighted]:bg-surface-subtle',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex items-center">
        <RadixDropdownMenu.ItemIndicator>
          <Check className="size-4" />
        </RadixDropdownMenu.ItemIndicator>
      </span>
      {children}
    </RadixDropdownMenu.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({ className, children, ...props }: RadixDropdownMenu.DropdownMenuRadioItemProps) {
  return (
    <RadixDropdownMenu.RadioItem
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-body outline-none',
        'data-[highlighted]:bg-surface-subtle',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex items-center">
        <RadixDropdownMenu.ItemIndicator>
          <Circle className="size-2 fill-current" />
        </RadixDropdownMenu.ItemIndicator>
      </span>
      {children}
    </RadixDropdownMenu.RadioItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: RadixDropdownMenu.DropdownMenuLabelProps) {
  return <RadixDropdownMenu.Label className={cn('px-2 py-1.5 text-caption text-text-secondary', className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: RadixDropdownMenu.DropdownMenuSeparatorProps) {
  return <RadixDropdownMenu.Separator className={cn('my-1 h-px bg-border', className)} {...props} />;
}

export function DropdownMenuSubTrigger({ className, children, ...props }: RadixDropdownMenu.DropdownMenuSubTriggerProps) {
  return (
    <RadixDropdownMenu.SubTrigger
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-body outline-none',
        'data-[highlighted]:bg-surface-subtle data-[state=open]:bg-surface-subtle',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-4" />
    </RadixDropdownMenu.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className, ...props }: RadixDropdownMenu.DropdownMenuSubContentProps) {
  return (
    <RadixDropdownMenu.SubContent
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-surface-overlay p-1 text-text-primary shadow-elevation-2 dark:shadow-elevation-2-dark',
        className,
      )}
      {...props}
    />
  );
}
