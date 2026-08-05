<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Audit\AuditLogger;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use Illuminate\Support\Facades\DB;

final readonly class UpdateShippingRateAction
{
    private const array TRACKED_FIELDS = ['min_weight_grams', 'max_weight_grams', 'amount', 'currency_code'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(ShippingRate $rate, array $changes, int $expectedVersion, ?string $actorId): ShippingRate
    {
        return DB::transaction(function () use ($rate, $changes, $expectedVersion, $actorId) {
            $rate->assertVersionMatches($expectedVersion);

            $before = $rate->only(self::TRACKED_FIELDS);
            $rate->fill($changes)->save();

            $this->auditLogger->log(
                action: 'shipping_rate.updated',
                actorId: $actorId,
                targetType: ShippingRate::class,
                targetId: $rate->id,
                before: $before,
                after: $rate->only(self::TRACKED_FIELDS),
            );

            return $rate;
        });
    }
}
