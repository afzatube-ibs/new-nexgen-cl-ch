<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Exceptions;

use RuntimeException;

/**
 * PRINCIPLES:EXPLICIT_FAILURE applied to this module's "Order status
 * lifecycle": every status-transition action checks Models\Order::
 * canTransitionTo() before writing, and this is the typed failure that
 * check produces for an illegal move (e.g. shipping an order that was
 * never confirmed) — a well-formed request naming a real order and a
 * real status that is nonetheless not reachable from where the order
 * currently stands. Mapped to HTTP 422 in bootstrap/app.php.
 */
final class InvalidOrderStatusTransitionException extends RuntimeException
{
    public function __construct(string $orderId, string $fromStatus, string $toStatus)
    {
        parent::__construct("Order [{$orderId}] cannot transition from [{$fromStatus}] to [{$toStatus}].");
    }
}
