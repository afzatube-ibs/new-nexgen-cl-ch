<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Exceptions\DependentRecordsExistException;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use App\Domains\Commerce\Pricing\Models\TaxZone;
use Illuminate\Support\Facades\DB;

/**
 * Soft-deletes a TaxZone — DATA:LIFECYCLE's Deleted state. Refuses to
 * delete a zone still referenced by a TaxRate, surfacing the schema's own
 * restrictOnDelete foreign key as a clean, typed exception rather than a
 * raw database error — see DependentRecordsExistException's docblock.
 */
final readonly class DeleteTaxZoneAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(TaxZone $zone, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($zone, $expectedVersion, $actorId) {
            $zone->assertVersionMatches($expectedVersion);

            if (TaxRate::query()->where('tax_zone_id', $zone->id)->exists()) {
                throw new DependentRecordsExistException(
                    aggregateType: TaxZone::class,
                    aggregateId: $zone->id,
                    reason: 'one or more tax rates still reference this zone',
                );
            }

            $before = $zone->only(['name', 'country_code', 'region']);
            $zone->delete();

            $this->auditLogger->log(
                action: 'tax_zone.deleted',
                actorId: $actorId,
                targetType: TaxZone::class,
                targetId: $zone->id,
                before: $before,
            );
        });
    }
}
