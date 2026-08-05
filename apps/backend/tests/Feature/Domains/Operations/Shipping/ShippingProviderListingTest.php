<?php

declare(strict_types=1);

it('denies listing shipping providers without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/shipping/providers')
        ->assertStatus(403);
});

it('lists every registered courier provider, including unavailable ones', function () {
    $caller = userWithPermissions(['shipping.providers.view']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/shipping/providers');

    $response->assertOk();
    $codes = collect($response->json('data'))->pluck('code')->all();

    expect($codes)->toContain('manual', 'steadfast', 'pathao', 'redx', 'paperfly', 'sundarban', 'ecourier');

    // Manual requires no credentials and is always available.
    $manual = collect($response->json('data'))->firstWhere('code', 'manual');
    expect($manual['available'])->toBeTrue();

    // Sundarban publishes no public API and is never reported available.
    $sundarban = collect($response->json('data'))->firstWhere('code', 'sundarban');
    expect($sundarban['available'])->toBeFalse();
});
