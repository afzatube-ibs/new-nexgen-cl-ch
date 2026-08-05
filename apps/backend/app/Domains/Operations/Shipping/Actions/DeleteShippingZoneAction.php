<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Audit\AuditLogger;
use App\Domains\Operations\Shipping\Exceptions\DependentRecordsExistException;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use App\Domains\Operations\Shipping\Models\ShippingZone;
use Illuminate\Support\Facades\DB;

final readonly class DeleteShippingZoneAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ShippingZone $zone, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($zone, $expectedVersion, $actorId): void {
            $zone->assertVersionMatches($expectedVersion);

            if (ShippingRate::query()->where('shipping_zone_id', $zone->id)->exists()) {
                throw new DependentRecordsExistException(
                    aggregateType: ShippingZone::class,
                    aggregateId: $zone->id,
                    reason: 'one or more shipping rates still reference this zone.',
                );
            }

            $zone->delete();

            $this->auditLogger->log(
                action: 'shipping_zone.deleted',
                actorId: $actorId,
                targetType: ShippingZone::class,
                targetId: $zone->id,
            );
        });
    }
}
