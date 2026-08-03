<?php

declare(strict_types=1);

use App\Domains\Platform\Localization\Audit\AuditLog;
use App\Domains\Platform\Localization\Models\Currency;
use Illuminate\Support\Str;

it('denies listing currencies without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/currencies')
        ->assertStatus(403)
        ->assertJsonPath('error.type', 'authorization_denied');
});

it('lists currencies, paginated, for a caller with the view permission', function () {
    $caller = userWithPermissions(['localization.currencies.view']);
    Currency::factory()->count(3)->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/currencies');

    $response->assertOk()->assertJsonStructure(['data', 'links', 'meta']);
    expect($response->json('meta.total'))->toBe(3);
});

it('creates a currency given the manage permission, auditing it, never as base', function () {
    $caller = userWithPermissions(['localization.currencies.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/currencies', [
        'code' => 'eur',
        'name' => 'Euro',
        'symbol' => '€',
        'decimal_places' => 2,
        'exchange_rate' => '0.920000',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.code', 'EUR')
        ->assertJsonPath('data.isBase', false)
        ->assertJsonPath('data.version', 1);

    expect(Currency::query()->where('code', 'EUR')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'currency.created')->count())->toBe(1);
});

it('rejects creating a currency without the manage permission', function () {
    $caller = userWithPermissions(['localization.currencies.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/currencies', ['code' => 'EUR', 'name' => 'Euro', 'symbol' => '€', 'exchange_rate' => '1'])
        ->assertStatus(403);
});

it('rejects a well-formed but non-existent currency code', function () {
    $caller = userWithPermissions(['localization.currencies.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/currencies', ['code' => 'ZZZ', 'name' => 'Fake', 'symbol' => 'Z', 'exchange_rate' => '1'])
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('rejects a duplicate currency code', function () {
    $caller = userWithPermissions(['localization.currencies.manage']);
    Currency::factory()->create(['code' => 'USD']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/currencies', ['code' => 'USD', 'name' => 'US Dollar', 'symbol' => '$', 'exchange_rate' => '1'])
        ->assertStatus(422);
});

it('rejects a non-positive exchange rate', function () {
    $caller = userWithPermissions(['localization.currencies.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/currencies', ['code' => 'EUR', 'name' => 'Euro', 'symbol' => '€', 'exchange_rate' => '0'])
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('updates a currency\'s exchange rate when the expected version matches', function () {
    $caller = userWithPermissions(['localization.currencies.manage']);
    $currency = Currency::factory()->create(['exchange_rate' => '0.900000']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/currencies/{$currency->id}", [
        'exchange_rate' => '0.950000',
        'expected_version' => 1,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.exchangeRate', '0.950000')
        ->assertJsonPath('data.version', 2);

    expect(AuditLog::query()->where('action', 'currency.updated')->count())->toBe(1);
});

it('rejects an update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['localization.currencies.manage']);
    $currency = Currency::factory()->create();
    $currency->update(['name' => 'Already changed once']); // now at version 2

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/currencies/{$currency->id}", [
        'name' => 'Racing update',
        'expected_version' => 1,
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
});

it('promotes a currency to base, demoting the previous base and forcing its rate to 1.000000', function () {
    $caller = userWithPermissions(['localization.currencies.manage']);
    $currentBase = Currency::factory()->base()->create();
    $candidate = Currency::factory()->create(['exchange_rate' => '0.900000']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/currencies/{$candidate->id}", [
        'is_base' => true,
        'exchange_rate' => '0.500000', // deliberately supplied and expected to be overridden
        'expected_version' => 1,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.isBase', true)
        ->assertJsonPath('data.exchangeRate', '1.000000');

    expect($currentBase->fresh()->is_base)->toBeFalse();
});

it('archives a non-base currency', function () {
    $caller = userWithPermissions(['localization.currencies.manage']);
    $currency = Currency::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/currencies/{$currency->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
    expect($currency->fresh()->isActive())->toBeFalse();
});

it('refuses to archive the base currency', function () {
    $caller = userWithPermissions(['localization.currencies.manage']);
    $currency = Currency::factory()->base()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/currencies/{$currency->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(422)->assertJsonPath('error.type', 'unprocessable_entity');
    expect($currency->fresh()->isActive())->toBeTrue();
});

it('deletes a non-base currency', function () {
    $caller = userWithPermissions(['localization.currencies.manage']);
    $currency = Currency::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/currencies/{$currency->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect(Currency::query()->find($currency->id))->toBeNull();
    expect(Currency::withTrashed()->find($currency->id))->not->toBeNull();
});

it('refuses to delete the base currency', function () {
    $caller = userWithPermissions(['localization.currencies.manage']);
    $currency = Currency::factory()->base()->create();

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/currencies/{$currency->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(422)->assertJsonPath('error.type', 'unprocessable_entity');
    expect(Currency::query()->find($currency->id))->not->toBeNull();
});

it('returns 404, not a stack trace, for a nonexistent currency', function () {
    $caller = userWithPermissions(['localization.currencies.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/currencies/'.Str::uuid())
        ->assertStatus(404)
        ->assertJsonPath('error.type', 'not_found');
});
