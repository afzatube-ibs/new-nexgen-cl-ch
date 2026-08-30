<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Actions;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Reviews\Audit\AuditLogger;
use App\Domains\Commerce\Reviews\Events\ReviewSubmitted;
use App\Domains\Commerce\Reviews\Exceptions\DuplicateReviewException;
use App\Domains\Commerce\Reviews\Models\Review;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;

/**
 * Production Completion Plan v2, Milestone 11 (Reviews Foundation).
 * Customer-authenticated only — no anonymous/guest review path (the
 * plan's own "shippable without [Customer Accounts]... but materially
 * better with it" was resolved in favor of the materially-better real
 * path, since Milestone 5 already shipped real Customer Accounts this
 * engagement).
 *
 * `author_name` is read directly from the already-available, already-
 * authenticated Customer principal (`customer.guard`) at submission time
 * — a real snapshot, never a live cross-domain query into Customers,
 * mirroring `order_items.product_name`'s own identically-reasoned
 * pattern.
 *
 * The one real, legitimate code-level dependency this module has is a
 * narrow, read-only check against Orders — exactly mirroring Payments'
 * own real, documented dependency on Orders (see that module's own
 * `InitiatePaymentAction`): a real order for this customer, containing
 * this product's SKU, in any status past `pending`/`cancelled` (i.e. the
 * order was genuinely confirmed and paid for, not merely started or
 * called off) marks the review `verified_purchase` and records which
 * order proved it. A review is never blocked for lacking one — an
 * honestly un-badged review from a real account is still real content,
 * not something to refuse outright.
 */
final readonly class CreateReviewAction
{
    public function __construct(
        private AuditLogger $auditLogger,
        private DomainEventBus $eventBus,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, string $customerId, string $authorName): Review
    {
        if (Review::query()->where('customer_id', $customerId)->where('product_id', $attributes['product_id'])->exists()) {
            throw new DuplicateReviewException;
        }

        [$verifiedPurchase, $orderId] = $this->findVerifiedPurchase($customerId, $attributes['product_id']);

        $review = Review::query()->create([
            'product_id' => $attributes['product_id'],
            'customer_id' => $customerId,
            'author_name' => $authorName,
            'order_id' => $orderId,
            'rating' => $attributes['rating'],
            'title' => $attributes['title'] ?? null,
            'body' => $attributes['body'],
            'verified_purchase' => $verifiedPurchase,
        ]);

        $this->auditLogger->log(
            action: 'review.submitted',
            actorId: $customerId,
            targetType: Review::class,
            targetId: $review->id,
            after: $review->only(['product_id', 'rating', 'status', 'verified_purchase']),
        );

        $this->eventBus->publish(new ReviewSubmitted(
            reviewId: $review->id,
            productId: $review->product_id,
            customerId: $review->customer_id,
            rating: $review->rating,
        ));

        return $review;
    }

    /**
     * @return array{0: bool, 1: string|null}
     */
    private function findVerifiedPurchase(string $customerId, string $productId): array
    {
        $order = Order::query()
            ->where('customer_id', $customerId)
            ->where('status', '!=', Order::STATUS_PENDING)
            ->where('status', '!=', Order::STATUS_CANCELLED)
            ->whereHas('items', fn ($query) => $query->where('product_id', $productId))
            ->orderByDesc('placed_at')
            ->first();

        if ($order === null) {
            return [false, null];
        }

        return [true, $order->id];
    }
}
