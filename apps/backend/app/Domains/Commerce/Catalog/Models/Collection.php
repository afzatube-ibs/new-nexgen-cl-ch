<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use App\Domains\Commerce\Catalog\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\CollectionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A flat, curated grouping of products — see the collections migration's
 * docblock for how this differs from Category.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property int $position
 * @property string $status
 * @property int $lock_version
 */
final class Collection extends Model
{
    /** @use HasFactory<CollectionFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $table = 'collections';

    protected $fillable = ['name', 'slug', 'description', 'position', 'status'];

    /**
     * @return CollectionFactory
     */
    protected static function newFactory(): Factory
    {
        return CollectionFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $collection): void {
            $collection->tenant_id ??= TenantId::DEFAULT;
            $collection->status ??= self::STATUS_ACTIVE;
            $collection->lock_version ??= 1;
        });
    }

    /**
     * @return BelongsToMany<Product, $this>
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_collections')
            ->withPivot('position');
    }
}
