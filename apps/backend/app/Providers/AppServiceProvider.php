<?php

namespace App\Providers;

use App\Domains\Commerce\Orders\Events\OrderPlaced;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Listeners\CreateShipmentOnOrderPlaced;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * This is the platform's cross-domain event-routing composition root —
     * see App\Listeners\CreateShipmentOnOrderPlaced's own docblock for why
     * that subscription (the first real, production cross-domain listener
     * this platform has ever wired — ARCHITECTURE_REVIEW.md A-4 anticipated
     * exactly this) is registered here rather than inside either Orders or
     * Fulfillment's own ServiceProvider.
     */
    public function boot(): void
    {
        $this->app->make(DomainEventBus::class)->subscribe(
            OrderPlaced::class,
            [CreateShipmentOnOrderPlaced::class, 'handle'],
        );
    }
}
