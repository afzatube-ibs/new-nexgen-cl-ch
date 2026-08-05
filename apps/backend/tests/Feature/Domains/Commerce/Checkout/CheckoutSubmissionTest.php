<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Checkout\Audit\AuditLog;
use App\Domains\Commerce\Checkout\Models\CheckoutItem;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\StockReservation;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Pricing\Models\PriceList;
use App\Domains\Commerce\Promotions\Models\Promotion;

/**
 * @return array{product: Product, warehouse: Warehouse, stockItem: StockItem, session: CheckoutSession, item: CheckoutItem}
 */
function checkoutReadyForSubmission(array $overrides = []): array
{
    $quantity = $overrides['quantity'] ?? 2;
    $unitPrice = $overrides['unit_price'] ?? '20.00';
    $quantityOnHand = $overrides['quantity_on_hand'] ?? 10;

    $product = Product::factory()->active()->create();
    $warehouse = Warehouse::factory()->default()->create();
    $stockItem = StockItem::factory()->create([
        'warehouse_id' => $warehouse->id,
        'sku' => $product->sku,
        'quantity_on_hand' => $quantityOnHand,
        'quantity_reserved' => 0,
    ]);

    $priceList = PriceList::query()->where('currency_code', 'USD')->where('is_default', true)->first()
        ?? PriceList::factory()->default()->create(['currency_code' => 'USD']);
    $priceList->entries()->create(['sku' => $product->sku, 'base_price' => $unitPrice]);

    $subtotal = bcmul($unitPrice, (string) $quantity, 4);
    $shippingTotal = '5.0000';
    $grandTotal = bcadd($subtotal, $shippingTotal, 4);

    $address = [
        'recipient_name' => 'Jane Buyer', 'phone' => null, 'address_line1' => '1 Main St',
        'address_line2' => null, 'city' => 'Springfield', 'region' => null, 'postal_code' => null, 'country_code' => 'US',
    ];

    $sessionAttributes = array_merge([
        'status' => CheckoutSession::STATUS_REVIEWED,
        'billing_address' => $address,
        'shipping_address' => $address,
        'shipping_option_id' => 'standard',
        'shipping_total' => $shippingTotal,
        'subtotal' => $subtotal,
        'discount_total' => '0.0000',
        'tax_total' => '0.0000',
        'grand_total' => $grandTotal,
    ], $overrides['session'] ?? []);

    $session = CheckoutSession::factory()->create($sessionAttributes);

    $item = $session->items()->create([
        'product_id' => $product->id,
        'sku' => $product->sku,
        'product_name' => $product->name,
        'quantity' => $quantity,
        'unit_price' => $unitPrice,
        'tax_amount' => '0.0000',
    ]);

    return compact('product', 'warehouse', 'stockItem', 'session', 'item');
}

it('denies submitting without the manage permission', function () {
    $caller = userWithPermissions(['checkout.sessions.view']);
    ['session' => $session] = checkoutReadyForSubmission();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/submit", ['idempotency_key' => 'k-1', 'expected_version' => 1])
        ->assertStatus(403);
});

it('submits a guest checkout, creating a new Customer, reserving stock, and placing an Order', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    ['session' => $session, 'stockItem' => $stockItem] = checkoutReadyForSubmission([
        'session' => ['guest_email' => 'newguest@example.test', 'guest_name' => 'New Guest'],
    ]);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/submit", [
        'idempotency_key' => 'submit-key-1',
        'expected_version' => 1,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.customerEmail', 'newguest@example.test')
        ->assertJsonPath('data.grandTotal', '45.0000')
        ->assertJsonPath('data.status', 'pending');

    $session->refresh();
    expect($session->status)->toBe(CheckoutSession::STATUS_SUBMITTED);
    expect($session->order_id)->not->toBeNull();
    expect(Customer::query()->where('email', 'newguest@example.test')->exists())->toBeTrue();
    expect(StockReservation::query()->where('stock_item_id', $stockItem->id)->count())->toBe(1);
    expect($stockItem->fresh()->quantity_reserved)->toBe(2);
    expect(AuditLog::query()->where('action', 'checkout.submitted')->count())->toBe(1);
});

it('submits a guest checkout that reuses an existing Customer sharing the same email', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $existing = Customer::factory()->create(['email' => 'repeat-guest@example.test']);
    ['session' => $session] = checkoutReadyForSubmission([
        'session' => ['guest_email' => 'repeat-guest@example.test', 'guest_name' => 'Repeat Guest'],
    ]);

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/submit", [
        'idempotency_key' => 'submit-key-2',
        'expected_version' => 1,
    ])->assertCreated();

    expect(Customer::query()->where('email', 'repeat-guest@example.test')->count())->toBe(1);
    expect(Order::query()->where('customer_id', $existing->id)->exists())->toBeTrue();
});

it('submits a registered-customer checkout, attributing the Order to that customer', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $customer = Customer::factory()->create();
    ['session' => $session] = checkoutReadyForSubmission([
        'session' => ['customer_id' => $customer->id, 'guest_email' => null, 'guest_name' => null],
    ]);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/submit", [
        'idempotency_key' => 'submit-key-3',
        'expected_version' => 1,
    ]);

    $response->assertCreated()->assertJsonPath('data.customerId', $customer->id);
});

it('is idempotent: resubmitting an already-submitted session returns the same Order without side effects', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    ['session' => $session, 'stockItem' => $stockItem] = checkoutReadyForSubmission();

    $first = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/submit", [
        'idempotency_key' => 'idem-key',
        'expected_version' => 1,
    ]);
    $first->assertCreated();
    $orderId = $first->json('data.id');

    $second = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/submit", [
        'idempotency_key' => 'idem-key',
        'expected_version' => $session->fresh()->lock_version,
    ]);

    $second->assertOk()->assertJsonPath('data.id', $orderId);
    expect(Order::query()->count())->toBe(1);
    expect(StockReservation::query()->where('stock_item_id', $stockItem->id)->count())->toBe(1);
});

it('rejects submitting a session that has not been reviewed', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->create(['status' => CheckoutSession::STATUS_OPEN]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/submit", ['idempotency_key' => 'k', 'expected_version' => 1])
        ->assertStatus(422);
});

it('rejects submitting an expired session', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    ['session' => $session] = checkoutReadyForSubmission(['session' => ['expires_at' => now()->subMinute()]]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/submit", ['idempotency_key' => 'k', 'expected_version' => 1])
        ->assertStatus(422);
});

it('rejects a submission already in progress as a 409 conflict', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    ['session' => $session] = checkoutReadyForSubmission(['session' => ['status' => CheckoutSession::STATUS_SUBMITTING]]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/submit", ['idempotency_key' => 'k', 'expected_version' => 1])
        ->assertStatus(409);
});

it('rejects submitting with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    ['session' => $session] = checkoutReadyForSubmission();
    $session->update(['coupon_code' => 'X']); // now at version 2

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/submit", ['idempotency_key' => 'k', 'expected_version' => 1])
        ->assertStatus(409);
});

it('releases reservations and reverts the session to reviewed when stock is insufficient at submit time', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    ['session' => $session, 'stockItem' => $stockItem] = checkoutReadyForSubmission(['quantity' => 5, 'quantity_on_hand' => 2]);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/submit", [
        'idempotency_key' => 'k-fail',
        'expected_version' => 1,
    ]);

    $response->assertStatus(409);

    $session->refresh();
    expect($session->status)->toBe(CheckoutSession::STATUS_REVIEWED);
    expect($session->order_id)->toBeNull();
    expect(Order::query()->count())->toBe(0);
    expect(StockReservation::query()->where('stock_item_id', $stockItem->id)->count())->toBe(0);
    expect($stockItem->fresh()->quantity_reserved)->toBe(0);
    expect(AuditLog::query()->where('action', 'checkout.submission_failed')->count())->toBe(1);
});

it('redeems an automatic promotion at submission, recording it on the Order and incrementing usage', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $promotion = Promotion::factory()->percentage('10.0000')->create();
    ['session' => $session] = checkoutReadyForSubmission([
        'unit_price' => '50.00',
        'quantity' => 1,
        'session' => ['subtotal' => '50.0000', 'discount_total' => '5.0000', 'grand_total' => '50.0000'],
    ]);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/submit", [
        'idempotency_key' => 'k-promo',
        'expected_version' => 1,
    ]);

    $response->assertCreated()->assertJsonCount(1, 'data.discounts');
    expect($promotion->fresh()->usage_count_global)->toBe(1);
});
