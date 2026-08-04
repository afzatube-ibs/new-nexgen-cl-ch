<?php

declare(strict_types=1);

use App\Domains\Commerce\Promotions\Audit\AuditLog;
use App\Domains\Commerce\Promotions\Models\Coupon;
use App\Domains\Commerce\Promotions\Models\Promotion;

it('denies creating a coupon without the manage permission', function () {
    $caller = userWithPermissions(['promotions.coupons.view']);
    $promotion = Promotion::factory()->requiresCoupon()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/promotions/{$promotion->id}/coupons", ['code' => 'SAVE10'])
        ->assertStatus(403);
});

it('creates a coupon given the manage permission, normalizing the code to uppercase, auditing it', function () {
    $caller = userWithPermissions(['promotions.coupons.manage']);
    $promotion = Promotion::factory()->requiresCoupon()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/promotions/{$promotion->id}/coupons", [
        'code' => 'save10',
        'usage_limit_global' => 100,
    ]);

    $response->assertCreated()->assertJsonPath('data.code', 'SAVE10')->assertJsonPath('data.version', 1);
    expect(Coupon::query()->where('code', 'SAVE10')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'coupon.created')->count())->toBe(1);
});

it('rejects a duplicate coupon code', function () {
    $caller = userWithPermissions(['promotions.coupons.manage']);
    $promotion = Promotion::factory()->requiresCoupon()->create();
    Coupon::factory()->create(['promotion_id' => $promotion->id, 'code' => 'SAVE10']);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/promotions/{$promotion->id}/coupons", ['code' => 'SAVE10'])
        ->assertStatus(422);
});

it('updates a coupon when the expected version matches', function () {
    $caller = userWithPermissions(['promotions.coupons.manage']);
    $promotion = Promotion::factory()->requiresCoupon()->create();
    $coupon = Coupon::factory()->create(['promotion_id' => $promotion->id]);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/promotions/{$promotion->id}/coupons/{$coupon->id}", [
        'usage_limit_global' => 50,
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.usageLimitGlobal', 50)->assertJsonPath('data.version', 2);
});

it('rejects a coupon update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['promotions.coupons.manage']);
    $promotion = Promotion::factory()->requiresCoupon()->create();
    $coupon = Coupon::factory()->create(['promotion_id' => $promotion->id]);
    $coupon->update(['usage_limit_global' => 10]);

    $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/promotions/{$promotion->id}/coupons/{$coupon->id}", [
        'usage_limit_global' => 20,
        'expected_version' => 1,
    ])->assertStatus(409);
});

it('archives a coupon', function () {
    $caller = userWithPermissions(['promotions.coupons.manage']);
    $promotion = Promotion::factory()->requiresCoupon()->create();
    $coupon = Coupon::factory()->create(['promotion_id' => $promotion->id]);

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/promotions/{$promotion->id}/coupons/{$coupon->id}/archive", [
        'expected_version' => 1,
    ])->assertOk()->assertJsonPath('data.status', 'archived');
});

it('deletes a coupon', function () {
    $caller = userWithPermissions(['promotions.coupons.manage']);
    $promotion = Promotion::factory()->requiresCoupon()->create();
    $coupon = Coupon::factory()->create(['promotion_id' => $promotion->id]);

    $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/promotions/{$promotion->id}/coupons/{$coupon->id}", [
        'expected_version' => 1,
    ])->assertStatus(204);

    expect(Coupon::query()->find($coupon->id))->toBeNull();
    expect(AuditLog::query()->where('action', 'coupon.deleted')->count())->toBe(1);
});
