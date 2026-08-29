import type { Metadata } from 'next';
import { UserPlus } from 'lucide-react';
import { RegisterForm } from '@nexgen/storefront-engine/client';
import { Text } from '@nexgen/ui';

export const metadata: Metadata = {
  title: 'Create an account',
};

/** Production Completion Plan v2, Milestone 5 (Customer Accounts) — real self-service registration. */
export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle text-brand">
          <UserPlus className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading">
            Create an account
          </Text>
          <Text as="p" variant="body" className="text-text-secondary">
            Save your addresses and track your orders.
          </Text>
        </div>
      </div>
      <RegisterForm />
    </div>
  );
}
