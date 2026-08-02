<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use App\Domains\Commerce\Catalog\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * MODULE:CATALOG's central aggregate root — see the products migration's
 * docblock for the full rationale behind its shape, in particular why it
 * carries no price (MODULE:PRICING's exclusive ownership) and no Media
 * reference (Catalog is deliberately independent of the not-yet-built
 * Media module; `images()` below stores plain URLs directly, an
 * intentional, documented simplification revisited when Media exists).
 *
 * Everything under this aggregate (variants, images, attribute values,
 * category/collection/tag membership, relationships) is reached and
 * modified only through this model or its own Actions — never written to
 * directly, per DATA:AGGREGATE_BOUNDARIES.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string|null $brand_id
 * @property string $sku
 * @property string|null $barcode
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property string|null $short_description
 * @property string $product_type
 * @property string $status
 * @property string $visibility
 * @property string|null $meta_title
 * @property string|null $meta_description
 * @property string|null $meta_keywords
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $published_at
 * @property int $lock_version
 */
final class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_DRAFT = 'draft';

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    public const string TYPE_SIMPLE = 'simple';

    public const string TYPE_CONFIGURABLE = 'configurable';

    public const string TYPE_DIGITAL = 'digital';

    public const string VISIBILITY_NOT_VISIBLE = 'not_visible';

    public const string VISIBILITY_CATALOG = 'catalog';

    public const string VISIBILITY_SEARCH = 'search';

    public const string VISIBILITY_CATALOG_SEARCH = 'catalog_search';

    /**
     * @return list<string>
     */
    public static function types(): array
    {
        return [self::TYPE_SIMPLE, self::TYPE_CONFIGURABLE, self::TYPE_DIGITAL];
    }

    /**
     * @return list<string>
     */
    public static function visibilities(): array
    {
        return [
            self::VISIBILITY_NOT_VISIBLE,
            self::VISIBILITY_CATALOG,
            self::VISIBILITY_SEARCH,
            self::VISIBILITY_CATALOG_SEARCH,
        ];
    }

    protected $fillable = [
        'brand_id',
        'sku',
        'barcode',
        'name',
        'slug',
        'description',
        'short_description',
        'product_type',
        'status',
        'visibility',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'metadata',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'published_at' => 'datetime',
        ];
    }

    /**
     * @return ProductFactory
     */
    protected static function newFactory(): Factory
    {
        return ProductFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $product): void {
            $product->tenant_id ??= TenantId::DEFAULT;
            $product->product_type ??= self::TYPE_SIMPLE;
            $product->status ??= self::STATUS_DRAFT;
            $product->visibility ??= self::VISIBILITY_CATALOG_SEARCH;
            $product->lock_version ??= 1;
        });
    }

    public function isConfigurable(): bool
    {
        return $this->product_type === self::TYPE_CONFIGURABLE;
    }

    /**
     * @return BelongsTo<Brand, $this>
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * @return HasMany<ProductVariant, $this>
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /**
     * @return HasMany<ProductImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class);
    }

    /**
     * @return HasMany<ProductAttributeValue, $this>
     */
    public function attributeValues(): HasMany
    {
        return $this->hasMany(ProductAttributeValue::class);
    }

    /**
     * @return BelongsToMany<Category, $this>
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'product_categories')
            ->withPivot('position');
    }

    /**
     * @return BelongsToMany<Collection, $this>
     */
    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(Collection::class, 'product_collections')
            ->withPivot('position');
    }

    /**
     * @return BelongsToMany<Tag, $this>
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'product_tags');
    }

    /**
     * @return BelongsToMany<Option, $this>
     */
    public function options(): BelongsToMany
    {
        return $this->belongsToMany(Option::class, 'product_options')
            ->withPivot('position');
    }

    /**
     * @return HasMany<ProductRelationship, $this>
     */
    public function relationships(): HasMany
    {
        return $this->hasMany(ProductRelationship::class);
    }
}
