<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Actions\RefundPaymentAction;
use App\Domains\Commerce\Payments\Events\PaymentRefunded;
use App\Domains\Commerce\Payments\Exceptions\PaymentValidationException;
use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function bkashConfiguredForRefund(): void
{
    config(['payments.bkash.app_key' => 'test-app-key']);
    config(['payments.bkash.app_secret' => 'test-app-secret']);
    config(['payments.bkash.username' => 'test-user']);
    config(['payments.bkash.password' => 'test-pass']);
    config(['payments.bkash.base_url' => 'https://tokenized.sandbox.bka.sh.test/v1.2.0-beta']);
}

it('fully refunds a captured payment, transitioning it to refunded', function () {
    bkashConfiguredForRefund();
    Http::fake([
        '*/token/grant' => Http::response(['id_token' => 'token-abc', 'expires_in' => 3600]),
        '*/payment/refund' => Http::response(['transactionStatus' => 'Completed', 'refundTrxID' => 'RFD-1']),
    ]);

    $payment = Payment::factory()->captured()->create(['gateway_code' => 'bkash', 'amount' => '100.0000', 'amount_captured' => '100.0000']);

    $result = app(RefundPaymentAction::class)->execute($payment, '100.0000', 'Customer return', null);

    expect($result->status)->toBe(Payment::STATUS_REFUNDED);
    expect($result->amount_refunded)->toBe('100.0000');
    expect($result->refunded_at)->not->toBeNull();
    expect(PaymentAttempt::query()->where('payment_id', $payment->id)->where('type', PaymentAttempt::TYPE_REFUND)->count())->toBe(1);
});

it('partially refunds a captured payment, transitioning it to partially_refunded', function () {
    bkashConfiguredForRefund();
    Http::fake([
        '*/token/grant' => Http::response(['id_token' => 'token-abc', 'expires_in' => 3600]),
        '*/payment/refund' => Http::response(['transactionStatus' => 'Completed', 'refundTrxID' => 'RFD-2']),
    ]);

    $payment = Payment::factory()->captured()->create(['gateway_code' => 'bkash', 'amount' => '100.0000', 'amount_captured' => '100.0000']);

    $result = app(RefundPaymentAction::class)->execute($payment, '40.0000', null, null);

    expect($result->status)->toBe(Payment::STATUS_PARTIALLY_REFUNDED);
    expect($result->amount_refunded)->toBe('40.0000');
});

it('allows a second partial refund to accumulate against the already-refunded amount', function () {
    bkashConfiguredForRefund();
    Http::fake([
        '*/token/grant' => Http::response(['id_token' => 'token-abc', 'expires_in' => 3600]),
        '*/payment/refund' => Http::response(['transactionStatus' => 'Completed', 'refundTrxID' => 'RFD-3']),
    ]);

    $payment = Payment::factory()->captured()->create([
        'gateway_code' => 'bkash',
        'amount' => '100.0000',
        'amount_captured' => '100.0000',
        'amount_refunded' => '40.0000',
        'status' => Payment::STATUS_PARTIALLY_REFUNDED,
    ]);

    $result = app(RefundPaymentAction::class)->execute($payment, '60.0000', null, null);

    expect($result->status)->toBe(Payment::STATUS_REFUNDED);
    expect($result->amount_refunded)->toBe('100.0000');
});

it('refuses to refund more than the remaining refundable balance', function () {
    bkashConfiguredForRefund();
    $payment = Payment::factory()->captured()->create([
        'gateway_code' => 'bkash',
        'amount' => '100.0000',
        'amount_captured' => '100.0000',
        'amount_refunded' => '80.0000',
        'status' => Payment::STATUS_PARTIALLY_REFUNDED,
    ]);

    expect(fn () => app(RefundPaymentAction::class)->execute($payment, '30.0000', null, null))
        ->toThrow(PaymentValidationException::class);
});

it('refuses to refund a payment whose gateway does not support refunds', function () {
    $payment = Payment::factory()->captured()->create(['gateway_code' => 'cod']);

    expect(fn () => app(RefundPaymentAction::class)->execute($payment, '10.0000', null, null))
        ->toThrow(PaymentValidationException::class);
});

it('refuses to refund a payment that has not been captured', function () {
    $payment = Payment::factory()->create(['status' => Payment::STATUS_PENDING]);

    expect(fn () => app(RefundPaymentAction::class)->execute($payment, '10.0000', null, null))
        ->toThrow(PaymentValidationException::class);
});

it('publishes PaymentRefunded on a successful refund', function () {
    bkashConfiguredForRefund();
    Http::fake([
        '*/token/grant' => Http::response(['id_token' => 'token-abc', 'expires_in' => 3600]),
        '*/payment/refund' => Http::response(['transactionStatus' => 'Completed', 'refundTrxID' => 'RFD-4']),
    ]);

    $payment = Payment::factory()->captured()->create(['gateway_code' => 'bkash', 'amount' => '50.0000', 'amount_captured' => '50.0000']);

    $published = [];
    app(DomainEventBus::class)->subscribe(PaymentRefunded::class, function ($event) use (&$published): void {
        $published[] = $event;
    });

    app(RefundPaymentAction::class)->execute($payment, '50.0000', null, null);

    expect($published)->toHaveCount(1);
    expect($published[0]->paymentId)->toBe($payment->id);
    expect($published[0]->amount)->toBe('50.0000');
    expect($published[0]->refundReference)->toBe('RFD-4');
});
