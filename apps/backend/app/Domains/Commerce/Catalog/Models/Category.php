<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use App\Domains\Commerce\Catalog\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * MODULE:CATALOG's hierarchical taxonomy, via the self-referential
 * `parent()`/`children()` relations.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string|null $parent_id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property int $position
 * @property string|null $meta_title
 * @property string|null $meta_description
 * @property string $status
 * @property int $lock_version
 */
final class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'parent_id',
        'name',
        'slug',
        'description',
        'position',
        'meta_title',
        'meta_description',
        'status',
    ];

    /**
     * @return CategoryFactory
     */
    protected static function newFactory(): Factory
    {
        return CategoryFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $category): void {
            $category->tenant_id ??= TenantId::DEFAULT;
            $category->status ??= self::STATUS_ACTIVE;
            $category->lock_version ??= 1;
        });
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * @return HasMany<Category, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * @return BelongsToMany<Product, $this>
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_categories')
            ->withPivot('position');
    }
}
