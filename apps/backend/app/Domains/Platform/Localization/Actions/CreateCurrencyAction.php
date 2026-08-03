<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\Localization\Audit\AuditLogger;
use App\Domains\Platform\Localization\Events\CurrencyRateUpdated;
use App\Domains\Platform\Localization\Models\Currency;
use Illuminate\Support\Facades\DB;

/**
 * Always creates a Currency as non-base (`is_base` is never accepted
 * here) — promoting a currency to base is a separate, explicit operator
 * action via Actions\UpdateCurrencyAction, so the single-base invariant
 * has exactly one enforcement point rather than two.
 */
final readonly class CreateCurrencyAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Currency
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $currency = Currency::query()->create([
                'code' => $attributes['code'],
                'name' => $attributes['name'],
                'symbol' => $attributes['symbol'],
                'decimal_places' => $attributes['decimal_places'] ?? 2,
                'exchange_rate' => $attributes['exchange_rate'],
            ]);

            $this->auditLogger->log(
                action: 'currency.created',
                actorId: $actorId,
                targetType: Currency::class,
                targetId: $currency->id,
                after: $this->snapshot($currency),
            );

            $this->eventBus->publish(new CurrencyRateUpdated(
                currencyId: $currency->id,
                code: $currency->code,
                exchangeRate: $currency->exchange_rate,
            ));

            return $currency;
        });
    }

    /**
     * @return array<string, scalar>
     */
    private function snapshot(Currency $currency): array
    {
        return $currency->only(['code', 'name', 'symbol', 'decimal_places', 'exchange_rate', 'is_base', 'status']);
    }
}
