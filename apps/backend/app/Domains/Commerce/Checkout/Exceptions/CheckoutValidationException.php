<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Exceptions;

use RuntimeException;

/**
 * PRINCIPLES:EXPLICIT_FAILURE applied to every "this session isn't ready
 * for that yet" outcome in this module: an empty cart, a missing address,
 * no shipping option selected, a SKU with no resolvable price, a coupon
 * code that does not evaluate to an eligible promotion, or a status that
 * does not permit the requested operation (e.g. submitting before
 * reviewing). One exception class carrying a short, stable `$reasonCode`
 * rather than one subclass per cause — mirrors Promotions'
 * UsageLimitExceeded/DependentRecordsExist pattern of a `$reason` string
 * on a single class — since every one of these maps to the same HTTP 422
 * response shape and differs only in which specific thing wasn't ready.
 * Named `$reasonCode`, not `$code`, since PHP's own Exception base class
 * already declares a writable, untyped `$code` property this class must
 * not collide with. Mapped to HTTP 422 in bootstrap/app.php.
 */
final class CheckoutValidationException extends RuntimeException
{
    public function __construct(
        public readonly string $sessionId,
        public readonly string $reasonCode,
        string $message,
    ) {
        parent::__construct($message);
    }
}
