import { NextResponse, type NextRequest } from 'next/server';

/**
 * `STORE_FRONTEND_ARCHITECTURE.md` §1.3: "Every request is resolved to
 * exactly one store... before any route matches, via Next.js middleware."
 * Phase 1 backend is single-tenant, so store resolution is a real, but
 * today unconditional, no-op — `x-nexgen-store: default` is set on every
 * request so a future multi-domain/path-prefix lookup is a change to this
 * one function, never a route/page rewrite (`STORE_FRONTEND_ARCHITECTURE.md`
 * §6's own "extension, not redesign" commitment).
 *
 * The other real job done here — and the reason this has to be middleware,
 * not a Server Component — is the guest-session cookie relay:
 * `apps/store-api-gateway`'s own guest-session plugin (Slice 1) mints an
 * `nx_did` cookie on first contact and expects it forwarded back on every
 * subsequent request. A Server Component's own `fetch()` call can READ the
 * incoming request's cookies (`next/headers`), but only middleware can
 * WRITE a `Set-Cookie` back to the browser for a page render — so on a
 * visitor's very first request (no `nx_did` cookie yet), middleware makes
 * one lightweight call to the Gateway, reads the `Set-Cookie` header the
 * guest-session plugin returns, and re-applies it to the outgoing
 * `NextResponse`. Every subsequent request already carries the cookie, so
 * this is a one-time cost per visitor, not a per-request tax.
 */

const GATEWAY_BASE_URL = process.env.STORE_API_GATEWAY_URL ?? 'http://127.0.0.1:4000';
// Beta Milestone 2 — implements STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md
// §1.3's own recommendation: a short, explicit timeout on this call rather
// than inheriting the platform's own default. A synchronous cross-service
// call on every new visitor's cold-start path must never wait longer than
// a bounded, deliberate ceiling.
const GUEST_SESSION_MINT_TIMEOUT_MS = 400;

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  response.headers.set('x-nexgen-store', 'default');

  if (!request.cookies.get('nx_did')) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GUEST_SESSION_MINT_TIMEOUT_MS);
    try {
      const gatewayResponse = await fetch(`${GATEWAY_BASE_URL}/health`, { headers: { Accept: 'application/json' }, signal: controller.signal });
      const setCookie = gatewayResponse.headers.get('set-cookie');
      if (setCookie) {
        response.headers.append('set-cookie', setCookie);
      }
    } catch {
      // The Gateway being briefly unreachable must never block a page
      // render (PRINCIPLES:EXPLICIT_FAILURE's "degrade, never crash the
      // whole request" already established for the Gateway's own circuit
      // breakers, applied here at the Storefront's own edge) — the visitor
      // simply gets a fresh anonymous identity minted on their next
      // successful request instead. A timeout (AbortError) hits this exact
      // same branch, deliberately — degrade identically either way.
    } finally {
      clearTimeout(timeout);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
