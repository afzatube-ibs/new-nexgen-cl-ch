<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Events\PriceChanged;
use App\Domains\Commerce\Pricing\Models\PriceList;
use App\Domains\Commerce\Pricing\Models\PriceListEntry;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

final readonly class CreatePriceListEntryAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(PriceList $priceList, array $attributes, ?string $actorId): PriceListEntry
    {
        return DB::transaction(function () use ($priceList, $attributes, $actorId) {
            $entry = $priceList->entries()->create([
                'sku' => strtoupper((string) $attributes['sku']),
                'base_price' => $attributes['base_price'],
                'compare_at_price' => $attributes['compare_at_price'] ?? null,
                'sale_price' => $attributes['sale_price'] ?? null,
                'sale_starts_at' => $attributes['sale_starts_at'] ?? null,
                'sale_ends_at' => $attributes['sale_ends_at'] ?? null,
            ]);

            $this->auditLogger->log(
                action: 'price_list_entry.created',
                actorId: $actorId,
                targetType: PriceListEntry::class,
                targetId: $entry->id,
                after: $this->snapshot($entry),
            );

            $this->eventBus->publish(new PriceChanged(
                priceListId: $priceList->id,
                sku: $entry->sku,
                currencyCode: $priceList->currency_code,
                effectivePrice: $entry->effectivePrice(),
            ));

            return $entry;
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshot(PriceListEntry $entry): array
    {
        return $entry->only(['sku', 'base_price', 'compare_at_price', 'sale_price', 'sale_starts_at', 'sale_ends_at']);
    }
}
