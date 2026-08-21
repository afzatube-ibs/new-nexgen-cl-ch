'use client';

import type { ReactNode } from 'react';
import { Button, Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, Icon } from '@nexgen/ui';
import { SlidersHorizontal } from 'lucide-react';

/**
 * Store Components library — mobile Filter drawer (this milestone's own
 * "Filter drawer desktop+mobile" build item, mobile half). A thin Radix
 * Dialog/Drawer wrapper around whatever filter content the calling page
 * passes as `children` — real reuse of the exact same `<FilterSidebar>`
 * markup the desktop layout renders inline, not a second, divergent
 * mobile-only filter implementation.
 */
export interface FilterDrawerProps {
  children: ReactNode;
  activeCount?: number;
}

export function FilterDrawer({ children, activeCount = 0 }: FilterDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="md" className="gap-2 lg:hidden">
          <Icon icon={SlidersHorizontal} size="inline" />
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-caption text-white">{activeCount}</span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent anchor="left" width="sm">
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto py-4">{children}</div>
        <DrawerClose asChild>
          <Button variant="primary" size="lg" className="w-full">
            Show results
          </Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
