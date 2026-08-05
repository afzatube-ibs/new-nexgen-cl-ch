<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Checkout\Audit\AuditLog;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;

it('denies recovering a session without the manage permission', function () {
    $caller = userWithPermissions(['checkout.sessions.view']);
    $session = CheckoutSession::factory()->expired()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/recover")
        ->assertStatus(403);
});

it('recovers an expired session into a brand-new, live one with the same cart', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->expired()->create(['guest_email' => 'lost@example.test', 'guest_name' => 'Lost Cart']);
    $product = Product::factory()->active()->create();
    $session->items()->create(['product_id' => $product->id, 'sku' => $product->sku, 'product_name' => $product->name, 'quantity' => 2]);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/recover");

    $response->assertCreated()
        ->assertJsonPath('data.guestEmail', 'lost@example.test')
        ->assertJsonPath('data.status', 'open')
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.sku', strtoupper($product->sku));

    expect($response->json('data.id'))->not->toBe($session->id);
    expect(AuditLog::query()->where('action', 'checkout.recovered')->count())->toBe(1);
});

it('rejects recovering a session that is not expired', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->create(['status' => CheckoutSession::STATUS_OPEN]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/recover")
        ->assertStatus(422);
});

it('recovers a session whose expiry has merely passed, without waiting for the expire-sessions sweep', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    // Time-expired but never swept: status is still OPEN, not EXPIRED.
    $session = CheckoutSession::factory()->create([
        'status' => CheckoutSession::STATUS_OPEN,
        'expires_at' => now()->subMinute(),
    ]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/recover")
        ->assertCreated();
});
