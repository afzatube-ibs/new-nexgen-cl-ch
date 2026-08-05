<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Exceptions;

use RuntimeException;

/**
 * Shipment Status Lifecycle guard — a well-formed request naming a real
 * shipment and a real transition that is nonetheless not reachable from
 * where the shipment currently stands. Mirrors Orders'
 * InvalidOrderStatusTransitionException exactly. Mapped to HTTP 422 in
 * bootstrap/app.php.
 */
final class InvalidShipmentStatusTransitionException extends RuntimeException
{
    public function __construct(string $shipmentId, string $from, string $to)
    {
        parent::__construct("Shipment [{$shipmentId}] cannot transition from [{$from}] to [{$to}].");
    }
}
