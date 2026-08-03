<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Events\PriceChanged;
use App\Domains\Commerce\Pricing\Models\PriceList;
use App\Domains\Commerce\Pricing\Models\PriceListEntry;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

final readonly class UpdatePriceListEntryAction
{
    private const array TRACKED_FIELDS = ['sku', 'base_price', 'compare_at_price', 'sale_price', 'sale_starts_at', 'sale_ends_at'];

    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(PriceListEntry $entry, array $changes, int $expectedVersion, ?string $actorId): PriceListEntry
    {
        return DB::transaction(function () use ($entry, $changes, $expectedVersion, $actorId) {
            $entry->assertVersionMatches($expectedVersion);

            if (array_key_exists('sku', $changes)) {
                $changes['sku'] = strtoupper((string) $changes['sku']);
            }

            $before = $entry->only(self::TRACKED_FIELDS);
            $entry->fill($changes)->save();

            $this->auditLogger->log(
                action: 'price_list_entry.updated',
                actorId: $actorId,
                targetType: PriceListEntry::class,
                targetId: $entry->id,
                before: $before,
                after: $entry->only(self::TRACKED_FIELDS),
            );

            $priceList = PriceList::query()->findOrFail($entry->price_list_id);

            $this->eventBus->publish(new PriceChanged(
                priceListId: $entry->price_list_id,
                sku: $entry->sku,
                currencyCode: $priceList->currency_code,
                effectivePrice: $entry->effectivePrice(),
            ));

            return $entry;
        });
    }
}
