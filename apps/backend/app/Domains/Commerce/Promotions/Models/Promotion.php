<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Models;

use App\Domains\Commerce\Promotions\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Carbon\CarbonImmutable;
use Database\Factories\PromotionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * MODULE:PROMOTIONS' aggregate root — see the promotions migration's
 * docblock for the full field-by-field rationale, including why "Buy X
 * Get Y" lives directly on this row rather than in PromotionCondition, and
 * why usage counting never spans both this aggregate and Coupon at once.
 *
 * Future extension points: the `discount_type` enum below is the seam
 * Loyalty, Gift Cards, and Vouchers are expected to extend through (new
 * type constants, no redesign) — see this module's Future Extension
 * Points entry in the master plan.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string|null $description
 * @property string $discount_type
 * @property string|null $discount_value
 * @property string|null $currency_code
 * @property int|null $buy_x_quantity
 * @property string|null $buy_x_target_type
 * @property string|null $buy_x_target_id
 * @property int|null $get_y_quantity
 * @property string|null $get_y_target_type
 * @property string|null $get_y_target_id
 * @property string|null $get_y_discount_percentage
 * @property bool $is_stackable
 * @property int $priority
 * @property bool $requires_coupon
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property int|null $usage_limit_global
 * @property int $usage_count_global
 * @property int|null $usage_limit_per_customer
 * @property string $status
 * @property int $lock_version
 */
final class Promotion extends Model
{
    /** @use HasFactory<PromotionFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    public const string TYPE_PERCENTAGE = 'percentage';

    public const string TYPE_FIXED_AMOUNT = 'fixed_amount';

    public const string TYPE_BUY_X_GET_Y = 'buy_x_get_y';

    public const string TYPE_FREE_SHIPPING = 'free_shipping';

    public const string TARGET_PRODUCT = 'product';

    public const string TARGET_CATEGORY = 'category';

    protected $fillable = [
        'name',
        'description',
        'discount_type',
        'discount_value',
        'currency_code',
        'buy_x_quantity',
        'buy_x_target_type',
        'buy_x_target_id',
        'get_y_quantity',
        'get_y_target_type',
        'get_y_target_id',
        'get_y_discount_percentage',
        'is_stackable',
        'priority',
        'requires_coupon',
        'starts_at',
        'ends_at',
        'usage_limit_global',
        'usage_limit_per_customer',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'discount_value' => 'decimal:4',
            'get_y_discount_percentage' => 'decimal:2',
            'is_stackable' => 'boolean',
            'requires_coupon' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $promotion): void {
            $promotion->tenant_id ??= TenantId::DEFAULT;
            $promotion->status ??= self::STATUS_ACTIVE;
            $promotion->is_stackable ??= false;
            $promotion->priority ??= 0;
            $promotion->requires_coupon ??= false;
            if ($promotion->currency_code !== null) {
                $promotion->currency_code = strtoupper((string) $promotion->currency_code);
            }
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $promotion->lock_version
            // immediately after creation would otherwise see null instead
            // of 1.
            $promotion->lock_version ??= 1;
        });

        self::saving(function (self $promotion): void {
            if ($promotion->isDirty('currency_code') && $promotion->currency_code !== null) {
                $promotion->currency_code = strtoupper((string) $promotion->currency_code);
            }
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return PromotionFactory
     */
    protected static function newFactory(): Factory
    {
        return PromotionFactory::new();
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * "Promotion scheduling": true when either bound is unset (open-ended)
     * or the current moment falls within both — mirrors Pricing's
     * PriceListEntry::isSaleActive() schedule-window logic exactly.
     */
    public function isWithinSchedule(): bool
    {
        $now = CarbonImmutable::now();

        if ($this->starts_at !== null && $now->lt($this->starts_at)) {
            return false;
        }

        if ($this->ends_at !== null && $now->gt($this->ends_at)) {
            return false;
        }

        return true;
    }

    public function hasReachedGlobalUsageLimit(): bool
    {
        return $this->usage_limit_global !== null && $this->usage_count_global >= $this->usage_limit_global;
    }

    public function touchAggregateVersion(): void
    {
        $this->lock_version++;
        $this->save();
    }

    /**
     * @return HasMany<PromotionCondition, $this>
     */
    public function conditions(): HasMany
    {
        return $this->hasMany(PromotionCondition::class);
    }

    /**
     * @return HasMany<Coupon, $this>
     */
    public function coupons(): HasMany
    {
        return $this->hasMany(Coupon::class);
    }
}
