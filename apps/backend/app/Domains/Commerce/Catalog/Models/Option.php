<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use App\Domains\Commerce\Catalog\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\OptionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A variant dimension (e.g. "Color", "Size") — see the options migration's
 * docblock. The aggregate root for its OptionValues: a value is only ever
 * added, changed, or removed through this model (see Actions\
 * AddOptionValueAction and friends), never created independently.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $code
 * @property string $name
 * @property int $position
 * @property int $lock_version
 */
final class Option extends Model
{
    /** @use HasFactory<OptionFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    protected $fillable = ['code', 'name', 'position'];

    /**
     * @return OptionFactory
     */
    protected static function newFactory(): Factory
    {
        return OptionFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $option): void {
            $option->tenant_id ??= TenantId::DEFAULT;
            $option->lock_version ??= 1;
        });
    }

    /**
     * @return HasMany<OptionValue, $this>
     */
    public function values(): HasMany
    {
        return $this->hasMany(OptionValue::class);
    }
}
