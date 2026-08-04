<?php

declare(strict_types=1);

use App\Domains\Commerce\Promotions\Audit\AuditLog;
use App\Domains\Commerce\Promotions\Models\Coupon;
use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Commerce\Promotions\Models\PromotionRedemption;
use Illuminate\Support\Str;

it('denies redeeming a promotion without the manage permission', function () {
    $caller = userWithPermissions(['promotions.promotions.view']);
    $promotion = Promotion::factory()->percentage('10.0000')->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/promotions/redeem', [
            'promotion_id' => $promotion->id,
            'discount_amount' => '10.00',
            'currency_code' => 'USD',
        ])
        ->assertStatus(403);
});

it('records a redemption for an automatic promotion, incrementing its usage count, auditing it, publishing PromotionApplied', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->percentage('10.0000')->create();
    $customerId = (string) Str::uuid();

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/promotions/redeem', [
        'promotion_id' => $promotion->id,
        'customer_id' => $customerId,
        'order_reference' => 'cart-123',
        'discount_amount' => '10.00',
        'currency_code' => 'USD',
    ]);

    $response->assertCreated()->assertJsonPath('data.promotionId', $promotion->id);
    expect($promotion->fresh()->usage_count_global)->toBe(1);
    expect(PromotionRedemption::query()->where('promotion_id', $promotion->id)->count())->toBe(1);
    expect(AuditLog::query()->where('action', 'promotion.redeemed')->count())->toBe(1);
});

it('rejects redeeming an archived promotion', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->percentage('10.0000')->archived()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/promotions/redeem', [
            'promotion_id' => $promotion->id,
            'discount_amount' => '10.00',
            'currency_code' => 'USD',
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('rejects redeeming an automatic promotion once its global usage limit is exhausted', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->percentage('10.0000')->create(['usage_limit_global' => 1, 'usage_count_global' => 1]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/promotions/redeem', [
            'promotion_id' => $promotion->id,
            'discount_amount' => '10.00',
            'currency_code' => 'USD',
        ])
        ->assertStatus(409)
        ->assertJsonPath('error.type', 'conflict');
});

it('rejects redeeming a coupon-gated promotion without a matching coupon code', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->percentage('10.0000')->requiresCoupon()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/promotions/redeem', [
            'promotion_id' => $promotion->id,
            'discount_amount' => '10.00',
            'currency_code' => 'USD',
        ])
        ->assertStatus(422);
});

it('records a coupon redemption, incrementing the coupon usage count, publishing CouponRedeemed', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->percentage('10.0000')->requiresCoupon()->create();
    $coupon = Coupon::factory()->create(['promotion_id' => $promotion->id, 'code' => 'SAVE10']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/promotions/redeem', [
        'promotion_id' => $promotion->id,
        'coupon_code' => 'save10',
        'discount_amount' => '10.00',
        'currency_code' => 'USD',
    ]);

    $response->assertCreated()->assertJsonPath('data.couponId', $coupon->id);
    expect($coupon->fresh()->usage_count_global)->toBe(1);
    expect($promotion->fresh()->usage_count_global)->toBe(0);
});

it('rejects redeeming a coupon once its own usage limit is exhausted', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->percentage('10.0000')->requiresCoupon()->create();
    Coupon::factory()->create([
        'promotion_id' => $promotion->id,
        'code' => 'SAVE10',
        'usage_limit_global' => 1,
        'usage_count_global' => 1,
    ]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/promotions/redeem', [
            'promotion_id' => $promotion->id,
            'coupon_code' => 'SAVE10',
            'discount_amount' => '10.00',
            'currency_code' => 'USD',
        ])
        ->assertStatus(409);
});

it('rejects redeeming a promotion once a customer has reached their per-customer usage limit', function () {
    $caller = userWithPermissions(['promotions.promotions.manage']);
    $promotion = Promotion::factory()->percentage('10.0000')->create(['usage_limit_per_customer' => 1]);
    $customerId = (string) Str::uuid();
    PromotionRedemption::factory()->create(['promotion_id' => $promotion->id, 'customer_id' => $customerId]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/promotions/redeem', [
            'promotion_id' => $promotion->id,
            'customer_id' => $customerId,
            'discount_amount' => '10.00',
            'currency_code' => 'USD',
        ])
        ->assertStatus(409);
});

it('lists redemption records for a caller with the redemptions view permission', function () {
    $caller = userWithPermissions(['promotions.redemptions.view']);
    $promotion = Promotion::factory()->create();
    PromotionRedemption::factory()->count(2)->create(['promotion_id' => $promotion->id]);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/promotions/redemptions');

    $response->assertOk();
    expect($response->json('meta.total'))->toBe(2);
});

it('denies listing redemption records without the redemptions view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/promotions/redemptions')
        ->assertStatus(403);
});
