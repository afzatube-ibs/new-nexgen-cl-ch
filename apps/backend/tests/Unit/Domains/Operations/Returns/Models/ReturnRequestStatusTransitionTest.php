<?php

declare(strict_types=1);

use App\Domains\Operations\Returns\Exceptions\InvalidReturnStatusTransitionException;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('allows every step of the normal refund happy path', function () {
    $returnRequest = ReturnRequest::factory()->create();

    $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_APPROVED);
    $returnRequest->status = ReturnRequest::STATUS_APPROVED;

    $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_PICKUP_SCHEDULED);
    $returnRequest->status = ReturnRequest::STATUS_PICKUP_SCHEDULED;

    $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_RECEIVED);
    $returnRequest->status = ReturnRequest::STATUS_RECEIVED;

    $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_INSPECTING);
    $returnRequest->status = ReturnRequest::STATUS_INSPECTING;

    $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_RESOLUTION_APPROVED);
    $returnRequest->status = ReturnRequest::STATUS_RESOLUTION_APPROVED;

    $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_COMPLETED);
})->throwsNoExceptions();

it('rejects skipping a step (requested straight to received)', function () {
    $returnRequest = ReturnRequest::factory()->create();

    expect(fn () => $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_RECEIVED))
        ->toThrow(InvalidReturnStatusTransitionException::class);
});

it('treats completed, rejected, and cancelled as terminal', function () {
    foreach ([ReturnRequest::STATUS_COMPLETED, ReturnRequest::STATUS_REJECTED, ReturnRequest::STATUS_CANCELLED] as $terminal) {
        $returnRequest = ReturnRequest::factory()->create(['status' => $terminal]);

        expect(fn () => $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_APPROVED))
            ->toThrow(InvalidReturnStatusTransitionException::class);

        expect($returnRequest->isTerminal())->toBeTrue();
    }
});

it('allows cancellation from requested, approved, and pickup_scheduled', function () {
    foreach ([ReturnRequest::STATUS_REQUESTED, ReturnRequest::STATUS_APPROVED, ReturnRequest::STATUS_PICKUP_SCHEDULED] as $status) {
        $returnRequest = ReturnRequest::factory()->create(['status' => $status]);

        $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_CANCELLED);
    }
})->throwsNoExceptions();

it('refuses cancellation once received (must go through rejection instead)', function () {
    $returnRequest = ReturnRequest::factory()->create(['status' => ReturnRequest::STATUS_RECEIVED]);

    expect(fn () => $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_CANCELLED))
        ->toThrow(InvalidReturnStatusTransitionException::class);
});

it('allows rejection from requested through inspecting', function () {
    foreach ([
        ReturnRequest::STATUS_REQUESTED,
        ReturnRequest::STATUS_APPROVED,
        ReturnRequest::STATUS_PICKUP_SCHEDULED,
        ReturnRequest::STATUS_RECEIVED,
        ReturnRequest::STATUS_INSPECTING,
    ] as $status) {
        $returnRequest = ReturnRequest::factory()->create(['status' => $status]);

        $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_REJECTED);
    }
})->throwsNoExceptions();

it('reports isExchange() correctly', function () {
    $return = ReturnRequest::factory()->create();
    expect($return->isExchange())->toBeFalse();

    $exchange = ReturnRequest::factory()->exchange()->create();
    expect($exchange->isExchange())->toBeTrue();
});
