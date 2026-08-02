<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\StockTransferFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Movement of one SKU between two Warehouses — see the stock_transfers
 * migration's docblock.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $from_warehouse_id
 * @property string $to_warehouse_id
 * @property string $sku
 * @property int $quantity
 * @property string $status
 */
final class StockTransfer extends Model
{
    /** @use HasFactory<StockTransferFactory> */
    use HasFactory, HasUuids;

    public const string STATUS_PENDING = 'pending';

    public const string STATUS_COMPLETED = 'completed';

    public const string STATUS_CANCELLED = 'cancelled';

    protected $fillable = ['from_warehouse_id', 'to_warehouse_id', 'sku', 'quantity', 'status'];

    /**
     * @return StockTransferFactory
     */
    protected static function newFactory(): Factory
    {
        return StockTransferFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $transfer): void {
            $transfer->tenant_id ??= TenantId::DEFAULT;
            $transfer->status ??= self::STATUS_PENDING;
        });
    }

    /**
     * @return BelongsTo<Warehouse, $this>
     */
    public function fromWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'from_warehouse_id');
    }

    /**
     * @return BelongsTo<Warehouse, $this>
     */
    public function toWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'to_warehouse_id');
    }
}
