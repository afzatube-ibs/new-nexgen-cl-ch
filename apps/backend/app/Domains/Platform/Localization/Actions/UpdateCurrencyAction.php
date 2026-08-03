<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\Localization\Audit\AuditLogger;
use App\Domains\Platform\Localization\Events\CurrencyRateUpdated;
use App\Domains\Platform\Localization\Models\Currency;
use Illuminate\Support\Facades\DB;

/**
 * Enforces the single-base invariant: if `is_base` is being set true in
 * this update, every other Currency's `is_base` is cleared first, and
 * `exchange_rate` is forced to exactly "1.000000" regardless of any rate
 * supplied alongside it — a base currency's rate relative to itself is
 * definitionally 1, never an operator-chosen value.
 */
final readonly class UpdateCurrencyAction
{
    private const array TRACKED_FIELDS = ['code', 'name', 'symbol', 'decimal_places', 'exchange_rate', 'is_base'];

    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Currency $currency, array $changes, int $expectedVersion, ?string $actorId): Currency
    {
        return DB::transaction(function () use ($currency, $changes, $expectedVersion, $actorId) {
            $currency->assertVersionMatches($expectedVersion);

            $before = $currency->only(self::TRACKED_FIELDS);
            $rateBefore = $currency->exchange_rate;

            if (($changes['is_base'] ?? false) === true) {
                Currency::query()->where('id', '!=', $currency->id)->update(['is_base' => false]);
                $changes['exchange_rate'] = '1.000000';
            }

            $currency->fill($changes)->save();

            $this->auditLogger->log(
                action: 'currency.updated',
                actorId: $actorId,
                targetType: Currency::class,
                targetId: $currency->id,
                before: $before,
                after: $currency->only(self::TRACKED_FIELDS),
            );

            if ($currency->exchange_rate !== $rateBefore) {
                $this->eventBus->publish(new CurrencyRateUpdated(
                    currencyId: $currency->id,
                    code: $currency->code,
                    exchangeRate: $currency->exchange_rate,
                ));
            }

            return $currency;
        });
    }
}
