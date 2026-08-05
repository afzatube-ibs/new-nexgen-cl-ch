<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Audit\AuditLogger;
use App\Domains\Operations\Shipping\Models\ShippingMethod;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveShippingMethodAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ShippingMethod $method, int $expectedVersion, ?string $actorId): ShippingMethod
    {
        return DB::transaction(function () use ($method, $expectedVersion, $actorId) {
            $method->assertVersionMatches($expectedVersion);

            $method->status = ShippingMethod::STATUS_ARCHIVED;
            $method->save();

            $this->auditLogger->log(
                action: 'shipping_method.archived',
                actorId: $actorId,
                targetType: ShippingMethod::class,
                targetId: $method->id,
                after: ['status' => $method->status],
            );

            return $method;
        });
    }
}
