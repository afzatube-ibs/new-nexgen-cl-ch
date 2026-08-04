<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Audit\AuditLogger;
use App\Domains\Commerce\Promotions\Models\Promotion;
use Illuminate\Support\Facades\DB;

final readonly class UpdatePromotionAction
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
     * @param  array<string, mixed>  $changes
     */
    public function execute(Promotion $promotion, array $changes, int $expectedVersion, ?string $actorId): Promotion
    {
        return DB::transaction(function () use ($promotion, $changes, $expectedVersion, $actorId) {
            $promotion->assertVersionMatches($expectedVersion);

            $before = $promotion->only(self::TRACKED_FIELDS);
            $promotion->fill($changes)->save();

            $this->auditLogger->log(
                action: 'promotion.updated',
                actorId: $actorId,
                targetType: Promotion::class,
                targetId: $promotion->id,
                before: $before,
                after: $promotion->only(self::TRACKED_FIELDS),
            );

            return $promotion;
        });
    }
}
