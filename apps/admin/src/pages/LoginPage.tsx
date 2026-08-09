import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Alert, Text } from '@nexgen/ui';
import { ValidationApiError, UnauthenticatedError, NetworkOrParseError } from '@nexgen/api-client';
import { useAuth } from '../auth/useAuth.js';
import { useAuthStore } from '../auth/authStore.js';
import { safeRelativePath } from '../lib/safeRedirect.js';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  // Mirrors LoginRequest's own server-side rule (apps/backend) — a
  // client-side failure should never surprise an operator relative to the
  // equivalent server-side 422, per ADR-0005's Forms decision.
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const endReason = useAuthStore((s) => s.endReason);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setFormError(null);
    try {
      await login(values.email, values.password);
      const rawReturnTo = searchParams.get('returnTo');
      const returnTo = safeRelativePath(rawReturnTo ? decodeURIComponent(rawReturnTo) : null);
      void navigate(returnTo, { replace: true });
    } catch (error) {
      if (error instanceof ValidationApiError) {
        const emailError = error.fieldErrors.email?.[0];
        if (emailError) {
          setError('email', { message: emailError });
          return;
        }
      }
      if (error instanceof UnauthenticatedError) {
        setFormError('Invalid email or password.');
        return;
      }
      if (error instanceof NetworkOrParseError) {
        setFormError('Could not reach the server. Check your connection and try again.');
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-elevation-2 dark:shadow-elevation-2-dark">
        <Text variant="heading" as="h1" className="mb-1">
          neXgen Admin
        </Text>
        <Text variant="body" className="mb-6 text-text-secondary">
          Sign in to continue
        </Text>

        {endReason === 'expired' && (
          <Alert variant="warning" className="mb-4" title="Your session ended">
            Please sign in again to continue.
          </Alert>
        )}
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input
            type="email"
            label="Email"
            autoComplete="username"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            type="password"
            label="Password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
