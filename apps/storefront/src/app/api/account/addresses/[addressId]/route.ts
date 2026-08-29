import { NextResponse } from 'next/server';
import { updateMyAddress, deleteMyAddress, GatewayRequestError, type AddressInput } from '@nexgen/storefront-engine';
import { getCustomerToken } from '@/lib/customerSession';

function unauthenticated(): NextResponse {
  return NextResponse.json({ message: 'You must be signed in to do that.' }, { status: 401 });
}

interface RouteParams {
  params: Promise<{ addressId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const token = await getCustomerToken();
  if (!token) return unauthenticated();
  const { addressId } = await params;

  const body = (await request.json().catch(() => null)) as (Partial<AddressInput> & { expectedVersion?: number }) | null;
  if (!body?.expectedVersion) {
    return NextResponse.json({ message: 'expectedVersion is required.' }, { status: 422 });
  }

  try {
    const address = await updateMyAddress(token, addressId, body as Partial<AddressInput> & { expectedVersion: number });
    return NextResponse.json({ data: address });
  } catch (error) {
    if (error instanceof GatewayRequestError) return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Something went wrong updating that address.' }, { status: 502 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const token = await getCustomerToken();
  if (!token) return unauthenticated();
  const { addressId } = await params;

  const body = (await request.json().catch(() => null)) as { expectedVersion?: number } | null;
  if (!body?.expectedVersion) {
    return NextResponse.json({ message: 'expectedVersion is required.' }, { status: 422 });
  }

  try {
    await deleteMyAddress(token, addressId, body.expectedVersion);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GatewayRequestError) return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Something went wrong deleting that address.' }, { status: 502 });
  }
}
