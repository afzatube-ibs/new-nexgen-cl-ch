<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Audit\AuditLogger;
use App\Domains\Operations\Shipping\Models\ShippingZone;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveShippingZoneAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ShippingZone $zone, int $expectedVersion, ?string $actorId): ShippingZone
    {
        return DB::transaction(function () use ($zone, $expectedVersion, $actorId) {
            $zone->assertVersionMatches($expectedVersion);

            $zone->status = ShippingZone::STATUS_ARCHIVED;
            $zone->save();

            $this->auditLogger->log(
                action: 'shipping_zone.archived',
                actorId: $actorId,
                targetType: ShippingZone::class,
                targetId: $zone->id,
                after: ['status' => $zone->status],
            );

            return $zone;
        });
    }
}
