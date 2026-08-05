<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Exceptions;

use RuntimeException;

/**
 * Thrown by Gateways\GatewayResolver when the requested gateway code is
 * either not registered at all (Providers\PaymentsServiceProvider only
 * registers what config/payments.php's `gateways` list names) or is
 * registered but Gateways\Contracts\PaymentGatewayContract::isAvailable()
 * reports false — most commonly a gateway whose required credentials are
 * absent from this deployment's environment (SECURITY:SECRETS_MANAGEMENT).
 * Mapped to HTTP 422 in bootstrap/app.php: a well-formed request naming a
 * gateway code that simply cannot process a payment right now.
 */
final class UnsupportedGatewayException extends RuntimeException
{
    public function __construct(string $gatewayCode)
    {
        parent::__construct("Payment gateway [{$gatewayCode}] is not available.");
    }
}
