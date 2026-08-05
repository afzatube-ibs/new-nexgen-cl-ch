<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Audit\AuditLogger;
use App\Domains\Operations\Shipping\Models\ShippingMethod;
use Illuminate\Support\Facades\DB;

final readonly class CreateShippingMethodAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): ShippingMethod
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $method = ShippingMethod::query()->create([
                'code' => $attributes['code'],
                'name' => $attributes['name'],
                'description' => $attributes['description'] ?? null,
                'provider_code' => $attributes['provider_code'] ?? null,
            ]);

            $this->auditLogger->log(
                action: 'shipping_method.created',
                actorId: $actorId,
                targetType: ShippingMethod::class,
                targetId: $method->id,
                after: $method->only(['code', 'name', 'description', 'provider_code', 'status']),
            );

            return $method;
        });
    }
}
