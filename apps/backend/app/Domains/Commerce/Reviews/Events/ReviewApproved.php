<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\ApproveReviewAction. A future Notifications
 * listener reacting to this (e.g. "notify the customer their review is
 * now live") is a real, natural extension point this event exists to
 * enable — not built in this milestone.
 */
final class ReviewApproved extends DomainEvent
{
    public function __construct(
        public readonly string $reviewId,
        public readonly string $productId,
        public readonly string $customerId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'reviews.review.approved';
    }
}
