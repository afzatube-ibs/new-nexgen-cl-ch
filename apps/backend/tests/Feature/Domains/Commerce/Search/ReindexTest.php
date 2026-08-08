<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Audit\AuditLog;
use App\Domains\Commerce\Search\Models\ProductSearchIndex;

it('denies triggering a reindex without the manage permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/search/reindex')
        ->assertStatus(403);
});

it('rebuilds the entire index given the manage permission, and audits it', function () {
    $caller = userWithPermissions(['search.index.manage']);
    Product::factory()->active()->count(3)->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/search/reindex');

    $response->assertOk()->assertJsonPath('indexedCount', 3);
    expect(ProductSearchIndex::count())->toBe(3);
    expect(AuditLog::query()->where('action', 'search.index.rebuilt')->where('actor_id', $caller->id)->exists())->toBeTrue();
});
