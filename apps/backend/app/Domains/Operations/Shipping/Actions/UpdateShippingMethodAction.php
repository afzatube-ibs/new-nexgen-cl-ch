<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Audit\AuditLogger;
use App\Domains\Operations\Shipping\Models\ShippingMethod;
use Illuminate\Support\Facades\DB;

final readonly class UpdateShippingMethodAction
{
    private const array TRACKED_FIELDS = ['code', 'name', 'description', 'provider_code'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(ShippingMethod $method, array $changes, int $expectedVersion, ?string $actorId): ShippingMethod
    {
        return DB::transaction(function () use ($method, $changes, $expectedVersion, $actorId) {
            $method->assertVersionMatches($expectedVersion);

            $before = $method->only(self::TRACKED_FIELDS);
            $method->fill($changes)->save();

            $this->auditLogger->log(
                action: 'shipping_method.updated',
                actorId: $actorId,
                targetType: ShippingMethod::class,
                targetId: $method->id,
                before: $before,
                after: $method->only(self::TRACKED_FIELDS),
            );

            return $method;
        });
    }
}
