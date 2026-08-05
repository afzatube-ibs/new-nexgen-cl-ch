<?php

declare(strict_types=1);

use App\Domains\Operations\Shipping\Audit\AuditLog;
use App\Domains\Operations\Shipping\Models\ShippingMethod;
use App\Domains\Operations\Shipping\Models\ShippingRate;

function shippingMethodPayload(array $overrides = []): array
{
    return array_merge([
        'code' => 'standard',
        'name' => 'Standard Shipping',
        'description' => '5-7 business days',
    ], $overrides);
}

it('denies listing shipping methods without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/shipping-methods')
        ->assertStatus(403);
});

it('creates a shipping method given the manage permission, auditing it', function () {
    $caller = userWithPermissions(['shipping.methods.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping-methods', shippingMethodPayload());

    $response->assertCreated()
        ->assertJsonPath('data.code', 'standard')
        ->assertJsonPath('data.providerCode', null)
        ->assertJsonPath('data.version', 1);

    expect(ShippingMethod::query()->where('code', 'standard')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'shipping_method.created')->count())->toBe(1);
});

it('accepts a provider_code naming a registered courier', function () {
    $caller = userWithPermissions(['shipping.methods.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping-methods', shippingMethodPayload([
        'code' => 'steadfast-standard',
        'provider_code' => 'steadfast',
    ]));

    $response->assertCreated()->assertJsonPath('data.providerCode', 'steadfast');
});

it('rejects a duplicate shipping method code', function () {
    $caller = userWithPermissions(['shipping.methods.manage']);
    ShippingMethod::factory()->create(['code' => 'standard']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/shipping-methods', shippingMethodPayload())
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('updates a shipping method when the expected version matches', function () {
    $caller = userWithPermissions(['shipping.methods.manage']);
    $method = ShippingMethod::factory()->create(['name' => 'Original Name']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/shipping-methods/{$method->id}", [
        'name' => 'Updated Name',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Updated Name')->assertJsonPath('data.version', 2);
});

it('rejects a shipping method update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['shipping.methods.manage']);
    $method = ShippingMethod::factory()->create();
    $method->update(['name' => 'Already changed once']);

    $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/shipping-methods/{$method->id}", [
        'name' => 'Racing update',
        'expected_version' => 1,
    ])->assertStatus(409);
});

it('archives a shipping method', function () {
    $caller = userWithPermissions(['shipping.methods.manage']);
    $method = ShippingMethod::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/shipping-methods/{$method->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
});

it('deletes a shipping method with no dependent shipping rates', function () {
    $caller = userWithPermissions(['shipping.methods.manage']);
    $method = ShippingMethod::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/shipping-methods/{$method->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect(AuditLog::query()->where('action', 'shipping_method.deleted')->count())->toBe(1);
});

it('refuses to delete a shipping method still referenced by a shipping rate', function () {
    $caller = userWithPermissions(['shipping.methods.manage']);
    $method = ShippingMethod::factory()->create();
    ShippingRate::factory()->create(['shipping_method_id' => $method->id]);

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/shipping-methods/{$method->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
    expect(ShippingMethod::query()->find($method->id))->not->toBeNull();
});
