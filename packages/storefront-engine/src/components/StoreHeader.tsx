'use client';

import { forwardRef, useState, type AnchorHTMLAttributes } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import { ChevronDown, Menu, MessageCircle, Search, ShoppingBag, User } from 'lucide-react';
import { useCartDrawerControls } from '../cart/CartDrawerProvider.js';
import { useCart } from '../cart/useCart.js';
import type { CategorySummary, StorefrontBranding } from '../gateway/types.js';
import { SearchOverlay } from './SearchOverlay.js';

export type NavCategory = CategorySummary & { href: string };
export interface StoreHeaderNavigationItem {
  id: string;
  label: string;
  href: string;
}

export interface StoreHeaderProps {
  categories: NavCategory[];
  branding: StorefrontBranding;
  /** Published MODULE:CMS main-navigation. Empty/undefined keeps the real category tree as a safe fallback. */
  navigation?: StoreHeaderNavigationItem[];
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

type NavigationAnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

const NavigationAnchor = forwardRef<HTMLAnchorElement, NavigationAnchorProps>(function NavigationAnchor({ href, ...props }, ref) {
  if (/^https?:\/\//i.test(href)) {
    return <a ref={ref} href={href} target="_blank" rel="noopener noreferrer" {...props} />;
  }
  return <Link ref={ref} href={href} {...props} />;
});

export function StoreHeader({ categories, branding, navigation }: StoreHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const categoryMenu = groupTopLevel(categories);
  const customNavigation = navigation && navigation.length > 0 ? navigation : null;
  const { activeItemCount } = useCart();
  const { openDrawer } = useCartDrawerControls();
  const brandColor = branding.primaryColor;

  const whatsappHref = branding.social.whatsappNumber
    ? `https://wa.me/${branding.social.whatsappNumber.replace(/[^\d]/g, '')}`
    : null;

  return (
    <div className="sticky top-0 z-40 bg-surface">
      {branding.announcement.enabled && branding.announcement.text && (
        <div className={cn('px-4 py-1.5 text-center text-caption text-white', !brandColor && 'bg-brand')} style={brandColor ? { backgroundColor: brandColor } : undefined}>
          {branding.announcement.text}
        </div>
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
                {customNavigation
                  ? customNavigation.map((item) => (
                      <DrawerClose asChild key={item.id}>
                        <NavigationAnchor href={item.href} className="rounded-md px-2 py-2 text-body-strong text-text-primary hover:bg-surface-subtle">
                          {item.label}
                        </NavigationAnchor>
                      </DrawerClose>
                    ))
                  : categoryMenu.map(({ parent, children }) => (
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

          <Link href="/" className="flex shrink-0 items-center" aria-label={branding.storeName}>
            {branding.logo ? (
              <Image src={branding.logo.url} alt={branding.logo.alt} width={120} height={32} className="h-8 w-auto object-contain" priority />
            ) : (
              <span className="text-body-strong text-text-primary">{branding.storeName}</span>
            )}
          </Link>

          <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 lg:flex">
            {customNavigation
              ? customNavigation.map((item) => (
                  <NavigationAnchor
                    key={item.id}
                    href={item.href}
                    className="rounded-md px-3 py-2 text-body text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {item.label}
                  </NavigationAnchor>
                ))
              : categoryMenu.map(({ parent, children }) =>
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
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
                title="Chat on WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-md text-text-primary hover:bg-surface-subtle"
              >
                <Icon icon={MessageCircle} size="standalone" />
              </a>
            )}
            <button type="button" aria-label="Search" onClick={() => setSearchOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-md text-text-primary hover:bg-surface-subtle">
              <Icon icon={Search} size="standalone" />
            </button>
            <Link
              href="/account"
              aria-label="My account"
              title="My account"
              className="flex h-9 w-9 items-center justify-center rounded-md text-text-primary hover:bg-surface-subtle"
            >
              <Icon icon={User} size="standalone" />
            </Link>
            <button
              type="button"
              aria-label={activeItemCount > 0 ? `Open cart, ${activeItemCount} item${activeItemCount === 1 ? '' : 's'}` : 'Open cart'}
              onClick={openDrawer}
              className="relative flex h-9 w-9 items-center justify-center rounded-md text-text-primary hover:bg-surface-subtle"
            >
              <Icon icon={ShoppingBag} size="standalone" />
              {activeItemCount > 0 && (
                <span
                  className={cn('absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white', !brandColor && 'bg-brand')}
                  style={brandColor ? { backgroundColor: brandColor } : undefined}
                >
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
