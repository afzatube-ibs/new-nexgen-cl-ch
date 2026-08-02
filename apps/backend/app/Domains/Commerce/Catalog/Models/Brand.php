<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use App\Domains\Commerce\Catalog\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use App\Domains\Platform\Media\Models\MediaAsset;
use Database\Factories\BrandFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One of MODULE:CATALOG's owned taxonomies. `logo_media_id` references
 * MODULE:MEDIA's MediaAsset by identifier — see the brands migration's
 * docblock for why this is not a database foreign key. Reading it directly
 * (never writing to it) is the sanctioned cross-module dependency
 * MODULE:INTERACTION_RULES' "into Platform, any module may depend on any
 * Platform module directly" describes.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property string|null $logo_media_id
 * @property string|null $meta_title
 * @property string|null $meta_description
 * @property string $status
 * @property int $lock_version
 */
final class Brand extends Model
{
    /** @use HasFactory<BrandFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'logo_media_id',
        'meta_title',
        'meta_description',
        'status',
    ];

    /**
     * @return BrandFactory
     */
    protected static function newFactory(): Factory
    {
        return BrandFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $brand): void {
            $brand->tenant_id ??= TenantId::DEFAULT;
            $brand->status ??= self::STATUS_ACTIVE;
            $brand->lock_version ??= 1;
        });
    }

    /**
     * @return HasMany<Product, $this>
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * @return BelongsTo<MediaAsset, $this>
     */
    public function logo(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'logo_media_id');
    }
}
