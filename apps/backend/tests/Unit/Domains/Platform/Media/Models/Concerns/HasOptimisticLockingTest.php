<?php

declare(strict_types=1);

use App\Domains\Platform\Media\Exceptions\ConcurrencyConflictException;
use App\Domains\Platform\Media\Models\MediaAsset;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('assigns version 1 to a newly created aggregate', function () {
    $asset = MediaAsset::factory()->create();

    expect($asset->lock_version)->toBe(1);
});

it('increments the version on every update', function () {
    $asset = MediaAsset::factory()->create();

    $asset->update(['alt_text' => 'Changed once']);
    expect($asset->lock_version)->toBe(2);
});

it('throws ConcurrencyConflictException when the expected version is stale', function () {
    $asset = MediaAsset::factory()->create();
    $asset->update(['alt_text' => 'Changed']);

    expect(fn () => $asset->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});
