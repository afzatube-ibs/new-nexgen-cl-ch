<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\TaxZone;
use Illuminate\Support\Facades\DB;

final readonly class UpdateTaxZoneAction
{
    private const array TRACKED_FIELDS = ['name', 'country_code', 'region'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(TaxZone $zone, array $changes, int $expectedVersion, ?string $actorId): TaxZone
    {
        return DB::transaction(function () use ($zone, $changes, $expectedVersion, $actorId) {
            $zone->assertVersionMatches($expectedVersion);

            $before = $zone->only(self::TRACKED_FIELDS);
            $zone->fill($changes)->save();

            $this->auditLogger->log(
                action: 'tax_zone.updated',
                actorId: $actorId,
                targetType: TaxZone::class,
                targetId: $zone->id,
                before: $before,
                after: $zone->only(self::TRACKED_FIELDS),
            );

            return $zone;
        });
    }
}
