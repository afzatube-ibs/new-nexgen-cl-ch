<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Exceptions;

use RuntimeException;

/**
 * "This request isn't valid against the current state of this shipment" —
 * e.g. packing with no items, dispatching with no destination address.
 * Mirrors Checkout's CheckoutValidationException and Payments'
 * PaymentValidationException exactly, including the machine-readable
 * `$reasonCode` those two also carry. Mapped to HTTP 422 in
 * bootstrap/app.php.
 */
final class ShipmentValidationException extends RuntimeException
{
    public function __construct(public readonly string $reasonCode, string $message)
    {
        parent::__construct($message);
    }
}
