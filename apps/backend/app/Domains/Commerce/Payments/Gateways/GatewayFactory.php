<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways;

use App\Domains\Commerce\Payments\Exceptions\UnsupportedGatewayException;
use App\Domains\Commerce\Payments\Gateways\Contracts\PaymentGatewayContract;
use Illuminate\Http\Client\Factory as HttpFactory;

/**
 * The construction half of this module's gateway architecture — turns a
 * gateway code plus its config/payments.php configuration array into a
 * concrete Gateways\Contracts\PaymentGatewayContract instance.
 * Providers\PaymentsServiceProvider is this class's only caller: it
 * iterates config/payments.php's `gateways` list, calls make() for each,
 * and registers the result into Gateways\GatewayRegistry.
 *
 * "Adding a new gateway should require ONLY: Implement PaymentGateway
 * contract, Register the gateway" — this `match` arm plus one new config
 * block is that registration step; nothing else in this module changes.
 */
final readonly class GatewayFactory
{
    public function __construct(private HttpFactory $http) {}

    /**
     * @param  array<string, mixed>  $config
     */
    public function make(string $code, array $config): PaymentGatewayContract
    {
        return match ($code) {
            'cod' => new CodGateway,
            'bank_transfer' => new BankTransferGateway($config),
            'sslcommerz' => new SslcommerzGateway($config, $this->http),
            'bkash' => new BkashGateway($config, $this->http),
            'nagad' => new NagadGateway($config, $this->http),
            default => throw new UnsupportedGatewayException($code),
        };
    }
}
