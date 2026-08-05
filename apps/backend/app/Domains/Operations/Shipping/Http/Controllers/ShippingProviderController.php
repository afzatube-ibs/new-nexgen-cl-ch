<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Controllers;

use App\Domains\Operations\Shipping\Couriers\ProviderResolver;
use App\Domains\Operations\Shipping\Http\Resources\ShippingProviderResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * This installation's Courier Registry, read-only — every registered
 * Couriers\Contracts\ShippingProviderContract implementation, whether or
 * not it is currently available (see Couriers\ProviderRegistry's
 * docblock), so an operator can see "configured but incomplete" providers
 * distinctly from providers not offered at all.
 */
final class ShippingProviderController
{
    public function __construct(private readonly ProviderResolver $providerResolver) {}

    public function index(): AnonymousResourceCollection
    {
        return ShippingProviderResource::collection($this->providerResolver->allProviders());
    }
}
