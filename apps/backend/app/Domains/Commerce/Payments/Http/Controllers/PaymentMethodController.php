<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Controllers;

use App\Domains\Commerce\Payments\Gateways\GatewayResolver;
use App\Domains\Commerce\Payments\Http\Resources\PaymentMethodResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * "Payment Methods" — lists every currently-available gateway (Cash On
 * Delivery, Bank Transfer, and whichever of SSLCommerz/bKash/Nagad this
 * installation has real credentials configured for), so a caller building
 * a checkout screen knows what to offer without hardcoding gateway codes.
 *
 * Production Completion Plan v2, Milestone 12 (Production Readiness
 * Indicators) — `?all=1` additionally lists every REGISTERED gateway
 * (configured or not), per `GatewayRegistry`'s own docblock naming this
 * exact use case ("report as configured-but-incomplete"). Defaults to the
 * pre-existing available-only behavior unchanged — the real Storefront
 * checkout screen that already calls this route with no query param is
 * unaffected.
 */
final class PaymentMethodController
{
    public function __construct(private readonly GatewayResolver $gatewayResolver) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $gateways = $request->boolean('all')
            ? $this->gatewayResolver->allGateways()
            : $this->gatewayResolver->availableGateways();

        return PaymentMethodResource::collection($gateways);
    }
}
