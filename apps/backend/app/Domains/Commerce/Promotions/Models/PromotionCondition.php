<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Models;

use Database\Factories\PromotionConditionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One eligibility-scoping rule within a Promotion's condition set — see
 * the promotion_conditions migration's docblock for the full evaluation
 * semantics (OR within a condition_type, AND across condition_types).
 *
 * @property string $id
 * @property string $promotion_id
 * @property string $condition_type
 * @property string|null $reference_id
 * @property string|null $numeric_value
 */
final class PromotionCondition extends Model
{
    /** @use HasFactory<PromotionConditionFactory> */
    use HasFactory, HasUuids, SoftDeletes;

    public const string TYPE_PRODUCT = 'product';

    public const string TYPE_CATEGORY = 'category';

    public const string TYPE_CUSTOMER = 'customer';

    public const string TYPE_STORE = 'store';

    public const string TYPE_MINIMUM_ORDER_AMOUNT = 'minimum_order_amount';

    protected $fillable = [
        'promotion_id',
        'condition_type',
        'reference_id',
        'numeric_value',
    ];

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return PromotionConditionFactory
     */
    protected static function newFactory(): Factory
    {
        return PromotionConditionFactory::new();
    }

    /**
     * @return BelongsTo<Promotion, $this>
     */
    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }
}
