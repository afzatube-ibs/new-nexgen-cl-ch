'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Alert, Button, Card, CardContent, Icon, Text, Textarea, cn } from '@nexgen/ui';
import { Star } from 'lucide-react';
import { submitReviewForm, ReviewSubmissionError, type SubmittedReview } from './reviewFormClient.js';

export interface ReviewFormProps {
  productId: string;
  onSubmitted?: (review: SubmittedReview) => void;
  className?: string;
}

/**
 * Production Completion Plan v2, Milestone 11 (Reviews Foundation) — the
 * real, working review submission form `ReviewCard.tsx`'s own docblock
 * anticipated ("a drop-in, not a rewrite" once a real backend ships).
 * Customer-authenticated only, mirroring `Actions\CreateReviewAction`'s
 * own backend docblock — but deliberately never told this by a
 * server-computed prop: the Product Detail page that renders this form is
 * a statically-generated, ISR page that never reads the visitor's session
 * cookie (see `app/products/[idSlug]/page.tsx`'s own docblock, and
 * `app/page.tsx`'s identical "never forward the Cookie header" rule) — so
 * this component discovers a signed-out caller the same way any of this
 * app's other same-origin mutation attempts would: the real `401` its own
 * submission attempt gets back from `/api/reviews`, at which point it
 * switches to a real "sign in to review" prompt instead of a fabricated
 * upfront gate.
 */
export function ReviewForm({ productId, onSubmitted, className }: ReviewFormProps) {
  const pathname = usePathname();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [requiresSignIn, setRequiresSignIn] = useState(false);

  if (requiresSignIn) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col gap-2 pt-4">
          <Text as="p" variant="body">
            Sign in to write a review — reviews are tied to a real account so other shoppers know it&apos;s genuine.
          </Text>
          <Button asChild className="w-fit">
            <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>Sign in to review</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className={className}>
        <CardContent className="pt-4">
          <Text as="p" variant="body" role="status">
            Thanks — your review has been submitted and is awaiting moderation before it appears publicly.
          </Text>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!rating) {
      setError('Choose a star rating.');
      return;
    }
    if (body.trim().length < 10) {
      setError('Your review needs at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      const review = await submitReviewForm({ productId, rating, title: title.trim() || undefined, body: body.trim() });
      setSubmitted(true);
      onSubmitted?.(review);
    } catch (err) {
      if (err instanceof ReviewSubmissionError && err.status === 401) {
        setRequiresSignIn(true);
        return;
      }
      setError(err instanceof ReviewSubmissionError ? err.message : 'Something went wrong submitting your review. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const displayedRating = hoverRating ?? rating ?? 0;

  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Text as="span" variant="label" className="text-text-primary">
              Your rating
            </Text>
            <div className="flex" role="radiogroup" aria-label="Rating out of 5 stars">
              {([1, 2, 3, 4, 5] as const).map((stars) => (
                <button
                  key={stars}
                  type="button"
                  role="radio"
                  aria-checked={rating === stars}
                  aria-label={`${stars} out of 5 stars`}
                  onClick={() => setRating(stars)}
                  onMouseEnter={() => setHoverRating(stars)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-0.5"
                >
                  <Icon icon={Star} size="inline" className={cn(stars <= displayedRating ? 'fill-current text-brand' : 'text-border')} />
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={255}
            placeholder="Review title (optional)"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-body text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          />

          <Textarea
            label="Your review"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            minLength={10}
            maxLength={5000}
            placeholder="What did you like or dislike? What should other shoppers know?"
            rows={4}
          />

          {error && (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          )}

          <Button type="submit" loading={loading} disabled={loading} className="w-fit">
            Submit review
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
