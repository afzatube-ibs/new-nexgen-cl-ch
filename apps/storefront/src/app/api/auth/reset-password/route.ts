import { NextResponse } from 'next/server';
import { resetPassword, loginCustomer, GatewayRequestError } from '@nexgen/storefront-engine';
import { CUSTOMER_SESSION_COOKIE } from '@/lib/customerSession';

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset). On a real,
 * successful reset, immediately signs the customer in with their new
 * password (a second, real call — never a fabricated session) and sets
 * the real session cookie, mirroring `/api/auth/register`'s own
 * "register, then sign in" UX — a customer who just reset their password
 * lands directly in their account rather than being sent to a login form
 * to re-type the password they just chose.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { email?: string; token?: string; password?: string } | null;

  if (!body?.email || !body.token || !body.password) {
    return NextResponse.json({ message: 'Email, token, and a new password are required.' }, { status: 422 });
  }

  try {
    await resetPassword(body.email, body.token, body.password);
    const { token } = await loginCustomer(body.email, body.password);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    if (error instanceof GatewayRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'Something went wrong resetting your password. Please try again.' }, { status: 502 });
  }
}
