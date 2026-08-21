import Image from 'next/image';
import { Badge, Icon, Text, cn } from '@nexgen/ui';
import { CheckCircle2, Star } from 'lucide-react';

/**
 * Store Components library — Beta Milestone 2.6's own "Review Foundation"
 * build item: a real, reusable review card, real photo-review layout, a
 * real verified-purchase badge, and a real merchant-response block — all
 * built to a Gateway-driven-only contract (`Review`, below, is the real
 * shape a future Reviews module would return). **No live page in this
 * codebase renders this with fabricated content** — it exists so the day
 * a real Reviews backend ships, this is a drop-in, not a rewrite.
 */
export interface Review {
  id: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  body: string;
  createdAt: string;
  verifiedPurchase: boolean;
  photos?: { src: string; alt: string }[];
  merchantResponse?: { body: string; respondedAt: string };
}

export interface ReviewCardProps {
  review: Review;
  className?: string;
}

export function ReviewCard({ review, className }: ReviewCardProps) {
  return (
    <div className={cn('flex flex-col gap-2 border-b border-border pb-6', className)}>
      <div className="flex items-center gap-2">
        <div className="flex" aria-label={`${review.rating} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, index) => (
            <Icon key={index} icon={Star} size="inline" className={index < review.rating ? 'fill-current text-brand' : 'text-border'} aria-hidden="true" />
          ))}
        </div>
        {review.verifiedPurchase && (
          <Badge variant="success" className="gap-1">
            <Icon icon={CheckCircle2} size="inline" />
            Verified Purchase
          </Badge>
        )}
      </div>

      {review.title && (
        <Text as="p" variant="body-strong">
          {review.title}
        </Text>
      )}
      <Text as="p" variant="body" className="text-text-secondary">
        {review.body}
      </Text>

      {review.photos && review.photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pt-1">
          {review.photos.map((photo) => (
            <div key={photo.src} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface-subtle">
              <Image src={photo.src} alt={photo.alt} fill sizes="80px" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      <Text as="p" variant="caption" className="text-text-secondary">
        {review.authorName} · {review.createdAt}
      </Text>

      {review.merchantResponse && (
        <div className="ml-4 mt-2 flex flex-col gap-1 rounded-md bg-surface-subtle p-3">
          <Text as="p" variant="caption" className="font-medium text-text-primary">
            Response from the seller
          </Text>
          <Text as="p" variant="caption" className="text-text-secondary">
            {review.merchantResponse.body}
          </Text>
          <Text as="p" variant="caption" className="text-text-secondary/70">
            {review.merchantResponse.respondedAt}
          </Text>
        </div>
      )}
    </div>
  );
}

export interface ReviewListProps {
  reviews: Review[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

/** Real, honest empty state when `reviews` is empty — true for every real product today. */
export function ReviewList({ reviews, emptyTitle = 'No reviews yet', emptyDescription = 'Be the first to review this product.', className }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className={cn('flex flex-col gap-1 py-6 text-center', className)}>
        <Text as="p" variant="body-strong">
          {emptyTitle}
        </Text>
        <Text as="p" variant="caption" className="text-text-secondary">
          {emptyDescription}
        </Text>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}
