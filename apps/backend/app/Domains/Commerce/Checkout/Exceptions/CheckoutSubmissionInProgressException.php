<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Exceptions;

use RuntimeException;

/**
 * "Duplicate submission protection" made concrete: a second submit
 * request that arrives while an earlier one for the same session is
 * still mid-flight (already claimed the session via Actions\
 * SubmitCheckoutAction's `lockForUpdate()` claim step, not yet
 * finalized) is rejected outright rather than allowed to race — see that
 * class's docblock for the full saga design. Mapped to HTTP 409 in
 * bootstrap/app.php, the same status this platform already uses for
 * "your request conflicts with what's currently happening to this
 * resource."
 */
final class CheckoutSubmissionInProgressException extends RuntimeException
{
    public function __construct(string $sessionId)
    {
        parent::__construct("Checkout session [{$sessionId}] is already being submitted.");
    }
}
