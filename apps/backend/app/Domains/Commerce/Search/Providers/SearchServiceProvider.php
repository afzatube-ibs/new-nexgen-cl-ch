<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Providers;

use App\Domains\Commerce\Catalog\Events\ProductArchived;
use App\Domains\Commerce\Catalog\Events\ProductCreated;
use App\Domains\Commerce\Catalog\Events\ProductUpdated;
use App\Domains\Commerce\Search\Console\Commands\ReindexCommand;
use App\Domains\Commerce\Search\Console\Commands\SyncPermissionsCommand;
use App\Domains\Commerce\Search\Engines\SearchEngineFactory;
use App\Domains\Commerce\Search\Engines\SearchEngineRegistry;
use App\Domains\Commerce\Search\Listeners\ReindexProductOnProductCreated;
use App\Domains\Commerce\Search\Listeners\ReindexProductOnProductUpdated;
use App\Domains\Commerce\Search\Listeners\RemoveProductFromIndexOnProductArchived;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Search's public contract into the platform: its search-engine
 * registry, its routes, its console commands, and — unlike every prior
 * module's own ServiceProvider — its own event subscriptions.
 *
 * `SearchEngineRegistry` is bound as a singleton and populated here,
 * once, from config('search.engines') via Engines\SearchEngineFactory —
 * mirrors Notifications' Providers\NotificationsServiceProvider,
 * Payments' Providers\PaymentsServiceProvider, and Shipping's
 * Providers\ShippingServiceProvider exactly.
 *
 * Subscribing Catalog's `ProductCreated`/`ProductUpdated`/
 * `ProductArchived` events to Listeners\* HERE, rather than in
 * App\Providers\AppServiceProvider (every prior cross-domain listener's
 * composition root), is deliberate new precedent — see this module's own
 * v1.5 Change Log entry in docs/04_MODULE_ARCHITECTURE.md: Catalog and
 * Search are both Commerce, so this is a same-domain subscription with
 * no deptrac.yaml boundary to protect, unlike every Fulfillment/Returns/
 * Notifications listener that genuinely crosses a domain and therefore
 * needs the neutral `app/Listeners/` bridge plus AppServiceProvider's
 * composition-root treatment. A module subscribing to its own same-
 * domain events from its own ServiceProvider keeps that wiring next to
 * the module it belongs to instead of growing an unrelated, ever-larger
 * shared file.
 */
final class SearchServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SearchEngineRegistry::class, function ($app) {
            $registry = new SearchEngineRegistry;
            $factory = $app->make(SearchEngineFactory::class);

            /** @var list<string> $engineCodes */
            $engineCodes = config('search.engines', []);

            foreach ($engineCodes as $code) {
                $code = trim($code);

                if ($code === '') {
                    continue;
                }

                $registry->register($factory->make($code, []));
            }

            return $registry;
        });
    }

    public function boot(): void
    {
        require __DIR__.'/../routes.php';

        $bus = $this->app->make(DomainEventBus::class);

        $bus->subscribe(
            ProductCreated::class,
            [ReindexProductOnProductCreated::class, 'handle'],
        );

        $bus->subscribe(
            ProductUpdated::class,
            [ReindexProductOnProductUpdated::class, 'handle'],
        );

        $bus->subscribe(
            ProductArchived::class,
            [RemoveProductFromIndexOnProductArchived::class, 'handle'],
        );

        if ($this->app->runningInConsole()) {
            $this->commands([
                ReindexCommand::class,
                SyncPermissionsCommand::class,
            ]);
        }
    }
}
