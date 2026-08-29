import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — the
 * one place this app ever reads or writes the real customer session
 * cookie. Confirmed transport design: httpOnly, Secure (in production),
 * SameSite=Lax — set only by `app/api/auth/login/route.ts` (the real
 * backend-issued Sanctum token, via `/api/auth/login`'s own real Gateway
 * call), cleared only by `app/api/auth/logout/route.ts`. The browser
 * never reads this cookie's value; only this app's own server-side code
 * (Route Handlers, Server Components) ever does, and only to forward it
 * as an `Authorization: Bearer` header on this app's own server-to-
 * Gateway calls — the real token itself never reaches client-side JS.
 */
export const CUSTOMER_SESSION_COOKIE = 'nx_customer_session';

export async function getCustomerToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CUSTOMER_SESSION_COOKIE)?.value ?? null;
}

/** For a genuinely protected page (`/account/*`) — redirects to `/login` (round-tripping the original destination) rather than rendering with no data. */
export async function requireCustomerToken(currentPath: string): Promise<string> {
  const token = await getCustomerToken();
  if (!token) {
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }
  return token;
}
