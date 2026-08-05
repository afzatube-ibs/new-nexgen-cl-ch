<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Models;

use Database\Factories\OrderDiscountFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One applied discount's frozen record for an Order — see the
 * order_discounts migration's docblock.
 *
 * @property string $id
 * @property string $order_id
 * @property string|null $promotion_id
 * @property string|null $code
 * @property string $label
 * @property string $amount
 */
final class OrderDiscount extends Model
{
    /** @use HasFactory<OrderDiscountFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'order_id',
        'promotion_id',
        'code',
        'label',
        'amount',
    ];

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return OrderDiscountFactory
     */
    protected static function newFactory(): Factory
    {
        return OrderDiscountFactory::new();
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
