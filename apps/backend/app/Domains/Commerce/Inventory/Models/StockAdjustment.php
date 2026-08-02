<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An immutable stock movement record — see the stock_adjustments
 * migration's docblock. Written only through Actions\AdjustStockAction
 * and the actions that internally adjust on-hand quantity (commit,
 * transfer completion).
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $stock_item_id
 * @property int $quantity_delta
 * @property string $reason
 * @property string|null $actor_id
 */
final class StockAdjustment extends Model
{
    use HasUuids;

    public const UPDATED_AT = null;

    protected $fillable = ['stock_item_id', 'quantity_delta', 'reason', 'actor_id'];

    protected static function booted(): void
    {
        self::creating(function (self $adjustment): void {
            $adjustment->tenant_id ??= TenantId::DEFAULT;
        });
    }

    /**
     * @return BelongsTo<StockItem, $this>
     */
    public function stockItem(): BelongsTo
    {
        return $this->belongsTo(StockItem::class);
    }
}
