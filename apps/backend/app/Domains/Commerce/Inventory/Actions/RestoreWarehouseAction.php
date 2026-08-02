<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Support\Facades\DB;

final readonly class RestoreWarehouseAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Warehouse $warehouse, ?string $actorId): Warehouse
    {
        return DB::transaction(function () use ($warehouse, $actorId) {
            $warehouse->restore();

            $this->auditLogger->log(
                action: 'warehouse.restored',
                actorId: $actorId,
                targetType: Warehouse::class,
                targetId: $warehouse->id,
                after: $warehouse->only(['code', 'name']),
            );

            return $warehouse;
        });
    }
}
