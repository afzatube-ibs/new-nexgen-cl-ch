import type { Metadata } from 'next';
import { KeyRound } from 'lucide-react';
import { ForgotPasswordForm } from '@nexgen/storefront-engine/client';
import { Text } from '@nexgen/ui';

export const metadata: Metadata = {
  title: 'Reset your password',
};

/** Production Completion Plan v2, Milestone 5b (Password Reset). */
export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle text-brand">
          <KeyRound className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading">
            Reset your password
          </Text>
          <Text as="p" variant="body" className="text-text-secondary">
            Enter your email and we&apos;ll send you a reset link.
          </Text>
        </div>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
