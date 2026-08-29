'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nexgen/ui';
import { logoutAccount } from './authClient.js';

/** Production Completion Plan v2, Milestone 5 (Customer Accounts) — real sign-out: revokes the real token server-side (see `/api/auth/logout`'s own docblock), then returns to the homepage. */
export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await logoutAccount();
    } finally {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" loading={loading} disabled={loading} onClick={handleClick}>
      Sign out
    </Button>
  );
}
