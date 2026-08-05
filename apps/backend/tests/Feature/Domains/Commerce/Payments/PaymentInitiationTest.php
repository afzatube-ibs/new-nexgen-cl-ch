<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Payments\Audit\AuditLog;
use App\Domains\Commerce\Payments\Models\Payment;
use Illuminate\Support\Str;

it('denies initiating a payment without the manage permission', function () {
    $caller = userWithPermissions(['payments.payments.view']);
    $order = Order::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/payments', [
            'order_id' => $order->id,
            'gateway_code' => 'cod',
            'idempotency_key' => 'key-1',
        ])
        ->assertStatus(403);
});

it('is unauthenticated without a token', function () {
    $order = Order::factory()->create();

    $this->postJson('/api/v1/payments', [
        'order_id' => $order->id,
        'gateway_code' => 'cod',
        'idempotency_key' => 'key-1',
    ])->assertStatus(401);
});

it('initiates a Cash On Delivery payment as pending — no external gateway call, and not yet Confirmed', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $order = Order::factory()->create(['grand_total' => '150.0000', 'currency_code' => 'USD']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/payments', [
        'order_id' => $order->id,
        'gateway_code' => 'cod',
        'idempotency_key' => 'cod-key-1',
    ]);

    // COD Payment Lifecycle: Pending -> Confirmed -> Cancelled/Failed —
    // initiation only reaches Pending; cash has not been collected yet.
    // "Confirmed" (this aggregate's shared `captured` status) is a
    // separate, later, operator-driven step — see the capture test below.
    $response->assertCreated()
        ->assertJsonPath('data.orderId', $order->id)
        ->assertJsonPath('data.gatewayCode', 'cod')
        ->assertJsonPath('data.amount', '150.0000')
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.amountCaptured', '0.0000');

    expect(Payment::query()->where('order_id', $order->id)->count())->toBe(1);
    expect(AuditLog::query()->where('action', 'payment.initiated')->count())->toBe(1);
});

it('confirms a Cash On Delivery payment once cash is collected at delivery', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $order = Order::factory()->create(['grand_total' => '150.0000', 'currency_code' => 'USD']);

    $initiated = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/payments', [
        'order_id' => $order->id,
        'gateway_code' => 'cod',
        'idempotency_key' => 'cod-key-confirm',
    ])->json('data');

    $response = $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/payments/{$initiated['id']}/capture", ['expected_version' => $initiated['version']]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'captured')
        ->assertJsonPath('data.amountCaptured', '150.0000');

    expect(AuditLog::query()->where('action', 'payment.captured')->count())->toBe(1);
});

it('initiates a Bank Transfer payment, returning instructions and leaving it pending', function () {
    config(['payments.bank_transfer.bank_name' => 'Example Bank']);
    config(['payments.bank_transfer.account_name' => 'neXgen Store']);
    config(['payments.bank_transfer.account_number' => '1234567890']);

    $caller = userWithPermissions(['payments.payments.manage']);
    $order = Order::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/payments', [
        'order_id' => $order->id,
        'gateway_code' => 'bank_transfer',
        'idempotency_key' => 'bt-key-1',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.gatewayCode', 'bank_transfer');

    expect($response->json('data.instructions'))->not->toBeNull();
});

it('is idempotent: retrying with the same idempotency_key returns the existing payment, not a new one', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $order = Order::factory()->create();

    $first = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/payments', [
        'order_id' => $order->id,
        'gateway_code' => 'cod',
        'idempotency_key' => 'idem-key',
    ]);
    $first->assertCreated();
    $paymentId = $first->json('data.id');

    $second = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/payments', [
        'order_id' => $order->id,
        'gateway_code' => 'cod',
        'idempotency_key' => 'idem-key',
    ]);

    $second->assertOk()->assertJsonPath('data.id', $paymentId);
    expect(Payment::query()->count())->toBe(1);
});

it('rejects a second payment attempt while an active one already exists for the order (Duplicate Payment Protection)', function () {
    config(['payments.bank_transfer.bank_name' => 'Example Bank']);
    config(['payments.bank_transfer.account_name' => 'neXgen Store']);
    config(['payments.bank_transfer.account_number' => '1234567890']);

    $caller = userWithPermissions(['payments.payments.manage']);
    $order = Order::factory()->create();

    // Bank Transfer stays "pending" (no immediate capture), leaving it
    // active — a second, different gateway attempt against the same
    // order must be refused, not silently accepted as a parallel payment.
    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/payments', [
        'order_id' => $order->id,
        'gateway_code' => 'bank_transfer',
        'idempotency_key' => 'bt-key-2',
    ])->assertCreated();

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/payments', [
        'order_id' => $order->id,
        'gateway_code' => 'cod',
        'idempotency_key' => 'cod-key-2',
    ])->assertStatus(409);

    expect(Payment::query()->where('order_id', $order->id)->count())->toBe(1);
});

it('allows a new payment attempt against the same order once the prior one reached a terminal state', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $order = Order::factory()->create();

    $first = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/payments', [
        'order_id' => $order->id,
        'gateway_code' => 'cod',
        'idempotency_key' => 'cod-key-3',
    ]);
    $first->assertCreated();

    // Cancel the first attempt (a terminal state) — only then does the
    // order's "at most one active payment" slot free up.
    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/payments/{$first->json('data.id')}/cancel", [
        'reason' => 'Customer switched payment method.',
        'expected_version' => $first->json('data.version'),
    ])->assertOk();

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/payments', [
        'order_id' => $order->id,
        'gateway_code' => 'cod',
        'idempotency_key' => 'cod-key-4',
    ])->assertCreated();

    expect(Payment::query()->where('order_id', $order->id)->count())->toBe(2);
});

it('rejects initiating a payment against a gateway that is not available in this installation', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $order = Order::factory()->create();

    // sslcommerz has no credentials configured in the testing environment.
    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/payments', [
        'order_id' => $order->id,
        'gateway_code' => 'sslcommerz',
        'idempotency_key' => 'ssl-key-1',
    ])->assertStatus(422);
});

it('rejects initiating a payment against a non-existent order', function () {
    $caller = userWithPermissions(['payments.payments.manage']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/payments', [
        'order_id' => (string) Str::uuid(),
        'gateway_code' => 'cod',
        'idempotency_key' => 'missing-order-key',
    ])->assertStatus(422);
});

it('lists and shows payments to a caller with the view permission', function () {
    $caller = userWithPermissions(['payments.payments.view', 'payments.payments.manage']);
    $order = Order::factory()->create();

    $store = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/payments', [
        'order_id' => $order->id,
        'gateway_code' => 'cod',
        'idempotency_key' => 'list-key-1',
    ]);
    $paymentId = $store->json('data.id');

    $this->actingAs($caller, 'sanctum')->getJson('/api/v1/payments')
        ->assertOk()
        ->assertJsonStructure(['data', 'links', 'meta']);

    $this->actingAs($caller, 'sanctum')->getJson("/api/v1/payments/{$paymentId}")
        ->assertOk()
        ->assertJsonPath('data.id', $paymentId);
});
