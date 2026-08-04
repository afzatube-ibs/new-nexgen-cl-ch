<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Audit\AuditLogger;
use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Commerce\Promotions\Models\PromotionCondition;
use Illuminate\Support\Facades\DB;

/**
 * Adds an eligibility condition to a Promotion. Requires the promotion's
 * current `expected_version` — conditions are versioned through the
 * aggregate root, not the condition row itself, mirroring Customers'
 * AddCustomerAddressAction exactly (see that class's docblock).
 */
final readonly class AddPromotionConditionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(Promotion $promotion, array $attributes, int $expectedVersion, ?string $actorId): PromotionCondition
    {
        return DB::transaction(function () use ($promotion, $attributes, $expectedVersion, $actorId) {
            $promotion->assertVersionMatches($expectedVersion);

            $condition = $promotion->conditions()->create([
                'condition_type' => $attributes['condition_type'],
                'reference_id' => $attributes['reference_id'] ?? null,
                'numeric_value' => $attributes['numeric_value'] ?? null,
            ]);

            $promotion->touchAggregateVersion();

            $this->auditLogger->log(
                action: 'promotion.condition_added',
                actorId: $actorId,
                targetType: PromotionCondition::class,
                targetId: $condition->id,
                after: $condition->only(['promotion_id', 'condition_type', 'reference_id', 'numeric_value']),
            );

            return $condition;
        });
    }
}
