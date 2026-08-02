<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Models;

use App\Domains\Commerce\Inventory\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\StockItemFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * MODULE:INVENTORY's core aggregate — see the stock_items migration's
 * docblock for why this is keyed by `sku` rather than a Catalog reference.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $warehouse_id
 * @property string $sku
 * @property int $quantity_on_hand
 * @property int $quantity_reserved
 * @property int $lock_version
 */
final class StockItem extends Model
{
    /** @use HasFactory<StockItemFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    protected $fillable = ['warehouse_id', 'sku', 'quantity_on_hand', 'quantity_reserved'];

    /**
     * @return StockItemFactory
     */
    protected static function newFactory(): Factory
    {
        return StockItemFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $stockItem): void {
            $stockItem->tenant_id ??= TenantId::DEFAULT;
            $stockItem->quantity_on_hand ??= 0;
            $stockItem->quantity_reserved ??= 0;
            $stockItem->lock_version ??= 1;
        });
    }

    public function available(): int
    {
        return $this->quantity_on_hand - $this->quantity_reserved;
    }

    /**
     * @return BelongsTo<Warehouse, $this>
     */
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    /**
     * @return HasMany<StockReservation, $this>
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(StockReservation::class);
    }

    /**
     * @return HasMany<StockAdjustment, $this>
     */
    public function adjustments(): HasMany
    {
        return $this->hasMany(StockAdjustment::class);
    }
}
