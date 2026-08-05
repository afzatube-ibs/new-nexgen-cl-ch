<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways;

use App\Domains\Commerce\Payments\Gateways\Contracts\PaymentGatewayContract;

/**
 * The storage half of "Gateway Registry / Gateway Resolver" — holds every
 * gateway Providers\PaymentsServiceProvider constructed via
 * Gateways\GatewayFactory from config/payments.php's `gateways` list,
 * keyed by each gateway's own PaymentGatewayContract::code(). Registered
 * regardless of PaymentGatewayContract::isAvailable() — an unavailable
 * gateway is still "known" (e.g. for Http\Controllers\
 * PaymentMethodController to report as configured-but-incomplete);
 * Gateways\GatewayResolver is what additionally enforces availability
 * before handing a gateway to a caller that intends to use it.
 */
final class GatewayRegistry
{
    /**
     * @var array<string, PaymentGatewayContract>
     */
    private array $gateways = [];

    public function register(PaymentGatewayContract $gateway): void
    {
        $this->gateways[$gateway->code()] = $gateway;
    }

    public function has(string $code): bool
    {
        return array_key_exists($code, $this->gateways);
    }

    public function get(string $code): ?PaymentGatewayContract
    {
        return $this->gateways[$code] ?? null;
    }

    /**
     * @return array<string, PaymentGatewayContract>
     */
    public function all(): array
    {
        return $this->gateways;
    }
}
