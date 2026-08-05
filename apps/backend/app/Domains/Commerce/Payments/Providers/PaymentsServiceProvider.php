<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Providers;

use App\Domains\Commerce\Payments\Console\Commands\ReconcilePaymentsCommand;
use App\Domains\Commerce\Payments\Console\Commands\SyncPermissionsCommand;
use App\Domains\Commerce\Payments\Gateways\GatewayFactory;
use App\Domains\Commerce\Payments\Gateways\GatewayRegistry;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Payments' public contract into the platform: its gateway
 * registry, its routes, its rate limiter, and its console commands.
 *
 * `GatewayRegistry` is bound as a singleton and populated here, once,
 * from config('payments.gateways') via Gateways\GatewayFactory — every
 * Action that needs a gateway resolves it through Gateways\GatewayResolver
 * (constructed from this same registry), never constructs a gateway
 * itself. This is the concrete mechanism behind "Adding a new gateway
 * should require ONLY: Implement PaymentGateway contract, Register the
 * gateway": the only change this file ever needs for a new gateway is
 * adding its code to config/payments.php's `gateways` list and a new
 * `match` arm in Gateways\GatewayFactory.
 */
final class PaymentsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(GatewayRegistry::class, function ($app) {
            $registry = new GatewayRegistry;
            $factory = $app->make(GatewayFactory::class);

            /** @var list<string> $gatewayCodes */
            $gatewayCodes = config('payments.gateways', []);

            foreach ($gatewayCodes as $code) {
                $code = trim($code);

                if ($code === '') {
                    continue;
                }

                /** @var array<string, mixed> $gatewayConfig */
                $gatewayConfig = config("payments.{$code}", []);

                $registry->register($factory->make($code, $gatewayConfig));
            }

            return $registry;
        });
    }

    public function boot(): void
    {
        // SECURITY:RATE_LIMITING_ABUSE applied to this module's three
        // unauthenticated, world-reachable webhook endpoints — mirrors
        // Installer's own 'install' limiter. Keyed by IP alone, the same
        // reasoning Installer's own docblock gives: no caller identity
        // exists to key on for an inbound gateway callback.
        RateLimiter::for('payments-webhooks', function ($request) {
            return Limit::perMinute(120)->by($request->ip());
        });

        require __DIR__.'/../routes.php';

        if ($this->app->runningInConsole()) {
            $this->commands([
                SyncPermissionsCommand::class,
                ReconcilePaymentsCommand::class,
            ]);
        }
    }
}
