<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\PriceList;
use Illuminate\Support\Facades\DB;

/**
 * Soft-deletes a PriceList — DATA:LIFECYCLE's Deleted state. Also
 * soft-deletes every entry it holds: PriceList and its entries move to
 * Deleted together rather than leaving priced entries that outlive their
 * owning list's own lifecycle state, mirroring Customers' identical
 * precedent for Customer + its address book.
 */
final readonly class DeletePriceListAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(PriceList $priceList, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($priceList, $expectedVersion, $actorId) {
            $priceList->assertVersionMatches($expectedVersion);

            $before = $priceList->only(['name', 'currency_code']);
            $priceList->entries()->delete();
            $priceList->delete();

            $this->auditLogger->log(
                action: 'price_list.deleted',
                actorId: $actorId,
                targetType: PriceList::class,
                targetId: $priceList->id,
                before: $before,
            );
        });
    }
}
