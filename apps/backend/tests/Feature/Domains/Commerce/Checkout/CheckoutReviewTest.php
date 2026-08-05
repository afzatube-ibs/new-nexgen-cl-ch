<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Checkout\Audit\AuditLog;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Commerce\Pricing\Models\PriceList;
use App\Domains\Commerce\Promotions\Models\Promotion;

function checkoutPricedProduct(string $basePrice = '20.00'): Product
{
    $product = Product::factory()->active()->create();

    $priceList = PriceList::query()->where('currency_code', 'USD')->where('is_default', true)->first()
        ?? PriceList::factory()->default()->create(['currency_code' => 'USD']);

    $priceList->entries()->create(['sku' => $product->sku, 'base_price' => $basePrice]);

    return $product;
}

function checkoutSessionWithAddressesAndShipping(array $overrides = []): CheckoutSession
{
    return CheckoutSession::factory()->create(array_merge([
        'billing_address' => [
            'recipient_name' => 'Jane Buyer', 'phone' => null, 'address_line1' => '1 Main St',
            'address_line2' => null, 'city' => 'Springfield', 'region' => null, 'postal_code' => null, 'country_code' => 'US',
        ],
        'shipping_address' => [
            'recipient_name' => 'Jane Buyer', 'phone' => null, 'address_line1' => '1 Main St',
            'address_line2' => null, 'city' => 'Springfield', 'region' => null, 'postal_code' => null, 'country_code' => 'US',
        ],
        'shipping_option_id' => 'standard',
        'shipping_total' => '5.0000',
    ], $overrides));
}

it('denies reviewing a session without the manage permission', function () {
    $caller = userWithPermissions(['checkout.sessions.view']);
    $session = checkoutSessionWithAddressesAndShipping();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/review", ['expected_version' => 1])
        ->assertStatus(403);
});

it('rejects reviewing an empty cart', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = checkoutSessionWithAddressesAndShipping();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/review", ['expected_version' => 1])
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('rejects reviewing a cart with no billing/shipping address set', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->create();
    $product = checkoutPricedProduct();
    $session->items()->create(['product_id' => $product->id, 'sku' => $product->sku, 'product_name' => $product->name, 'quantity' => 1]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/review", ['expected_version' => 1])
        ->assertStatus(422);
});

it('rejects reviewing a cart with no shipping option selected', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = checkoutSessionWithAddressesAndShipping(['shipping_option_id' => null, 'shipping_total' => null]);
    $product = checkoutPricedProduct();
    $session->items()->create(['product_id' => $product->id, 'sku' => $product->sku, 'product_name' => $product->name, 'quantity' => 1]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/review", ['expected_version' => 1])
        ->assertStatus(422);
});

it('rejects reviewing a SKU with no resolvable price', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = checkoutSessionWithAddressesAndShipping();
    $product = Product::factory()->active()->create(); // no PriceListEntry created for this SKU
    $session->items()->create(['product_id' => $product->id, 'sku' => $product->sku, 'product_name' => $product->name, 'quantity' => 1]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/review", ['expected_version' => 1])
        ->assertStatus(422);
});

it('reviews a cart, resolving price and computing totals correctly, auditing it', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = checkoutSessionWithAddressesAndShipping();
    $product = checkoutPricedProduct('20.00');
    $session->items()->create(['product_id' => $product->id, 'sku' => $product->sku, 'product_name' => $product->name, 'quantity' => 3]);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/review", [
        'expected_version' => 1,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'reviewed')
        ->assertJsonPath('data.subtotal', '60.0000')
        ->assertJsonPath('data.taxTotal', '0.0000')
        ->assertJsonPath('data.discountTotal', '0.0000')
        ->assertJsonPath('data.shippingTotal', '5.0000')
        ->assertJsonPath('data.grandTotal', '65.0000')
        ->assertJsonPath('data.items.0.unitPrice', '20.0000');

    expect(AuditLog::query()->where('action', 'checkout.reviewed')->count())->toBe(1);
});

it('rejects reviewing with a coupon code that does not evaluate to an eligible promotion', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = checkoutSessionWithAddressesAndShipping(['coupon_code' => 'DOES-NOT-EXIST']);
    $product = checkoutPricedProduct();
    $session->items()->create(['product_id' => $product->id, 'sku' => $product->sku, 'product_name' => $product->name, 'quantity' => 1]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/checkout/sessions/{$session->id}/review", ['expected_version' => 1])
        ->assertStatus(422);
});

it('includes an automatic promotion\'s discount in the review totals', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    Promotion::factory()->percentage('10.0000')->create();

    $session = checkoutSessionWithAddressesAndShipping();
    $product = checkoutPricedProduct('50.00');
    $session->items()->create(['product_id' => $product->id, 'sku' => $product->sku, 'product_name' => $product->name, 'quantity' => 1]);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/checkout/sessions/{$session->id}/review", [
        'expected_version' => 1,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.discountTotal', '5.0000')
        ->assertJsonPath('data.grandTotal', '50.0000'); // 50 - 5 discount + 5 shipping
});
