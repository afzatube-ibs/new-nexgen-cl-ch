<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Models;

use Database\Factories\OrderNoteFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An append-only annotation on an Order — see the order_notes migration's
 * docblock.
 *
 * @property string $id
 * @property string $order_id
 * @property string|null $author_id
 * @property string $body
 * @property bool $is_customer_visible
 */
final class OrderNote extends Model
{
    /** @use HasFactory<OrderNoteFactory> */
    use HasFactory, HasUuids;

    public const UPDATED_AT = null;

    protected $fillable = [
        'order_id',
        'author_id',
        'body',
        'is_customer_visible',
    ];

    protected function casts(): array
    {
        return [
            'is_customer_visible' => 'boolean',
        ];
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return OrderNoteFactory
     */
    protected static function newFactory(): Factory
    {
        return OrderNoteFactory::new();
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
