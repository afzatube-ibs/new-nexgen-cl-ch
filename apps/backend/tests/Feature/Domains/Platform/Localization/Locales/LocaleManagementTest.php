<?php

declare(strict_types=1);

use App\Domains\Platform\Localization\Audit\AuditLog;
use App\Domains\Platform\Localization\Models\Locale;
use Illuminate\Support\Str;

it('denies listing locales without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/locales')
        ->assertStatus(403)
        ->assertJsonPath('error.type', 'authorization_denied');
});

it('lists locales, paginated, for a caller with the view permission', function () {
    $caller = userWithPermissions(['localization.locales.view']);
    Locale::factory()->count(3)->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/locales');

    $response->assertOk()->assertJsonStructure(['data', 'links', 'meta']);
    expect($response->json('meta.total'))->toBe(3);
});

it('filters the locale list by status', function () {
    $caller = userWithPermissions(['localization.locales.view']);
    Locale::factory()->archived()->create();
    Locale::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/locales?status=archived');

    expect($response->json('meta.total'))->toBe(1);
    expect($response->json('data.0.status'))->toBe('archived');
});

it('creates a locale given the manage permission, auditing it, never as default', function () {
    $caller = userWithPermissions(['localization.locales.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/locales', [
        'code' => 'en-US',
        'name' => 'English (United States)',
        'native_name' => 'English (United States)',
        'is_rtl' => false,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.code', 'en-US')
        ->assertJsonPath('data.isDefault', false)
        ->assertJsonPath('data.version', 1);

    expect(Locale::query()->where('code', 'en-US')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'locale.added')->count())->toBe(1);
});

it('rejects creating a locale without the manage permission', function () {
    $caller = userWithPermissions(['localization.locales.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/locales', ['code' => 'en', 'name' => 'English', 'native_name' => 'English'])
        ->assertStatus(403);
});

it('rejects a malformed locale code', function () {
    $caller = userWithPermissions(['localization.locales.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/locales', ['code' => 'ENGLISH', 'name' => 'English', 'native_name' => 'English'])
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('rejects a duplicate locale code', function () {
    $caller = userWithPermissions(['localization.locales.manage']);
    Locale::factory()->create(['code' => 'en']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/locales', ['code' => 'en', 'name' => 'English', 'native_name' => 'English'])
        ->assertStatus(422);
});

it('updates a locale when the expected version matches', function () {
    $caller = userWithPermissions(['localization.locales.manage']);
    $locale = Locale::factory()->create(['name' => 'Original Name']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/locales/{$locale->id}", [
        'name' => 'Updated Name',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Updated Name')->assertJsonPath('data.version', 2);
    expect(AuditLog::query()->where('action', 'locale.updated')->count())->toBe(1);
});

it('rejects an update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['localization.locales.manage']);
    $locale = Locale::factory()->create();
    $locale->update(['name' => 'Already changed once']); // now at version 2

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/locales/{$locale->id}", [
        'name' => 'Racing update',
        'expected_version' => 1,
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
});

it('promotes a locale to default, demoting the previous default', function () {
    $caller = userWithPermissions(['localization.locales.manage']);
    $current = Locale::factory()->default()->create();
    $candidate = Locale::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/locales/{$candidate->id}", [
        'is_default' => true,
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.isDefault', true);
    expect($current->fresh()->is_default)->toBeFalse();
});

it('archives a non-default locale', function () {
    $caller = userWithPermissions(['localization.locales.manage']);
    $locale = Locale::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/locales/{$locale->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
    expect($locale->fresh()->isActive())->toBeFalse();
});

it('refuses to archive the default locale', function () {
    $caller = userWithPermissions(['localization.locales.manage']);
    $locale = Locale::factory()->default()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/locales/{$locale->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(422)->assertJsonPath('error.type', 'unprocessable_entity');
    expect($locale->fresh()->isActive())->toBeTrue();
});

it('deletes a non-default locale', function () {
    $caller = userWithPermissions(['localization.locales.manage']);
    $locale = Locale::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/locales/{$locale->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect(Locale::query()->find($locale->id))->toBeNull();
    expect(Locale::withTrashed()->find($locale->id))->not->toBeNull();
});

it('refuses to delete the default locale', function () {
    $caller = userWithPermissions(['localization.locales.manage']);
    $locale = Locale::factory()->default()->create();

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/locales/{$locale->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(422)->assertJsonPath('error.type', 'unprocessable_entity');
    expect(Locale::query()->find($locale->id))->not->toBeNull();
});

it('returns 404, not a stack trace, for a nonexistent locale', function () {
    $caller = userWithPermissions(['localization.locales.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/locales/'.Str::uuid())
        ->assertStatus(404)
        ->assertJsonPath('error.type', 'not_found');
});
