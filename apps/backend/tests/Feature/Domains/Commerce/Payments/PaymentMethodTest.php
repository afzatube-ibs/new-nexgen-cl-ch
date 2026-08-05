<?php

declare(strict_types=1);

it('lists only currently-available payment methods', function () {
    $caller = userWithPermissions(['payments.payments.view']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/payments/methods');

    $response->assertOk();
    $codes = array_column($response->json('data'), 'code');

    // Cash On Delivery and Bank Transfer with no configured account are
    // the two whose availability does not depend on external credentials
    // — Bank Transfer needs account details (not configured here), so
    // only Cash On Delivery is guaranteed available in this environment.
    expect($codes)->toContain('cod');
    expect($codes)->not->toContain('sslcommerz');
    expect($codes)->not->toContain('bkash');
    expect($codes)->not->toContain('nagad');
});

it('denies listing payment methods without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/payments/methods')
        ->assertStatus(403);
});
