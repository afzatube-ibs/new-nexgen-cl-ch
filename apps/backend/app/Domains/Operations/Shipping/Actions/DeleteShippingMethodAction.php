<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Audit\AuditLogger;
use App\Domains\Operations\Shipping\Exceptions\DependentRecordsExistException;
use App\Domains\Operations\Shipping\Models\ShippingMethod;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use Illuminate\Support\Facades\DB;

final readonly class DeleteShippingMethodAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ShippingMethod $method, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($method, $expectedVersion, $actorId): void {
            $method->assertVersionMatches($expectedVersion);

            if (ShippingRate::query()->where('shipping_method_id', $method->id)->exists()) {
                throw new DependentRecordsExistException(
                    aggregateType: ShippingMethod::class,
                    aggregateId: $method->id,
                    reason: 'one or more shipping rates still reference this method.',
                );
            }

            $method->delete();

            $this->auditLogger->log(
                action: 'shipping_method.deleted',
                actorId: $actorId,
                targetType: ShippingMethod::class,
                targetId: $method->id,
            );
        });
    }
}
