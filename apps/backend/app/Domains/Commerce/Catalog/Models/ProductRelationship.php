<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A directed relationship from one Product to another — see the
 * product_relationships migration's docblock. Part of Product's aggregate.
 *
 * @property string $id
 * @property string $product_id
 * @property string $related_product_id
 * @property string $type
 * @property int $position
 */
final class ProductRelationship extends Model
{
    use HasUuids;

    public const string TYPE_RELATED = 'related';

    public const string TYPE_CROSS_SELL = 'cross_sell';

    public const string TYPE_UP_SELL = 'up_sell';

    /**
     * @return list<string>
     */
    public static function types(): array
    {
        return [self::TYPE_RELATED, self::TYPE_CROSS_SELL, self::TYPE_UP_SELL];
    }

    protected $fillable = ['related_product_id', 'type', 'position'];

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function relatedProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'related_product_id');
    }
}
