<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Actions;

use App\Domains\Commerce\Reviews\Audit\AuditLogger;
use App\Domains\Commerce\Reviews\Models\Review;
use Illuminate\Support\Carbon;

/**
 * `reviews.reviews.manage`. Setting a merchant response is not a status
 * transition — it is orthogonal to moderation and legal on a review in any
 * status, mirroring `RespondToReviewRequest`'s own docblock: calling this
 * again replaces the prior response rather than stacking a thread, since
 * `ReviewCard.tsx`'s contract has room for exactly one.
 */
final readonly class RespondToReviewAction
{
    public function __construct(
        private AuditLogger $auditLogger,
    ) {}

    public function execute(Review $review, string $body, int $expectedVersion, string $actorId): Review
    {
        $review->assertVersionMatches($expectedVersion);

        $before = $review->only(['merchant_response_body', 'merchant_responded_by', 'merchant_responded_at']);

        $review->update([
            'merchant_response_body' => $body,
            'merchant_responded_by' => $actorId,
            'merchant_responded_at' => Carbon::now(),
        ]);

        $this->auditLogger->log(
            action: 'review.responded',
            actorId: $actorId,
            targetType: Review::class,
            targetId: $review->id,
            before: $before,
            after: $review->only(['merchant_response_body', 'merchant_responded_by', 'merchant_responded_at']),
        );

        return $review->refresh();
    }
}
