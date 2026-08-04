<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Audit\AuditLogger;
use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Commerce\Promotions\Models\PromotionCondition;
use Illuminate\Support\Facades\DB;

final readonly class DeletePromotionConditionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Promotion $promotion, PromotionCondition $condition, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($promotion, $condition, $expectedVersion, $actorId) {
            $promotion->assertVersionMatches($expectedVersion);

            $before = $condition->only(['promotion_id', 'condition_type', 'reference_id', 'numeric_value']);
            $condition->delete();

            $promotion->touchAggregateVersion();

            $this->auditLogger->log(
                action: 'promotion.condition_deleted',
                actorId: $actorId,
                targetType: PromotionCondition::class,
                targetId: $condition->id,
                before: $before,
            );
        });
    }
}
