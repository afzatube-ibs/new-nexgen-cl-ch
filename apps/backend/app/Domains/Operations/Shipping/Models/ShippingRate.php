<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Models;

use App\Domains\Operations\Shipping\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\ShippingRateFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * The price charged for a ShippingMethod within a ShippingZone, optionally
 * banded by weight — see the shipping_rates migration's docblock,
 * including why "Shipping Rates" and "Shipping Rules" are implemented as
 * this one concept.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $shipping_zone_id
 * @property string $shipping_method_id
 * @property int $min_weight_grams
 * @property int|null $max_weight_grams
 * @property string $amount
 * @property string $currency_code
 * @property string $status
 * @property int $lock_version
 */
final class ShippingRate extends Model
{
    /** @use HasFactory<ShippingRateFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'shipping_zone_id',
        'shipping_method_id',
        'min_weight_grams',
        'max_weight_grams',
        'amount',
        'currency_code',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'min_weight_grams' => 'integer',
            'max_weight_grams' => 'integer',
            // `decimal:4` matches this table's own `decimal(12, 4)` column
            // and this platform's own established pattern for every other
            // money column (Payment, Promotion, Shipment) — without it,
            // Eloquent returns whatever the driver hands back verbatim,
            // which on SQLite's NUMERIC column affinity silently coerces a
            // whole-number amount like '60.0000' into a PHP int, crashing
            // Actions\CalculateShippingRateAction's own `string $amount`
            // contract (a real, live bug found and fixed this sprint —
            // MySQL's DECIMAL columns never exhibited this, which is why
            // it went unnoticed until a real quote was exercised against
            // this installation's real SQLite dev database).
            'amount' => 'decimal:4',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $rate): void {
            $rate->tenant_id ??= TenantId::DEFAULT;
            $rate->status ??= self::STATUS_ACTIVE;
            $rate->min_weight_grams ??= 0;
            $rate->currency_code = strtoupper((string) $rate->currency_code);
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $rate->lock_version immediately
            // after creation would otherwise see null instead of 1.
            $rate->lock_version ??= 1;
        });

        self::saving(function (self $rate): void {
            if ($rate->isDirty('currency_code')) {
                $rate->currency_code = strtoupper((string) $rate->currency_code);
            }
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ShippingRateFactory
     */
    protected static function newFactory(): Factory
    {
        return ShippingRateFactory::new();
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Whether $weightGrams falls within this rate's band: [min, max) —
     * unbounded above when max_weight_grams is null.
     */
    public function coversWeight(int $weightGrams): bool
    {
        if ($weightGrams < $this->min_weight_grams) {
            return false;
        }

        return $this->max_weight_grams === null || $weightGrams < $this->max_weight_grams;
    }

    /**
     * @return BelongsTo<ShippingZone, $this>
     */
    public function shippingZone(): BelongsTo
    {
        return $this->belongsTo(ShippingZone::class);
    }

    /**
     * @return BelongsTo<ShippingMethod, $this>
     */
    public function shippingMethod(): BelongsTo
    {
        return $this->belongsTo(ShippingMethod::class);
    }
}
