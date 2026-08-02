<?php

declare(strict_types=1);

use App\Domains\Commerce\Inventory\Exceptions\ConcurrencyConflictException;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('assigns version 1 to a newly created aggregate', function () {
    $warehouse = Warehouse::factory()->create();

    expect($warehouse->lock_version)->toBe(1);
});

it('increments the version on every update', function () {
    $warehouse = Warehouse::factory()->create();

    $warehouse->update(['name' => 'Renamed']);
    expect($warehouse->lock_version)->toBe(2);
});

it('throws ConcurrencyConflictException when the expected version is stale', function () {
    $warehouse = Warehouse::factory()->create();
    $warehouse->update(['name' => 'Changed']);

    expect(fn () => $warehouse->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});
