<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\PriceList;
use Illuminate\Support\Facades\DB;

/**
 * Transitions a PriceList to DATA:LIFECYCLE's Archived state — an
 * intentional, recorded action, distinct from deletion
 * (DeletePriceListAction).
 */
final readonly class ArchivePriceListAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(PriceList $priceList, int $expectedVersion, ?string $actorId): PriceList
    {
        return DB::transaction(function () use ($priceList, $expectedVersion, $actorId) {
            $priceList->assertVersionMatches($expectedVersion);

            $previousStatus = $priceList->status;
            $priceList->status = PriceList::STATUS_ARCHIVED;
            $priceList->save();

            $this->auditLogger->log(
                action: 'price_list.archived',
                actorId: $actorId,
                targetType: PriceList::class,
                targetId: $priceList->id,
                before: ['status' => $previousStatus],
                after: ['status' => $priceList->status],
            );

            return $priceList;
        });
    }
}
