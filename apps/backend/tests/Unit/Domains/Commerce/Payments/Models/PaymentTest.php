<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('starts pending', function () {
    $payment = Payment::factory()->create();

    expect($payment->status)->toBe(Payment::STATUS_PENDING);
    expect($payment->isActive())->toBeTrue();
    expect($payment->isTerminal())->toBeFalse();
});

it('allows the documented transitions from pending', function () {
    $payment = Payment::factory()->create();

    expect($payment->canTransitionTo(Payment::STATUS_AUTHORIZED))->toBeTrue();
    expect($payment->canTransitionTo(Payment::STATUS_CAPTURED))->toBeTrue();
    expect($payment->canTransitionTo(Payment::STATUS_FAILED))->toBeTrue();
    expect($payment->canTransitionTo(Payment::STATUS_CANCELLED))->toBeTrue();
    expect($payment->canTransitionTo(Payment::STATUS_VOIDED))->toBeFalse();
});

it('allows the documented transitions from authorized', function () {
    $payment = Payment::factory()->authorized()->create();

    expect($payment->canTransitionTo(Payment::STATUS_CAPTURED))->toBeTrue();
    expect($payment->canTransitionTo(Payment::STATUS_VOIDED))->toBeTrue();
    expect($payment->canTransitionTo(Payment::STATUS_FAILED))->toBeTrue();
    expect($payment->canTransitionTo(Payment::STATUS_CANCELLED))->toBeTrue();
});

it('treats failed, cancelled, and voided as terminal with no further transitions', function () {
    $failed = Payment::factory()->failed()->create();
    $cancelled = Payment::factory()->cancelled()->create();
    $voided = Payment::factory()->create(['status' => Payment::STATUS_VOIDED]);

    foreach ([$failed, $cancelled, $voided] as $payment) {
        expect($payment->isTerminal())->toBeTrue();
        expect($payment->isActive())->toBeFalse();
        expect($payment->canTransitionTo(Payment::STATUS_CAPTURED))->toBeFalse();
    }
});

// Since MODULE:RETURNS was built, captured is no longer a dead end — see
// Payment::TRANSITIONS' own STATUS_CAPTURED entry: a captured payment can
// still move to partially_refunded or refunded, so it is not "terminal"
// even though it is no longer "active" (Actions\InitiatePaymentAction's
// one-active-payment-per-order lock has already been released).
it('treats captured as no longer terminal, but still not active, since it can still be refunded', function () {
    $captured = Payment::factory()->captured()->create();

    expect($captured->isTerminal())->toBeFalse();
    expect($captured->isActive())->toBeFalse();
    expect($captured->canTransitionTo(Payment::STATUS_PARTIALLY_REFUNDED))->toBeTrue();
    expect($captured->canTransitionTo(Payment::STATUS_REFUNDED))->toBeTrue();
    expect($captured->canTransitionTo(Payment::STATUS_CAPTURED))->toBeFalse();
});

it('is active only while pending or authorized', function () {
    expect(Payment::factory()->create()->isActive())->toBeTrue();
    expect(Payment::factory()->authorized()->create()->isActive())->toBeTrue();
    expect(Payment::factory()->captured()->create()->isActive())->toBeFalse();
});
