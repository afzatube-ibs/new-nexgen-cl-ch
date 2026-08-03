<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Models;

use App\Domains\Commerce\Pricing\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\TaxRateFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * The rate applied when a TaxClass is taxed within a TaxZone — see the
 * tax_rates migration's docblock, including why "Tax Rates" and "Tax
 * Rules" are implemented as this one concept.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $tax_zone_id
 * @property string $tax_class_id
 * @property string $rate
 * @property string $status
 * @property int $lock_version
 */
final class TaxRate extends Model
{
    /** @use HasFactory<TaxRateFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'tax_zone_id',
        'tax_class_id',
        'rate',
        'status',
    ];

    protected static function booted(): void
    {
        self::creating(function (self $rate): void {
            $rate->tenant_id ??= TenantId::DEFAULT;
            $rate->status ??= self::STATUS_ACTIVE;
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $rate->lock_version immediately
            // after creation would otherwise see null instead of 1.
            $rate->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return TaxRateFactory
     */
    protected static function newFactory(): Factory
    {
        return TaxRateFactory::new();
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * @return BelongsTo<TaxZone, $this>
     */
    public function taxZone(): BelongsTo
    {
        return $this->belongsTo(TaxZone::class);
    }

    /**
     * @return BelongsTo<TaxClass, $this>
     */
    public function taxClass(): BelongsTo
    {
        return $this->belongsTo(TaxClass::class);
    }
}
