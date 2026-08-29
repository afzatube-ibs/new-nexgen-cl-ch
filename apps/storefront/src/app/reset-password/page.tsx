import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { ResetPasswordForm } from '@nexgen/storefront-engine/client';
import { Alert, Text } from '@nexgen/ui';

export const metadata: Metadata = {
  title: 'Choose a new password',
};

interface PageProps {
  searchParams: Promise<{ email?: string; token?: string }>;
}

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset) — the
 * destination of the real link `SendPasswordResetEmailOnCustomer
 * PasswordResetRequested` builds and queues in a real email. A missing
 * or malformed `email`/`token` (a stale bookmark, a forwarded/mangled
 * link) shows a real, honest message rather than a broken form — the
 * real backend's own generic "invalid or expired" outcome would fire
 * anyway once submitted, but failing this early avoids a pointless
 * round trip.
 */
export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { email, token } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle text-brand">
          <KeyRound className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading">
            Choose a new password
          </Text>
        </div>
      </div>
      {email && token ? (
        <ResetPasswordForm email={email} token={token} />
      ) : (
        <Alert variant="danger">
          This password reset link is missing required information.{' '}
          <Link href="/forgot-password" className="underline">
            Request a new one
          </Link>
          .
        </Alert>
      )}
    </div>
  );
}
