<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use App\Domains\Commerce\Catalog\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\ProductVariantFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * The concrete sellable unit for a `configurable` Product — see the
 * product_variants migration's docblock for why this is its own aggregate.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $product_id
 * @property string $sku
 * @property string|null $barcode
 * @property string $status
 * @property int $position
 * @property int $lock_version
 */
final class ProductVariant extends Model
{
    /** @use HasFactory<ProductVariantFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = ['sku', 'barcode', 'status', 'position'];

    /**
     * @return ProductVariantFactory
     */
    protected static function newFactory(): Factory
    {
        return ProductVariantFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $variant): void {
            $variant->tenant_id ??= TenantId::DEFAULT;
            $variant->status ??= self::STATUS_ACTIVE;
            $variant->lock_version ??= 1;
        });
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return BelongsToMany<OptionValue, $this>
     */
    public function optionValues(): BelongsToMany
    {
        // Explicit pivot keys: Laravel's default convention would infer
        // `product_variant_id`, but the product_variant_option_values
        // migration names it `variant_id` (matching the column name used
        // throughout this module's nested product/{product}/variants
        // routes).
        return $this->belongsToMany(OptionValue::class, 'product_variant_option_values', 'variant_id', 'option_value_id');
    }
}
