'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardContent, Input } from '@nexgen/ui';
import { resetPassword, AuthRequestError } from './authClient.js';

export interface ResetPasswordFormProps {
  email: string;
  token: string;
}

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset). On
 * success, `/api/auth/reset-password` has already signed the customer in
 * with their new password and set the real session cookie — this just
 * redirects into the account area, mirroring `RegisterForm`'s own
 * "then immediately sign in" UX.
 */
export function ResetPasswordForm({ email, token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!password) {
      setError('Enter a new password.');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, token, password);
      router.push('/account');
      router.refresh();
    } catch (err) {
      setError(err instanceof AuthRequestError ? err.message : 'Something went wrong resetting your password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
          />
          {error && (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          )}
          <Button type="submit" loading={loading} disabled={loading}>
            Reset password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
