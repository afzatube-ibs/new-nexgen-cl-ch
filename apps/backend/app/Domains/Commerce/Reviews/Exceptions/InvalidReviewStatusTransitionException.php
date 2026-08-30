<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Exceptions;

use RuntimeException;

/**
 * A real, well-formed moderation request against a Review that cannot
 * legally move from its current `status` to the requested one, per
 * `Models\Review::TRANSITIONS`. Mapped to HTTP 422 in bootstrap/app.php —
 * a business-rule violation, not a validation or version-conflict
 * failure.
 */
final class InvalidReviewStatusTransitionException extends RuntimeException
{
    public function __construct(string $reviewId, string $fromStatus, string $toStatus)
    {
        parent::__construct("Review [{$reviewId}] cannot move from [{$fromStatus}] to [{$toStatus}].");
    }
}
