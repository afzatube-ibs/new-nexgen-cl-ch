<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Models;

use App\Domains\Commerce\Inventory\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\WarehouseFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * MODULE:INVENTORY's location aggregate — see the warehouses migration's
 * docblock.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $code
 * @property string $name
 * @property string|null $address_line1
 * @property string|null $address_line2
 * @property string|null $city
 * @property string|null $region
 * @property string|null $postal_code
 * @property string|null $country_code
 * @property bool $is_default
 * @property string $status
 * @property int $lock_version
 */
final class Warehouse extends Model
{
    /** @use HasFactory<WarehouseFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'code',
        'name',
        'address_line1',
        'address_line2',
        'city',
        'region',
        'postal_code',
        'country_code',
        'is_default',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    /**
     * @return WarehouseFactory
     */
    protected static function newFactory(): Factory
    {
        return WarehouseFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $warehouse): void {
            $warehouse->tenant_id ??= TenantId::DEFAULT;
            $warehouse->status ??= self::STATUS_ACTIVE;
            $warehouse->is_default ??= false;
            $warehouse->lock_version ??= 1;
        });
    }

    /**
     * @return HasMany<StockItem, $this>
     */
    public function stockItems(): HasMany
    {
        return $this->hasMany(StockItem::class);
    }
}
