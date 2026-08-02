<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Audit\AuditLog;
use App\Domains\Commerce\Catalog\Models\Brand;

it('denies listing brands without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/brands')
        ->assertStatus(403);
});

it('lists brands for a caller with the view permission', function () {
    $caller = userWithPermissions(['catalog.brands.view']);
    Brand::factory()->count(3)->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/brands');

    $response->assertOk();
    expect($response->json('meta.total'))->toBe(3);
});

it('creates a brand given the manage permission, generating a slug and auditing it', function () {
    $caller = userWithPermissions(['catalog.brands.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/brands', ['name' => 'Acme Corp']);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Acme Corp')
        ->assertJsonPath('data.slug', 'acme-corp')
        ->assertJsonPath('data.version', 1);

    expect(AuditLog::query()->where('action', 'brand.created')->count())->toBe(1);
});

it('rejects creating a brand without the manage permission', function () {
    $caller = userWithPermissions(['catalog.brands.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/brands', ['name' => 'Acme Corp'])
        ->assertStatus(403);
});

it('updates a brand when the expected version matches', function () {
    $caller = userWithPermissions(['catalog.brands.manage']);
    $brand = Brand::factory()->create(['name' => 'Original']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/brands/{$brand->id}", [
        'name' => 'Renamed',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Renamed')->assertJsonPath('data.version', 2);
});

it('rejects an update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['catalog.brands.manage']);
    $brand = Brand::factory()->create();
    $brand->update(['name' => 'Already changed']);

    $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/brands/{$brand->id}", ['name' => 'Racing update', 'expected_version' => 1])
        ->assertStatus(409)
        ->assertJsonPath('error.type', 'conflict');
});

it('archives a brand', function () {
    $caller = userWithPermissions(['catalog.brands.manage']);
    $brand = Brand::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/brands/{$brand->id}/archive", ['expected_version' => 1]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
});

it('deletes a brand', function () {
    $caller = userWithPermissions(['catalog.brands.manage']);
    $brand = Brand::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/brands/{$brand->id}", ['expected_version' => 1])
        ->assertStatus(204);

    expect(Brand::query()->find($brand->id))->toBeNull();
});

it('restores a deleted brand', function () {
    $caller = userWithPermissions(['catalog.brands.manage']);
    $brand = Brand::factory()->create();
    $brand->delete();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/brands/{$brand->id}/restore");

    $response->assertOk()->assertJsonPath('data.id', $brand->id);
    expect(Brand::query()->find($brand->id))->not->toBeNull();
    expect(AuditLog::query()->where('action', 'brand.restored')->count())->toBe(1);
});
