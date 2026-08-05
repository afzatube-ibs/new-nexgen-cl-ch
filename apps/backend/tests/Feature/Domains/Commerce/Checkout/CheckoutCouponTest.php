<?php

declare(strict_types=1);

use App\Domains\Commerce\Checkout\Models\CheckoutSession;

it('denies applying a coupon without the manage permission', function () {
    $caller = userWithPermissions(['checkout.sessions.view']);
    $session = CheckoutSession::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/coupon", ['coupon_code' => 'SAVE10', 'expected_version' => 1])
        ->assertStatus(403);
});

it('applies a coupon code, normalizing it to uppercase', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/coupon", [
        'coupon_code' => 'save10',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.couponCode', 'SAVE10');
});

it('resets a reviewed session back to open when a coupon is applied', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->reviewed()->create();

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/coupon", [
        'coupon_code' => 'SAVE10',
        'expected_version' => 1,
    ])->assertOk();

    expect($session->fresh()->status)->toBe(CheckoutSession::STATUS_OPEN);
});

it('removes a coupon code', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->create(['coupon_code' => 'SAVE10']);

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/checkout/sessions/{$session->id}/coupon", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.couponCode', null);
});
