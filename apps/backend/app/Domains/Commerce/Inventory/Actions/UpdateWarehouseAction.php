<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Support\Facades\DB;

final readonly class UpdateWarehouseAction
{
    private const array TRACKED_FIELDS = [
        'code', 'name', 'address_line1', 'address_line2', 'city', 'region', 'postal_code', 'country_code', 'is_default',
    ];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Warehouse $warehouse, array $changes, int $expectedVersion, ?string $actorId): Warehouse
    {
        return DB::transaction(function () use ($warehouse, $changes, $expectedVersion, $actorId) {
            $warehouse->assertVersionMatches($expectedVersion);

            if ($changes['is_default'] ?? false) {
                Warehouse::query()->where('id', '!=', $warehouse->id)->where('is_default', true)->update(['is_default' => false]);
            }

            $before = $warehouse->only(self::TRACKED_FIELDS);
            $warehouse->fill($changes)->save();
            $after = $warehouse->only(self::TRACKED_FIELDS);

            $this->auditLogger->log(
                action: 'warehouse.updated',
                actorId: $actorId,
                targetType: Warehouse::class,
                targetId: $warehouse->id,
                before: $before,
                after: $after,
            );

            return $warehouse;
        });
    }
}
