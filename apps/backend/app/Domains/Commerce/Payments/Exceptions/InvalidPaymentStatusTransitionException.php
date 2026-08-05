<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Exceptions;

use RuntimeException;

/**
 * PRINCIPLES:EXPLICIT_FAILURE applied to this module's "Payment status
 * lifecycle": every transition action checks Models\Payment::
 * canTransitionTo() before writing, and this is the typed failure that
 * check produces for an illegal move (e.g. capturing a payment that has
 * already failed) — a well-formed request naming a real payment and a
 * real status that is nonetheless not reachable from where the payment
 * currently stands. Mapped to HTTP 422 in bootstrap/app.php.
 */
final class InvalidPaymentStatusTransitionException extends RuntimeException
{
    public function __construct(string $paymentId, string $fromStatus, string $toStatus)
    {
        parent::__construct("Payment [{$paymentId}] cannot transition from [{$fromStatus}] to [{$toStatus}].");
    }
}
