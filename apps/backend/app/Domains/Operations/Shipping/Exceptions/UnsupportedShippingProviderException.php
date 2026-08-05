<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Exceptions;

use RuntimeException;

/**
 * A courier code that is either unregistered or currently unavailable
 * (missing credentials) — see Couriers\ProviderResolver. Mirrors Payments'
 * identically-shaped UnsupportedGatewayException. Mapped to HTTP 422 in
 * bootstrap/app.php: a well-formed request naming a courier that simply
 * isn't usable right now, not a version conflict.
 */
final class UnsupportedShippingProviderException extends RuntimeException
{
    public function __construct(public readonly string $providerCode)
    {
        parent::__construct("Shipping provider [{$providerCode}] is not registered or is not currently available.");
    }
}
