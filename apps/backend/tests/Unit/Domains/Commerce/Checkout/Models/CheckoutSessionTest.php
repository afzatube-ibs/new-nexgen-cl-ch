<?php

declare(strict_types=1);

use App\Domains\Commerce\Checkout\Exceptions\CheckoutSessionExpiredException;
use App\Domains\Commerce\Checkout\Exceptions\CheckoutValidationException;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('is not expired immediately after creation', function () {
    $session = CheckoutSession::factory()->create();

    expect($session->isExpired())->toBeFalse();
});

it('is expired once expires_at has passed', function () {
    $session = CheckoutSession::factory()->create(['expires_at' => now()->subMinute()]);

    expect($session->isExpired())->toBeTrue();
});

it('is ready for review only while open or reviewed', function () {
    $open = CheckoutSession::factory()->create(['status' => CheckoutSession::STATUS_OPEN]);
    $reviewed = CheckoutSession::factory()->create(['status' => CheckoutSession::STATUS_REVIEWED]);
    $submitted = CheckoutSession::factory()->create(['status' => CheckoutSession::STATUS_SUBMITTED]);
    $expired = CheckoutSession::factory()->create(['status' => CheckoutSession::STATUS_EXPIRED]);

    expect($open->isReadyForReview())->toBeTrue();
    expect($reviewed->isReadyForReview())->toBeTrue();
    expect($submitted->isReadyForReview())->toBeFalse();
    expect($expired->isReadyForReview())->toBeFalse();
});

it('rejects mutation on an expired session', function () {
    $session = CheckoutSession::factory()->create(['expires_at' => now()->subMinute()]);

    expect(fn () => $session->assertMutable())->toThrow(CheckoutSessionExpiredException::class);
});

it('rejects mutation on a submitted session', function () {
    $session = CheckoutSession::factory()->create(['status' => CheckoutSession::STATUS_SUBMITTED]);

    expect(fn () => $session->assertMutable())->toThrow(CheckoutValidationException::class);
});

it('allows mutation on an open or reviewed session', function () {
    $open = CheckoutSession::factory()->create(['status' => CheckoutSession::STATUS_OPEN]);
    $open->assertMutable();

    $reviewed = CheckoutSession::factory()->create(['status' => CheckoutSession::STATUS_REVIEWED]);
    $reviewed->assertMutable();
})->throwsNoExceptions();

it('resets a reviewed session back to open and clears its totals', function () {
    $session = CheckoutSession::factory()->reviewed()->create();

    $session->resetReviewIfNeeded();

    expect($session->status)->toBe(CheckoutSession::STATUS_OPEN);
    expect($session->subtotal)->toBeNull();
    expect($session->grand_total)->toBeNull();
});

it('leaves an already-open session untouched by resetReviewIfNeeded', function () {
    $session = CheckoutSession::factory()->create(['status' => CheckoutSession::STATUS_OPEN]);

    $session->resetReviewIfNeeded();

    expect($session->status)->toBe(CheckoutSession::STATUS_OPEN);
});
