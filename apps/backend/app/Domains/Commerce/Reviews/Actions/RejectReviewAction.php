<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Actions;

use App\Domains\Commerce\Reviews\Audit\AuditLogger;
use App\Domains\Commerce\Reviews\Events\ReviewRejected;
use App\Domains\Commerce\Reviews\Models\Review;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;

final readonly class RejectReviewAction
{
    public function __construct(
        private AuditLogger $auditLogger,
        private DomainEventBus $eventBus,
    ) {}

    public function execute(Review $review, string $reason, int $expectedVersion, ?string $actorId): Review
    {
        $review->assertVersionMatches($expectedVersion);
        $review->assertCanTransitionTo(Review::STATUS_REJECTED);

        $before = $review->only(['status', 'rejection_reason']);
        $review->update(['status' => Review::STATUS_REJECTED, 'rejection_reason' => $reason]);

        $this->auditLogger->log(
            action: 'review.rejected',
            actorId: $actorId,
            targetType: Review::class,
            targetId: $review->id,
            before: $before,
            after: $review->only(['status', 'rejection_reason']),
        );

        $this->eventBus->publish(new ReviewRejected(
            reviewId: $review->id,
            productId: $review->product_id,
            customerId: $review->customer_id,
            reason: $reason,
        ));

        return $review->refresh();
    }
}
