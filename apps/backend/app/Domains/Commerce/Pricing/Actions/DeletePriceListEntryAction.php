<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\PriceListEntry;
use Illuminate\Support\Facades\DB;

final readonly class DeletePriceListEntryAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(PriceListEntry $entry, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($entry, $expectedVersion, $actorId) {
            $entry->assertVersionMatches($expectedVersion);

            $before = $entry->only(['sku', 'base_price']);
            $entry->delete();

            $this->auditLogger->log(
                action: 'price_list_entry.deleted',
                actorId: $actorId,
                targetType: PriceListEntry::class,
                targetId: $entry->id,
                before: $before,
            );
        });
    }
}
