'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, CardContent, Input, Text } from '@nexgen/ui';
import { requestPasswordReset, AuthRequestError } from './authClient.js';

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset). Shows
 * the identical success message regardless of whether the email matched
 * a real account — the real backend's own anti-enumeration discipline,
 * preserved all the way to this UI: this form never has a way to know
 * which case actually happened, so it cannot leak it even by accident.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof AuthRequestError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="pt-4">
          <Text as="p" variant="body" role="status">
            If that email has an account, a password reset link was sent. Check your inbox.
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          )}
          <Button type="submit" loading={loading} disabled={loading}>
            Send reset link
          </Button>
          <Text as="p" variant="caption" className="text-center text-text-secondary">
            <Link href="/login" className="text-brand hover:underline">
              Back to sign in
            </Link>
          </Text>
        </form>
      </CardContent>
    </Card>
  );
}
