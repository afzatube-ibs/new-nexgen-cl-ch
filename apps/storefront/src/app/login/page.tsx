import type { Metadata } from 'next';
import { LogIn } from 'lucide-react';
import { LoginForm } from '@nexgen/storefront-engine/client';
import { Text } from '@nexgen/ui';

export const metadata: Metadata = {
  title: 'Sign in',
};

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — real
 * customer sign-in. `?redirect=` (set by `requireCustomerToken()` when an
 * unauthenticated visit to a protected `/account/*` page bounces here)
 * sends the customer back to where they were actually headed, rather
 * than always landing on the generic account overview.
 */
export default async function LoginPage({ searchParams }: PageProps) {
  const { redirect } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle text-brand">
          <LogIn className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading">
            Sign in
          </Text>
          <Text as="p" variant="body" className="text-text-secondary">
            Access your orders, addresses, and profile.
          </Text>
        </div>
      </div>
      <LoginForm redirectTo={redirect && redirect.startsWith('/') ? redirect : '/account'} />
    </div>
  );
}
