<?php

declare(strict_types=1);

use App\Domains\Commerce\Reviews\Exceptions\InvalidReviewStatusTransitionException;
use App\Domains\Commerce\Reviews\Models\Review;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('allows a pending review to be approved or rejected', function () {
    $review = Review::factory()->create();

    $review->assertCanTransitionTo(Review::STATUS_APPROVED);
    $review->assertCanTransitionTo(Review::STATUS_REJECTED);
})->throwsNoExceptions();

it('allows an approved review to later be rejected (reported for abuse)', function () {
    $review = Review::factory()->approved()->create();

    $review->assertCanTransitionTo(Review::STATUS_REJECTED);
})->throwsNoExceptions();

it('refuses to re-approve an already-approved review', function () {
    $review = Review::factory()->approved()->create();

    expect(fn () => $review->assertCanTransitionTo(Review::STATUS_APPROVED))
        ->toThrow(InvalidReviewStatusTransitionException::class);
});

it('allows a rejected review to later be approved on appeal', function () {
    $review = Review::factory()->rejected()->create();

    $review->assertCanTransitionTo(Review::STATUS_APPROVED);
})->throwsNoExceptions();

it('refuses to re-reject an already-rejected review', function () {
    $review = Review::factory()->rejected()->create();

    expect(fn () => $review->assertCanTransitionTo(Review::STATUS_REJECTED))
        ->toThrow(InvalidReviewStatusTransitionException::class);
});

it('reports hasMerchantResponse() correctly', function () {
    $review = Review::factory()->create();
    expect($review->hasMerchantResponse())->toBeFalse();

    $review->update(['merchant_response_body' => 'Thanks!']);
    expect($review->hasMerchantResponse())->toBeTrue();
});
