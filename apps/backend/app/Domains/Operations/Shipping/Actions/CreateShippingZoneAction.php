<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Audit\AuditLogger;
use App\Domains\Operations\Shipping\Models\ShippingZone;
use Illuminate\Support\Facades\DB;

final readonly class CreateShippingZoneAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): ShippingZone
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $zone = ShippingZone::query()->create([
                'name' => $attributes['name'],
                'country_code' => $attributes['country_code'],
                'region' => $attributes['region'] ?? '',
            ]);

            $this->auditLogger->log(
                action: 'shipping_zone.created',
                actorId: $actorId,
                targetType: ShippingZone::class,
                targetId: $zone->id,
                after: $zone->only(['name', 'country_code', 'region', 'status']),
            );

            return $zone;
        });
    }
}
