<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Exceptions;

use RuntimeException;

/**
 * Raised when releasing or committing a StockReservation that is no
 * longer active (already released or committed). Mapped to HTTP 409 in
 * bootstrap/app.php — the request conflicts with the reservation's
 * current, already-terminal state.
 */
final class InvalidReservationStateException extends RuntimeException
{
    public function __construct(public readonly string $reservationId, public readonly string $currentStatus)
    {
        parent::__construct("Reservation [{$reservationId}] is already [{$currentStatus}] and cannot be changed.");
    }
}
