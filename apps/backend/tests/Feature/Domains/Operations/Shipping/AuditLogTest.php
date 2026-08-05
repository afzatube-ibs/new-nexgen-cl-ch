<?php

declare(strict_types=1);

it('denies listing the shipping audit log without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/shipping/audit-logs')
        ->assertStatus(403);
});

it('lists audit entries produced by shipping zone mutations', function () {
    $caller = userWithPermissions(['shipping.zones.manage', 'shipping.audit_log.view']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping-zones', [
        'name' => 'Dhaka Division',
        'country_code' => 'BD',
        'region' => 'Dhaka',
    ])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/shipping/audit-logs');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('action')->all())->toContain('shipping_zone.created');
});
