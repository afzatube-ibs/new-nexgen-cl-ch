import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from '../../lib/cn.js';

export const TooltipProvider = RadixTooltip.Provider;
export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;

export function TooltipContent({ className, sideOffset = 6, ...props }: RadixTooltip.TooltipContentProps) {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-md bg-slate-900 px-2.5 py-1.5 text-caption text-white shadow-elevation-2 dark:bg-slate-100 dark:text-slate-900',
          'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 duration-fast',
          className,
        )}
        {...props}
      />
    </RadixTooltip.Portal>
  );
}
