'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardContent, Input, Text } from '@nexgen/ui';
import type { CustomerProfile } from '../gateway/customerTypes.js';

export interface ProfileEditFormProps {
  profile: CustomerProfile;
}

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — real
 * self-service profile editing, backed by `PATCH /api/account/profile`
 * (which forwards the real session cookie to the Gateway → backend).
 * Imports its shape from `gateway/customerTypes.ts` — a plain types
 * file with no `server-only` marker (see that file's own docblock) —
 * never from `gateway/customerAuth.ts` itself, which owns the real
 * fetch/token-forwarding code this Client Component must never bundle.
 */
export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone: phone || null, expectedVersion: profile.version }),
      });
      const json = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(json.message ?? 'Something went wrong updating your profile.');
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong updating your profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {error && (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          )}
          {success && !error && (
            <Text as="p" variant="caption" role="status" className="text-feedback-success">
              Profile updated.
            </Text>
          )}
          <Button type="submit" loading={loading} disabled={loading} className="self-start">
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
