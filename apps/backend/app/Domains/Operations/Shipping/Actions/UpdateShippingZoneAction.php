<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Audit\AuditLogger;
use App\Domains\Operations\Shipping\Models\ShippingZone;
use Illuminate\Support\Facades\DB;

final readonly class UpdateShippingZoneAction
{
    private const array TRACKED_FIELDS = ['name', 'country_code', 'region'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(ShippingZone $zone, array $changes, int $expectedVersion, ?string $actorId): ShippingZone
    {
        return DB::transaction(function () use ($zone, $changes, $expectedVersion, $actorId) {
            $zone->assertVersionMatches($expectedVersion);

            $before = $zone->only(self::TRACKED_FIELDS);
            $zone->fill($changes)->save();

            $this->auditLogger->log(
                action: 'shipping_zone.updated',
                actorId: $actorId,
                targetType: ShippingZone::class,
                targetId: $zone->id,
                before: $before,
                after: $zone->only(self::TRACKED_FIELDS),
            );

            return $zone;
        });
    }
}
