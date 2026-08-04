<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Audit\AuditLogger;
use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Commerce\Promotions\Models\PromotionCondition;
use Illuminate\Support\Facades\DB;

final readonly class UpdatePromotionConditionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Promotion $promotion, PromotionCondition $condition, array $changes, int $expectedVersion, ?string $actorId): PromotionCondition
    {
        return DB::transaction(function () use ($promotion, $condition, $changes, $expectedVersion, $actorId) {
            $promotion->assertVersionMatches($expectedVersion);

            $before = $condition->only(['condition_type', 'reference_id', 'numeric_value']);
            $condition->fill($changes)->save();

            $promotion->touchAggregateVersion();

            $this->auditLogger->log(
                action: 'promotion.condition_updated',
                actorId: $actorId,
                targetType: PromotionCondition::class,
                targetId: $condition->id,
                before: $before,
                after: $condition->only(['condition_type', 'reference_id', 'numeric_value']),
            );

            return $condition;
        });
    }
}
