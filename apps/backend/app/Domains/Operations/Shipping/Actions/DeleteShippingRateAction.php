<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Audit\AuditLogger;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use Illuminate\Support\Facades\DB;

final readonly class DeleteShippingRateAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ShippingRate $rate, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($rate, $expectedVersion, $actorId): void {
            $rate->assertVersionMatches($expectedVersion);

            $rate->delete();

            $this->auditLogger->log(
                action: 'shipping_rate.deleted',
                actorId: $actorId,
                targetType: ShippingRate::class,
                targetId: $rate->id,
            );
        });
    }
}
