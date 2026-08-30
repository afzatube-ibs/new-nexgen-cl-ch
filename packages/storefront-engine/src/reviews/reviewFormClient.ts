'use client';

/**
 * Production Completion Plan v2, Milestone 11 (Reviews Foundation) — the
 * real client for this Storefront app's OWN `/api/reviews` Route Handler,
 * never the Gateway directly. Mirrors `auth/authClient.ts`'s own
 * established same-origin pattern exactly, and for the identical reason:
 * the real customer session lives in an httpOnly cookie only this app's
 * server-side code (the Route Handler) can read — this file, running in
 * the browser, never sees or forwards a real bearer token.
 */

export class ReviewSubmissionError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ReviewSubmissionError';
    this.status = status;
  }
}

export interface SubmitReviewFormInput {
  productId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  body: string;
}

export interface SubmittedReview {
  id: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  body: string;
  createdAt: string;
  verifiedPurchase: boolean;
}

export async function submitReviewForm(input: SubmitReviewFormInput): Promise<SubmittedReview> {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const json = (await response.json().catch(() => ({}))) as { message?: string; data?: SubmittedReview };

  if (!response.ok) {
    throw new ReviewSubmissionError(response.status, json.message ?? 'Something went wrong submitting your review. Please try again.');
  }

  return json.data as SubmittedReview;
}
