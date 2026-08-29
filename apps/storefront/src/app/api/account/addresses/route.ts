import { NextResponse } from 'next/server';
import { listMyAddresses, addMyAddress, GatewayRequestError, type AddressInput } from '@nexgen/storefront-engine';
import { getCustomerToken } from '@/lib/customerSession';

function unauthenticated(): NextResponse {
  return NextResponse.json({ message: 'You must be signed in to do that.' }, { status: 401 });
}

export async function GET(): Promise<NextResponse> {
  const token = await getCustomerToken();
  if (!token) return unauthenticated();

  try {
    const addresses = await listMyAddresses(token);
    return NextResponse.json({ data: addresses });
  } catch (error) {
    if (error instanceof GatewayRequestError) return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Something went wrong loading your addresses.' }, { status: 502 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const token = await getCustomerToken();
  if (!token) return unauthenticated();

  const body = (await request.json().catch(() => null)) as Partial<AddressInput> | null;
  if (!body?.recipientName || !body.addressLine1 || !body.city || !body.countryCode || !body.expectedVersion) {
    return NextResponse.json({ message: 'Recipient, address, city, country, and expectedVersion are required.' }, { status: 422 });
  }

  try {
    const address = await addMyAddress(token, body as AddressInput);
    return NextResponse.json({ data: address });
  } catch (error) {
    if (error instanceof GatewayRequestError) return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Something went wrong saving that address.' }, { status: 502 });
  }
}
