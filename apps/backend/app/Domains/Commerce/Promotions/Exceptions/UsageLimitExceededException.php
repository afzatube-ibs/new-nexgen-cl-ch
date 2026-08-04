<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Exceptions;

use RuntimeException;

/**
 * PRINCIPLES:EXPLICIT_FAILURE applied to this module's usage-limit
 * invariants: "Usage limits", "Per-customer limits", and "Global limits"
 * are all enforced by Actions\RedeemPromotionAction re-checking them
 * inside the same optimistic-locked transaction that would otherwise
 * increment the governing counter past its cap — this is the typed
 * failure that check produces. Distinct from ConcurrencyConflictException:
 * a stale `expected_version` means the caller read stale data; this means
 * the caller read current data but the limit is genuinely, correctly
 * exhausted. Mapped to HTTP 409 in bootstrap/app.php ("Coupon abuse
 * (redemption limit bypass) requires the same rigor as any financial
 * control" per this module's Security Considerations entry).
 */
final class UsageLimitExceededException extends RuntimeException
{
    public function __construct(
        public readonly string $aggregateType,
        public readonly string $aggregateId,
        string $reason,
    ) {
        parent::__construct("{$aggregateType} [{$aggregateId}] usage limit exceeded: {$reason}");
    }
}
