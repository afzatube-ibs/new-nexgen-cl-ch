<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use App\Domains\Platform\StoreConfiguration\Models\Concerns\HasOptimisticLocking;
use Database\Factories\StoreFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * MODULE:STORE_CONFIGURATION's aggregate root — the store-level business
 * profile (identity, currency, locale, timezone, contact, and registered
 * address) every other module reads to know "what store is this and how
 * does it operate," per planning/IMPLEMENTATION_MASTER_PLAN.md's
 * Organizations & Stores entry.
 *
 * `status` implements DATA:LIFECYCLE's Active/Archived states at the
 * business level (soft-deletes below implement Deleted). `lock_version`
 * implements DATA:VERSIONING. `tenant_id` implements ARCH:DATA_OWNERSHIP's
 * designed-in, unexercised tenant boundary — Phase 1 exercises this module
 * as a single-store record; Phase 3 multi-store narrows this same,
 * already-present dimension rather than requiring a redesign.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string|null $legal_name
 * @property string $currency_code
 * @property string $locale
 * @property string $timezone
 * @property string $contact_email
 * @property string|null $contact_phone
 * @property string $address_line1
 * @property string|null $address_line2
 * @property string $city
 * @property string|null $region
 * @property string|null $postal_code
 * @property string $country_code
 * @property string $status
 * @property int $lock_version
 */
final class Store extends Model
{
    /** @use HasFactory<StoreFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'name',
        'legal_name',
        'currency_code',
        'locale',
        'timezone',
        'contact_email',
        'contact_phone',
        'address_line1',
        'address_line2',
        'city',
        'region',
        'postal_code',
        'country_code',
        'status',
    ];

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return StoreFactory
     */
    protected static function newFactory(): Factory
    {
        return StoreFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $store): void {
            $store->tenant_id ??= TenantId::DEFAULT;
            $store->status ??= self::STATUS_ACTIVE;
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $store->lock_version immediately
            // after creation would otherwise see null instead of 1.
            $store->lock_version ??= 1;
        });
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
