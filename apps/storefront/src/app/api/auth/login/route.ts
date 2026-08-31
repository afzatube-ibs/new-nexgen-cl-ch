import { NextResponse } from 'next/server';
import { loginCustomer, GatewayRequestError } from '@nexgen/storefront-engine';
import { CUSTOMER_SESSION_COOKIE } from '@/lib/customerSession';

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — the
 * one real place the customer session cookie is ever SET. Calls the real
 * Gateway login, receives the real backend-issued Sanctum token, and
 * sets it as an httpOnly, SameSite=Lax cookie (Secure in production) —
 * confirmed transport design: the token never appears in this route's
 * own JSON response body, only in the `Set-Cookie` header, which
 * client-side JS cannot read.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { identifier?: string; password?: string } | null;

  // Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — `identifier` may be either a phone or an email.
  if (!body?.identifier || !body.password) {
    return NextResponse.json({ message: 'Mobile number or email, and password, are required.' }, { status: 422 });
  }

  try {
    const { customer, token } = await loginCustomer(body.identifier, body.password);

    const response = NextResponse.json({ phone: customer.phone, email: customer.email });
    response.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // Sanctum tokens issued by identity-access:create-service-account/
      // login carry no server-side expiration by default in this
      // installation (see config/sanctum.php's own 'expiration' — null) —
      // this cookie's own maxAge is this Storefront's independent choice
      // of how long a browser session should stay signed in, not a claim
      // about the token's own real validity window.
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    if (error instanceof GatewayRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'Something went wrong signing in. Please try again.' }, { status: 502 });
  }
}
