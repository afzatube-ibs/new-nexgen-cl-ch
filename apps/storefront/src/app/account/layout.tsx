import Link from 'next/link';
import { SignOutButton } from '@nexgen/storefront-engine/client';
import { Text } from '@nexgen/ui';
import { requireCustomerToken } from '@/lib/customerSession';

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — the
 * real `/account/*` gate: every page under this layout requires a real
 * customer session (`requireCustomerToken`), which redirects to `/login`
 * (round-tripping the original path) rather than rendering with no data.
 * A shared sub-nav so Profile/Addresses/Orders don't each rebuild it.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireCustomerToken('/account');

  const links = [
    { href: '/account', label: 'Profile' },
    { href: '/account/addresses', label: 'Addresses' },
    { href: '/account/orders', label: 'Orders' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Text as="h1" variant="display">
          My account
        </Text>
        <SignOutButton />
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        <nav aria-label="Account" className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-48 md:flex-col">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap rounded-md px-3 py-2 text-body text-text-primary hover:bg-surface-subtle">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
