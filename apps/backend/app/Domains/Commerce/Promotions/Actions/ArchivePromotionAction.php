<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Audit\AuditLogger;
use App\Domains\Commerce\Promotions\Models\Promotion;
use Illuminate\Support\Facades\DB;

/**
 * Transitions a Promotion to DATA:LIFECYCLE's Archived state — an
 * intentional, recorded action, distinct from deletion
 * (DeletePromotionAction). An archived promotion is excluded from
 * Actions\EvaluatePromotionsAction's eligibility scan just like an expired
 * schedule window.
 */
final readonly class ArchivePromotionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Promotion $promotion, int $expectedVersion, ?string $actorId): Promotion
    {
        return DB::transaction(function () use ($promotion, $expectedVersion, $actorId) {
            $promotion->assertVersionMatches($expectedVersion);

            $previousStatus = $promotion->status;
            $promotion->status = Promotion::STATUS_ARCHIVED;
            $promotion->save();

            $this->auditLogger->log(
                action: 'promotion.archived',
                actorId: $actorId,
                targetType: Promotion::class,
                targetId: $promotion->id,
                before: ['status' => $previousStatus],
                after: ['status' => $promotion->status],
            );

            return $promotion;
        });
    }
}
