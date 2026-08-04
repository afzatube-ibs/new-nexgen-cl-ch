<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Audit\AuditLogger;
use App\Domains\Commerce\Promotions\Models\Promotion;
use Illuminate\Support\Facades\DB;

/**
 * Creates a Promotion. Conditions are added afterward via
 * AddPromotionConditionAction (mirrors Customers' Customer/CustomerAddress
 * split — a promotion can exist with zero conditions, meaning cart-wide
 * eligible, before any are attached).
 */
final readonly class CreatePromotionAction
{
    private const array TRACKED_FIELDS = [
        'name', 'discount_type', 'discount_value', 'currency_code',
        'buy_x_quantity', 'buy_x_target_type', 'buy_x_target_id',
        'get_y_quantity', 'get_y_target_type', 'get_y_target_id', 'get_y_discount_percentage',
        'is_stackable', 'priority', 'requires_coupon', 'starts_at', 'ends_at',
        'usage_limit_global', 'usage_limit_per_customer', 'status',
    ];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Promotion
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $promotion = Promotion::query()->create($attributes);

            $this->auditLogger->log(
                action: 'promotion.created',
                actorId: $actorId,
                targetType: Promotion::class,
                targetId: $promotion->id,
                after: $promotion->only(self::TRACKED_FIELDS),
            );

            return $promotion;
        });
    }
}
