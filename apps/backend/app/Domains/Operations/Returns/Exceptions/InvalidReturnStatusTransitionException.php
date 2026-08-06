<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Exceptions;

use RuntimeException;

/**
 * Return Status Lifecycle guard — a well-formed request naming a real
 * return request and a real transition that is nonetheless not reachable
 * from where it currently stands. Mirrors Fulfillment's
 * InvalidShipmentStatusTransitionException exactly. Mapped to HTTP 422 in
 * bootstrap/app.php.
 */
final class InvalidReturnStatusTransitionException extends RuntimeException
{
    public function __construct(string $returnRequestId, string $from, string $to)
    {
        parent::__construct("Return request [{$returnRequestId}] cannot transition from [{$from}] to [{$to}].");
    }
}
