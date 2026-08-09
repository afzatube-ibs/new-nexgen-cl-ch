import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '../../lib/cn.js';

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: RadixTabs.TabsListProps) {
  return (
    <RadixTabs.List
      className={cn('inline-flex items-center gap-1 border-b border-border', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: RadixTabs.TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'relative px-3 py-2 text-body-strong text-text-secondary transition-colors duration-fast',
        'hover:text-text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
        'data-[state=active]:text-brand',
        "data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-brand data-[state=active]:after:content-['']",
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: RadixTabs.TabsContentProps) {
  return (
    <RadixTabs.Content
      className={cn('pt-4 focus-visible:outline-none', className)}
      {...props}
    />
  );
}
