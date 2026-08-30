<?php

declare(strict_types=1);

use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Orders\Models\OrderItem;
use App\Domains\Commerce\Reviews\Audit\AuditLog;
use App\Domains\Commerce\Reviews\Models\Review;
use Illuminate\Support\Str;

function reviewPayload(array $overrides = []): array
{
    return array_merge([
        'product_id' => (string) Str::uuid(),
        'rating' => 5,
        'title' => 'Great product',
        'body' => 'This exceeded my expectations in every way.',
    ], $overrides);
}

function asCustomer(Customer $customer): string
{
    return $customer->createToken('test-suite')->plainTextToken;
}

it('requires a real customer token, not a staff permission, to submit a review', function () {
    $staff = userWithPermissions(['reviews.reviews.view']);

    $this->actingAs($staff, 'sanctum')
        ->postJson('/api/v1/reviews', reviewPayload())
        ->assertStatus(401);
});

it('creates a review as pending, unverified, snapshotting the customer\'s name, and audits it', function () {
    $customer = Customer::factory()->create(['name' => 'Jamie Rivera']);
    $productId = (string) Str::uuid();

    $response = $this->withHeader('Authorization', 'Bearer '.asCustomer($customer))
        ->postJson('/api/v1/reviews', reviewPayload(['product_id' => $productId]));

    $response->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.verifiedPurchase', false)
        ->assertJsonPath('data.authorName', 'Jamie Rivera')
        ->assertJsonPath('data.productId', $productId)
        ->assertJsonPath('data.version', 1);

    $reviewId = $response->json('data.id');
    expect(Review::query()->find($reviewId))->not->toBeNull();
    expect(AuditLog::query()->where('action', 'review.submitted')->count())->toBe(1);
});

it('marks a review verified_purchase when the customer genuinely bought the product', function () {
    $customer = Customer::factory()->create();
    $productId = (string) Str::uuid();

    $order = Order::factory()->confirmed()->create(['customer_id' => $customer->id]);
    OrderItem::factory()->create(['order_id' => $order->id, 'product_id' => $productId]);

    $response = $this->withHeader('Authorization', 'Bearer '.asCustomer($customer))
        ->postJson('/api/v1/reviews', reviewPayload(['product_id' => $productId]));

    $response->assertCreated()
        ->assertJsonPath('data.verifiedPurchase', true)
        ->assertJsonPath('data.orderId', $order->id);
});

it('never marks verified_purchase for a pending or cancelled order', function () {
    $customer = Customer::factory()->create();
    $productId = (string) Str::uuid();

    $pendingOrder = Order::factory()->create(['customer_id' => $customer->id]);
    OrderItem::factory()->create(['order_id' => $pendingOrder->id, 'product_id' => $productId]);

    $response = $this->withHeader('Authorization', 'Bearer '.asCustomer($customer))
        ->postJson('/api/v1/reviews', reviewPayload(['product_id' => $productId]));

    $response->assertCreated()->assertJsonPath('data.verifiedPurchase', false);
});

it('rejects a second review from the same customer on the same product as a 409 conflict', function () {
    $customer = Customer::factory()->create();
    $productId = (string) Str::uuid();
    $token = asCustomer($customer);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/reviews', reviewPayload(['product_id' => $productId]))
        ->assertCreated();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/reviews', reviewPayload(['product_id' => $productId]))
        ->assertStatus(409);
});

it('allows the same customer to review two different products', function () {
    $customer = Customer::factory()->create();
    $token = asCustomer($customer);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/reviews', reviewPayload())
        ->assertCreated();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/reviews', reviewPayload())
        ->assertCreated();
});

it('rejects a rating outside 1-5', function () {
    $customer = Customer::factory()->create();

    $this->withHeader('Authorization', 'Bearer '.asCustomer($customer))
        ->postJson('/api/v1/reviews', reviewPayload(['rating' => 6]))
        ->assertStatus(422);
});

it('rejects a body shorter than 10 characters', function () {
    $customer = Customer::factory()->create();

    $this->withHeader('Authorization', 'Bearer '.asCustomer($customer))
        ->postJson('/api/v1/reviews', reviewPayload(['body' => 'too short']))
        ->assertStatus(422);
});

it('allows a review with no title', function () {
    $customer = Customer::factory()->create();

    $this->withHeader('Authorization', 'Bearer '.asCustomer($customer))
        ->postJson('/api/v1/reviews', reviewPayload(['title' => null]))
        ->assertCreated()
        ->assertJsonPath('data.title', null);
});
