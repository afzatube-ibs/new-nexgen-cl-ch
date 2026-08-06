<?php

declare(strict_types=1);

use App\Domains\Operations\Returns\Models\RefundRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('allows the normal pending -> processing -> completed path', function () {
    $refund = RefundRequest::factory()->create();

    expect($refund->canTransitionTo(RefundRequest::STATUS_PROCESSING))->toBeTrue();
    $refund->status = RefundRequest::STATUS_PROCESSING;

    expect($refund->canTransitionTo(RefundRequest::STATUS_COMPLETED))->toBeTrue();
});

it('allows pending or processing to fail', function () {
    $pending = RefundRequest::factory()->create();
    expect($pending->canTransitionTo(RefundRequest::STATUS_FAILED))->toBeTrue();

    $processing = RefundRequest::factory()->processing()->create();
    expect($processing->canTransitionTo(RefundRequest::STATUS_FAILED))->toBeTrue();
});

it('allows retrying a failed refund back to processing', function () {
    $failed = RefundRequest::factory()->failed()->create();

    expect($failed->canTransitionTo(RefundRequest::STATUS_PROCESSING))->toBeTrue();
});

it('treats completed as terminal with no further transitions', function () {
    $completed = RefundRequest::factory()->completed()->create();

    expect($completed->isTerminal())->toBeTrue();
    expect($completed->canTransitionTo(RefundRequest::STATUS_PROCESSING))->toBeFalse();
    expect($completed->canTransitionTo(RefundRequest::STATUS_FAILED))->toBeFalse();
});

it('does not consider pending, processing, or failed terminal', function () {
    expect(RefundRequest::factory()->create()->isTerminal())->toBeFalse();
    expect(RefundRequest::factory()->processing()->create()->isTerminal())->toBeFalse();
    expect(RefundRequest::factory()->failed()->create()->isTerminal())->toBeFalse();
});
