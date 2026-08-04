<?php

declare(strict_types=1);

use App\Domains\Commerce\Promotions\Models\Promotion;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('is within schedule when both bounds are unset', function () {
    $promotion = Promotion::factory()->make(['starts_at' => null, 'ends_at' => null]);

    expect($promotion->isWithinSchedule())->toBeTrue();
});

it('is not within schedule before starts_at', function () {
    $promotion = Promotion::factory()->make([
        'starts_at' => CarbonImmutable::now()->addDay(),
        'ends_at' => null,
    ]);

    expect($promotion->isWithinSchedule())->toBeFalse();
});

it('is within schedule between starts_at and ends_at', function () {
    $promotion = Promotion::factory()->make([
        'starts_at' => CarbonImmutable::now()->subDay(),
        'ends_at' => CarbonImmutable::now()->addDay(),
    ]);

    expect($promotion->isWithinSchedule())->toBeTrue();
});

it('is not within schedule after ends_at', function () {
    $promotion = Promotion::factory()->make([
        'starts_at' => null,
        'ends_at' => CarbonImmutable::now()->subDay(),
    ]);

    expect($promotion->isWithinSchedule())->toBeFalse();
});

it('has not reached the global usage limit when unset', function () {
    $promotion = Promotion::factory()->make(['usage_limit_global' => null, 'usage_count_global' => 500]);

    expect($promotion->hasReachedGlobalUsageLimit())->toBeFalse();
});

it('has reached the global usage limit once the count meets it', function () {
    $promotion = Promotion::factory()->make(['usage_limit_global' => 10, 'usage_count_global' => 10]);

    expect($promotion->hasReachedGlobalUsageLimit())->toBeTrue();
});

it('has not reached the global usage limit while the count is below it', function () {
    $promotion = Promotion::factory()->make(['usage_limit_global' => 10, 'usage_count_global' => 9]);

    expect($promotion->hasReachedGlobalUsageLimit())->toBeFalse();
});
