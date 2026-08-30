<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Actions;

use App\Domains\Commerce\Reviews\Audit\AuditLogger;
use App\Domains\Commerce\Reviews\Events\ReviewApproved;
use App\Domains\Commerce\Reviews\Models\Review;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;

final readonly class ApproveReviewAction
{
    public function __construct(
        private AuditLogger $auditLogger,
        private DomainEventBus $eventBus,
    ) {}

    public function execute(Review $review, int $expectedVersion, ?string $actorId): Review
    {
        $review->assertVersionMatches($expectedVersion);
        $review->assertCanTransitionTo(Review::STATUS_APPROVED);

        $before = $review->only(['status']);
        $review->update(['status' => Review::STATUS_APPROVED, 'rejection_reason' => null]);

        $this->auditLogger->log(
            action: 'review.approved',
            actorId: $actorId,
            targetType: Review::class,
            targetId: $review->id,
            before: $before,
            after: $review->only(['status']),
        );

        $this->eventBus->publish(new ReviewApproved(
            reviewId: $review->id,
            productId: $review->product_id,
            customerId: $review->customer_id,
        ));

        return $review->refresh();
    }
}
