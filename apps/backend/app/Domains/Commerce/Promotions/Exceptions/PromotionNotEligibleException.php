<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Exceptions;

use RuntimeException;

/**
 * PRINCIPLES:EXPLICIT_FAILURE applied to redemption attempts against a
 * promotion or coupon that is not currently redeemable — archived, outside
 * its schedule window, or (for a coupon code) unknown. Distinct from
 * UsageLimitExceededException: this means the promotion/coupon itself is
 * not eligible at all, not that a real limit was reached. Mapped to HTTP
 * 422 in bootstrap/app.php — a well-formed request that names something
 * that cannot presently be redeemed, not a conflict with prior reads.
 */
final class PromotionNotEligibleException extends RuntimeException
{
    public function __construct(string $reason)
    {
        parent::__construct($reason);
    }
}
