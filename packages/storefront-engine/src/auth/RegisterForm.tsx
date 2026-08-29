'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Button, Card, CardContent, Input, Text } from '@nexgen/ui';
import { registerAccount, loginAccount, AuthRequestError } from './authClient.js';

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — real
 * self-service registration. Registers, then immediately signs the new
 * customer in with the same credentials (a second, real call — never a
 * fabricated session) so a new customer lands in their own account
 * straight away, rather than being sent back to a login form to re-type
 * the password they just entered.
 */
export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!name.trim() || !email.trim() || !password) {
      setError('Fill in your name, email, and password.');
      return;
    }
    if (password !== passwordConfirmation) {
      setFieldErrors({ password_confirmation: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      await registerAccount({ name: name.trim(), email: email.trim(), password, passwordConfirmation: password });
      await loginAccount(email.trim(), password);
      router.push('/account');
      router.refresh();
    } catch (err) {
      if (err instanceof AuthRequestError) {
        setError(err.message);
        if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      } else {
        setError('Something went wrong creating your account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
          <Input label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            error={fieldErrors.password_confirmation}
          />
          {error && (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          )}
          <Button type="submit" loading={loading} disabled={loading}>
            Create account
          </Button>
          <Text as="p" variant="caption" className="text-center text-text-secondary">
            Already have an account?{' '}
            <Link href="/login" className="text-brand hover:underline">
              Sign in
            </Link>
          </Text>
        </form>
      </CardContent>
    </Card>
  );
}
