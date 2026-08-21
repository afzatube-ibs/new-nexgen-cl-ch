<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Exceptions\DependentRecordsExistException;
use App\Domains\Commerce\Inventory\Models\StockTransfer;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Support\Facades\DB;

final readonly class DeleteWarehouseAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Warehouse $warehouse, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($warehouse, $expectedVersion, $actorId) {
            $warehouse->assertVersionMatches($expectedVersion);

            if ($warehouse->stockItems()->exists()) {
                throw new DependentRecordsExistException(
                    Warehouse::class,
                    $warehouse->id,
                    'it still has stock items recorded against it.',
                );
            }

            // A warehouse that has never held stock (`stockItems()->exists()`
            // above is false) can still be the *destination* of a pending
            // transfer — CompleteStockTransferAction only creates the
            // destination's StockItem row when the transfer actually
            // completes, not when it's initiated. Without this check, a
            // brand-new, still-empty destination warehouse could be deleted
            // out from under an in-flight transfer; completing it afterward
            // would then silently create real stock under a warehouse the
            // merchant can no longer see or manage. Pending transfers where
            // this warehouse is the *source* are already covered by the
            // stock-items check above (a transfer can only be initiated from
            // a warehouse that already has the stock to hold), but checking
            // both sides here is the honest, explicit version of that rule
            // rather than relying on it holding incidentally.
            if (StockTransfer::query()
                ->where('status', StockTransfer::STATUS_PENDING)
                ->where(fn ($query) => $query->where('from_warehouse_id', $warehouse->id)->orWhere('to_warehouse_id', $warehouse->id))
                ->exists()) {
                throw new DependentRecordsExistException(
                    Warehouse::class,
                    $warehouse->id,
                    'it still has a pending stock transfer referencing it.',
                );
            }

            $before = $warehouse->only(['code', 'name']);
            $warehouse->delete();

            $this->auditLogger->log(
                action: 'warehouse.deleted',
                actorId: $actorId,
                targetType: Warehouse::class,
                targetId: $warehouse->id,
                before: $before,
            );
        });
    }
}
