import { headers } from 'next/headers';

/**
 * The incoming request's own `Cookie` header, forwarded to every Gateway
 * call a Server Component makes — this is what lets the Gateway's own
 * guest-session plugin (`nx_did`) see the same visitor across requests
 * (`middleware.ts`'s own docblock explains the write side of this same
 * relay). `next/headers`'s `headers()` is the read side; a Server
 * Component cannot itself write a `Set-Cookie`, which is exactly why the
 * mint-on-first-visit half of this lives in middleware instead.
 */
export async function getRequestCookie(): Promise<string | undefined> {
  const requestHeaders = await headers();
  return requestHeaders.get('cookie') ?? undefined;
}

export async function getRequestLocale(): Promise<string | null> {
  const requestHeaders = await headers();
  return requestHeaders.get('accept-language');
}
