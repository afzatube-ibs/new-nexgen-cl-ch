import { NextResponse } from 'next/server';
import { requestPasswordReset, GatewayRequestError } from '@nexgen/storefront-engine';

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset). Always
 * answers with the identical success response, whether or not the real
 * backend actually found a matching account — the real backend's own
 * anti-enumeration discipline (`RequestPasswordResetAction`) is
 * preserved end to end; this route adds no distinguishing behavior of
 * its own (e.g. never wraps the real Gateway call in a try/catch that
 * would let a genuine upstream failure silently look identical to
 * success — a real 5xx here still surfaces as one, honestly).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;

  if (!body?.email) {
    return NextResponse.json({ message: 'Email is required.' }, { status: 422 });
  }

  try {
    await requestPasswordReset(body.email);
  } catch (error) {
    if (error instanceof GatewayRequestError) {
      // A genuine upstream failure (rate-limited, backend unreachable)
      // still surfaces honestly — only the "email not found" case is
      // deliberately hidden, and that case never throws at all (see
      // RequestPasswordResetAction's own docblock).
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 502 });
  }

  return NextResponse.json({ message: 'If that email has an account, a password reset link was sent.' });
}
