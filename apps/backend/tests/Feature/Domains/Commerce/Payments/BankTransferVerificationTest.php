<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Payments\Audit\AuditLog;
use App\Domains\Commerce\Payments\Models\Payment;

function bankTransferPayment(): Payment
{
    $order = Order::factory()->create();

    return Payment::factory()->create([
        'order_id' => $order->id,
        'amount' => $order->grand_total,
        'currency_code' => $order->currency_code,
        'gateway_code' => 'bank_transfer',
    ]);
}

it('denies attaching proof without the manage permission', function () {
    $caller = userWithPermissions(['payments.payments.view']);
    $payment = bankTransferPayment();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/payments/{$payment->id}/bank-transfer/proof", [
            'proof_reference' => 'media-file-123',
            'expected_version' => 1,
        ])
        ->assertStatus(403);
});

it('attaches a proof reference (identifier only — no file upload handled here)', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $payment = bankTransferPayment();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/payments/{$payment->id}/bank-transfer/proof", [
        'proof_reference' => 'media-file-123',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.proofReference', 'media-file-123');
});

it('denies approving or rejecting a bank transfer without the dedicated verify permission', function () {
    $caller = userWithPermissions(['payments.payments.manage']);
    $payment = bankTransferPayment();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/payments/{$payment->id}/bank-transfer/approve", ['expected_version' => 1])
        ->assertStatus(403);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/payments/{$payment->id}/bank-transfer/reject", ['reason' => 'x', 'expected_version' => 1])
        ->assertStatus(403);
});

it('approves a bank transfer, capturing the payment', function () {
    $caller = userWithPermissions(['payments.bank_transfer.verify']);
    $payment = bankTransferPayment();

    $response = $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/payments/{$payment->id}/bank-transfer/approve", ['expected_version' => 1]);

    $response->assertOk()->assertJsonPath('data.status', 'captured');
    expect(AuditLog::query()->where('action', 'payment.captured')->count())->toBe(1);
});

it('rejects a bank transfer with a reason, marking the payment failed', function () {
    $caller = userWithPermissions(['payments.bank_transfer.verify']);
    $payment = bankTransferPayment();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/payments/{$payment->id}/bank-transfer/reject", [
        'reason' => 'No matching transfer found for this reference.',
        'expected_version' => 1,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'failed')
        ->assertJsonPath('data.failureReason', 'No matching transfer found for this reference.');
});
