<?php

declare(strict_types=1);

use App\Domains\Commerce\Promotions\Audit\AuditLog;
use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Commerce\Promotions\Models\PromotionCondition;
use Illuminate\Support\Str;

it('rejects adding a condition without the manage permission', function () {
    $caller = userWithPermissions(['promotions.promotions.view']);
    $promotion = Promotion::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/promotions/{$promotion->id}/conditions", [
            'condition_type' => PromotionCondition::TYPE_PRODUCT,
            'reference_id' => (string) Str::uuid(),
            'expected_version' => 1,
        ])
        ->assertStatus(403);
});

it('adds a condition, bumping the parent promotion version, auditing it', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/promotions/{$promotion->id}/conditions", [
        'condition_type' => PromotionCondition::TYPE_PRODUCT,
        'reference_id' => (string) Str::uuid(),
        'expected_version' => 1,
    ]);

    $response->assertCreated()->assertJsonPath('data.conditionType', 'product');
    expect($promotion->fresh()->lock_version)->toBe(2);
    expect(AuditLog::query()->where('action', 'promotion.condition_added')->count())->toBe(1);
});

it('rejects a product condition without a reference_id', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/promotions/{$promotion->id}/conditions", [
            'condition_type' => PromotionCondition::TYPE_PRODUCT,
            'expected_version' => 1,
        ])
        ->assertStatus(422);
});

it('rejects a minimum-order-amount condition without a numeric_value', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/promotions/{$promotion->id}/conditions", [
            'condition_type' => PromotionCondition::TYPE_MINIMUM_ORDER_AMOUNT,
            'expected_version' => 1,
        ])
        ->assertStatus(422);
});

it('rejects adding a condition with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->create();
    $promotion->update(['name' => 'Already changed once']);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/promotions/{$promotion->id}/conditions", [
            'condition_type' => PromotionCondition::TYPE_PRODUCT,
            'reference_id' => (string) Str::uuid(),
            'expected_version' => 1,
        ])
        ->assertStatus(409);
});

it('updates a condition, bumping the parent promotion version', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->create();
    $condition = $promotion->conditions()->create(['condition_type' => PromotionCondition::TYPE_PRODUCT, 'reference_id' => (string) Str::uuid()]);

    $newReferenceId = (string) Str::uuid();
    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/promotions/{$promotion->id}/conditions/{$condition->id}", [
        'reference_id' => $newReferenceId,
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.referenceId', $newReferenceId);
    expect($promotion->fresh()->lock_version)->toBe(2);
});

it('deletes a condition, bumping the parent promotion version', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->create();
    $condition = $promotion->conditions()->create(['condition_type' => PromotionCondition::TYPE_PRODUCT, 'reference_id' => (string) Str::uuid()]);

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/promotions/{$promotion->id}/conditions/{$condition->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect(PromotionCondition::query()->find($condition->id))->toBeNull();
    expect($promotion->fresh()->lock_version)->toBe(2);
    expect(AuditLog::query()->where('action', 'promotion.condition_deleted')->count())->toBe(1);
});
