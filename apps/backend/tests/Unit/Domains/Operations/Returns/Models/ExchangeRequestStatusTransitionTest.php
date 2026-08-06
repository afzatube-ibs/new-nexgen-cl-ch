<?php

declare(strict_types=1);

use App\Domains\Operations\Returns\Models\ExchangeRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('allows the normal pending -> preparing -> shipped -> completed path', function () {
    $exchange = ExchangeRequest::factory()->create();

    expect($exchange->canTransitionTo(ExchangeRequest::STATUS_PREPARING))->toBeTrue();
    $exchange->status = ExchangeRequest::STATUS_PREPARING;

    expect($exchange->canTransitionTo(ExchangeRequest::STATUS_SHIPPED))->toBeTrue();
    $exchange->status = ExchangeRequest::STATUS_SHIPPED;

    expect($exchange->canTransitionTo(ExchangeRequest::STATUS_COMPLETED))->toBeTrue();
});

it('allows cancellation from pending or preparing', function () {
    expect(ExchangeRequest::factory()->create()->canTransitionTo(ExchangeRequest::STATUS_CANCELLED))->toBeTrue();
    expect(ExchangeRequest::factory()->preparing()->create()->canTransitionTo(ExchangeRequest::STATUS_CANCELLED))->toBeTrue();
});

it('refuses cancellation once shipped', function () {
    $shipped = ExchangeRequest::factory()->shipped()->create();

    expect($shipped->canTransitionTo(ExchangeRequest::STATUS_CANCELLED))->toBeFalse();
});

it('refuses completing straight from pending, skipping preparing and shipped', function () {
    $pending = ExchangeRequest::factory()->create();

    expect($pending->canTransitionTo(ExchangeRequest::STATUS_COMPLETED))->toBeFalse();
});

it('treats completed and cancelled as having no further transitions', function () {
    $completed = ExchangeRequest::factory()->create(['status' => ExchangeRequest::STATUS_COMPLETED]);
    $cancelled = ExchangeRequest::factory()->create(['status' => ExchangeRequest::STATUS_CANCELLED]);

    expect($completed->canTransitionTo(ExchangeRequest::STATUS_PREPARING))->toBeFalse();
    expect($cancelled->canTransitionTo(ExchangeRequest::STATUS_PREPARING))->toBeFalse();
});
