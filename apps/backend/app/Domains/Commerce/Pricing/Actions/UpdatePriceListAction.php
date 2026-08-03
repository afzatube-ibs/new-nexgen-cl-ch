<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Exceptions\DependentRecordsExistException;
use App\Domains\Commerce\Pricing\Models\PriceList;
use Illuminate\Support\Facades\DB;

/**
 * Enforces the single-default-per-currency invariant: if `is_default` is
 * being set true in this update, every other PriceList in the same
 * currency has its `is_default` cleared first, in the same transaction —
 * at most one default list per currency, since "the default list for USD"
 * and "the default list for EUR" are independent facts.
 *
 * Refuses to change `currency_code` once the list has priced entries —
 * every existing PriceListEntry's price was set meaning "in the list's
 * current currency"; silently reinterpreting them under a new currency
 * would be a data integrity failure this module's own "currency-aware
 * pricing" requirement exists to prevent. An operator must move entries
 * to a new list (or clear this one) before repurposing its currency.
 */
final readonly class UpdatePriceListAction
{
    private const array TRACKED_FIELDS = ['name', 'currency_code', 'is_default'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(PriceList $priceList, array $changes, int $expectedVersion, ?string $actorId): PriceList
    {
        return DB::transaction(function () use ($priceList, $changes, $expectedVersion, $actorId) {
            $priceList->assertVersionMatches($expectedVersion);

            if (
                array_key_exists('currency_code', $changes)
                && strtoupper((string) $changes['currency_code']) !== $priceList->currency_code
                && $priceList->entries()->exists()
            ) {
                throw new DependentRecordsExistException(
                    aggregateType: PriceList::class,
                    aggregateId: $priceList->id,
                    reason: 'currency cannot be changed while it has priced entries',
                );
            }

            $before = $priceList->only(self::TRACKED_FIELDS);

            if (($changes['is_default'] ?? false) === true) {
                $targetCurrency = strtoupper((string) ($changes['currency_code'] ?? $priceList->currency_code));

                PriceList::query()
                    ->where('currency_code', $targetCurrency)
                    ->where('id', '!=', $priceList->id)
                    ->update(['is_default' => false]);
            }

            $priceList->fill($changes)->save();

            $this->auditLogger->log(
                action: 'price_list.updated',
                actorId: $actorId,
                targetType: PriceList::class,
                targetId: $priceList->id,
                before: $before,
                after: $priceList->only(self::TRACKED_FIELDS),
            );

            return $priceList;
        });
    }
}
