import { NextResponse } from 'next/server';
import { registerCustomer } from '@nexgen/storefront-engine';
import { GatewayRequestError } from '@nexgen/storefront-engine';

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — real
 * self-service registration. Does not itself set the session cookie —
 * `RegisterForm` calls this, then immediately calls `/api/auth/login`
 * with the same credentials for a real, separate authentication (never a
 * fabricated session from a registration response alone).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    phone?: string;
    email?: string | null;
    password?: string;
    passwordConfirmation?: string;
  } | null;

  // Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — phone required, email optional (was the inverse).
  if (!body?.name || !body.phone || !body.password || !body.passwordConfirmation) {
    return NextResponse.json({ message: 'Name, mobile number, and password are required.' }, { status: 422 });
  }

  try {
    const customer = await registerCustomer({
      name: body.name,
      phone: body.phone,
      email: body.email,
      password: body.password,
      passwordConfirmation: body.passwordConfirmation,
    });
    return NextResponse.json({ phone: customer.phone, email: customer.email });
  } catch (error) {
    if (error instanceof GatewayRequestError) {
      const fieldErrors = extractFieldErrors(error);
      return NextResponse.json({ message: error.message, fieldErrors }, { status: error.status });
    }
    return NextResponse.json({ message: 'Something went wrong creating your account. Please try again.' }, { status: 502 });
  }
}

/** The Gateway's own `validation_failed` shape carries `error.details: [{field, message}]` — reshaped here into the flat `{field: message}` map `RegisterForm` reads directly against each `Input`'s own `error` prop. */
function extractFieldErrors(error: GatewayRequestError): Record<string, string> | undefined {
  if (!error.details) return undefined;
  const map: Record<string, string> = {};
  for (const detail of error.details) {
    if (detail.field) map[detail.field] = detail.message;
  }
  return map;
}
