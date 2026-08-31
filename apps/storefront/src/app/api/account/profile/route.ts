import { NextResponse } from 'next/server';
import { updateMyProfile, GatewayRequestError } from '@nexgen/storefront-engine';
import { getCustomerToken } from '@/lib/customerSession';

/** Production Completion Plan v2, Milestone 5 (Customer Accounts) — real self-service profile update, reading the real session cookie server-side and forwarding it to the Gateway. */
export async function PATCH(request: Request): Promise<NextResponse> {
  const token = await getCustomerToken();
  if (!token) {
    return NextResponse.json({ message: 'You must be signed in to do that.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { name?: string; email?: string | null; phone?: string; expectedVersion?: number } | null;

  if (!body?.expectedVersion) {
    return NextResponse.json({ message: 'expectedVersion is required.' }, { status: 422 });
  }

  try {
    const profile = await updateMyProfile(token, { name: body.name, email: body.email, phone: body.phone, expectedVersion: body.expectedVersion });
    return NextResponse.json({ data: profile });
  } catch (error) {
    if (error instanceof GatewayRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'Something went wrong updating your profile. Please try again.' }, { status: 502 });
  }
}
