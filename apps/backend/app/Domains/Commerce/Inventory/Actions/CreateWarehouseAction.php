<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Support\Facades\DB;

final readonly class CreateWarehouseAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Warehouse
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            if ($attributes['is_default'] ?? false) {
                Warehouse::query()->where('is_default', true)->update(['is_default' => false]);
            }

            $warehouse = Warehouse::query()->create($attributes);

            $this->auditLogger->log(
                action: 'warehouse.created',
                actorId: $actorId,
                targetType: Warehouse::class,
                targetId: $warehouse->id,
                after: $warehouse->only(['code', 'name', 'is_default', 'status']),
            );

            return $warehouse;
        });
    }
}
