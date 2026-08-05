<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Exceptions;

use RuntimeException;

/**
 * This module's "this request isn't valid against the current state of
 * things" guard — mirrors Checkout's identically-shaped
 * CheckoutValidationException (each module owns its own copy per
 * MODULE:PUBLIC_CONTRACT). `$reasonCode` is a stable, machine-readable
 * discriminator (e.g. "order_not_payable", "amount_mismatch",
 * "gateway_mismatch") a caller can branch on without parsing `$message`.
 * Named `$reasonCode` rather than `$code`, exactly as Checkout's own
 * exception is, to avoid colliding with PHP's built-in, non-readonly
 * `Exception::$code` property. Mapped to HTTP 422 in bootstrap/app.php.
 */
final class PaymentValidationException extends RuntimeException
{
    public function __construct(
        public readonly string $reasonCode,
        string $message,
    ) {
        parent::__construct($message);
    }
}
