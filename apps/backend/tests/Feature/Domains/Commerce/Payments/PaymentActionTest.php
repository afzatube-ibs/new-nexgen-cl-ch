<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Payments\Models\Payment;

function paymentReadyForAction(array $overrides = []): Payment
{
    $order = Order::factory()->create();

    return Payment::factory()->create(array_merge([
        'order_id' => $order->id,
        'amount' => $order->grand_total,
        'currency_code' => $order->currency_code,
        'gateway_code' => 'bank_transfer',
    ], $overrides));
}

it('denies capturing a payment without the manage permission', function () {
    $caller = userWithPermissions(['payments.payments.view']);
    $payment = paymentReadyForAction();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/payments/{$payment->id}/capture", ['expected_version' => 1])
        ->assertStatus(403);
});

it('captures a pending payment (e.g. Bank Transfer approved without the dedicated verification endpoint)', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $payment = paymentReadyForAction();

    $response = $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/payments/{$payment->id}/capture", ['expected_version' => 1]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'captured')
        ->assertJsonPath('data.amountCaptured', $payment->amount);
});

it('rejects capturing with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $payment = paymentReadyForAction();
    $payment->update(['failure_reason' => null]); // bump lock_version to 2

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/payments/{$payment->id}/capture", ['expected_version' => 1])
        ->assertStatus(409);
});

it('rejects capturing a payment that is already terminal', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $payment = paymentReadyForAction(['status' => Payment::STATUS_CAPTURED, 'captured_at' => now()]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/payments/{$payment->id}/capture", ['expected_version' => 1])
        ->assertStatus(422);
});

it('cancels a pending payment with a reason', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $payment = paymentReadyForAction();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/payments/{$payment->id}/cancel", [
        'reason' => 'Customer changed their mind.',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'cancelled');
});

it('voids an authorized payment with a reason', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $payment = paymentReadyForAction(['status' => Payment::STATUS_AUTHORIZED, 'authorized_at' => now()]);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/payments/{$payment->id}/void", [
        'reason' => 'Authorization expired at the gateway.',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'voided');
});

it('rejects voiding a payment that was never authorized', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $payment = paymentReadyForAction();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/payments/{$payment->id}/void", ['reason' => 'x', 'expected_version' => 1])
        ->assertStatus(422);
});

it('captures concurrently-submitted requests safely: only one succeeds, the second sees the already-captured state', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $payment = paymentReadyForAction();

    $first = $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/payments/{$payment->id}/capture", ['expected_version' => 1]);
    $first->assertOk()->assertJsonPath('data.status', 'captured');

    // A second request still carrying the pre-capture version is a stale
    // write, correctly rejected as a conflict rather than double-capturing.
    $second = $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/payments/{$payment->id}/capture", ['expected_version' => 1]);
    $second->assertStatus(409);

    expect($payment->fresh()->status)->toBe(Payment::STATUS_CAPTURED);
});
