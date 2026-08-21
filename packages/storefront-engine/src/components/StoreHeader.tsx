'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  cn,
} from '@nexgen/ui';
import { ChevronDown, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { useCartDrawerControls } from '../cart/CartDrawerProvider.js';
import { useCart } from '../cart/useCart.js';
import type { CategorySummary } from '../gateway/types.js';
import { SearchOverlay } from './SearchOverlay.js';

/**
 * Store Components library — the site-wide Navigation header, this
 * milestone's own build item 5. A real mega-menu built from the real
 * category hierarchy (`CategorySummary.parentId`/`.position`, added to
 * the Gateway specifically for this — `mappers.ts`'s own docblock): a
 * top-level category (`parentId === null`) with real children renders as
 * a keyboard-navigable Radix dropdown; one with no children is a plain
 * link. Sticky (`position: sticky`, not JS scroll-listening — zero extra
 * runtime cost). Search/Account are real, accessible, keyboard-focusable
 * affordances — Search opens a real overlay, Account remains honestly
 * inert (Category B, no customer-facing auth guard exists yet). **Cart**
 * is real as of Beta Sprint 3's Cart Engine — a live item-count badge
 * (`useCart().activeItemCount`) and a real click handler
 * (`useCartDrawerControls().openDrawer`) opening the site-wide
 * `CartDrawer` mounted once in `app/layout.tsx`.
 *
 * **`categories` carries an already-computed `href`, not a `buildHref`
 * function** — unlike `ProductGrid`/`CategoryGrid` (real Server
 * Components, where a function prop is fine), this is a real Client
 * Component (`'use client'`, needed for the mega-menu/drawer/search
 * open state): a plain function cannot cross the Server→Client boundary
 * as a prop (found live, via a real `next build` prerender failure —
 * "Functions cannot be passed directly to Client Components") — the
 * calling Server Component (`app/layout.tsx`) computes each category's
 * own real href with `categoryHref()` before handing this component
 * plain, serializable data.
 */
export type NavCategory = CategorySummary & { href: string };

export interface StoreHeaderProps {
  categories: NavCategory[];
  storeName?: string;
  /** A real, generic announcement — no per-store promotions backend exists to source real copy from yet (`MISSING_ECOMMERCE_FEATURES_AUDIT.md`). */
  announcement?: string;
}

function groupTopLevel(categories: NavCategory[]): { parent: NavCategory; children: NavCategory[] }[] {
  const byParent = new Map<string, NavCategory[]>();
  for (const category of categories) {
    if (category.parentId === null) continue;
    const list = byParent.get(category.parentId) ?? [];
    list.push(category);
    byParent.set(category.parentId, list);
  }
  return categories
    .filter((category) => category.parentId === null)
    .sort((a, b) => a.position - b.position)
    .map((parent) => ({ parent, children: (byParent.get(parent.id) ?? []).sort((a, b) => a.position - b.position) }));
}

export function StoreHeader({ categories, storeName = 'neXgen Store', announcement }: StoreHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menu = groupTopLevel(categories);
  const { activeItemCount } = useCart();
  const { openDrawer } = useCartDrawerControls();

  return (
    <div className="sticky top-0 z-40 bg-surface">
      {announcement && (
        <div className="bg-brand px-4 py-1.5 text-center text-caption text-white">{announcement}</div>
      )}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
            <DrawerTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="flex h-9 w-9 items-center justify-center rounded-md text-text-primary hover:bg-surface-subtle lg:hidden"
              >
                <Icon icon={Menu} size="standalone" />
              </button>
            </DrawerTrigger>
            <DrawerContent anchor="left" width="sm">
              <DrawerHeader>
                <DrawerTitle>Menu</DrawerTitle>
              </DrawerHeader>
              <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1 overflow-y-auto py-2">
                {menu.map(({ parent, children }) => (
                  <div key={parent.id} className="flex flex-col">
                    <DrawerClose asChild>
                      <Link href={parent.href} className="rounded-md px-2 py-2 text-body-strong text-text-primary hover:bg-surface-subtle">
                        {parent.name}
                      </Link>
                    </DrawerClose>
                    {children.length > 0 && (
                      <div className="ml-3 flex flex-col border-l border-border pl-3">
                        {children.map((child) => (
                          <DrawerClose asChild key={child.id}>
                            <Link href={child.href} className="rounded-md px-2 py-1.5 text-body text-text-secondary hover:bg-surface-subtle hover:text-text-primary">
                              {child.name}
                            </Link>
                          </DrawerClose>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </DrawerContent>
          </Drawer>

          <Link href="/" className="shrink-0 text-body-strong text-text-primary">
            {storeName}
          </Link>

          <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 lg:flex">
            {menu.map(({ parent, children }) =>
              children.length > 0 ? (
                <DropdownMenu key={parent.id}>
                  <DropdownMenuTrigger
                    className={cn(
                      'flex items-center gap-1 rounded-md px-3 py-2 text-body text-text-primary hover:bg-surface-subtle',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                    )}
                  >
                    {parent.name}
                    <Icon icon={ChevronDown} size="inline" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[14rem]">
                    <DropdownMenuItem asChild>
                      <Link href={parent.href}>All {parent.name}</Link>
                    </DropdownMenuItem>
                    {children.map((child) => (
                      <DropdownMenuItem asChild key={child.id}>
                        <Link href={child.href}>{child.name}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={parent.id}
                  href={parent.href}
                  className="rounded-md px-3 py-2 text-body text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {parent.name}
                </Link>
              ),
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button type="button" aria-label="Search" onClick={() => setSearchOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-md text-text-primary hover:bg-surface-subtle">
              <Icon icon={Search} size="standalone" />
            </button>
            <button type="button" aria-label="Account — coming soon" title="Coming soon" className="flex h-9 w-9 items-center justify-center rounded-md text-text-primary hover:bg-surface-subtle">
              <Icon icon={User} size="standalone" />
            </button>
            <button
              type="button"
              aria-label={activeItemCount > 0 ? `Open cart, ${activeItemCount} item${activeItemCount === 1 ? '' : 's'}` : 'Open cart'}
              onClick={openDrawer}
              className="relative flex h-9 w-9 items-center justify-center rounded-md text-text-primary hover:bg-surface-subtle"
            >
              <Icon icon={ShoppingBag} size="standalone" />
              {activeItemCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-white">
                  {activeItemCount > 99 ? '99+' : activeItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
