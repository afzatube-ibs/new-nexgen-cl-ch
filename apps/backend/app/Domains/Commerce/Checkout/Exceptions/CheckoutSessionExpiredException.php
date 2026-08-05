<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Exceptions;

use RuntimeException;

/**
 * PRINCIPLES:EXPLICIT_FAILURE applied to this module's Temporary data
 * classification: a session past its `expires_at` refuses every further
 * mutation, cart or otherwise — a caller must start a new session, or
 * recover one via Actions\RecoverCheckoutSessionAction. Mapped to HTTP
 * 422 in bootstrap/app.php (a well-formed request against a session that
 * genuinely can no longer be acted on, not a version conflict).
 */
final class CheckoutSessionExpiredException extends RuntimeException
{
    public function __construct(string $sessionId)
    {
        parent::__construct("Checkout session [{$sessionId}] has expired.");
    }
}
