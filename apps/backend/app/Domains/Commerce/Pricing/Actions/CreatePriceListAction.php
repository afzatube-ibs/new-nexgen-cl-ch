<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\PriceList;
use Illuminate\Support\Facades\DB;

/**
 * Always creates a PriceList as non-default (`is_default` is never
 * accepted here) — promoting a list to default is a separate, explicit
 * operator action via Actions\UpdatePriceListAction, so the
 * single-default-per-currency invariant has exactly one enforcement point
 * rather than two, mirroring Localization & Currency's identical pattern
 * for Locale/Currency.
 */
final readonly class CreatePriceListAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): PriceList
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $priceList = PriceList::query()->create([
                'name' => $attributes['name'],
                'currency_code' => $attributes['currency_code'],
            ]);

            $this->auditLogger->log(
                action: 'price_list.created',
                actorId: $actorId,
                targetType: PriceList::class,
                targetId: $priceList->id,
                after: $priceList->only(['name', 'currency_code', 'is_default', 'status']),
            );

            return $priceList;
        });
    }
}
