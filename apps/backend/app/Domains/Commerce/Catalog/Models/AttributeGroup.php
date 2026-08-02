<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use App\Domains\Commerce\Catalog\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\AttributeGroupFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Purely organizational grouping over Attribute — see that model's
 * docblock.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $code
 * @property string $name
 * @property int $position
 * @property int $lock_version
 */
final class AttributeGroup extends Model
{
    /** @use HasFactory<AttributeGroupFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    protected $fillable = ['code', 'name', 'position'];

    /**
     * @return AttributeGroupFactory
     */
    protected static function newFactory(): Factory
    {
        return AttributeGroupFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $group): void {
            $group->tenant_id ??= TenantId::DEFAULT;
            $group->lock_version ??= 1;
        });
    }

    /**
     * @return HasMany<Attribute, $this>
     */
    public function attributes(): HasMany
    {
        return $this->hasMany(Attribute::class);
    }
}
