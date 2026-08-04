<?php

declare(strict_types=1);

use App\Domains\Commerce\Promotions\Audit\AuditLog;
use App\Domains\Commerce\Promotions\Models\Coupon;
use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Commerce\Promotions\Models\PromotionCondition;
use Illuminate\Support\Str;

function promotionsPromotionPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Summer Sale',
        'discount_type' => Promotion::TYPE_PERCENTAGE,
        'discount_value' => '15.0000',
    ], $overrides);
}

it('denies listing promotions without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/promotions')
        ->assertStatus(403)
        ->assertJsonPath('error.type', 'authorization_denied');
});

it('lists promotions, paginated, for a caller with the view permission', function () {
    $caller = userWithPermissions(['promotions.promotions.view']);
    Promotion::factory()->count(3)->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/promotions');

    $response->assertOk()->assertJsonStructure(['data', 'links', 'meta']);
    expect($response->json('meta.total'))->toBe(3);
});

it('creates a percentage promotion given the manage permission, auditing it', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/promotions', promotionsPromotionPayload());

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Summer Sale')
        ->assertJsonPath('data.discountType', 'percentage')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.version', 1);

    expect(Promotion::query()->where('name', 'Summer Sale')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'promotion.created')->count())->toBe(1);
});

it('rejects creating a promotion without the manage permission', function () {
    $caller = userWithPermissions(['promotions.promotions.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/promotions', promotionsPromotionPayload())
        ->assertStatus(403);
});

it('rejects a percentage promotion missing a discount_value', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/promotions', promotionsPromotionPayload(['discount_value' => null]))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('rejects a fixed-amount promotion missing a currency_code', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/promotions', promotionsPromotionPayload([
            'discount_type' => Promotion::TYPE_FIXED_AMOUNT,
            'discount_value' => '5.00',
        ]))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('creates a fixed-amount promotion given a currency_code', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/promotions', promotionsPromotionPayload([
        'discount_type' => Promotion::TYPE_FIXED_AMOUNT,
        'discount_value' => '5.00',
        'currency_code' => 'USD',
    ]));

    $response->assertCreated()->assertJsonPath('data.currencyCode', 'USD');
});

it('rejects a buy-X-get-Y promotion missing its required fields', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/promotions', promotionsPromotionPayload([
            'discount_type' => Promotion::TYPE_BUY_X_GET_Y,
            'discount_value' => null,
        ]))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('creates a free-shipping promotion without any discount_value', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/promotions', promotionsPromotionPayload([
        'discount_type' => Promotion::TYPE_FREE_SHIPPING,
        'discount_value' => null,
    ]));

    $response->assertCreated()->assertJsonPath('data.discountType', 'free_shipping');
});

it('updates a promotion when the expected version matches', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->create(['name' => 'Original Name']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/promotions/{$promotion->id}", [
        'name' => 'Updated Name',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Updated Name')->assertJsonPath('data.version', 2);
    expect(AuditLog::query()->where('action', 'promotion.updated')->count())->toBe(1);
});

it('rejects an update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->create();
    $promotion->update(['name' => 'Already changed once']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/promotions/{$promotion->id}", [
        'name' => 'Racing update',
        'expected_version' => 1,
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
});

it('archives a promotion', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/promotions/{$promotion->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
    expect($promotion->fresh()->isActive())->toBeFalse();
    expect(AuditLog::query()->where('action', 'promotion.archived')->count())->toBe(1);
});

it('deletes a promotion and its conditions and coupons together', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->requiresCoupon()->create();
    $condition = $promotion->conditions()->create(['condition_type' => 'product', 'reference_id' => (string) Str::uuid()]);
    $coupon = $promotion->coupons()->create(['code' => 'DEL-TEST']);

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/promotions/{$promotion->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect(Promotion::query()->find($promotion->id))->toBeNull();
    expect(PromotionCondition::withTrashed()->find($condition->id)->trashed())->toBeTrue();
    expect(Coupon::withTrashed()->find($coupon->id)->trashed())->toBeTrue();
    expect(AuditLog::query()->where('action', 'promotion.deleted')->count())->toBe(1);
});

it('returns 404, not a stack trace, for a nonexistent promotion', function () {
    $caller = userWithPermissions(['promotions.promotions.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/promotions/'.Str::uuid())
        ->assertStatus(404)
        ->assertJsonPath('error.type', 'not_found');
});
