import { NextResponse } from 'next/server';
import { submitReview, GatewayRequestError, type SubmitReviewInput } from '@nexgen/storefront-engine';
import { getCustomerToken } from '@/lib/customerSession';

/**
 * Production Completion Plan v2, Milestone 11 (Reviews Foundation) — the
 * one place this app ever submits a review, mirroring `app/api/account/
 * addresses/route.ts`'s own established shape exactly: reads the real
 * customer session cookie server-side, forwards it as a Bearer token to
 * the Gateway via `submitReview`, and never lets the real token reach the
 * browser.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const token = await getCustomerToken();
  if (!token) {
    return NextResponse.json({ message: 'You must be signed in to write a review.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<SubmitReviewInput> | null;
  if (!body?.productId || !body.rating || !body.body) {
    return NextResponse.json({ message: 'A product, rating, and review body are required.' }, { status: 422 });
  }

  try {
    const review = await submitReview(token, {
      productId: body.productId,
      rating: body.rating,
      title: body.title,
      body: body.body,
    });
    return NextResponse.json({ data: review });
  } catch (error) {
    if (error instanceof GatewayRequestError) return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'Something went wrong submitting your review.' }, { status: 502 });
  }
}
