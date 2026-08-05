<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Controllers;

use App\Domains\Commerce\Payments\Gateways\GatewayResolver;
use App\Domains\Commerce\Payments\Http\Resources\PaymentMethodResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * "Payment Methods" — lists every currently-available gateway (Cash On
 * Delivery, Bank Transfer, and whichever of SSLCommerz/bKash/Nagad this
 * installation has real credentials configured for), so a caller building
 * a checkout screen knows what to offer without hardcoding gateway codes.
 */
final class PaymentMethodController
{
    public function __construct(private readonly GatewayResolver $gatewayResolver) {}

    public function index(): AnonymousResourceCollection
    {
        return PaymentMethodResource::collection($this->gatewayResolver->availableGateways());
    }
}
