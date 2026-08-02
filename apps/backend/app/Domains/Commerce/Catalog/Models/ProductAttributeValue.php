<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A Product's value for a given Attribute. Part of Product's aggregate —
 * see the product_attribute_values migration's docblock.
 *
 * @property string $id
 * @property string $product_id
 * @property string $attribute_id
 * @property string|null $value
 */
final class ProductAttributeValue extends Model
{
    use HasUuids;

    protected $fillable = ['attribute_id', 'value'];

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return BelongsTo<Attribute, $this>
     */
    public function attribute(): BelongsTo
    {
        return $this->belongsTo(Attribute::class);
    }
}
