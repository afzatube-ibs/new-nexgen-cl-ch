<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Audit\AuditLogger;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveShippingRateAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ShippingRate $rate, int $expectedVersion, ?string $actorId): ShippingRate
    {
        return DB::transaction(function () use ($rate, $expectedVersion, $actorId) {
            $rate->assertVersionMatches($expectedVersion);

            $rate->status = ShippingRate::STATUS_ARCHIVED;
            $rate->save();

            $this->auditLogger->log(
                action: 'shipping_rate.archived',
                actorId: $actorId,
                targetType: ShippingRate::class,
                targetId: $rate->id,
                after: ['status' => $rate->status],
            );

            return $rate;
        });
    }
}
