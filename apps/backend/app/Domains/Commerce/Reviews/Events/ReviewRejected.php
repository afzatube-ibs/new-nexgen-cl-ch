<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\RejectReviewAction. A future Notifications listener
 * reacting to this (e.g. "notify the customer why their review wasn't
 * approved") is a real, natural extension point this event exists to
 * enable — not built in this milestone.
 */
final class ReviewRejected extends DomainEvent
{
    public function __construct(
        public readonly string $reviewId,
        public readonly string $productId,
        public readonly string $customerId,
        public readonly string $reason,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'reviews.review.rejected';
    }
}
