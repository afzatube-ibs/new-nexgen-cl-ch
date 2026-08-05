<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Checkout\Audit\AuditLog;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;

function checkoutStartedSession(array $overrides = []): CheckoutSession
{
    return CheckoutSession::factory()->create($overrides);
}

it('denies adding an item without the manage permission', function () {
    $caller = userWithPermissions(['checkout.sessions.view']);
    $session = checkoutStartedSession();
    $product = Product::factory()->active()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/items", [
            'product_id' => $product->id,
            'quantity' => 1,
            'expected_version' => 1,
        ])
        ->assertStatus(403);
});

it('adds an item to the cart, snapshotting product identity, auditing it', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = checkoutStartedSession();
    $product = Product::factory()->active()->create(['name' => 'Widget']);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/items", [
        'product_id' => $product->id,
        'quantity' => 2,
        'expected_version' => 1,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.sku', strtoupper($product->sku))
        ->assertJsonPath('data.productName', 'Widget')
        ->assertJsonPath('data.quantity', 2);

    expect($session->fresh()->lock_version)->toBe(2);
    expect($session->fresh()->status)->toBe(CheckoutSession::STATUS_OPEN);
    expect(AuditLog::query()->where('action', 'checkout.item_added')->count())->toBe(1);
});

it('rejects adding an inactive product', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = checkoutStartedSession();
    $product = Product::factory()->create(); // draft by default

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/items", [
            'product_id' => $product->id,
            'quantity' => 1,
            'expected_version' => 1,
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('merges quantity when the same product is added twice', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = checkoutStartedSession();
    $product = Product::factory()->active()->create();

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/items", [
        'product_id' => $product->id,
        'quantity' => 2,
        'expected_version' => 1,
    ])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/items", [
        'product_id' => $product->id,
        'quantity' => 3,
        'expected_version' => 2,
    ]);

    $response->assertCreated()->assertJsonPath('data.quantity', 5);
    expect($session->items()->count())->toBe(1);
});

it('resets a reviewed session back to open when an item is added', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->reviewed()->create();
    $product = Product::factory()->active()->create();

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/items", [
        'product_id' => $product->id,
        'quantity' => 1,
        'expected_version' => 1,
    ])->assertCreated();

    expect($session->fresh()->status)->toBe(CheckoutSession::STATUS_OPEN);
    expect($session->fresh()->grand_total)->toBeNull();
});

it('rejects adding an item with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = checkoutStartedSession();
    $session->update(['coupon_code' => 'X']); // now at version 2
    $product = Product::factory()->active()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/items", [
            'product_id' => $product->id,
            'quantity' => 1,
            'expected_version' => 1,
        ])
        ->assertStatus(409)
        ->assertJsonPath('error.type', 'conflict');
});

it('updates an item quantity', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = checkoutStartedSession();
    $product = Product::factory()->active()->create();
    $item = $session->items()->create([
        'product_id' => $product->id,
        'sku' => $product->sku,
        'product_name' => $product->name,
        'quantity' => 1,
    ]);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/checkout/sessions/{$session->id}/items/{$item->id}", [
        'quantity' => 5,
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.quantity', 5);
});

it('removes an item from the cart', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = checkoutStartedSession();
    $product = Product::factory()->active()->create();
    $item = $session->items()->create([
        'product_id' => $product->id,
        'sku' => $product->sku,
        'product_name' => $product->name,
        'quantity' => 1,
    ]);

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/checkout/sessions/{$session->id}/items/{$item->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect($session->items()->count())->toBe(0);
    expect(AuditLog::query()->where('action', 'checkout.item_removed')->count())->toBe(1);
});

it('rejects mutating items on an expired session', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->expired()->create();
    $product = Product::factory()->active()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/items", [
            'product_id' => $product->id,
            'quantity' => 1,
            'expected_version' => 1,
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});
