'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Button, Card, CardContent, Input, Text } from '@nexgen/ui';
import { loginAccount, AuthRequestError } from './authClient.js';

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — real
 * customer login. On success, the real session cookie is already set
 * (by `/api/auth/login`, before this component's own fetch resolves) —
 * this just redirects into the account area next.
 *
 * Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — a single
 * "Mobile number or email" field replaces the previous email-only field,
 * per the Product Owner's own requirement: "Customer login should
 * support mobile number... Email login may remain supported."
 */
export interface LoginFormProps {
  /** Where to land after a real, successful login — defaults to the account overview. */
  redirectTo?: string;
}

export function LoginForm({ redirectTo = '/account' }: LoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Enter your mobile number or email, and password.');
      return;
    }

    setLoading(true);
    try {
      await loginAccount(identifier.trim(), password);
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof AuthRequestError ? err.message : 'Something went wrong signing in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Mobile number or email"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Link href="/forgot-password" className="self-end text-caption text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
          {error && (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          )}
          <Button type="submit" loading={loading} disabled={loading}>
            Sign in
          </Button>
          <Text as="p" variant="caption" className="text-center text-text-secondary">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-brand hover:underline">
              Create one
            </Link>
          </Text>
        </form>
      </CardContent>
    </Card>
  );
}
