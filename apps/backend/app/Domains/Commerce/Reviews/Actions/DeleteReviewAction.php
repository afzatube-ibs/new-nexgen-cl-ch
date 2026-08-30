<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Actions;

use App\Domains\Commerce\Reviews\Audit\AuditLogger;
use App\Domains\Commerce\Reviews\Models\Review;

/**
 * `reviews.reviews.manage`. Soft-deletes a Review — a staff-only removal
 * for abuse/spam, mirroring Customers' own `DeleteCustomerAction` and every
 * other module's DATA:LIFECYCLE Deleted-state pattern: the row is retained
 * (and excluded from every default query) rather than hard-deleted, so the
 * audit trail this action itself writes stays meaningful.
 */
final readonly class DeleteReviewAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Review $review, int $expectedVersion, ?string $actorId): void
    {
        $review->assertVersionMatches($expectedVersion);

        $before = $review->only(['product_id', 'customer_id', 'status', 'rating']);
        $review->delete();

        $this->auditLogger->log(
            action: 'review.deleted',
            actorId: $actorId,
            targetType: Review::class,
            targetId: $review->id,
            before: $before,
        );
    }
}
