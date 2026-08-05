<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Models;

use Database\Factories\OrderItemFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One purchased line within an Order — see the order_items migration's
 * docblock for why this carries no `lock_version`.
 *
 * @property string $id
 * @property string $order_id
 * @property string $product_id
 * @property string $sku
 * @property string $product_name
 * @property int $quantity
 * @property string $unit_price
 * @property string $discount_amount
 * @property string $tax_amount
 * @property string $line_subtotal
 */
final class OrderItem extends Model
{
    /** @use HasFactory<OrderItemFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'order_id',
        'product_id',
        'sku',
        'product_name',
        'quantity',
        'unit_price',
        'discount_amount',
        'tax_amount',
        'line_subtotal',
    ];

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return OrderItemFactory
     */
    protected static function newFactory(): Factory
    {
        return OrderItemFactory::new();
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
