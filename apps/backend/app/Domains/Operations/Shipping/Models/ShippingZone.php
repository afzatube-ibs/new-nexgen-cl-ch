<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Models;

use App\Domains\Operations\Shipping\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\ShippingZoneFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A geographic delivery jurisdiction — see the shipping_zones migration's
 * docblock, including why `region` is an empty string rather than null for
 * a country-wide zone.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string $country_code
 * @property string $region
 * @property string $status
 * @property int $lock_version
 */
final class ShippingZone extends Model
{
    /** @use HasFactory<ShippingZoneFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'name',
        'country_code',
        'region',
        'status',
    ];

    protected static function booted(): void
    {
        self::creating(function (self $zone): void {
            $zone->tenant_id ??= TenantId::DEFAULT;
            $zone->status ??= self::STATUS_ACTIVE;
            $zone->region ??= '';
            $zone->country_code = strtoupper((string) $zone->country_code);
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $zone->lock_version immediately
            // after creation would otherwise see null instead of 1.
            $zone->lock_version ??= 1;
        });

        self::saving(function (self $zone): void {
            if ($zone->isDirty('country_code')) {
                $zone->country_code = strtoupper((string) $zone->country_code);
            }
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ShippingZoneFactory
     */
    protected static function newFactory(): Factory
    {
        return ShippingZoneFactory::new();
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isCountryWide(): bool
    {
        return $this->region === '';
    }
}
