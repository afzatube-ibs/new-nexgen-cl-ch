<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Http\Controllers;

use App\Domains\Operations\Notifications\Channels\ProviderResolver;
use App\Domains\Operations\Notifications\Http\Resources\NotificationProviderResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * This installation's Channel Provider Registry, read-only — every
 * registered Channels\Contracts\NotificationProviderContract
 * implementation, whether or not it is currently available, mirrors
 * Shipping's own ShippingProviderController exactly.
 *
 * Production Completion Plan v2, Milestone 12 (Production Readiness
 * Indicators) — the real signal an Admin readiness check needs ("is any
 * email/SMS provider actually configured"), previously unexposed.
 */
final class NotificationProviderController
{
    public function __construct(private readonly ProviderResolver $providerResolver) {}

    public function index(): AnonymousResourceCollection
    {
        return NotificationProviderResource::collection($this->providerResolver->allProviders());
    }
}
