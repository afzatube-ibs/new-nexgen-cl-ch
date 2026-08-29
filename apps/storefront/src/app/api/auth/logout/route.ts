import { NextResponse } from 'next/server';
import { logoutCustomer } from '@nexgen/storefront-engine';
import { CUSTOMER_SESSION_COOKIE, getCustomerToken } from '@/lib/customerSession';

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — real
 * logout: revokes the actual token server-side (via the real Gateway/
 * backend call) before clearing the cookie, so a copy of the cookie
 * captured before logout (e.g. from a shared/public machine) cannot
 * still authenticate — never just a client-side "forget the cookie."
 */
export async function POST(): Promise<NextResponse> {
  const token = await getCustomerToken();

  if (token) {
    // Best-effort: if the real backend call fails (token already
    // expired/revoked, or the backend is briefly unreachable), the
    // cookie is still cleared below — a customer must always be able to
    // sign out of THIS browser, even if the real revocation call itself
    // could not complete.
    await logoutCustomer(token).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(CUSTOMER_SESSION_COOKIE);
  return response;
}
