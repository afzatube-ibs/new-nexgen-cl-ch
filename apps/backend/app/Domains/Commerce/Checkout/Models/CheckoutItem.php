<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Models;

use Database\Factories\CheckoutItemFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One cart line within a CheckoutSession — see the checkout_items
 * migration's docblock for the full field-by-field rationale, including
 * why this carries no `lock_version` of its own.
 *
 * @property string $id
 * @property string $checkout_session_id
 * @property string $product_id
 * @property string $sku
 * @property string $product_name
 * @property list<string>|null $category_ids
 * @property int $quantity
 * @property string|null $tax_class_id
 * @property string|null $unit_price
 * @property string|null $tax_amount
 */
final class CheckoutItem extends Model
{
    /** @use HasFactory<CheckoutItemFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'checkout_session_id',
        'product_id',
        'sku',
        'product_name',
        'category_ids',
        'quantity',
        'tax_class_id',
        'unit_price',
        'tax_amount',
    ];

    protected function casts(): array
    {
        return [
            'category_ids' => 'array',
            // Matches the migration's own decimal(14,4) precision — see
            // CheckoutSession::casts()'s own docblock for the bug class
            // this closes (SQLite NUMERIC affinity round-tripping a
            // decimal string as a plain int/float without it).
            'unit_price' => 'decimal:4',
            'tax_amount' => 'decimal:4',
        ];
    }

    protected static function booted(): void
    {
        self::saving(function (self $item): void {
            if ($item->isDirty('sku')) {
                $item->sku = strtoupper((string) $item->sku);
            }
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return CheckoutItemFactory
     */
    protected static function newFactory(): Factory
    {
        return CheckoutItemFactory::new();
    }

    /**
     * @return BelongsTo<CheckoutSession, $this>
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(CheckoutSession::class, 'checkout_session_id');
    }
}
