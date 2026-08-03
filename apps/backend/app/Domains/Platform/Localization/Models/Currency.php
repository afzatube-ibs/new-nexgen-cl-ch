<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use App\Domains\Platform\Localization\Models\Concerns\HasOptimisticLocking;
use Database\Factories\CurrencyFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * MODULE:LOCALIZATION's registry entry for one supported currency and its
 * exchange rate — see the currencies migration's docblock for how this
 * differs from Store Configuration's own `stores.currency_code` column.
 *
 * `is_base` implements the single-base invariant enforced in
 * Actions\UpdateCurrencyAction, which also forces `exchange_rate` to
 * exactly 1.000000 whenever a currency becomes base. `status` plus soft
 * deletes implement DATA:LIFECYCLE's Active/Archived/Deleted framework.
 * `lock_version` implements DATA:VERSIONING. `tenant_id` implements
 * ARCH:DATA_OWNERSHIP's designed-in, unexercised tenant boundary.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $code
 * @property string $name
 * @property string $symbol
 * @property int $decimal_places
 * @property string $exchange_rate
 * @property bool $is_base
 * @property string $status
 * @property int $lock_version
 */
final class Currency extends Model
{
    /** @use HasFactory<CurrencyFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'code',
        'name',
        'symbol',
        'decimal_places',
        'exchange_rate',
        'is_base',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'decimal_places' => 'integer',
            'is_base' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $currency): void {
            $currency->tenant_id ??= TenantId::DEFAULT;
            $currency->status ??= self::STATUS_ACTIVE;
            $currency->is_base ??= false;
            $currency->code = strtoupper($currency->code);
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $currency->lock_version
            // immediately after creation would otherwise see null instead
            // of 1.
            $currency->lock_version ??= 1;
        });

        self::saving(function (self $currency): void {
            if ($currency->isDirty('code')) {
                $currency->code = strtoupper($currency->code);
            }
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return CurrencyFactory
     */
    protected static function newFactory(): Factory
    {
        return CurrencyFactory::new();
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
