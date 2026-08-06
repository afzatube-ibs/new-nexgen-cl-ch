<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Exceptions;

use RuntimeException;

/**
 * "This request isn't valid against the current state of this return
 * request" — e.g. no items to return, resolving without a resolution
 * type, exchanging a return not typed as an exchange. Mirrors
 * Fulfillment's ShipmentValidationException exactly, including the
 * machine-readable `$reasonCode`. Mapped to HTTP 422 in bootstrap/app.php.
 */
final class ReturnValidationException extends RuntimeException
{
    public function __construct(public readonly string $reasonCode, string $message)
    {
        parent::__construct($message);
    }
}
