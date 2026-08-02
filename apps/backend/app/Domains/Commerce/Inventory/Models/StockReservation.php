<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A temporary hold against a StockItem — see the stock_reservations
 * migration's docblock. No lock_version/soft-delete of its own: its whole
 * lifecycle is the `status` transition active -> released|committed,
 * always performed under the parent StockItem's row lock (see
 * Actions\ReserveStockAction and friends).
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $stock_item_id
 * @property int $quantity
 * @property string|null $reference_type
 * @property string|null $reference_id
 * @property string $status
 * @property Carbon|null $expires_at
 */
final class StockReservation extends Model
{
    use HasUuids;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_RELEASED = 'released';

    public const string STATUS_COMMITTED = 'committed';

    protected $fillable = ['quantity', 'reference_type', 'reference_id', 'status', 'expires_at'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $reservation): void {
            $reservation->tenant_id ??= TenantId::DEFAULT;
            $reservation->status ??= self::STATUS_ACTIVE;
        });
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * @return BelongsTo<StockItem, $this>
     */
    public function stockItem(): BelongsTo
    {
        return $this->belongsTo(StockItem::class);
    }
}
