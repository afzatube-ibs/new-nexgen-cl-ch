'use client';

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — the
 * real client for this Storefront app's OWN `/api/auth/*` Route
 * Handlers, never the Gateway directly. Deliberately same-origin, unlike
 * `checkout/checkoutClient.ts`'s direct-to-Gateway pattern: only a
 * same-origin Route Handler can set the real httpOnly session cookie
 * this platform's confirmed transport design requires (a browser fetch
 * to a cross-origin Gateway could not set a cookie this app's own pages
 * could later read server-side) — see `apps/storefront/src/lib/
 * customerSession.ts`'s own docblock for the full transport chain.
 *
 * This file never sees, stores, or forwards a real bearer token — it
 * only ever talks to this app's own Route Handlers, which are the only
 * code that ever touches one.
 */

export class AuthRequestError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string> | undefined;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'AuthRequestError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function authRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as { message?: string; fieldErrors?: Record<string, string> } & T;

  if (!response.ok) {
    throw new AuthRequestError(response.status, json.message ?? 'Something went wrong. Please try again.', json.fieldErrors);
  }

  return json;
}

export interface RegisterAccountInput {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  phone?: string;
}

export function registerAccount(input: RegisterAccountInput): Promise<{ email: string }> {
  return authRequest('/api/auth/register', input);
}

export function loginAccount(email: string, password: string): Promise<{ email: string }> {
  return authRequest('/api/auth/login', { email, password });
}

export function logoutAccount(): Promise<void> {
  return authRequest('/api/auth/logout');
}
