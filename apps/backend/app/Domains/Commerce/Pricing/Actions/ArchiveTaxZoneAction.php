<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\TaxZone;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveTaxZoneAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(TaxZone $zone, int $expectedVersion, ?string $actorId): TaxZone
    {
        return DB::transaction(function () use ($zone, $expectedVersion, $actorId) {
            $zone->assertVersionMatches($expectedVersion);

            $previousStatus = $zone->status;
            $zone->status = TaxZone::STATUS_ARCHIVED;
            $zone->save();

            $this->auditLogger->log(
                action: 'tax_zone.archived',
                actorId: $actorId,
                targetType: TaxZone::class,
                targetId: $zone->id,
                before: ['status' => $previousStatus],
                after: ['status' => $zone->status],
            );

            return $zone;
        });
    }
}
