<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Audit\AuditLogger;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use Illuminate\Support\Facades\DB;

final readonly class CreateShippingRateAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): ShippingRate
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $rate = ShippingRate::query()->create([
                'shipping_zone_id' => $attributes['shipping_zone_id'],
                'shipping_method_id' => $attributes['shipping_method_id'],
                'min_weight_grams' => $attributes['min_weight_grams'] ?? 0,
                'max_weight_grams' => $attributes['max_weight_grams'] ?? null,
                'amount' => $attributes['amount'],
                'currency_code' => $attributes['currency_code'],
            ]);

            $this->auditLogger->log(
                action: 'shipping_rate.created',
                actorId: $actorId,
                targetType: ShippingRate::class,
                targetId: $rate->id,
                after: $rate->only(['shipping_zone_id', 'shipping_method_id', 'min_weight_grams', 'max_weight_grams', 'amount', 'currency_code', 'status']),
            );

            return $rate;
        });
    }
}
