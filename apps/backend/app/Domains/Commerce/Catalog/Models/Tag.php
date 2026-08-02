<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use App\Domains\Commerce\Catalog\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\TagFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A simple, flat label a Product may carry.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string $slug
 * @property int $lock_version
 */
final class Tag extends Model
{
    /** @use HasFactory<TagFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    protected $fillable = ['name', 'slug'];

    /**
     * @return TagFactory
     */
    protected static function newFactory(): Factory
    {
        return TagFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $tag): void {
            $tag->tenant_id ??= TenantId::DEFAULT;
            $tag->lock_version ??= 1;
        });
    }

    /**
     * @return BelongsToMany<Product, $this>
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_tags');
    }
}
