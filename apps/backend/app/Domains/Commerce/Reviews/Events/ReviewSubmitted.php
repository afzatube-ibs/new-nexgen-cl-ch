<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\CreateReviewAction once a real review is submitted
 * (always `pending` at this point — never assume approval). A future
 * Notifications listener reacting to this (e.g. "notify the merchant a
 * review needs moderation") is a real, natural extension point this event
 * exists to enable — not built in this milestone, per its own honest
 * scope (see the completion report).
 */
final class ReviewSubmitted extends DomainEvent
{
    public function __construct(
        public readonly string $reviewId,
        public readonly string $productId,
        public readonly string $customerId,
        public readonly int $rating,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'reviews.review.submitted';
    }
}
