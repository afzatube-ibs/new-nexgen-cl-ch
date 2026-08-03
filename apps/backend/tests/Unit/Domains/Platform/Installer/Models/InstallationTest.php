<?php

declare(strict_types=1);

use App\Domains\Platform\Installer\Models\Installation;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('always assigns slot 1 on creation', function () {
    $installation = Installation::factory()->create();

    expect($installation->slot)->toBe(1);
});

it('refuses a second row via the database-level unique constraint on slot', function () {
    Installation::factory()->create();

    expect(fn () => Installation::factory()->create())
        ->toThrow(UniqueConstraintViolationException::class);
});

it('has no updated_at column', function () {
    $installation = Installation::factory()->create();

    expect($installation->getAttributes())->not->toHaveKey('updated_at');
});
