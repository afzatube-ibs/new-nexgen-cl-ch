<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use App\Domains\Platform\Localization\Models\Concerns\HasOptimisticLocking;
use Database\Factories\LocaleFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * MODULE:LOCALIZATION's registry entry for one supported locale — see the
 * locales migration's docblock for how this differs from Store
 * Configuration's own `stores.locale` column.
 *
 * `is_default` implements the single-default invariant enforced in
 * Actions\UpdateLocaleAction. `status` plus soft deletes implement
 * DATA:LIFECYCLE's Active/Archived/Deleted framework. `lock_version`
 * implements DATA:VERSIONING. `tenant_id` implements ARCH:DATA_OWNERSHIP's
 * designed-in, unexercised tenant boundary.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $code
 * @property string $name
 * @property string $native_name
 * @property bool $is_rtl
 * @property bool $is_default
 * @property string $status
 * @property int $lock_version
 */
final class Locale extends Model
{
    /** @use HasFactory<LocaleFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'code',
        'name',
        'native_name',
        'is_rtl',
        'is_default',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'is_rtl' => 'boolean',
            'is_default' => 'boolean',
        ];
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return LocaleFactory
     */
    protected static function newFactory(): Factory
    {
        return LocaleFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $locale): void {
            $locale->tenant_id ??= TenantId::DEFAULT;
            $locale->status ??= self::STATUS_ACTIVE;
            $locale->is_default ??= false;
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $locale->lock_version immediately
            // after creation would otherwise see null instead of 1.
            $locale->lock_version ??= 1;
        });
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
